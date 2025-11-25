-- ============================================
-- USER PROFILES TABLE
-- Stores organization details and unique wallet ID per user
-- ============================================

-- Function to automatically update updated_at timestamp (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_name TEXT,
    organization_email TEXT,
    wallet_id UUID NOT NULL UNIQUE DEFAULT extensions.uuid_generate_v4(),
    channel TEXT DEFAULT 'daily',
    call_concurrency_limit INTEGER DEFAULT 10,
    hipaa_enabled BOOLEAN DEFAULT false,
    credits_balance DECIMAL(10, 2) DEFAULT 0.00,
    plan_type TEXT DEFAULT 'PAYG' CHECK (plan_type IN ('PAYG', 'Starter', 'Pro', 'Enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_wallet_id ON public.user_profiles(wallet_id);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, organization_name, organization_email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'organization_name', NEW.email || '''s Org'),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have one yet
INSERT INTO public.user_profiles (user_id, organization_name, organization_email)
SELECT 
    id as user_id,
    email || '''s Org' as organization_name,
    email as organization_email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO NOTHING;
