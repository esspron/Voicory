-- Migration: 001_call_costs
-- Created: 2026-04-04
-- Purpose: Track per-call LLM/TTS/LiveKit costs for P&L analysis

CREATE TABLE IF NOT EXISTS call_costs (
  id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  call_id           text,
  model             text,
  input_tokens      int           DEFAULT 0,
  output_tokens     int           DEFAULT 0,
  llm_cost_usd      numeric(10,6) DEFAULT 0,
  tts_cost_usd      numeric(10,6) DEFAULT 0,
  livekit_cost_usd  numeric(10,6) DEFAULT 0,
  total_cost_usd    numeric(10,6) DEFAULT 0,
  credits_charged   int           DEFAULT 0,
  margin_usd        numeric(10,6) DEFAULT 0,
  created_at        timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_costs_user_id    ON call_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_costs_created_at ON call_costs(created_at);
CREATE INDEX IF NOT EXISTS idx_call_costs_call_id    ON call_costs(call_id);

ALTER TABLE call_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cost records"
  ON call_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON call_costs FOR ALL
  USING (auth.role() = 'service_role');
