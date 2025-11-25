-- Sample Data for Callyy Dashboard
-- Run this in Supabase SQL Editor AFTER logging in to set auth.uid()
-- This will create demo data associated with your logged-in user

-- ============================================
-- 1. INSERT VOICES
-- ============================================
INSERT INTO voices (name, provider, language, accent, gender, cost_per_min, preview_url, tags, user_id)
VALUES 
  (
    'Aditi - Hindi Female',
    '11labs',
    'Hindi',
    'Indian',
    'Female',
    4.5,
    'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
    ARRAY['Conversational', 'Support', 'News'],
    auth.uid()
  ),
  (
    'Raj - English Male',
    'callyy',
    'English (India)',
    'Indian',
    'Male',
    3.0,
    'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand60.wav',
    ARRAY['Formal', 'Business', 'Support'],
    auth.uid()
  ),
  (
    'Priya - Tamil Female',
    'azure',
    'Tamil',
    'South Indian',
    'Female',
    2.0,
    'https://www2.cs.uic.edu/~i101/SoundFiles/TaDa.wav',
    ARRAY['Narrative', 'Storytelling'],
    auth.uid()
  ),
  (
    'Arjun - English Male',
    'playht',
    'English (India)',
    'Neutral',
    'Male',
    5.0,
    'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav',
    ARRAY['Energetic', 'Sales'],
    auth.uid()
  );

-- ============================================
-- 2. INSERT ASSISTANTS
-- ============================================
-- Get voice IDs first
DO $$
DECLARE
  voice_id_1 UUID;
  voice_id_2 UUID;
  voice_id_3 UUID;
BEGIN
  -- Get voice IDs
  SELECT id INTO voice_id_1 FROM voices WHERE name = 'Aditi - Hindi Female' AND user_id = auth.uid();
  SELECT id INTO voice_id_2 FROM voices WHERE name = 'Raj - English Male' AND user_id = auth.uid();
  SELECT id INTO voice_id_3 FROM voices WHERE name = 'Arjun - English Male' AND user_id = auth.uid();
  
  -- Insert assistants
  INSERT INTO assistants (name, model, voice_id, transcriber, status, user_id)
  VALUES 
    ('Customer Support - Hindi', 'gpt-4o', voice_id_1, 'Deepgram Nova-2', 'active', auth.uid()),
    ('Sales Outbound', 'claude-3.5-sonnet', voice_id_2, 'Deepgram Nova-2', 'active', auth.uid()),
    ('Appointment Booker', 'gpt-3.5-turbo', voice_id_3, 'Deepgram Nova-2', 'inactive', auth.uid());
END $$;

-- ============================================
-- 3. INSERT PHONE NUMBERS
-- ============================================
DO $$
DECLARE
  assistant_id_1 UUID;
  assistant_id_2 UUID;
BEGIN
  -- Get assistant IDs
  SELECT id INTO assistant_id_1 FROM assistants WHERE name = 'Customer Support - Hindi' AND user_id = auth.uid();
  SELECT id INTO assistant_id_2 FROM assistants WHERE name = 'Sales Outbound' AND user_id = auth.uid();
  
  -- Insert phone numbers
  INSERT INTO phone_numbers (number, provider, assistant_id, label, user_id)
  VALUES 
    ('+91 98765 43210', 'Callyy', assistant_id_1, 'Support Line - India', auth.uid()),
    ('+1 415 555 0123', 'Twilio', assistant_id_2, 'US Sales Line', auth.uid());
END $$;

-- ============================================
-- 4. INSERT API KEYS
-- ============================================
INSERT INTO api_keys (label, key, type, user_id)
VALUES 
  ('Production Key', 'callyy_live_7d9f8a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2x1', 'private', auth.uid()),
  ('Frontend Client Key', 'callyy_pub_9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f8z9', 'public', auth.uid());

-- ============================================
-- 5. INSERT CUSTOMERS
-- ============================================
INSERT INTO customers (name, email, phone_number, variables, user_id)
VALUES 
  (
    'Rahul Sharma',
    'rahul.s@example.com',
    '+91 98765 12345',
    '{"plan": "Premium", "last_order_status": "Delivered", "location": "Mumbai", "preferred_language": "Hindi"}'::jsonb,
    auth.uid()
  ),
  (
    'Sneha Patel',
    'sneha.p@example.com',
    '+91 99887 11223',
    '{"plan": "Basic", "preferred_language": "Hindi", "interest": "Personal Loans"}'::jsonb,
    auth.uid()
  ),
  (
    'Amit Verma',
    'amit.v@example.com',
    '+91 88776 33445',
    '{"plan": "Enterprise", "account_manager": "Priya", "industry": "Technology"}'::jsonb,
    auth.uid()
  );

-- ============================================
-- 6. INSERT CALL LOGS
-- ============================================
INSERT INTO callyy_call_logs (assistant_name, phone_number, duration, cost, status, created_at, user_id)
VALUES 
  ('Customer Support - Hindi', '+91 99887 76655', '4m 32s', 12.50, 'completed', NOW() - INTERVAL '5 minutes', auth.uid()),
  ('Sales Outbound', '+91 88776 65544', '0m 45s', 2.10, 'failed', NOW() - INTERVAL '15 minutes', auth.uid()),
  ('Customer Support - Hindi', '+91 77665 54433', '12m 10s', 35.00, 'completed', NOW() - INTERVAL '1 hour', auth.uid()),
  ('Appointment Booker', '+91 66554 43322', '2m 05s', 6.20, 'completed', NOW() - INTERVAL '3 hours', auth.uid()),
  ('Customer Support - Hindi', '+91 99887 76655', '8m 15s', 22.00, 'completed', NOW() - INTERVAL '1 day', auth.uid()),
  ('Sales Outbound', '+1 415 555 9876', '3m 45s', 11.25, 'completed', NOW() - INTERVAL '2 days', auth.uid());

-- ============================================
-- VERIFY DATA
-- ============================================
SELECT 'Voices created: ' || COUNT(*) FROM voices WHERE user_id = auth.uid();
SELECT 'Assistants created: ' || COUNT(*) FROM assistants WHERE user_id = auth.uid();
SELECT 'Phone numbers created: ' || COUNT(*) FROM phone_numbers WHERE user_id = auth.uid();
SELECT 'API keys created: ' || COUNT(*) FROM api_keys WHERE user_id = auth.uid();
SELECT 'Customers created: ' || COUNT(*) FROM customers WHERE user_id = auth.uid();
SELECT 'Call logs created: ' || COUNT(*) FROM callyy_call_logs WHERE user_id = auth.uid();

-- View complete data
SELECT 
  'VOICES' as section,
  json_agg(json_build_object(
    'name', name,
    'provider', provider,
    'language', language
  )) as data
FROM voices WHERE user_id = auth.uid()
UNION ALL
SELECT 
  'ASSISTANTS' as section,
  json_agg(json_build_object(
    'name', name,
    'model', model,
    'status', status
  )) as data
FROM assistants WHERE user_id = auth.uid()
UNION ALL
SELECT 
  'PHONE_NUMBERS' as section,
  json_agg(json_build_object(
    'number', number,
    'provider', provider,
    'label', label
  )) as data
FROM phone_numbers WHERE user_id = auth.uid();
