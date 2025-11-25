-- Referral Program Schema
-- Migration: 005_referral_program.sql
-- This creates the referral system with user-specific referral codes and tracking

-- Create referral_codes table to store unique referral codes per user
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    custom_code VARCHAR(30) UNIQUE, -- Allow users to set custom referral codes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT unique_user_referral_code UNIQUE(user_id)
);

-- Create referral_rewards table to track rewards earned
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_amount DECIMAL(10,2) DEFAULT 0,
    reward_type VARCHAR(50) DEFAULT 'credits', -- credits, percentage_discount, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, expired, cancelled
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_referral_pair UNIQUE(referrer_id, referred_id)
);

-- Create referral_stats view for easy querying
CREATE OR REPLACE VIEW public.referral_stats AS
SELECT 
    rc.user_id,
    rc.code,
    rc.custom_code,
    rc.is_active,
    COUNT(CASE WHEN rr.status = 'pending' THEN 1 END) as pending_referrals,
    COUNT(CASE WHEN rr.status = 'completed' THEN 1 END) as completed_referrals,
    COUNT(rr.id) as total_referrals,
    COALESCE(SUM(CASE WHEN rr.status = 'completed' THEN rr.reward_amount ELSE 0 END), 0) as total_rewards_earned,
    COALESCE(SUM(CASE WHEN rr.status = 'pending' THEN rr.reward_amount ELSE 0 END), 0) as pending_rewards
FROM public.referral_codes rc
LEFT JOIN public.referral_rewards rr ON rc.user_id = rr.referrer_id
GROUP BY rc.user_id, rc.code, rc.custom_code, rc.is_active;

-- Create referral_activity table for tracking link clicks and conversions
CREATE TABLE IF NOT EXISTS public.referral_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- link_click, signup_started, signup_completed, first_purchase
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Users can view their own referral code"
    ON public.referral_codes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral code"
    ON public.referral_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral code"
    ON public.referral_codes FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their referral rewards"
    ON public.referral_rewards FOR SELECT
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- RLS Policies for referral_activity
CREATE POLICY "Users can view activity for their referral codes"
    ON public.referral_activity FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.referral_codes 
            WHERE id = referral_activity.referral_code_id 
            AND user_id = auth.uid()
        )
    );

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a 8-character alphanumeric code
        new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or get referral code for a user
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    code VARCHAR(20),
    custom_code VARCHAR(30),
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_user_id UUID := auth.uid();
    existing_code RECORD;
BEGIN
    -- Check if user already has a referral code
    SELECT * INTO existing_code FROM public.referral_codes rc WHERE rc.user_id = current_user_id;
    
    IF existing_code IS NULL THEN
        -- Create new referral code
        INSERT INTO public.referral_codes (user_id, code)
        VALUES (current_user_id, public.generate_referral_code(current_user_id))
        RETURNING * INTO existing_code;
    END IF;
    
    RETURN QUERY SELECT existing_code.id, existing_code.user_id, existing_code.code, 
                        existing_code.custom_code, existing_code.is_active, existing_code.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral stats for current user
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS TABLE (
    referral_code TEXT,
    custom_code TEXT,
    is_active BOOLEAN,
    pending_referrals BIGINT,
    completed_referrals BIGINT,
    total_referrals BIGINT,
    total_rewards_earned DECIMAL,
    pending_rewards DECIMAL
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        rs.code::TEXT,
        rs.custom_code::TEXT,
        rs.is_active,
        rs.pending_referrals,
        rs.completed_referrals,
        rs.total_referrals,
        rs.total_rewards_earned,
        rs.pending_rewards
    FROM public.referral_stats rs
    WHERE rs.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed referral history
CREATE OR REPLACE FUNCTION public.get_my_referral_history()
RETURNS TABLE (
    id UUID,
    referred_email TEXT,
    reward_amount DECIMAL,
    reward_type VARCHAR,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        rr.id,
        COALESCE(u.email, 'Unknown')::TEXT as referred_email,
        rr.reward_amount,
        rr.reward_type,
        rr.status,
        rr.created_at,
        rr.completed_at
    FROM public.referral_rewards rr
    LEFT JOIN auth.users u ON rr.referred_id = u.id
    WHERE rr.referrer_id = auth.uid()
    ORDER BY rr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_custom_code ON public.referral_codes(custom_code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_id ON public.referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards(status);
CREATE INDEX IF NOT EXISTS idx_referral_activity_code_id ON public.referral_activity(referral_code_id);

-- ============================================
-- REFERRAL COMPLETION FUNCTIONS
-- ============================================

-- Function to process a referral when a new user signs up with a referral code
CREATE OR REPLACE FUNCTION public.process_referral_signup(referral_code_param TEXT)
RETURNS JSON AS $$
DECLARE
    referrer_record RECORD;
    current_user_id UUID := auth.uid();
    result JSON;
BEGIN
    -- Check if current user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Find the referrer by code or custom_code
    SELECT rc.*, up.user_id as referrer_user_id
    INTO referrer_record
    FROM public.referral_codes rc
    LEFT JOIN public.user_profiles up ON rc.user_id = up.user_id
    WHERE (rc.code = upper(referral_code_param) OR rc.custom_code = upper(referral_code_param))
    AND rc.is_active = true;

    -- Check if referral code exists
    IF referrer_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid referral code');
    END IF;

    -- Check if user is trying to refer themselves
    IF referrer_record.user_id = current_user_id THEN
        RETURN json_build_object('success', false, 'error', 'Cannot use your own referral code');
    END IF;

    -- Check if this user has already been referred
    IF EXISTS (SELECT 1 FROM public.referral_rewards WHERE referred_id = current_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'User already has a referral');
    END IF;

    -- Create the referral reward record (pending status)
    INSERT INTO public.referral_rewards (referrer_id, referred_id, reward_amount, reward_type, status)
    VALUES (referrer_record.user_id, current_user_id, 100, 'credits', 'pending')
    ON CONFLICT (referrer_id, referred_id) DO NOTHING;

    -- Log the activity
    INSERT INTO public.referral_activity (referral_code_id, activity_type, metadata)
    VALUES (referrer_record.id, 'signup_completed', json_build_object('referred_user_id', current_user_id));

    RETURN json_build_object(
        'success', true, 
        'referrer_id', referrer_record.user_id,
        'message', 'Referral recorded successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a referral (called after first qualifying purchase)
CREATE OR REPLACE FUNCTION public.complete_referral(referred_user_id UUID)
RETURNS JSON AS $$
DECLARE
    referral_record RECORD;
    reward_amount DECIMAL := 100;
BEGIN
    -- Find the pending referral
    SELECT * INTO referral_record
    FROM public.referral_rewards
    WHERE referred_id = referred_user_id AND status = 'pending';

    IF referral_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'No pending referral found');
    END IF;

    -- Update the referral status to completed
    UPDATE public.referral_rewards
    SET status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = referral_record.id;

    -- Credit the referrer's account
    UPDATE public.user_profiles
    SET credits_balance = credits_balance + reward_amount,
        updated_at = NOW()
    WHERE user_id = referral_record.referrer_id;

    -- Credit the referred user's account
    UPDATE public.user_profiles
    SET credits_balance = credits_balance + reward_amount,
        updated_at = NOW()
    WHERE user_id = referred_user_id;

    -- Log the completion activity
    INSERT INTO public.referral_activity (
        referral_code_id, 
        activity_type, 
        metadata
    )
    SELECT 
        rc.id,
        'referral_completed',
        json_build_object(
            'referrer_id', referral_record.referrer_id,
            'referred_id', referred_user_id,
            'reward_amount', reward_amount
        )
    FROM public.referral_codes rc
    WHERE rc.user_id = referral_record.referrer_id;

    RETURN json_build_object(
        'success', true,
        'referrer_credited', reward_amount,
        'referred_credited', reward_amount,
        'message', 'Referral completed and rewards credited'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user was referred (for UI display)
CREATE OR REPLACE FUNCTION public.get_my_referral_status()
RETURNS JSON AS $$
DECLARE
    current_user_id UUID := auth.uid();
    referral_record RECORD;
BEGIN
    SELECT rr.*, u.email as referrer_email
    INTO referral_record
    FROM public.referral_rewards rr
    LEFT JOIN auth.users u ON rr.referrer_id = u.id
    WHERE rr.referred_id = current_user_id;

    IF referral_record IS NULL THEN
        RETURN json_build_object('was_referred', false);
    END IF;

    RETURN json_build_object(
        'was_referred', true,
        'status', referral_record.status,
        'reward_amount', referral_record.reward_amount,
        'referrer_email', referral_record.referrer_email,
        'completed_at', referral_record.completed_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for inserting referral rewards (for the process_referral_signup function)
DROP POLICY IF EXISTS "Allow referral reward creation" ON public.referral_rewards;
CREATE POLICY "Allow referral reward creation"
    ON public.referral_rewards FOR INSERT
    WITH CHECK (auth.uid() = referred_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.process_referral_signup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_status() TO authenticated;

-- ============================================
-- FRAUD PREVENTION: MINIMUM PURCHASE REQUIREMENT
-- ============================================

-- Update the complete_referral function to require minimum ₹500 purchase
CREATE OR REPLACE FUNCTION public.complete_referral_on_purchase(
    user_id_param UUID,
    purchase_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
    referral_record RECORD;
    reward_amount DECIMAL := 100;
    minimum_purchase DECIMAL := 500;
BEGIN
    -- Check minimum purchase requirement
    IF purchase_amount < minimum_purchase THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Minimum purchase of ₹500 required to activate referral rewards',
            'minimum_required', minimum_purchase,
            'purchase_amount', purchase_amount
        );
    END IF;

    -- Find the pending referral for this user
    SELECT * INTO referral_record
    FROM public.referral_rewards
    WHERE referred_id = user_id_param AND status = 'pending';

    -- If no pending referral, nothing to do
    IF referral_record IS NULL THEN
        RETURN json_build_object(
            'success', true, 
            'message', 'No pending referral to complete',
            'referral_completed', false
        );
    END IF;

    -- Update the referral status to completed
    UPDATE public.referral_rewards
    SET 
        status = 'completed', 
        completed_at = NOW(), 
        updated_at = NOW()
    WHERE id = referral_record.id;

    -- Credit the referrer's account (₹100)
    UPDATE public.user_profiles
    SET 
        credits_balance = credits_balance + reward_amount,
        updated_at = NOW()
    WHERE user_id = referral_record.referrer_id;

    -- Credit the referred user's account (₹100)
    UPDATE public.user_profiles
    SET 
        credits_balance = credits_balance + reward_amount,
        updated_at = NOW()
    WHERE user_id = user_id_param;

    -- Log the completion activity
    INSERT INTO public.referral_activity (
        referral_code_id, 
        activity_type, 
        metadata
    )
    SELECT 
        rc.id,
        'referral_completed',
        json_build_object(
            'referrer_id', referral_record.referrer_id,
            'referred_id', user_id_param,
            'reward_amount', reward_amount,
            'qualifying_purchase', purchase_amount
        )
    FROM public.referral_codes rc
    WHERE rc.user_id = referral_record.referrer_id;

    RETURN json_build_object(
        'success', true,
        'referral_completed', true,
        'referrer_credited', reward_amount,
        'referred_credited', reward_amount,
        'qualifying_purchase', purchase_amount,
        'message', 'Referral completed! Both users credited ₹100'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to track credit purchases
CREATE TABLE IF NOT EXISTS public.credit_purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on credit_purchases
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_purchases
CREATE POLICY "Users can view their own purchases"
    ON public.credit_purchases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
    ON public.credit_purchases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases(status);

-- Function to process a credit top-up and check referral eligibility
CREATE OR REPLACE FUNCTION public.process_credit_topup(
    amount_param DECIMAL,
    payment_id_param VARCHAR DEFAULT NULL,
    payment_method_param VARCHAR DEFAULT 'card'
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID := auth.uid();
    purchase_id UUID;
    referral_result JSON;
    total_purchases DECIMAL;
    is_first_qualifying_purchase BOOLEAN := false;
BEGIN
    -- Check if user is authenticated
    IF current_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Insert the purchase record
    INSERT INTO public.credit_purchases (user_id, amount, payment_id, payment_method, status, completed_at)
    VALUES (current_user_id, amount_param, payment_id_param, payment_method_param, 'completed', NOW())
    RETURNING id INTO purchase_id;

    -- Add credits to user's balance
    UPDATE public.user_profiles
    SET 
        credits_balance = credits_balance + amount_param,
        updated_at = NOW()
    WHERE user_id = current_user_id;

    -- Check if this is the first qualifying purchase (≥ ₹500)
    SELECT COALESCE(SUM(amount), 0) INTO total_purchases
    FROM public.credit_purchases
    WHERE user_id = current_user_id 
    AND status = 'completed'
    AND id != purchase_id;

    -- If user had no previous completed purchases and this one qualifies
    IF total_purchases = 0 AND amount_param >= 500 THEN
        is_first_qualifying_purchase := true;
        SELECT public.complete_referral_on_purchase(current_user_id, amount_param) INTO referral_result;
    -- If user's total purchases just crossed ₹500 threshold
    ELSIF total_purchases < 500 AND (total_purchases + amount_param) >= 500 THEN
        is_first_qualifying_purchase := true;
        SELECT public.complete_referral_on_purchase(current_user_id, total_purchases + amount_param) INTO referral_result;
    END IF;

    RETURN json_build_object(
        'success', true,
        'purchase_id', purchase_id,
        'amount', amount_param,
        'new_balance', (SELECT credits_balance FROM public.user_profiles WHERE user_id = current_user_id),
        'first_qualifying_purchase', is_first_qualifying_purchase,
        'referral_result', referral_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for new functions
GRANT EXECUTE ON FUNCTION public.complete_referral_on_purchase(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_credit_topup(DECIMAL, VARCHAR, VARCHAR) TO authenticated;

-- Add column to track qualifying purchase amount
ALTER TABLE public.referral_rewards 
ADD COLUMN IF NOT EXISTS qualifying_purchase_amount DECIMAL(10,2);
