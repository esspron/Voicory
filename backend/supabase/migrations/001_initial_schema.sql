-- Supabase Initial Schema Migration
-- This creates all necessary tables for the Callyy AI Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- VOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('11labs', 'playht', 'callyy', 'azure')),
    language TEXT NOT NULL,
    accent TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    cost_per_min DECIMAL(10, 2) NOT NULL,
    preview_url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX idx_voices_user_id ON public.voices(user_id);
CREATE INDEX idx_voices_provider ON public.voices(provider);

-- Enable Row Level Security
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voices
CREATE POLICY "Users can view their own voices"
    ON public.voices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voices"
    ON public.voices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voices"
    ON public.voices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voices"
    ON public.voices FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ASSISTANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.assistants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    voice_id UUID REFERENCES public.voices(id) ON DELETE SET NULL,
    transcriber TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_assistants_user_id ON public.assistants(user_id);
CREATE INDEX idx_assistants_voice_id ON public.assistants(voice_id);
CREATE INDEX idx_assistants_status ON public.assistants(status);

-- Enable RLS
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistants
CREATE POLICY "Users can view their own assistants"
    ON public.assistants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assistants"
    ON public.assistants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistants"
    ON public.assistants FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistants"
    ON public.assistants FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- PHONE NUMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('Callyy', 'Twilio', 'Vonage')),
    assistant_id UUID REFERENCES public.assistants(id) ON DELETE SET NULL,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_assistant_id ON public.phone_numbers(assistant_id);

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_numbers
CREATE POLICY "Users can view their own phone numbers"
    ON public.phone_numbers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone numbers"
    ON public.phone_numbers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone numbers"
    ON public.phone_numbers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone numbers"
    ON public.phone_numbers FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('public', 'private')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_type ON public.api_keys(type);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own api keys"
    ON public.api_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own api keys"
    ON public.api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own api keys"
    ON public.api_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api keys"
    ON public.api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- CALLYY CALL LOGS TABLE
-- ============================================
-- Note: Named callyy_call_logs to avoid conflict with existing call_logs table
CREATE TABLE IF NOT EXISTS public.callyy_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    duration TEXT NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'ongoing')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_callyy_call_logs_user_id ON public.callyy_call_logs(user_id);
CREATE INDEX idx_callyy_call_logs_status ON public.callyy_call_logs(status);
CREATE INDEX idx_callyy_call_logs_created_at ON public.callyy_call_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.callyy_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for callyy_call_logs
CREATE POLICY "Users can view their own callyy call logs"
    ON public.callyy_call_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own callyy call logs"
    ON public.callyy_call_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own callyy call logs"
    ON public.callyy_call_logs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own callyy call logs"
    ON public.callyy_call_logs FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_phone_number ON public.customers(phone_number);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view their own customers"
    ON public.customers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
    ON public.customers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
    ON public.customers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
    ON public.customers FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_voices_updated_at BEFORE UPDATE ON public.voices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON public.assistants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON public.phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================
-- Uncomment below to insert sample data for testing
-- Note: Replace 'YOUR_USER_ID' with an actual user ID from auth.users

/*
-- Insert sample voices
INSERT INTO public.voices (name, provider, language, accent, gender, cost_per_min, preview_url, tags, user_id)
VALUES 
    ('Aditi', '11labs', 'Hindi', 'Indian', 'Female', 4.5, 'https://example.com/preview1.wav', ARRAY['Conversational', 'News'], 'YOUR_USER_ID'),
    ('Raj', 'callyy', 'English (India)', 'Indian', 'Male', 3.0, 'https://example.com/preview2.wav', ARRAY['Formal', 'Support'], 'YOUR_USER_ID'),
    ('Priya', 'azure', 'Tamil', 'South Indian', 'Female', 2.0, 'https://example.com/preview3.wav', ARRAY['Narrative'], 'YOUR_USER_ID');
*/
