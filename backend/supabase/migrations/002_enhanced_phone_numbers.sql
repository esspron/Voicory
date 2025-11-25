-- Enhanced Phone Numbers Migration
-- Adds support for all provider types and their specific configurations

-- First, update the provider constraint to include all provider types
ALTER TABLE public.phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_provider_check;

ALTER TABLE public.phone_numbers 
ADD CONSTRAINT phone_numbers_provider_check 
CHECK (provider IN ('Callyy', 'CallyySIP', 'Twilio', 'Vonage', 'Telnyx', 'BYOSIP'));

-- Add new columns for enhanced phone number functionality

-- For Free Callyy Number (area code support)
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS area_code TEXT;

-- For Free Callyy SIP
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS sip_identifier TEXT,
ADD COLUMN IF NOT EXISTS sip_label TEXT,
ADD COLUMN IF NOT EXISTS sip_username TEXT,
ADD COLUMN IF NOT EXISTS sip_password TEXT;

-- For Twilio Import
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT,
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;

-- For Vonage Import
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS vonage_phone_number TEXT,
ADD COLUMN IF NOT EXISTS vonage_api_key TEXT,
ADD COLUMN IF NOT EXISTS vonage_api_secret TEXT;

-- For Telnyx Import
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS telnyx_phone_number TEXT,
ADD COLUMN IF NOT EXISTS telnyx_api_key TEXT;

-- For BYO SIP Trunk Number
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS sip_trunk_phone_number TEXT,
ADD COLUMN IF NOT EXISTS sip_trunk_credential_id UUID,
ADD COLUMN IF NOT EXISTS allow_non_e164 BOOLEAN DEFAULT false;

-- Common fields for all providers
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS inbound_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS outbound_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_provider ON public.phone_numbers(provider);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_is_active ON public.phone_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_area_code ON public.phone_numbers(area_code);

-- Add comments for documentation
COMMENT ON COLUMN public.phone_numbers.provider IS 'Phone number provider: Callyy (free number), CallyySIP (free SIP), Twilio, Vonage, Telnyx, or BYOSIP (bring your own SIP trunk)';
COMMENT ON COLUMN public.phone_numbers.area_code IS 'Area code for Free Callyy Numbers (e.g., 346, 984, 326)';
COMMENT ON COLUMN public.phone_numbers.sip_identifier IS 'SIP identifier for Free Callyy SIP (used as sip:identifier@sip.callyy.ai)';
COMMENT ON COLUMN public.phone_numbers.sip_label IS 'Label for SIP URI';
COMMENT ON COLUMN public.phone_numbers.twilio_phone_number IS 'Phone number from Twilio';
COMMENT ON COLUMN public.phone_numbers.twilio_account_sid IS 'Twilio Account SID';
COMMENT ON COLUMN public.phone_numbers.twilio_auth_token IS 'Twilio Auth Token (encrypted recommended)';
COMMENT ON COLUMN public.phone_numbers.sms_enabled IS 'Whether SMS messaging is enabled for Twilio numbers';
COMMENT ON COLUMN public.phone_numbers.vonage_phone_number IS 'Phone number from Vonage';
COMMENT ON COLUMN public.phone_numbers.vonage_api_key IS 'Vonage API Key';
COMMENT ON COLUMN public.phone_numbers.vonage_api_secret IS 'Vonage API Secret (encrypted recommended)';
COMMENT ON COLUMN public.phone_numbers.telnyx_phone_number IS 'Phone number from Telnyx';
COMMENT ON COLUMN public.phone_numbers.telnyx_api_key IS 'Telnyx API Key (encrypted recommended)';
COMMENT ON COLUMN public.phone_numbers.sip_trunk_phone_number IS 'Phone number for BYO SIP Trunk';
COMMENT ON COLUMN public.phone_numbers.sip_trunk_credential_id IS 'Reference to SIP trunk credential';
COMMENT ON COLUMN public.phone_numbers.allow_non_e164 IS 'Allow non-E164 phone number formats';
COMMENT ON COLUMN public.phone_numbers.inbound_enabled IS 'Whether inbound calls are enabled';
COMMENT ON COLUMN public.phone_numbers.outbound_enabled IS 'Whether outbound calls are enabled';
COMMENT ON COLUMN public.phone_numbers.is_active IS 'Whether the phone number is currently active';

-- Optional: Create a separate table for SIP trunk credentials (more secure)
CREATE TABLE IF NOT EXISTS public.sip_trunk_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sip_trunk_uri TEXT NOT NULL,
    username TEXT,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for SIP credentials
CREATE INDEX IF NOT EXISTS idx_sip_trunk_credentials_user_id ON public.sip_trunk_credentials(user_id);

-- Enable RLS for SIP trunk credentials
ALTER TABLE public.sip_trunk_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sip_trunk_credentials
CREATE POLICY "Users can view their own SIP credentials"
    ON public.sip_trunk_credentials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SIP credentials"
    ON public.sip_trunk_credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SIP credentials"
    ON public.sip_trunk_credentials FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SIP credentials"
    ON public.sip_trunk_credentials FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sip_trunk_credentials_updated_at 
BEFORE UPDATE ON public.sip_trunk_credentials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
