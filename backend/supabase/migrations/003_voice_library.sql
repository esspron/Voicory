-- ============================================
-- VOICE LIBRARY MIGRATION
-- ============================================
-- This migration creates a curated voice library with:
-- 1. Platform-managed voices (not per-user)
-- 2. Sample audio in multiple languages
-- 3. ElevenLabs voice_id for actual TTS during calls
-- ============================================

-- ============================================
-- DROP EXISTING VOICES TABLE (if exists)
-- ============================================
-- Note: This will remove existing voices table and recreate with new schema
-- Backup any existing data before running this migration

DROP TABLE IF EXISTS public.voice_samples CASCADE;
DROP TABLE IF EXISTS public.voices CASCADE;

-- ============================================
-- VOICES TABLE (Platform-Curated Library)
-- ============================================
CREATE TABLE public.voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info (Your branded names)
    name TEXT NOT NULL,
    description TEXT,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Neutral')),
    
    -- ElevenLabs Reference (for actual TTS during calls)
    elevenlabs_voice_id TEXT NOT NULL,
    elevenlabs_model_id TEXT DEFAULT 'eleven_multilingual_v2',
    
    -- Categorization
    accent TEXT NOT NULL DEFAULT 'Indian',
    primary_language TEXT NOT NULL DEFAULT 'Hindi',
    supported_languages TEXT[] DEFAULT ARRAY['Hindi', 'English']::TEXT[],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Voice Settings (defaults for this voice)
    default_stability DECIMAL(3,2) DEFAULT 0.50 CHECK (default_stability >= 0 AND default_stability <= 1),
    default_similarity DECIMAL(3,2) DEFAULT 0.75 CHECK (default_similarity >= 0 AND default_similarity <= 1),
    default_style DECIMAL(3,2) DEFAULT 0.00 CHECK (default_style >= 0 AND default_style <= 1),
    
    -- Pricing (your custom pricing in INR)
    cost_per_min DECIMAL(10, 2) NOT NULL DEFAULT 3.00,
    
    -- Status & Display
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE public.voices IS 'Platform-curated voice library. Each voice maps to an ElevenLabs voice_id.';
COMMENT ON COLUMN public.voices.elevenlabs_voice_id IS 'The voice_id from ElevenLabs used for actual TTS during calls';
COMMENT ON COLUMN public.voices.cost_per_min IS 'Platform pricing in INR per minute';

-- Indexes for common queries
CREATE INDEX idx_voices_gender ON public.voices(gender);
CREATE INDEX idx_voices_accent ON public.voices(accent);
CREATE INDEX idx_voices_primary_language ON public.voices(primary_language);
CREATE INDEX idx_voices_is_active ON public.voices(is_active);
CREATE INDEX idx_voices_is_featured ON public.voices(is_featured);
CREATE INDEX idx_voices_display_order ON public.voices(display_order);

-- ============================================
-- VOICE SAMPLES TABLE (Audio in Different Languages)
-- ============================================
CREATE TABLE public.voice_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voice_id UUID NOT NULL REFERENCES public.voices(id) ON DELETE CASCADE,
    
    -- Sample Info
    language TEXT NOT NULL,
    sample_text TEXT,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 5,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.voice_samples IS 'Pre-recorded MP3 samples for each voice in different languages';
COMMENT ON COLUMN public.voice_samples.audio_url IS 'URL to MP3 file in Supabase Storage';

-- Indexes
CREATE INDEX idx_voice_samples_voice_id ON public.voice_samples(voice_id);
CREATE INDEX idx_voice_samples_language ON public.voice_samples(language);

-- Unique constraint: one sample per voice per language
CREATE UNIQUE INDEX idx_voice_samples_unique ON public.voice_samples(voice_id, language);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on voices
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

-- All authenticated users can READ active voices
CREATE POLICY "Anyone can view active voices"
    ON public.voices FOR SELECT
    USING (is_active = true);

-- Enable RLS on voice_samples
ALTER TABLE public.voice_samples ENABLE ROW LEVEL SECURITY;

-- All authenticated users can READ voice samples
CREATE POLICY "Anyone can view voice samples"
    ON public.voice_samples FOR SELECT
    USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_voices_updated_at 
    BEFORE UPDATE ON public.voices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR VOICE SAMPLES
-- ============================================
-- Run this in Supabase SQL Editor or via API:
-- 
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('voice-samples', 'voice-samples', true);
--
-- -- Allow public read access
-- CREATE POLICY "Public Access"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'voice-samples');

-- ============================================
-- SEED DATA (Sample Voices)
-- ============================================
-- Add some initial voices for testing
-- Replace elevenlabs_voice_id with actual IDs from your ElevenLabs account

INSERT INTO public.voices (name, description, gender, elevenlabs_voice_id, accent, primary_language, supported_languages, tags, cost_per_min, is_featured, display_order)
VALUES 
    (
        'Aditi',
        'Warm and friendly female voice, perfect for customer support and conversational AI.',
        'Female',
        'EXAVITQu4vr4xnSDxMaL',  -- Replace with actual ElevenLabs voice_id
        'Indian',
        'Hindi',
        ARRAY['Hindi', 'English', 'Tamil', 'Telugu']::TEXT[],
        ARRAY['Conversational', 'Warm', 'Support']::TEXT[],
        4.50,
        true,
        1
    ),
    (
        'Raj',
        'Professional male voice with clear articulation, ideal for business communications.',
        'Male',
        'ErXwobaYiN019PkySvjV',  -- Replace with actual ElevenLabs voice_id
        'Indian',
        'English',
        ARRAY['English', 'Hindi']::TEXT[],
        ARRAY['Professional', 'Clear', 'Business']::TEXT[],
        3.50,
        true,
        2
    ),
    (
        'Priya',
        'Calm and soothing female voice, great for IVR and informational content.',
        'Female',
        'MF3mGyEYCl7XYWbV9V6O',  -- Replace with actual ElevenLabs voice_id
        'South Indian',
        'Tamil',
        ARRAY['Tamil', 'English', 'Hindi']::TEXT[],
        ARRAY['Calm', 'Narrative', 'IVR']::TEXT[],
        4.00,
        true,
        3
    ),
    (
        'Arjun',
        'Authoritative male voice with strong presence, suitable for news and announcements.',
        'Male',
        'VR6AewLTigWG4xSOukaG',  -- Replace with actual ElevenLabs voice_id
        'Indian',
        'Hindi',
        ARRAY['Hindi', 'English']::TEXT[],
        ARRAY['Authoritative', 'News', 'Formal']::TEXT[],
        3.00,
        false,
        4
    ),
    (
        'Meera',
        'Energetic and youthful female voice, perfect for marketing and sales.',
        'Female',
        'jBpfuIE2acCO8z3wKNLl',  -- Replace with actual ElevenLabs voice_id
        'Indian',
        'Hindi',
        ARRAY['Hindi', 'English', 'Marathi']::TEXT[],
        ARRAY['Energetic', 'Marketing', 'Sales']::TEXT[],
        4.00,
        false,
        5
    ),
    (
        'Vikram',
        'Deep and reassuring male voice, excellent for healthcare and finance.',
        'Male',
        'onwK4e9ZLuTAKqWW03F9',  -- Replace with actual ElevenLabs voice_id
        'Indian',
        'English',
        ARRAY['English', 'Hindi']::TEXT[],
        ARRAY['Reassuring', 'Healthcare', 'Finance']::TEXT[],
        3.50,
        false,
        6
    );

-- Insert sample audio URLs (placeholder - replace with actual URLs after uploading MP3s)
-- You'll need to upload MP3 files to Supabase Storage first, then update these URLs

INSERT INTO public.voice_samples (voice_id, language, sample_text, audio_url, duration_seconds)
SELECT 
    v.id,
    'Hindi',
    'नमस्ते! Callyy में आपका स्वागत है। मैं आपके किसी भी सवाल में मदद के लिए यहाँ हूँ।',
    'https://your-supabase-url.supabase.co/storage/v1/object/public/voice-samples/' || v.id || '_hindi.mp3',
    5
FROM public.voices v;

INSERT INTO public.voice_samples (voice_id, language, sample_text, audio_url, duration_seconds)
SELECT 
    v.id,
    'English',
    'Hello! Welcome to Callyy. I am here to help you with any questions you might have.',
    'https://your-supabase-url.supabase.co/storage/v1/object/public/voice-samples/' || v.id || '_english.mp3',
    5
FROM public.voices v;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:
--
-- SELECT * FROM public.voices;
-- SELECT v.name, vs.language, vs.audio_url FROM public.voices v JOIN public.voice_samples vs ON v.id = vs.voice_id;
