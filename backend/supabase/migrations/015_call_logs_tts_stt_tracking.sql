-- Migration: 015_call_logs_tts_stt_tracking.sql
-- Created: 2026-04-06
-- Purpose: Add TTS character + STT minute tracking columns to call_logs
--   tts_characters: cumulative chars sent to TTS engine per call turn
--   stt_seconds:    cumulative STT seconds (each gather turn ≈ 5s)
-- These enable accurate billing in deductVoiceCost instead of
-- falling back to duration-only estimation.

ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS tts_characters INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stt_seconds    INTEGER DEFAULT 0;

COMMENT ON COLUMN public.call_logs.tts_characters IS 'Cumulative TTS characters synthesised across all gather turns';
COMMENT ON COLUMN public.call_logs.stt_seconds    IS 'Cumulative STT seconds transcribed across all gather turns (each turn ≈ 5s)';
