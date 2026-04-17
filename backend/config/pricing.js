// AUTO-GENERATED: Last updated 2026-04-08
// Source: openai.com/api/pricing/ (verified April 8 2026)
// MARGIN: Voicory charges 4x provider cost (300% margin) on all AI models
module.exports = {
  openai: {
    // GPT-5.4 family — frontier models (April 2026)
    'gpt-5.4': {
      inputPerToken:  0.0000025,  // $2.50/1M  → Voicory: $10.00/1M
      outputPerToken: 0.000015,   // $15.00/1M → Voicory: $60.00/1M
    },
    'gpt-5.4-mini': {
      inputPerToken:  0.00000075, // $0.75/1M  → Voicory: $3.00/1M
      outputPerToken: 0.0000045,  // $4.50/1M  → Voicory: $18.00/1M
    },
    'gpt-5.4-nano': {
      inputPerToken:  0.0000002,  // $0.20/1M  → Voicory: $0.80/1M
      outputPerToken: 0.00000125, // $1.25/1M  → Voicory: $5.00/1M
    },
    // GPT-4.1 family
    'gpt-4.1': {
      inputPerToken:  0.000002,   // $2.00/1M  → Voicory: $8.00/1M
      outputPerToken: 0.000008,   // $8.00/1M  → Voicory: $32.00/1M
    },
    'gpt-4.1-mini': {
      inputPerToken:  0.0000004,  // $0.40/1M  → Voicory: $1.60/1M
      outputPerToken: 0.0000016,  // $1.60/1M  → Voicory: $6.40/1M
    },
    'gpt-4.1-nano': {
      inputPerToken:  0.0000001,  // $0.10/1M  → Voicory: $0.40/1M
      outputPerToken: 0.0000004,  // $0.40/1M  → Voicory: $1.60/1M
    },
    // GPT-4o family
    'gpt-4o': {
      inputPerToken:  0.0000025,  // $2.50/1M  → Voicory: $10.00/1M
      outputPerToken: 0.00001,    // $10.00/1M → Voicory: $40.00/1M
    },
    'gpt-4o-mini': {
      inputPerToken:  0.00000015, // $0.15/1M  → Voicory: $0.60/1M
      outputPerToken: 0.0000006,  // $0.60/1M  → Voicory: $2.40/1M
    },
    // Reasoning models — use max_completion_tokens, no temperature
    'o4-mini': {
      inputPerToken:  0.0000011,  // $1.10/1M  → Voicory: $4.40/1M
      outputPerToken: 0.0000044,  // $4.40/1M  → Voicory: $17.60/1M
      reasoning: true,
    },
    'o3': {
      inputPerToken:  0.00001,    // $10.00/1M → Voicory: $40.00/1M
      outputPerToken: 0.00004,    // $40.00/1M → Voicory: $160.00/1M
      reasoning: true,
    },
    'o3-mini': {
      inputPerToken:  0.0000011,  // $1.10/1M  → Voicory: $4.40/1M
      outputPerToken: 0.0000044,  // $4.40/1M  → Voicory: $17.60/1M
      reasoning: true,
    },
    'o1': {
      inputPerToken:  0.000015,   // $15.00/1M → Voicory: $60.00/1M
      outputPerToken: 0.00006,    // $60.00/1M → Voicory: $240.00/1M
      reasoning: true,
    },
    'o1-mini': {
      inputPerToken:  0.0000011,  // $1.10/1M  → Voicory: $4.40/1M
      outputPerToken: 0.0000044,  // $4.40/1M  → Voicory: $17.60/1M
      reasoning: true,
    },
    // Legacy
    'gpt-4-turbo': {
      inputPerToken:  0.00001,    // $10.00/1M → Voicory: $40.00/1M
      outputPerToken: 0.00003,    // $30.00/1M → Voicory: $120.00/1M
    },
    'gpt-3.5-turbo': {
      inputPerToken:  0.0000005,  // $0.50/1M  → Voicory: $2.00/1M
      outputPerToken: 0.0000015,  // $1.50/1M  → Voicory: $6.00/1M
    },
    // Audio / Speech models
    'whisper-1': {
      perMinute: 0.006,           // $0.006/min STT
    },
    'tts-1': {
      perCharacter: 0.000015,     // $15/1M chars
    },
    'tts-1-hd': {
      perCharacter: 0.000030,     // $30/1M chars
    },
  },
  // ElevenLabs TTS — verified April 17 2026 from elevenlabs.io/pricing/api
  // Flash/Turbo = eleven_flash_v2, eleven_turbo_v2_5 etc.
  // Multilingual = eleven_multilingual_v2, eleven_multilingual_v3 etc.
  elevenlabs: {
    flash:         { perCharacter: 0.00005  },  // $0.05/1K chars (Flash/Turbo models)
    multilingual:  { perCharacter: 0.0001   },  // $0.10/1K chars (Multilingual v2/v3)
    default:       { perCharacter: 0.00005  },  // default to Flash rate
    // Voicory charge per minute at 4x (assuming ~750 chars/min of AI speech):
    // Flash:        provider $0.038/min → Voicory $0.15/min
    // Multilingual: provider $0.075/min → Voicory $0.30/min
  },
  // Google Cloud TTS — verified April 17 2026 from cloud.google.com/text-to-speech/pricing
  google: {
    'chirp3-hd':   { perCharacter: 0.00003  },  // $0.03/1K chars (Chirp 3 HD)
    default:       { perCharacter: 0.00003  },
    // Voicory charge per minute at 4x (~750 chars/min):
    // Chirp3-HD: provider $0.023/min → Voicory $0.09/min
  },
  livekit: {
    perParticipantMinute: 0.001,
  },
  twilio: {
    perMinuteInbound:  0.0085,
    perMinuteOutbound: 0.013,
    perSms:            0.0079,
  },
  voicory: {
    creditCostUsd:    1.0,   // $1 = 1 credit
    marginMultiplier: 4.0,   // 4x provider cost = 300% margin
    // Per-provider voice rates (charged to user per minute, verified April 17 2026)
    // Includes STT ($0.006/min) + LLM ($0.002/min) + LiveKit ($0.001/min) + TTS (per provider)
    voicePerMinute: {
      openai:      0.08,  // tts-1: provider $0.020/min → 4x = $0.08/min
      openai_hd:   0.12,  // tts-1-hd: provider $0.031/min → 4x = $0.12/min
      elevenlabs:  0.15,  // Flash: provider $0.047/min → 4x = $0.19/min → rounded $0.15/min
      elevenlabs_multilingual: 0.30, // Multilingual v2/v3: provider $0.084/min → 4x = $0.30/min
      google:      0.09,  // Chirp3-HD: provider $0.031/min → 4x = $0.12/min → $0.09/min
      default:     0.15,  // safe fallback
    },
    chatPerMessage:   0.001, // $0.001/msg chat + WhatsApp
  },
};
