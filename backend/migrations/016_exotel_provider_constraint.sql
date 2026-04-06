-- Migration 016: Add 'exotel' to phone_numbers provider constraint
-- and add missing webhook_url / status_callback_url columns
-- Required for Exotel BYOK import (VT-11)

-- Drop old constraint and re-create with 'exotel' included
ALTER TABLE public.phone_numbers
DROP CONSTRAINT IF EXISTS phone_numbers_provider_check;

ALTER TABLE public.phone_numbers
ADD CONSTRAINT phone_numbers_provider_check
CHECK (provider IN ('Callyy', 'CallyySIP', 'Twilio', 'Vonage', 'Telnyx', 'BYOSIP', 'exotel'));

-- Add webhook columns if not already present
ALTER TABLE public.phone_numbers
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS status_callback_url TEXT;

-- Add deleted_at for soft-delete support
ALTER TABLE public.phone_numbers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add last_call_at if not present
ALTER TABLE public.phone_numbers
ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ;

-- Exotel-specific columns (in case 015 was not run)
ALTER TABLE public.phone_numbers
ADD COLUMN IF NOT EXISTS exotel_account_sid TEXT,
ADD COLUMN IF NOT EXISTS exotel_api_key TEXT,
ADD COLUMN IF NOT EXISTS exotel_api_token TEXT,
ADD COLUMN IF NOT EXISTS exotel_subdomain TEXT DEFAULT 'ccm-api.in.exotel.com';

-- Index for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_phone_numbers_deleted_at ON public.phone_numbers(deleted_at);

SELECT 'migration 016 complete' AS status;
