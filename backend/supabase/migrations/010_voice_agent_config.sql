-- ============================================
-- MIGRATION: Voice Agent Configuration
-- LiveKit-style real-time voice agent settings
-- ============================================

-- Voice Agent Configuration Table
-- Stores advanced voice agent settings per assistant
CREATE TABLE IF NOT EXISTS public.voice_agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL UNIQUE REFERENCES public.assistants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- ===== STT (Speech-to-Text) Settings =====
    stt_provider TEXT NOT NULL DEFAULT 'deepgram' CHECK (stt_provider IN ('deepgram', 'whisper', 'assemblyai', 'google')),
    stt_model TEXT DEFAULT 'nova-2',                    -- Deepgram: nova-2, nova, enhanced, base
    stt_language TEXT DEFAULT 'en',                     -- Primary STT language
    stt_interim_results BOOLEAN DEFAULT TRUE,           -- Enable partial transcripts
    stt_endpointing_ms INTEGER DEFAULT 400,             -- Silence duration to end utterance (ms)
    stt_utterance_end_ms INTEGER DEFAULT 1000,          -- Max silence before forced end
    stt_keywords TEXT[] DEFAULT '{}',                   -- Boost recognition of these words
    stt_smart_format BOOLEAN DEFAULT TRUE,              -- Auto-format numbers, dates, etc.
    
    -- ===== LLM (Language Model) Settings =====
    llm_provider TEXT NOT NULL DEFAULT 'openai' CHECK (llm_provider IN ('openai', 'anthropic', 'groq', 'together', 'fireworks')),
    llm_model TEXT DEFAULT 'gpt-4o',
    llm_temperature NUMERIC(3,2) DEFAULT 0.70 CHECK (llm_temperature >= 0 AND llm_temperature <= 2),
    llm_max_tokens INTEGER DEFAULT 300,                 -- Lower for faster responses
    llm_streaming BOOLEAN DEFAULT TRUE,
    llm_first_response_filler TEXT,                     -- e.g., "Let me think..." while processing
    
    -- ===== TTS (Text-to-Speech) Settings =====
    tts_provider TEXT NOT NULL DEFAULT 'elevenlabs' CHECK (tts_provider IN ('elevenlabs', 'deepgram', 'cartesia', 'openai', 'azure')),
    tts_voice_id TEXT,                                  -- Provider-specific voice ID
    tts_model TEXT DEFAULT 'eleven_turbo_v2_5',         -- eleven_multilingual_v2, eleven_turbo_v2_5, eleven_flash_v2_5
    tts_stability NUMERIC(3,2) DEFAULT 0.50,
    tts_similarity_boost NUMERIC(3,2) DEFAULT 0.75,
    tts_style NUMERIC(3,2) DEFAULT 0.00,
    tts_speaking_rate NUMERIC(3,2) DEFAULT 1.00,        -- Speed multiplier
    tts_chunk_length INTEGER DEFAULT 100,               -- Chars per TTS chunk for streaming
    
    -- ===== VAD (Voice Activity Detection) =====
    vad_enabled BOOLEAN DEFAULT TRUE,
    vad_threshold NUMERIC(3,2) DEFAULT 0.50,            -- Voice detection sensitivity (0-1)
    vad_min_speech_duration_ms INTEGER DEFAULT 200,     -- Min speech to trigger (avoid coughs)
    vad_silence_duration_ms INTEGER DEFAULT 500,        -- Silence to consider end of speech
    vad_padding_ms INTEGER DEFAULT 300,                 -- Audio padding around detected speech
    
    -- ===== Interruption (Barge-In) Settings =====
    interruption_enabled BOOLEAN DEFAULT TRUE,
    interruption_threshold_ms INTEGER DEFAULT 200,      -- Min user speech to interrupt bot
    interruption_cancel_pending BOOLEAN DEFAULT TRUE,   -- Cancel pending TTS on interrupt
    interruption_min_words INTEGER DEFAULT 1,           -- Min transcribed words to interrupt
    
    -- ===== Turn-Taking Settings =====
    turn_detection_mode TEXT DEFAULT 'server_vad' CHECK (turn_detection_mode IN ('server_vad', 'client_vad', 'push_to_talk', 'semantic')),
    turn_end_silence_ms INTEGER DEFAULT 700,            -- Silence duration to end turn
    turn_prefix_padding_ms INTEGER DEFAULT 200,         -- Audio before VAD detection
    turn_max_duration_ms INTEGER DEFAULT 30000,         -- Max turn duration (30s)
    
    -- ===== Latency Optimization =====
    optimistic_stt BOOLEAN DEFAULT TRUE,                -- Start STT before VAD confirms speech
    sentence_splitting BOOLEAN DEFAULT TRUE,            -- Split sentences for faster TTS start
    sentence_split_chars TEXT DEFAULT '.,!?;:',         -- Characters to split on
    parallel_processing BOOLEAN DEFAULT TRUE,           -- Process STT/LLM/TTS in parallel
    audio_buffer_size_ms INTEGER DEFAULT 200,           -- Jitter buffer size
    
    -- ===== Audio Settings =====
    input_sample_rate INTEGER DEFAULT 16000,            -- Input audio sample rate (Hz)
    output_sample_rate INTEGER DEFAULT 24000,           -- Output audio sample rate (Hz)
    audio_encoding TEXT DEFAULT 'pcm_s16le' CHECK (audio_encoding IN ('pcm_s16le', 'pcm_f32le', 'opus', 'mulaw')),
    input_channels INTEGER DEFAULT 1,                   -- Mono input
    output_channels INTEGER DEFAULT 1,                  -- Mono output
    noise_suppression BOOLEAN DEFAULT TRUE,
    echo_cancellation BOOLEAN DEFAULT TRUE,
    auto_gain_control BOOLEAN DEFAULT TRUE,
    
    -- ===== Transport Settings =====
    transport_type TEXT DEFAULT 'websocket' CHECK (transport_type IN ('websocket', 'webrtc', 'twilio_media_stream')),
    connection_timeout_ms INTEGER DEFAULT 30000,
    ping_interval_ms INTEGER DEFAULT 10000,
    max_reconnect_attempts INTEGER DEFAULT 3,
    
    -- ===== Session Settings =====
    max_session_duration_ms INTEGER DEFAULT 3600000,    -- 1 hour max
    idle_timeout_ms INTEGER DEFAULT 60000,              -- Disconnect after 60s idle
    greeting_enabled BOOLEAN DEFAULT TRUE,
    greeting_delay_ms INTEGER DEFAULT 500,              -- Delay before greeting
    farewell_enabled BOOLEAN DEFAULT TRUE,
    farewell_phrase TEXT DEFAULT 'Goodbye! Have a great day.',
    
    -- ===== Metrics & Debugging =====
    enable_metrics BOOLEAN DEFAULT TRUE,
    enable_debug_audio BOOLEAN DEFAULT FALSE,           -- Save audio for debugging
    log_transcripts BOOLEAN DEFAULT TRUE,
    
    -- ===== Metadata =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_agent_config_assistant ON voice_agent_config(assistant_id);
CREATE INDEX IF NOT EXISTS idx_voice_agent_config_user ON voice_agent_config(user_id);

-- Enable RLS
ALTER TABLE public.voice_agent_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own voice agent configs"
    ON public.voice_agent_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice agent configs"
    ON public.voice_agent_config FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice agent configs"
    ON public.voice_agent_config FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice agent configs"
    ON public.voice_agent_config FOR DELETE
    USING (auth.uid() = user_id);

-- Voice Call Sessions Table (tracks active/completed voice sessions)
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES public.phone_numbers(id),
    customer_id UUID REFERENCES public.customers(id),
    
    -- Session Info
    session_type TEXT NOT NULL DEFAULT 'inbound' CHECK (session_type IN ('inbound', 'outbound', 'widget', 'test')),
    transport TEXT NOT NULL DEFAULT 'websocket' CHECK (transport IN ('websocket', 'webrtc', 'twilio')),
    status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'connected', 'speaking', 'listening', 'processing', 'ended', 'failed')),
    
    -- Call Details
    from_number TEXT,
    to_number TEXT,
    twilio_call_sid TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Metrics
    total_user_speech_ms INTEGER DEFAULT 0,
    total_agent_speech_ms INTEGER DEFAULT 0,
    total_silence_ms INTEGER DEFAULT 0,
    turn_count INTEGER DEFAULT 0,
    interruption_count INTEGER DEFAULT 0,
    
    -- Latency Metrics
    avg_stt_latency_ms INTEGER,
    avg_llm_latency_ms INTEGER,
    avg_tts_latency_ms INTEGER,
    avg_total_latency_ms INTEGER,                       -- Time from user stop speaking to bot start speaking
    
    -- Quality Metrics
    stt_confidence_avg NUMERIC(4,3),
    audio_quality_score NUMERIC(4,3),
    
    -- Transcript
    transcript JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    sentiment TEXT CHECK (sentiment IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
    
    -- Error Tracking
    error_code TEXT,
    error_message TEXT,
    
    -- Cost Tracking
    stt_cost_inr NUMERIC(10,4) DEFAULT 0,
    llm_cost_inr NUMERIC(10,4) DEFAULT 0,
    tts_cost_inr NUMERIC(10,4) DEFAULT 0,
    telephony_cost_inr NUMERIC(10,4) DEFAULT 0,
    total_cost_inr NUMERIC(10,4) DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voice sessions
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_assistant ON voice_sessions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_started ON voice_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_sessions
CREATE POLICY "Users can view own voice sessions"
    ON public.voice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice sessions"
    ON public.voice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice sessions"
    ON public.voice_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_voice_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_agent_config_updated_at
    BEFORE UPDATE ON voice_agent_config
    FOR EACH ROW EXECUTE FUNCTION update_voice_agent_updated_at();

CREATE TRIGGER voice_sessions_updated_at
    BEFORE UPDATE ON voice_sessions
    FOR EACH ROW EXECUTE FUNCTION update_voice_agent_updated_at();

-- Function to get voice agent config with defaults
CREATE OR REPLACE FUNCTION get_voice_agent_config(p_assistant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_record RECORD;
    voice_record RECORD;
    assistant_record RECORD;
BEGIN
    -- Get assistant details
    SELECT * INTO assistant_record
    FROM assistants
    WHERE id = p_assistant_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Get voice config (or use defaults)
    SELECT * INTO config_record
    FROM voice_agent_config
    WHERE assistant_id = p_assistant_id;
    
    -- Get voice details if voice_id is set
    IF assistant_record.voice_id IS NOT NULL THEN
        SELECT * INTO voice_record
        FROM voices
        WHERE id = assistant_record.voice_id;
    END IF;
    
    -- Return merged config
    RETURN jsonb_build_object(
        'assistant_id', p_assistant_id,
        'assistant_name', assistant_record.name,
        'instruction', assistant_record.instruction,
        'voice', CASE WHEN voice_record IS NOT NULL THEN jsonb_build_object(
            'id', voice_record.id,
            'name', voice_record.name,
            'elevenlabs_voice_id', voice_record.elevenlabs_voice_id,
            'elevenlabs_model_id', voice_record.elevenlabs_model_id,
            'default_stability', voice_record.default_stability,
            'default_similarity', voice_record.default_similarity
        ) ELSE NULL END,
        'config', CASE WHEN config_record IS NOT NULL THEN to_jsonb(config_record) 
            ELSE jsonb_build_object(
                'stt_provider', 'deepgram',
                'stt_model', 'nova-2',
                'llm_provider', COALESCE(assistant_record.llm_provider, 'openai'),
                'llm_model', COALESCE(assistant_record.llm_model, 'gpt-4o'),
                'tts_provider', 'elevenlabs',
                'tts_model', COALESCE(assistant_record.elevenlabs_model_id, 'eleven_turbo_v2_5'),
                'interruption_enabled', true,
                'vad_enabled', true
            ) END
    );
END;
$$;

-- Comment on table
COMMENT ON TABLE public.voice_agent_config IS 'LiveKit-style voice agent configuration for real-time voice AI';
COMMENT ON TABLE public.voice_sessions IS 'Tracks active and completed real-time voice sessions';
