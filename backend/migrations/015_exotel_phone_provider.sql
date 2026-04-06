-- Migration 015: Add Exotel provider support to phone_numbers + call_logs
-- Applied: 2026-04-06

-- Add provider field to distinguish Twilio vs Exotel numbers
-- Note: existing constraint updated to include 'exotel' and 'twilio' (lowercase)
ALTER TABLE phone_numbers DROP CONSTRAINT IF EXISTS phone_numbers_provider_check;
ALTER TABLE phone_numbers ADD CONSTRAINT phone_numbers_provider_check
  CHECK (provider IN ('Callyy', 'CallyySIP', 'Twilio', 'Vonage', 'Telnyx', 'BYOSIP', 'exotel', 'twilio'));
ALTER TABLE phone_numbers ALTER COLUMN provider SET DEFAULT 'twilio';

-- Exotel-specific credentials (encrypted)
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS exotel_account_sid TEXT;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS exotel_api_key TEXT;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS exotel_api_token TEXT;
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS exotel_subdomain TEXT DEFAULT 'ccm-api.in.exotel.com';
ALTER TABLE phone_numbers ADD COLUMN IF NOT EXISTS exotel_phone_number TEXT; -- virtual number in Exotel format

-- Add provider to call_logs for analytics
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'twilio';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS from_number TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS to_number TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'inbound';
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS tts_characters INTEGER DEFAULT 0;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS stt_minutes NUMERIC(10,4) DEFAULT 0;

-- Index for Exotel webhook lookup
CREATE INDEX IF NOT EXISTS idx_phone_numbers_exotel ON phone_numbers(exotel_phone_number, user_id) WHERE provider = 'exotel';

-- Index for call_logs provider analytics
CREATE INDEX IF NOT EXISTS idx_call_logs_provider ON call_logs(provider, user_id);

SELECT 'migration 015 complete' AS status;
