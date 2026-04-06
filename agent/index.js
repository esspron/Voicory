/**
 * Voicory LiveKit Agent Worker
 * 
 * Runs as a persistent Cloud Run service (min-instances=1).
 * Listens for room dispatch events from LiveKit Cloud, joins rooms,
 * and runs the full STT → LLM → TTS pipeline for "Talk to Assistant" calls.
 * 
 * Flow:
 * 1. User opens "Talk to Assistant" on app.voicory.com
 * 2. Frontend calls POST /api/livekit/token → backend creates room
 * 3. Backend dispatches agent job to this worker
 * 4. Worker joins room, reads participant metadata (assistantId, userId)
 * 5. Worker fetches assistant config from Supabase
 * 6. Worker runs STT→GPT→TTS loop using assistant's voice + system prompt
 */

import {
  defineAgent,
  WorkerOptions,
  cli,
  voice,
} from '@livekit/agents';
import * as openaiPlugin from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// ─── Default assistant config ─────────────────────────────────────────────────
const DEFAULT_INSTRUCTIONS = 'You are a helpful AI assistant. Be concise and friendly.';
const DEFAULT_FIRST_MESSAGE = 'Hello! How can I help you today?';
const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const DEFAULT_VOICE = 'alloy'; // OpenAI TTS voice fallback

// ─── Fetch assistant config from DB ──────────────────────────────────────────
async function fetchAssistant(assistantId) {
  if (!assistantId) return null;
  const { data, error } = await supabase
    .from('assistants')
    .select(`
      id, name, instruction, first_message, llm_model, language,
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

// ─── Build TTS instance based on voice library ────────────────────────────────
function buildTTS(assistant) {
  const voice = assistant?.voices;
  const provider = voice?.tts_provider?.toLowerCase();

  if (provider === 'elevenlabs' && voice?.elevenlabs_voice_id) {
    const modelId = voice.elevenlabs_model_id ||
      assistant.elevenlabs_model_id ||
      'eleven_turbo_v2_5';
    // ElevenLabs via OpenAI-compatible plugin is not available in agents-js
    // Use OpenAI TTS as fallback with provider_voice_id or alloy
    console.log(`[Agent] ElevenLabs voice requested (${voice.name}) — using OpenAI TTS fallback`);
    return new openaiPlugin.TTS({
      model: 'tts-1',
      voice: DEFAULT_VOICE,
    });
  }

  if (provider === 'openai' && voice?.provider_voice_id) {
    return new openaiPlugin.TTS({
      model: 'tts-1-hd',
      voice: voice.provider_voice_id || DEFAULT_VOICE,
    });
  }

  // Default fallback
  return new openaiPlugin.TTS({
    model: 'tts-1',
    voice: DEFAULT_VOICE,
  });
}

// ─── Agent definition ─────────────────────────────────────────────────────────
export default defineAgent({
  prewarm: async (proc) => {
    // Pre-load VAD model so first room join is fast
    proc.userData.vad = await silero.VAD.load();
    console.log('[Agent] VAD model loaded ✅');
  },

  entry: async (ctx) => {
    console.log('[Agent] Job started, room:', ctx.job.room?.name);

    // Wait for user participant
    const participant = await ctx.waitForParticipant();
    console.log('[Agent] Participant joined:', participant.identity);

    // Parse metadata from participant (set by backend token endpoint)
    let assistantId = null;
    let userId = null;
    try {
      const meta = JSON.parse(participant.metadata || ctx.job.metadata || '{}');
      assistantId = meta.assistantId;
      userId = meta.userId;
      console.log('[Agent] assistantId:', assistantId, 'userId:', userId);
    } catch {
      console.warn('[Agent] Failed to parse participant metadata');
    }

    // Fetch assistant config
    const assistant = await fetchAssistant(assistantId);
    const instructions = assistant?.instruction || DEFAULT_INSTRUCTIONS;
    const firstMessage = assistant?.first_message || DEFAULT_FIRST_MESSAGE;
    const llmModel = assistant?.llm_model || DEFAULT_LLM_MODEL;
    const language = assistant?.language || 'en';
    const assistantName = assistant?.name || 'Assistant';

    console.log(`[Agent] Starting session as "${assistantName}" with model ${llmModel}`);

    // Build STT with language support
    const sttLanguage = language === 'hi' || language === 'hi-IN' ? 'hi' : 'en';
    const stt = new openaiPlugin.STT({
      model: 'whisper-1',
      language: sttLanguage,
    });

    // Build LLM
    const llm = new openaiPlugin.LLM({
      model: llmModel,
    });

    // Build TTS from voice library
    const tts = buildTTS(assistant);

    // Create agent
    const agent = new voice.Agent({
      instructions,
    });

    // Create session
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad,
      stt,
      llm,
      tts,
    });

    await session.start({ agent, room: ctx.room });

    // Greet user
    await session.say(firstMessage);

    console.log('[Agent] Session active ✅');

    // Cleanup on shutdown
    ctx.addShutdownCallback(async () => {
      console.log('[Agent] Session ended for room:', ctx.job.room?.name);
    });
  },
});

// Cloud Run requires an HTTP server listening on PORT.
// We run a tiny health check server alongside the LiveKit agent worker.
import { createServer } from 'http';
const PORT = process.env.PORT || 8080;
const healthServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'voicory-agent' }));
});
healthServer.listen(PORT, () => {
  console.log(`[Health] HTTP server listening on port ${PORT}`);
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
