-- Migration: Add push notification columns to user_profiles
-- Wave 16: Push Notifications

-- Push token for Expo push notifications
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Notification preferences (per-category toggles)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS notification_call_alerts     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notification_whatsapp_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notification_billing_alerts  BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for looking up users by push_token (e.g. sending targeted pushes from backend)
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_token
  ON user_profiles (push_token)
  WHERE push_token IS NOT NULL;
