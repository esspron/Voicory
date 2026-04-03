// AUTO-GENERATED: Last updated 2026-04-04
// Source: Context7 + official pricing pages (openai.com, elevenlabs.io, livekit.io, twilio.com)
// Review monthly — AI pricing changes frequently
module.exports = {
  openai: {
    'gpt-4o': {
      inputPerToken: 0.0000025,   // $2.50 per 1M tokens
      outputPerToken: 0.000010,   // $10.00 per 1M tokens
    },
    'gpt-4o-mini': {
      inputPerToken: 0.00000015,  // $0.15 per 1M tokens
      outputPerToken: 0.0000006,  // $0.60 per 1M tokens
    },
    'gpt-4-turbo': {
      inputPerToken: 0.00001,     // $10.00 per 1M tokens
      outputPerToken: 0.00003,    // $30.00 per 1M tokens
    },
    'gpt-3.5-turbo': {
      inputPerToken: 0.0000005,   // $0.50 per 1M tokens
      outputPerToken: 0.0000015,  // $1.50 per 1M tokens
    },
    'whisper-1': {
      perMinute: 0.006,           // $0.006 per minute
    },
    'tts-1': {
      perCharacter: 0.000015,     // $15 per 1M chars
    },
    'tts-1-hd': {
      perCharacter: 0.000030,     // $30 per 1M chars
    },
  },
  elevenlabs: {
    starter:  { perCharacter: 0.000030 }, // ~$30 per 1M chars (Starter tier)
    creator:  { perCharacter: 0.000024 },
    pro:      { perCharacter: 0.000018 },
    default:  { perCharacter: 0.000030 },
    // Simplified: ~$0.30 per 1000 chars (Starter tier)
    perCharacter: 0.0003,
  },
  livekit: {
    perParticipantMinute: 0.001,  // ~$0.001/participant-minute (updated from livekit.io/pricing)
  },
  twilio: {
    perMinuteInbound: 0.0085,    // $0.0085/min inbound
    perMinuteOutbound: 0.013,    // $0.013/min outbound
    perSms: 0.0079,              // $0.0079/SMS
  },
  // Voicory pricing to customer
  voicory: {
    creditCostUsd: 1.0,          // $1 = 1 credit
    minutesPerCredit: 20,        // ~20 min per $1 at ~35% margin
    targetMarginPct: 40,         // 40% margin target
    // Cost breakdown per 1 min voice call (estimated):
    //   GPT-4o-mini: ~150 input + ~100 output tokens = ~$0.000083
    //   Whisper-1: $0.006/min
    //   TTS-1: ~500 chars = $0.0075
    //   LiveKit: 2 participants = $0.002/min
    //   Twilio: $0.013/min
    //   Total: ~$0.028/min
    //   At 40% margin: charge $0.047/min → ~21 min per credit
    //   Rounded to 20 min/credit (~35% margin)
    estimatedCostPerMinute: 0.028,
  }
};
