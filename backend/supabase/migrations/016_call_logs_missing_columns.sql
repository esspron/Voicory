-- Migration: 016_call_logs_missing_columns.sql
-- Created: 2026-04-06
-- Purpose: Add missing columns to call_logs and phone_numbers tables
--   - call_logs: from_number, to_number, phone_number_id, duration_seconds, summary
--   - phone_numbers: last_call_at (updated when a call ends)
-- These columns are referenced in backend/routes/twilio.js but were absent
-- from migration 012, causing silent insert failures.

-- ============================================
-- CALL LOGS — add missing columns
-- ============================================
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS from_number      TEXT,
  ADD COLUMN IF NOT EXISTS to_number        TEXT,
  ADD COLUMN IF NOT EXISTS phone_number_id  UUID REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS summary          TEXT;

-- Index for phone lookup (CRM push, billing)
CREATE INDEX IF NOT EXISTS idx_call_logs_from_number ON public.call_logs(from_number);

-- ============================================
-- PHONE NUMBERS — add last_call_at
-- ============================================
ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ;

COMMENT ON COLUMN public.phone_numbers.last_call_at IS 'Timestamp of the most recent completed call on this number';
