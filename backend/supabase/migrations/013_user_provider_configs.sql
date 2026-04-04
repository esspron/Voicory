-- Migration 013: user_provider_configs
-- Stores per-user provider credentials for non-CRM integrations
-- (Voice, Model, Tool, Storage, etc.)

CREATE TABLE IF NOT EXISTS user_provider_configs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider       TEXT NOT NULL,
  api_key        TEXT,
  api_secret     TEXT,
  webhook_url    TEXT,
  extra_config   JSONB DEFAULT '{}'::jsonb,
  is_connected   BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS
ALTER TABLE user_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own provider configs"
  ON user_provider_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_provider_configs_user_provider
  ON user_provider_configs(user_id, provider);

COMMENT ON TABLE user_provider_configs IS
  'Stores per-user third-party provider credentials (non-CRM integrations).';
