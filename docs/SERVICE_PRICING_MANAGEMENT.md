# 💰 Voicory Service Pricing Management System

## Overview

A comprehensive system to track costs, set selling prices, and monitor margins for all Voicory services. **All prices in USD.**

---

## 📊 Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `service_categories` | Top-level grouping (LLM, TTS, STT, Telephony, WhatsApp, Infrastructure, Payments) |
| `service_pricing` | Unified pricing for ALL services with auto-calculated margins |
| `service_pricing_history` | Automatic audit trail of all price changes |
| `subscription_plans` | Plan tiers with limits and features |

### Auto-Calculated Fields

```sql
-- These are automatically calculated when you update prices:
margin_percent = ((selling_price_usd - provider_cost) / provider_cost) * 100
profit_per_unit_usd = selling_price_usd - provider_cost
```

---

## 🎯 Service Categories

| Category | Icon | Services |
|----------|------|----------|
| **LLM** | Brain | GPT-4o, Claude, Llama, Mistral |
| **TTS** | Microphone | ElevenLabs, OpenAI TTS, Deepgram, Google |
| **STT** | Waveform | Deepgram Nova-2, Whisper, AssemblyAI |
| **Telephony** | Phone | Twilio calls, number rentals |
| **WhatsApp** | WhatsappLogo | Utility, Marketing, Service messages |
| **Infrastructure** | Server | GCP, Vercel, Supabase, Upstash |
| **Payments** | CreditCard | Razorpay, Stripe fees |

---

## 💵 Current Pricing Summary (USD)

### Per-Minute Voice Call Cost (to customer)

| Tier | LLM | TTS | STT | **Total/min** |
|------|-----|-----|-----|---------------|
| **Economy** | Llama 8B | Flash v2.5 | Deepgram Base | ~$0.05/min |
| **Standard** | GPT-4o Mini | Turbo v2.5 | Nova-2 | ~$0.12/min |
| **Premium** | GPT-4o | Multilingual v2 | Nova-2 | ~$0.20/min |

### LLM Pricing (per 1M tokens)

| Model | Provider Cost | Selling Price | Margin |
|-------|---------------|---------------|--------|
| GPT-4o | $2.50 / $10.00 | $7.50 / $30.00 | 200% |
| GPT-4o Mini | $0.15 / $0.60 | $0.45 / $1.80 | 200% |
| Claude 3.5 Sonnet | $3.00 / $15.00 | $9.00 / $45.00 | 200% |
| Llama 3.1 70B | $0.59 / $0.79 | $1.77 / $2.37 | 200% |
| Llama 3.1 8B | $0.05 / $0.08 | $0.15 / $0.24 | 200% |

### TTS Pricing (per minute)

| Provider | Model | Provider Cost | Selling Price | Margin |
|----------|-------|---------------|---------------|--------|
| ElevenLabs | Flash v2.5 | $0.0135 | $0.04 | 196% |
| ElevenLabs | Turbo v2.5 | $0.036 | $0.10 | 178% |
| ElevenLabs | Multilingual v2 | $0.072 | $0.18 | 150% |
| OpenAI | TTS-1 | $0.015 | $0.045 | 200% |
| Deepgram | Aura | $0.015 | $0.045 | 200% |

### STT Pricing (per minute)

| Provider | Model | Provider Cost | Selling Price | Margin |
|----------|-------|---------------|---------------|--------|
| Deepgram | Nova-2 | $0.0059 | $0.018 | 205% |
| Deepgram | Base | $0.0025 | $0.0075 | 200% |
| OpenAI | Whisper | $0.006 | $0.018 | 200% |

### WhatsApp Pricing (per message)

| Type | Meta Cost | Selling Price | Margin |
|------|-----------|---------------|--------|
| Service | $0.0055 | $0.008 | 45% |
| Utility | $0.0042 | $0.006 | 43% |
| Authentication | $0.0034 | $0.005 | 47% |
| Marketing | $0.018 | $0.024 | 33% |

### Telephony - Number Rentals (per month)

| Type | Provider Cost | Selling Price | Margin |
|------|---------------|---------------|--------|
| Indian Local | $4.00 | $8.00 | 100% |
| Indian Toll-Free | $15.00 | $30.00 | 100% |
| US Number | $1.15 | $2.30 | 100% |

---

## 🔧 How to Update Prices

### 1. View Current Pricing
```sql
-- All pricing with margins
SELECT * FROM v_pricing_summary;

-- Per-minute call costs by tier
SELECT * FROM v_per_minute_call_cost;

-- Monthly infrastructure costs
SELECT * FROM v_monthly_infrastructure_cost;
```

### 2. Update a Service Price
```sql
UPDATE service_pricing
SET 
    provider_cost = 3.00,  -- Provider cost in USD
    selling_price_usd = 9.00,  -- Your selling price in USD
    updated_by = 'YOUR_USER_ID'
WHERE service_code = 'llm_claude_sonnet';
```

### 3. Calculate Call Cost
```sql
-- Calculate cost for a 3-minute call with GPT-4o Mini
SELECT * FROM calculate_call_cost(
    180,  -- 3 minutes in seconds
    'gpt-4o-mini',
    'eleven_turbo_v2_5',
    'nova-2',
    500,  -- avg input tokens
    200   -- avg output tokens
);
```

### 4. Get Price for a Service
```sql
SELECT * FROM get_service_price('llm_gpt4o');
```

---

## 📈 Margin Strategy

### Target Margins by Category

| Category | Target Margin | Reason |
|----------|---------------|--------|
| **LLM** | 200% | High competition, volume-based |
| **TTS** | 150-200% | Value-add, premium voices |
| **STT** | 200% | Commodity, compete on accuracy |
| **Telephony** | 100-200% | Carrier dependent |
| **WhatsApp** | 30-50% | Meta pricing is fixed, pass-through |
| **Number Rentals** | 100% | Recurring revenue |

---

## 🗓️ Monthly Fixed Costs (Infrastructure)

| Service | Provider | Monthly (USD) |
|---------|----------|---------------|
| Cloud Run | GCP | $50 |
| Supabase Pro | Supabase | $25 |
| Vercel Pro | Vercel | $20 |
| Upstash Redis | Upstash | $10 |
| Domain + SSL | Cloudflare | $1.50 |
| **Total** | | **$106.50/month** |

---

## 📊 Pricing Model

**Pay As You Go** - No monthly fees, pay only for what you use.

---

## 📋 Quick Queries

```sql
-- Top 10 highest margin services
SELECT service_name, provider, margin_percent, selling_price_usd
FROM v_pricing_summary
WHERE margin_percent IS NOT NULL AND margin_percent > 0
ORDER BY margin_percent DESC
LIMIT 10;

-- Services with margin < 100%
SELECT service_name, provider, margin_percent
FROM v_pricing_summary
WHERE margin_percent > 0 AND margin_percent < 100;

-- Total monthly infrastructure cost
SELECT total_monthly_cost_usd FROM v_monthly_infrastructure_cost;

-- Price history for a service
SELECT * FROM service_pricing_history
WHERE service_pricing_id = (SELECT id FROM service_pricing WHERE service_code = 'llm_gpt4o')
ORDER BY changed_at DESC;

-- Calculate total cost breakdown for a call
SELECT 
    SUM(selling_price_usd) as total_selling,
    SUM(provider_cost_usd) as total_cost,
    SUM(selling_price_usd) - SUM(provider_cost_usd) as profit
FROM calculate_call_cost(60, 'gpt-4o-mini', 'eleven_turbo_v2_5', 'nova-2');
```

---

## 📋 Adding a New Service

```sql
INSERT INTO service_pricing (
    category_id,
    service_code,
    service_name,
    description,
    provider,
    provider_model,
    cost_unit,
    cost_currency,
    provider_cost,
    selling_price_usd,
    pricing_tier,
    tags
) VALUES (
    (SELECT id FROM service_categories WHERE name = 'llm'),
    'llm_new_model',
    'New Model Name',
    'Description of the model',
    'provider_name',
    'model-id',
    'per_1m_tokens_input',
    'USD',
    1.00,  -- Provider cost
    3.00,  -- Your selling price (3x markup)
    'standard',
    ARRAY['provider', 'feature1', 'feature2']
);
```

---

## 🛡️ Security & Access

- **Read Access**: All authenticated users (pricing is public)
- **Write Access**: Service role only (backend admin functions)
- **History**: All changes auto-logged with user ID and timestamp

---

Last Updated: December 2024
