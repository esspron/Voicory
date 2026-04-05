-- Migration 014: Add logo_url column to user_profiles
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Also: create Supabase Storage bucket 'logos' (public) via Dashboard → Storage → New Bucket
-- Bucket name: logos, Public: true
