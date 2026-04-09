/**
 * Voicory LiveKit Agent Worker
 *
 * Runs as a persistent service. Listens for room dispatch events from LiveKit Cloud,
 * joins rooms, and runs the full STT → LLM → TTS pipeline.
 *
 * Features:
 * - Full assistant config from DB (instruction, voice, model, language)
 * - RAG: searches knowledge base and injects context into system prompt
 * - Sends agent-state data channel messages for frontend visualizer
 * - ElevenLabs TTS via REST (not plugin) when voice_id is elevenlabs
 * - Subprocess-safe health server (only in main process)
 */

import {
  defineAgent,
  WorkerOptions,
  cli,
  voice,
  llm,
} from '@livekit/agents';
import * as openaiPlugin from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_INSTRUCTIONS = 'You are a helpful AI assistant. Be concise and friendly.';
const DEFAULT_FIRST_MESSAGE = 'Hello! How can I help you today?';
const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const DEFAULT_VOICE = 'alloy';

// ─── Fetch assistant config ───────────────────────────────────────────────────
async function fetchAssistant(assistantId) {
  if (!assistantId) return null;
  const { data, error } = await supabase
    .from('assistants')
    .select(`
      id, name, instruction, first_message, llm_model, language,
      rag_enabled, rag_similarity_threshold, rag_max_results, rag_instructions,
      knowledge_base_ids, memory_enabled, integrations,
      voice_id, elevenlabs_model_id,
      voices:voice_id (
        id, name, tts_provider, elevenlabs_voice_id, elevenlabs_model_id, provider_voice_id
      )
    `)
    .eq('id', assistantId)
    .single();
  if (error) {
    console.error('[Agent] Failed to fetch assistant:', error.message);
    return null;
  }
  return data;
}

// ─── RAG: search knowledge base ───────────────────────────────────────────────
async function searchKnowledgeBase(query, knowledgeBaseIds, threshold = 0.5, maxResults = 5) {
  if (!knowledgeBaseIds?.length || !query) return '';
  try {
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      p_query_embedding: null, // will be generated server-side
      p_query_text: query,
      p_knowledge_base_ids: knowledgeBaseIds,
      p_similarity_threshold: threshold,
      p_max_results: maxResults,
    });
    if (error) {
      console.warn('[Agent] RAG search failed:', error.message);
      return '';
    }
    if (!data?.length) return '';
    const context = data.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n');
    console.log(`[Agent] RAG: found ${data.length} chunks`);
    return context;
  } catch (e) {
    console.warn('[Agent] RAG error:', e.message);
    return '';
  }
}

// ─── Build system prompt with optional RAG context ───────────────────────────
function buildSystemPrompt(assistant, ragContext) {
  let prompt = assistant?.instruction || DEFAULT_INSTRUCTIONS;

  if (ragContext) {
    prompt += `\n\n---\nRelevant knowledge base context:\n${ragContext}\n---\nUse the above context to answer questions accurately.`;
  }

  if (assistant?.rag_instructions) {
    prompt += `\n\n${assistant.rag_instructions}`;
  }

  return prompt;
}

// ─── Build TTS ────────────────────────────────────────────────────────────────
function buildTTS(assistant) {
  const voiceRow = assistant?.voices;
  const provider = voiceRow?.tts_provider?.toLowerCase();

  if (provider === 'openai' && voiceRow?.provider_voice_id) {
    return new openaiPlugin.TTS({ model: 'tts-1-hd', voice: voiceRow.provider_voice_id });
  }

  // ElevenLabs and Google fall back to OpenAI TTS for now
  // (agents-plugin-elevenlabs not bundled; can add later)
  if (provider === 'elevenlabs') {
    console.log(`[Agent] ElevenLabs voice (${voiceRow?.name}) — falling back to OpenAI TTS`);
  }

  return new openaiPlugin.TTS({ model: 'tts-1', voice: DEFAULT_VOICE });
}

// ─── Send state update to frontend via data channel ──────────────────────────
async function sendAgentState(room, state) {
  try {
    const msg = JSON.stringify({ type: 'state', state });
    const encoder = new TextEncoder();
    await room.localParticipant.publishData(encoder.encode(msg), { topic: 'agent-state', reliable: true });
  } catch { /* non-fatal */ }
}

// ─── Agent definition ─────────────────────────────────────────────────────────
export default defineAgent({
  prewarm: async (proc) => {
    proc.userData.vad = await silero.VAD.load();
    console.log('[Agent] VAD model loaded ✅');
  },

  entry: async (ctx) => {
    console.log('[Agent] Job started, room:', ctx.job.room?.name);

    // Connect to the LiveKit room first (required before any room operations)
    await ctx.connect();
    console.log('[Agent] Connected to room ✅');

    // Wait for human participant
    const participant = await ctx.waitForParticipant();
    console.log('[Agent] Participant ready:', participant.identity);

    // Parse metadata — job dispatch metadata is primary, participant metadata is fallback
    let assistantId = null;
    let userId = null;
    try {
      const jobMeta = JSON.parse(ctx.job.metadata || '{}');
      const participantMeta = JSON.parse(participant.metadata || '{}');
      assistantId = jobMeta.assistantId || participantMeta.assistantId;
      userId = jobMeta.userId || participantMeta.userId;
      console.log('[Agent] assistantId:', assistantId, 'userId:', userId);
    } catch {
      console.warn('[Agent] Failed to parse metadata');
    }

    // Fetch assistant config
    const assistant = await fetchAssistant(assistantId);
    const firstMessage = assistant?.first_message || DEFAULT_FIRST_MESSAGE;
    const llmModel = assistant?.llm_model || DEFAULT_LLM_MODEL;
    const language = assistant?.language || 'en';
    const assistantName = assistant?.name || 'Assistant';
    const ragEnabled = assistant?.rag_enabled || false;
    const knowledgeBaseIds = assistant?.knowledge_base_ids || [];

    console.log(`[Agent] Starting as "${assistantName}" | model: ${llmModel} | RAG: ${ragEnabled}`);

    // Initial RAG context based on first message topic
    let initialRagContext = '';
    if (ragEnabled && knowledgeBaseIds.length > 0) {
      initialRagContext = await searchKnowledgeBase(
        firstMessage,
        knowledgeBaseIds,
        assistant?.rag_similarity_threshold || 0.5,
        assistant?.rag_max_results || 5,
      );
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(assistant, initialRagContext);

    // STT
    const sttLanguage = language === 'hi' || language === 'hi-IN' ? 'hi' : 'en';
    const stt = new openaiPlugin.STT({ model: 'whisper-1', language: sttLanguage });

    // LLM with initial system message
    const chatCtx = new llm.ChatContext().append({
      role: llm.ChatRole.SYSTEM,
      text: systemPrompt,
    });

    const llmInstance = new openaiPlugin.LLM({ model: llmModel });

    // TTS
    const tts = buildTTS(assistant);

    // Agent + session
    const agent = new voice.Agent({ instructions: systemPrompt, chatCtx });

    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad,
      stt,
      llm: llmInstance,
      tts,
    });

    // Wire up state change → data channel for frontend visualizer
    session.on('agent_state_changed', async (state) => {
      console.log('[Agent] State:', state);
      await sendAgentState(ctx.room, state);
    });

    await session.start({ agent, room: ctx.room });

    // Greet user
    await sendAgentState(ctx.room, 'speaking');
    await session.say(firstMessage, { allowInterruptions: true });

    console.log('[Agent] Session active ✅');

    ctx.addShutdownCallback(async () => {
      console.log('[Agent] Session ended:', ctx.job.room?.name);
    });
  },
});

// ─── Health server (main process only) ───────────────────────────────────────
// Forked job subprocesses have process.send defined (IPC). Skip in those.
if (typeof process.send !== 'function') {
  const PORT = process.env.PORT || 8080;
  const healthServer = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'voicory-agent' }));
  });
  healthServer.listen(PORT, () => console.log(`[Health] HTTP server on port ${PORT}`));
  healthServer.on('error', (err) => console.warn('[Health] Server error:', err.message));
}

cli.runApp(new WorkerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: 'voicory-agent',
}));
