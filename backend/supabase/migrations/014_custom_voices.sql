-- Migration 014: Custom voices table
-- Stores user-cloned ElevenLabs voices

CREATE TABLE IF NOT EXISTS custom_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  gender TEXT DEFAULT 'Neutral',
  elevenlabs_voice_id TEXT NOT NULL,
  preview_url TEXT,
  accent TEXT DEFAULT 'Custom',
  status TEXT DEFAULT 'ready', -- 'ready' | 'processing' | 'error'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE custom_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own custom voices"
  ON custom_voices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS custom_voices_user_id_idx ON custom_voices(user_id);

-- Also ensure assistants table has voice_id column
ALTER TABLE assistants
  ADD COLUMN IF NOT EXISTS voice_id TEXT,
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;
