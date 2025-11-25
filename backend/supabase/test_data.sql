-- Phone Numbers Test Data
-- This file contains sample data for testing the phone numbers feature
-- Run this AFTER applying the main migration (002_enhanced_phone_numbers.sql)
-- Replace 'YOUR_USER_ID' with an actual user ID from auth.users table

-- ============================================
-- STEP 1: Find your user ID
-- ============================================
-- Run this query to get your user ID:
-- SELECT id, email FROM auth.users;
-- Copy the ID and replace 'YOUR_USER_ID' below

-- ============================================
-- STEP 2: Insert SIP Trunk Credentials (for BYO SIP)
-- ============================================
INSERT INTO public.sip_trunk_credentials (name, sip_trunk_uri, username, password, user_id)
VALUES 
    ('Production SIP Trunk', 'sip:trunk.example.com:5060', 'sipuser1', 'sippass123', 'YOUR_USER_ID'),
    ('Backup SIP Trunk', 'sip:backup.example.com:5060', 'sipuser2', 'sippass456', 'YOUR_USER_ID');

-- ============================================
-- STEP 3: Insert Sample Phone Numbers
-- ============================================

-- Free Callyy Number (with area code)
INSERT INTO public.phone_numbers 
(number, provider, area_code, label, inbound_enabled, outbound_enabled, is_active, user_id)
VALUES 
('+1346XXXXXXX', 'Callyy', '346', 'Support Line', true, false, true, 'YOUR_USER_ID'),
('+1984XXXXXXX', 'Callyy', '984', 'Sales Line', true, false, true, 'YOUR_USER_ID');

-- Free Callyy SIP
INSERT INTO public.phone_numbers 
(number, provider, sip_identifier, sip_label, sip_username, sip_password, label, inbound_enabled, outbound_enabled, is_active, user_id)
VALUES 
('sip:support@sip.callyy.ai', 'CallyySIP', 'support', 'Support SIP URI', 'support_user', 'pass123', 'Support SIP', true, true, true, 'YOUR_USER_ID'),
('sip:sales@sip.callyy.ai', 'CallyySIP', 'sales', 'Sales SIP URI', NULL, NULL, 'Sales SIP (No Auth)', true, true, true, 'YOUR_USER_ID');

-- Twilio Number
INSERT INTO public.phone_numbers 
(number, provider, twilio_phone_number, twilio_account_sid, twilio_auth_token, sms_enabled, label, inbound_enabled, outbound_enabled, is_active, user_id)
VALUES 
('+14155551234', 'Twilio', '+14155551234', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'auth_token_here', true, 'Main Twilio Line', true, true, true, 'YOUR_USER_ID'),
('+14155555678', 'Twilio', '+14155555678', 'ACyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy', 'auth_token_here_2', false, 'Customer Service', true, true, true, 'YOUR_USER_ID');

-- Vonage Number
INSERT INTO public.phone_numbers 
(number, provider, vonage_phone_number, vonage_api_key, vonage_api_secret, label, inbound_enabled, outbound_enabled, is_active, user_id)
VALUES 
('+14157891234', 'Vonage', '+14157891234', 'vonage_key_123', 'vonage_secret_456', 'Vonage Line', true, true, true, 'YOUR_USER_ID');

-- Telnyx Number
INSERT INTO public.phone_numbers 
(number, provider, telnyx_phone_number, telnyx_api_key, label, inbound_enabled, outbound_enabled, is_active, user_id)
VALUES 
('+14158765432', 'Telnyx', '+14158765432', 'KEY123abc456def', 'Telnyx Line', true, true, true, 'YOUR_USER_ID');

-- BYO SIP Trunk Number (using the first SIP credential created above)
INSERT INTO public.phone_numbers 
(number, provider, sip_trunk_phone_number, sip_trunk_credential_id, allow_non_e164, label, inbound_enabled, outbound_enabled, is_active, user_id)
VALUES 
('+14159876543', 'BYOSIP', '+14159876543', (SELECT id FROM sip_trunk_credentials WHERE name = 'Production SIP Trunk' AND user_id = 'YOUR_USER_ID'), false, 'Custom SIP Trunk', true, true, true, 'YOUR_USER_ID');

-- ============================================
-- STEP 4: Verify the data
-- ============================================
-- Run these queries to verify the test data:

-- View all phone numbers
SELECT 
    id,
    number,
    provider,
    label,
    inbound_enabled,
    outbound_enabled,
    is_active,
    created_at
FROM public.phone_numbers
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;

-- View phone numbers with provider-specific details
SELECT 
    number,
    provider,
    CASE 
        WHEN provider = 'Callyy' THEN CONCAT('Area Code: ', area_code)
        WHEN provider = 'CallyySIP' THEN CONCAT('SIP ID: ', sip_identifier)
        WHEN provider = 'Twilio' THEN CONCAT('SMS: ', sms_enabled::text)
        WHEN provider = 'Vonage' THEN 'Vonage Number'
        WHEN provider = 'Telnyx' THEN 'Telnyx Number'
        WHEN provider = 'BYOSIP' THEN CONCAT('Non-E164: ', allow_non_e164::text)
    END as provider_details,
    label,
    is_active
FROM public.phone_numbers
WHERE user_id = 'YOUR_USER_ID';

-- View SIP trunk credentials
SELECT 
    id,
    name,
    sip_trunk_uri,
    username,
    created_at
FROM public.sip_trunk_credentials
WHERE user_id = 'YOUR_USER_ID';

-- ============================================
-- STEP 5: Test RLS (Row Level Security)
-- ============================================
-- These queries should only return data for the authenticated user

-- As authenticated user, should see all their phone numbers
SELECT count(*) as my_phone_numbers
FROM public.phone_numbers
WHERE user_id = auth.uid();

-- Should NOT be able to see other users' phone numbers
-- (This would return 0 if RLS is working correctly)
SELECT count(*) as other_users_numbers
FROM public.phone_numbers
WHERE user_id != auth.uid();

-- ============================================
-- CLEANUP (if needed)
-- ============================================
-- To remove all test data for a specific user:

-- DELETE FROM public.phone_numbers WHERE user_id = 'YOUR_USER_ID';
-- DELETE FROM public.sip_trunk_credentials WHERE user_id = 'YOUR_USER_ID';

-- ============================================
-- NOTES
-- ============================================
-- ⚠️ IMPORTANT: In production, you should:
-- 1. Encrypt sensitive fields (auth tokens, API keys, passwords)
-- 2. Use Supabase Vault for storing secrets
-- 3. Never store credentials in plain text
-- 4. Implement proper key rotation
-- 5. Use environment variables for API keys

-- Example of using Supabase Vault (for future implementation):
-- SELECT vault.create_secret('twilio_auth_token_' || id, 'actual_token_value', 'Twilio auth token')
-- FROM phone_numbers WHERE provider = 'Twilio';

-- ============================================
-- TESTING SCENARIOS
-- ============================================

-- Scenario 1: Test fetching by provider
SELECT * FROM phone_numbers 
WHERE user_id = 'YOUR_USER_ID' AND provider = 'Twilio';

-- Scenario 2: Test active numbers only
SELECT * FROM phone_numbers 
WHERE user_id = 'YOUR_USER_ID' AND is_active = true;

-- Scenario 3: Test inbound-enabled numbers
SELECT * FROM phone_numbers 
WHERE user_id = 'YOUR_USER_ID' AND inbound_enabled = true;

-- Scenario 4: Test SMS-enabled Twilio numbers
SELECT * FROM phone_numbers 
WHERE user_id = 'YOUR_USER_ID' 
AND provider = 'Twilio' 
AND sms_enabled = true;

-- Scenario 5: Test numbers with specific area codes
SELECT * FROM phone_numbers 
WHERE user_id = 'YOUR_USER_ID' 
AND provider = 'Callyy' 
AND area_code IN ('346', '984', '326');

-- ============================================
-- PERFORMANCE TESTING
-- ============================================

-- Test index usage
EXPLAIN ANALYZE
SELECT * FROM phone_numbers 
WHERE user_id = 'YOUR_USER_ID' 
AND provider = 'Twilio';

-- Should use indexes:
-- - idx_phone_numbers_user_id
-- - idx_phone_numbers_provider

-- ============================================
-- DATA VALIDATION
-- ============================================

-- Check for missing required fields
SELECT id, number, provider, 
    CASE 
        WHEN number IS NULL THEN 'Missing number'
        WHEN provider IS NULL THEN 'Missing provider'
        WHEN user_id IS NULL THEN 'Missing user_id'
        ELSE 'Valid'
    END as validation_status
FROM phone_numbers;

-- Check for orphaned phone numbers (no valid user)
SELECT p.id, p.number, p.provider
FROM phone_numbers p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Check for orphaned SIP trunk references
SELECT p.id, p.number, p.sip_trunk_credential_id
FROM phone_numbers p
WHERE p.provider = 'BYOSIP'
AND p.sip_trunk_credential_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sip_trunk_credentials s 
    WHERE s.id = p.sip_trunk_credential_id
);
