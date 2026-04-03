# Voicory Pricing Reference

Last updated: 2026-04-04
Source: Context7 + official vendor pricing pages

## AI Service Costs (Per-Unit)

### OpenAI
| Model | Input | Output |
|-------|-------|--------|
| GPT-4o | $2.50/1M tokens | $10.00/1M tokens |
| GPT-4o-mini | $0.15/1M tokens | $0.60/1M tokens |
| Whisper-1 (STT) | $0.006/min | — |
| TTS-1 | $15.00/1M chars | — |
| TTS-1-HD | $30.00/1M chars | — |

### ElevenLabs
| Plan | Cost |
|------|------|
| Starter | ~$0.30/1000 chars |
| Creator | ~$0.24/1000 chars |
| Pro | ~$0.18/1000 chars |

### LiveKit
| Usage | Cost |
|-------|------|
| Participants | ~$0.001/participant-minute |

### Twilio
| Usage | Cost |
|-------|------|
| Inbound calls | $0.0085/min |
| Outbound calls | $0.013/min |
| SMS | $0.0079/message |

## Margin Analysis

### Per 1-Minute Voice Call Breakdown
| Service | Usage | Cost |
|---------|-------|------|
| GPT-4o-mini | ~250 tokens | ~$0.000083 |
| Whisper-1 | 1 minute | $0.006000 |
| TTS-1 | ~500 chars | $0.007500 |
| LiveKit | 2 participants | $0.002000 |
| Twilio outbound | 1 minute | $0.013000 |
| **Total** | | **~$0.028/min** |

### Voicory Customer Pricing
- 1 Credit = $1.00 USD
- All-in cost: ~$0.028/min
- At 40% target margin: charge ~$0.047/min → ~21 minutes per credit
- Recommended pricing: **20 min per credit** (~35% margin)

## Review Schedule
Check and update this file monthly. AI pricing changes frequently.

Official pricing URLs:
- OpenAI: https://openai.com/api/pricing/
- ElevenLabs: https://elevenlabs.io/pricing
- LiveKit: https://livekit.io/pricing
- Twilio: https://www.twilio.com/en-us/voice/pricing
