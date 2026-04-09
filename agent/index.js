/**
 * Voicory LiveKit Agent Worker — v3 (Context7 verified)
 * 
 * API reference: /livekit/agents-js (Context7)
 * Correct order: ctx.connect() → session.start({agent, room}) → ctx.waitForParticipant() → session.say()
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

const DEFAULT_INSTRUCTIONS = 'You are a helpful AI assistant. Be concise and friendly.';
const DEFAULT_FIRST_MESSAGE = 'Hello! How can I help you today?';
const DEFAULT_LLM_MODEL = 'gpt-4o-mini';

// ─── Fetch assistant config ───────────────────────────────────────────────────
async function fetchAssistant(assistantId) {
  if (!assistantId) return null;
  const { data, error } = await supabase
    .from('assistants')
    .select(`
      id, name, instruction, first_message, llm_model, language,
      rag_enabled, rag_similarity_threshold, rag_max_results, rag_instructions,
      knowledge_base_ids,
      voices:voice_id (
        id, name, tts_provider, provider_voice_id, elevenlabs_voice_id
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

// ─── RAG search ───────────────────────────────────────────────────────────────
async function searchKnowledgeBase(query, knowledgeBaseIds, threshold = 0.5, maxResults = 5) {
  if (!knowledgeBaseIds?.length || !query) return '';
  try {
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      p_query_text: query,
      p_knowledge_base_ids: knowledgeBaseIds,
      p_similarity_threshold: threshold,
      p_max_results: maxResults,
    });
    if (error || !data?.length) return '';
    console.log(`[Agent] RAG: ${data.length} chunks found`);
    return data.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n');
  } catch (e) {
    console.warn('[Agent] RAG error:', e.message);
    return '';
  }
}

// ─── Build system prompt ──────────────────────────────────────────────────────
function buildInstructions(assistant, ragContext) {
  let prompt = assistant?.instruction || DEFAULT_INSTRUCTIONS;
  if (ragContext) {
    prompt += `\n\n---\nKnowledge base context:\n${ragContext}\n---\nUse the above to answer accurately.`;
  }
  if (assistant?.rag_instructions) {
    prompt += `\n\n${assistant.rag_instructions}`;
  }
  return prompt;
}

// ─── Build OpenAI TTS ─────────────────────────────────────────────────────────
function buildTTS(assistant) {
  const voiceRow = assistant?.voices;
  const provider = voiceRow?.tts_provider?.toLowerCase();
  const voiceName = (provider === 'openai' && voiceRow?.provider_voice_id)
    ? voiceRow.provider_voice_id
    : 'alloy';

  if (provider === 'elevenlabs') {
    console.log(`[Agent] ElevenLabs voice "${voiceRow?.name}" — using OpenAI fallback (plugin not bundled)`);
  }

  console.log(`[Agent] TTS: openai/${voiceName}`);
  return new openaiPlugin.TTS({ model: 'tts-1', voice: voiceName });
}

// ─── Agent definition ─────────────────────────────────────────────────────────
export default defineAgent({
  prewarm: async (proc) => {
    proc.userData.vad = await silero.VAD.load();
    console.log('[Agent] VAD loaded ✅');
  },

  entry: async (ctx) => {
    console.log('[Agent] Job started, room:', ctx.job.room?.name);

    // 1. Connect to room FIRST (required before any room ops)
    await ctx.connect();
    console.log('[Agent] Connected to room ✅');

    // 2. Parse metadata
    let assistantId = null;
    let userId = null;
    try {
      const jobMeta = JSON.parse(ctx.job.metadata || '{}');
      assistantId = jobMeta.assistantId;
      userId = jobMeta.userId;
      console.log('[Agent] assistantId:', assistantId, 'userId:', userId);
    } catch {
      console.warn('[Agent] Could not parse job metadata');
    }

    // 3. Fetch assistant config
    const assistant = await fetchAssistant(assistantId);
    const firstMessage = assistant?.first_message || DEFAULT_FIRST_MESSAGE;
    const llmModel = assistant?.llm_model || DEFAULT_LLM_MODEL;
    const language = assistant?.language || 'en';
    const assistantName = assistant?.name || 'Assistant';

    console.log(`[Agent] "${assistantName}" | model:${llmModel} | lang:${language}`);

    // 4. RAG context
    let ragContext = '';
    if (assistant?.rag_enabled && assistant?.knowledge_base_ids?.length) {
      ragContext = await searchKnowledgeBase(
        firstMessage,
        assistant.knowledge_base_ids,
        assistant.rag_similarity_threshold || 0.5,
        assistant.rag_max_results || 5,
      );
    }

    // 5. Build pipeline
    const instructions = buildInstructions(assistant, ragContext);
    const sttLang = language.startsWith('hi') ? 'hi' : 'en';

    const agent = new voice.Agent({ instructions });

    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad,
      stt: new openaiPlugin.STT({ model: 'whisper-1', language: sttLang }),
      llm: new openaiPlugin.LLM({ model: llmModel }),
      tts: buildTTS(assistant),
    });

    // 6. Wire state → data channel for frontend visualizer
    session.on('agent_state_changed', async (ev) => {
      const state = ev?.newState ?? ev?.state ?? ev;
      console.log('[Agent] State:', state);
      try {
        const msg = JSON.stringify({ type: 'state', state: String(state) });
        await ctx.room.localParticipant.publishData(
          new TextEncoder().encode(msg),
          { topic: 'agent-state', reliable: true },
        );
      } catch { /* non-fatal */ }
    });

    // 7. Start session with room — Context7 verified pattern
    await session.start({ agent, room: ctx.room });
    console.log('[Agent] Session started ✅');

    // 8. Wait for participant AFTER session.start
    const participant = await ctx.waitForParticipant();
    console.log('[Agent] Participant ready:', participant.identity);

    // 9. Greet
    session.say(firstMessage, { allowInterruptions: true });

    ctx.addShutdownCallback(async () => {
      console.log('[Agent] Shutdown:', ctx.job.room?.name);
    });
  },
});

// ─── Health server (main process only, not forked subprocesses) ───────────────
if (typeof process.send !== 'function') {
  const PORT = process.env.PORT || 8080;
  const healthServer = createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'voicory-agent' }));
  });
  healthServer.listen(PORT, () => console.log(`[Health] HTTP on port ${PORT}`));
  healthServer.on('error', (e) => console.warn('[Health] Error:', e.message));
}

cli.runApp(new WorkerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: 'voicory-agent',
}));
