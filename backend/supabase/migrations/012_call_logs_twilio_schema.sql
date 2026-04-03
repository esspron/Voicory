-- Migration: 012_call_logs_twilio_schema.sql
-- Created: 2026-04-04
-- Purpose: Create call_logs table for Twilio voice call tracking
-- and add missing columns needed by backend/routes/twilio.js

-- ============================================
-- CALL LOGS TABLE (for Twilio voice calls)
-- ============================================
-- Note: callyy_call_logs is an older display-only table.
-- call_logs is used by twilio.js for real call tracking with
-- conversation history and Twilio CallSid.

CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES public.assistants(id) ON DELETE SET NULL,
    call_sid TEXT,                                    -- Twilio CallSid
    phone_number TEXT,
    direction TEXT DEFAULT 'inbound',
    status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
    duration INTEGER DEFAULT 0,                        -- seconds
    conversation_history JSONB DEFAULT '[]',           -- full conversation turns
    transcript TEXT,
    recording_url TEXT,
    cost DECIMAL(10, 4) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON public.call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON public.call_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for Twilio webhook backend)
CREATE POLICY "Service role full access to call_logs"
    ON public.call_logs
    USING (true)
    WITH CHECK (true);

-- User-level RLS
CREATE POLICY "Users can view their own call logs"
    ON public.call_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call logs"
    ON public.call_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call logs"
    ON public.call_logs FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- ASSISTANTS TABLE — add model column if missing
-- ============================================
ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini';

-- ============================================
-- CALLYY_CALL_LOGS — add missing columns
-- ============================================
ALTER TABLE public.callyy_call_logs ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]';
ALTER TABLE public.callyy_call_logs ADD COLUMN IF NOT EXISTS call_sid TEXT;
