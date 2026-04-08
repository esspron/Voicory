// AUTO-GENERATED: Last updated 2026-04-08
// Source: OpenAI pricing page + Context7 (reviewed monthly — AI pricing changes frequently)
module.exports = {
  openai: {
    // GPT-5.4 family (latest frontier — April 2026)
    'gpt-5.4': {
      inputPerToken:  0.0000025,  // $2.50/1M
      outputPerToken: 0.000015,   // $15.00/1M
    },
    'gpt-5.4-mini': {
      inputPerToken:  0.00000075, // $0.75/1M
      outputPerToken: 0.0000045,  // $4.50/1M
    },
    'gpt-5.4-nano': {
      inputPerToken:  0.0000002,  // $0.20/1M
      outputPerToken: 0.00000125, // $1.25/1M
    },
    // GPT-4.1 family
    'gpt-4.1': {
      inputPerToken:  0.000002,   // $2.00/1M
      outputPerToken: 0.000008,   // $8.00/1M
    },
    'gpt-4.1-mini': {
      inputPerToken:  0.0000004,  // $0.40/1M
      outputPerToken: 0.0000016,  // $1.60/1M
    },
    'gpt-4.1-nano': {
      inputPerToken:  0.0000001,  // $0.10/1M
      outputPerToken: 0.0000004,  // $0.40/1M
    },
    // GPT-4o family
    'gpt-4o': {
      inputPerToken:  0.0000025,  // $2.50/1M
      outputPerToken: 0.00001,    // $10.00/1M
    },
    'gpt-4o-mini': {
      inputPerToken:  0.00000015, // $0.15/1M
      outputPerToken: 0.0000006,  // $0.60/1M
    },
    // Reasoning models — use max_completion_tokens, no temperature
    'o4-mini': {
      inputPerToken:  0.0000011,  // $1.10/1M
      outputPerToken: 0.0000044,  // $4.40/1M
      reasoning: true,
    },
    'o3': {
      inputPerToken:  0.00001,    // $10.00/1M
      outputPerToken: 0.00004,    // $40.00/1M
      reasoning: true,
    },
    'o3-mini': {
      inputPerToken:  0.0000011,  // $1.10/1M
      outputPerToken: 0.0000044,  // $4.40/1M
      reasoning: true,
    },
    'o1': {
      inputPerToken:  0.000015,   // $15.00/1M
      outputPerToken: 0.00006,    // $60.00/1M
      reasoning: true,
    },
    'o1-mini': {
      inputPerToken:  0.0000011,  // $1.10/1M
      outputPerToken: 0.0000044,  // $4.40/1M
      reasoning: true,
    },
    // Legacy
    'gpt-4-turbo': {
      inputPerToken:  0.00001,    // $10.00/1M
      outputPerToken: 0.00003,    // $30.00/1M
    },
    'gpt-3.5-turbo': {
      inputPerToken:  0.0000005,  // $0.50/1M
      outputPerToken: 0.0000015,  // $1.50/1M
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
  elevenlabs: {
    starter:     { perCharacter: 0.000030 },
    creator:     { perCharacter: 0.000024 },
    pro:         { perCharacter: 0.000018 },
    default:     { perCharacter: 0.000030 },
    perCharacter: 0.0003,
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
    creditCostUsd:        1.0,    // $1 = 1 credit (100 credits = $1.00)
    targetMarginPct:      40,     // 40% margin on all AI costs
    // Canonical channel pricing (per SOUL.md):
    voicePerMinute:       0.03,   // $0.03/min voice
    chatPerMessage:       0.001,  // $0.001/msg chat + WhatsApp
  },
};
