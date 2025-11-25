-- ============================================
-- CUSTOMER MEMORY SYSTEM
-- ============================================
-- This is a groundbreaking feature that stores conversation history
-- and insights for each customer, enabling truly personalized AI calls.
-- 
-- Key Features:
-- 1. Conversation Transcripts - Full conversation history
-- 2. AI-Generated Summaries - Key points from each call
-- 3. Customer Insights - Preferences, sentiment, important dates
-- 4. Relationship Timeline - Track relationship progression
-- 5. Action Items - Follow-ups and commitments made

-- ============================================
-- CUSTOMER CONVERSATIONS TABLE
-- ============================================
-- Stores each conversation/call with a customer

CREATE TABLE IF NOT EXISTS public.customer_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES public.assistants(id) ON DELETE SET NULL,
    call_log_id UUID REFERENCES public.callyy_call_logs(id) ON DELETE SET NULL,
    
    -- Call metadata
    call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Transcript
    transcript JSONB DEFAULT '[]',  -- Array of {role: 'user'|'assistant', content: string, timestamp: string}
    
    -- AI-Generated Analysis (populated after call ends)
    summary TEXT,                    -- Brief summary of the conversation
    key_points TEXT[],              -- Array of key discussion points
    sentiment TEXT CHECK (sentiment IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative')),
    sentiment_score DECIMAL(3, 2),  -- -1.0 to 1.0
    topics_discussed TEXT[],        -- Topics covered in conversation
    
    -- Action Items & Follow-ups
    action_items JSONB DEFAULT '[]', -- [{task: string, due_date: string, priority: 'high'|'medium'|'low', completed: boolean}]
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_reason TEXT,
    
    -- Outcome
    outcome TEXT CHECK (outcome IN ('successful', 'callback_requested', 'not_interested', 'wrong_number', 'voicemail', 'no_answer', 'other')),
    outcome_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for fast lookups
CREATE INDEX idx_customer_conversations_customer_id ON public.customer_conversations(customer_id);
CREATE INDEX idx_customer_conversations_assistant_id ON public.customer_conversations(assistant_id);
CREATE INDEX idx_customer_conversations_user_id ON public.customer_conversations(user_id);
CREATE INDEX idx_customer_conversations_started_at ON public.customer_conversations(started_at DESC);
CREATE INDEX idx_customer_conversations_sentiment ON public.customer_conversations(sentiment);

-- Enable RLS
ALTER TABLE public.customer_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own customer conversations"
    ON public.customer_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer conversations"
    ON public.customer_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer conversations"
    ON public.customer_conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer conversations"
    ON public.customer_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- CUSTOMER MEMORY TABLE
-- ============================================
-- Aggregated memory/profile for each customer built from conversations

CREATE TABLE IF NOT EXISTS public.customer_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
    
    -- Relationship Overview
    total_conversations INTEGER DEFAULT 0,
    total_call_duration_minutes INTEGER DEFAULT 0,
    first_contact_date TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ,
    average_sentiment DECIMAL(3, 2),  -- Running average of sentiment scores
    
    -- AI-Generated Customer Profile
    personality_traits TEXT[],        -- e.g., ['friendly', 'detail-oriented', 'busy']
    communication_preferences JSONB,  -- {preferred_time: string, preferred_language: string, communication_style: string}
    interests TEXT[],                 -- Topics they've shown interest in
    pain_points TEXT[],               -- Problems/challenges they've mentioned
    
    -- Important Information (extracted from conversations)
    important_dates JSONB DEFAULT '[]',   -- [{date: string, description: string, type: 'birthday'|'anniversary'|'renewal'|'custom'}]
    family_info JSONB DEFAULT '{}',       -- {spouse_name: string, children: [], etc.}
    professional_info JSONB DEFAULT '{}', -- {company: string, role: string, industry: string}
    
    -- Preferences & History
    product_interests TEXT[],         -- Products/services they've shown interest in
    past_purchases JSONB DEFAULT '[]', -- [{product: string, date: string, amount: number}]
    objections_raised TEXT[],         -- Common objections they've raised
    
    -- Engagement Metrics
    engagement_score INTEGER DEFAULT 50, -- 0-100 based on responsiveness, sentiment, etc.
    lifetime_value DECIMAL(12, 2),
    churn_risk TEXT CHECK (churn_risk IN ('low', 'medium', 'high')),
    
    -- Summary (AI-generated comprehensive summary)
    executive_summary TEXT,           -- One paragraph summary of who this customer is
    conversation_context TEXT,        -- Context to inject into future calls
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_customer_memories_customer_id ON public.customer_memories(customer_id);
CREATE INDEX idx_customer_memories_user_id ON public.customer_memories(user_id);
CREATE INDEX idx_customer_memories_engagement_score ON public.customer_memories(engagement_score DESC);
CREATE INDEX idx_customer_memories_last_contact ON public.customer_memories(last_contact_date DESC);

-- Enable RLS
ALTER TABLE public.customer_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own customer memories"
    ON public.customer_memories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer memories"
    ON public.customer_memories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer memories"
    ON public.customer_memories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer memories"
    ON public.customer_memories FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- CUSTOMER INSIGHTS TABLE
-- ============================================
-- Specific insights/notes extracted from conversations

CREATE TABLE IF NOT EXISTS public.customer_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.customer_conversations(id) ON DELETE SET NULL,
    
    -- Insight details
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'preference', 'objection', 'interest', 'personal_info', 
        'pain_point', 'opportunity', 'commitment', 'feedback', 'custom'
    )),
    category TEXT,                    -- e.g., 'pricing', 'product', 'service', 'personal'
    content TEXT NOT NULL,            -- The actual insight
    importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
    
    -- Context
    source_quote TEXT,                -- Exact quote from conversation that led to this insight
    confidence DECIMAL(3, 2),         -- AI confidence in this insight (0.0 to 1.0)
    
    -- Status
    is_active BOOLEAN DEFAULT true,   -- Can be archived/deactivated
    verified_by_user BOOLEAN DEFAULT false, -- User confirmed this insight
    
    -- Timestamps
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_customer_insights_customer_id ON public.customer_insights(customer_id);
CREATE INDEX idx_customer_insights_type ON public.customer_insights(insight_type);
CREATE INDEX idx_customer_insights_importance ON public.customer_insights(importance);
CREATE INDEX idx_customer_insights_user_id ON public.customer_insights(user_id);

-- Enable RLS
ALTER TABLE public.customer_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own customer insights"
    ON public.customer_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer insights"
    ON public.customer_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer insights"
    ON public.customer_insights FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customer insights"
    ON public.customer_insights FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ADD MEMORY SETTINGS TO ASSISTANTS
-- ============================================

ALTER TABLE public.assistants
ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS memory_config JSONB DEFAULT '{
    "remember_conversations": true,
    "extract_insights": true,
    "track_sentiment": true,
    "max_context_conversations": 5,
    "include_summary": true,
    "include_insights": true,
    "include_action_items": true,
    "auto_generate_summary": true
}'::jsonb;

COMMENT ON COLUMN public.assistants.memory_enabled IS 'Whether customer memory is enabled for this assistant';
COMMENT ON COLUMN public.assistants.memory_config IS 'Configuration for memory features';

-- ============================================
-- ADD MEMORY REFERENCE TO CUSTOMERS
-- ============================================

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS has_memory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_interaction TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interaction_count INTEGER DEFAULT 0;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Update customer_memories.updated_at
CREATE TRIGGER update_customer_memories_updated_at 
    BEFORE UPDATE ON public.customer_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update customer_conversations.updated_at
CREATE TRIGGER update_customer_conversations_updated_at 
    BEFORE UPDATE ON public.customer_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Update customer memory stats after conversation
-- ============================================

CREATE OR REPLACE FUNCTION update_customer_memory_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or create customer memory record
    INSERT INTO public.customer_memories (
        customer_id,
        user_id,
        total_conversations,
        first_contact_date,
        last_contact_date
    ) VALUES (
        NEW.customer_id,
        NEW.user_id,
        1,
        NEW.started_at,
        NEW.started_at
    )
    ON CONFLICT (customer_id) DO UPDATE SET
        total_conversations = customer_memories.total_conversations + 1,
        last_contact_date = NEW.started_at,
        total_call_duration_minutes = customer_memories.total_call_duration_minutes + COALESCE(NEW.duration_seconds / 60, 0),
        average_sentiment = CASE 
            WHEN NEW.sentiment_score IS NOT NULL THEN
                (COALESCE(customer_memories.average_sentiment, 0) * customer_memories.total_conversations + NEW.sentiment_score) / (customer_memories.total_conversations + 1)
            ELSE customer_memories.average_sentiment
        END,
        updated_at = NOW();

    -- Update customer record
    UPDATE public.customers SET
        has_memory = true,
        last_interaction = NEW.started_at,
        interaction_count = COALESCE(interaction_count, 0) + 1
    WHERE id = NEW.customer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update memory stats after conversation insert
CREATE TRIGGER trigger_update_customer_memory_stats
    AFTER INSERT ON public.customer_conversations
    FOR EACH ROW EXECUTE FUNCTION update_customer_memory_stats();

-- ============================================
-- FUNCTION: Get customer context for AI
-- ============================================
-- This function returns formatted context for the AI assistant

CREATE OR REPLACE FUNCTION get_customer_context(p_customer_id UUID, p_max_conversations INTEGER DEFAULT 5)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    customer_record RECORD;
    memory_record RECORD;
    recent_conversations JSONB;
    key_insights JSONB;
BEGIN
    -- Get customer basic info
    SELECT * INTO customer_record FROM public.customers WHERE id = p_customer_id;
    
    -- Get memory profile
    SELECT * INTO memory_record FROM public.customer_memories WHERE customer_id = p_customer_id;
    
    -- Get recent conversations
    SELECT COALESCE(jsonb_agg(conv ORDER BY started_at DESC), '[]'::jsonb)
    INTO recent_conversations
    FROM (
        SELECT 
            started_at,
            summary,
            key_points,
            sentiment,
            outcome,
            action_items
        FROM public.customer_conversations
        WHERE customer_id = p_customer_id
        ORDER BY started_at DESC
        LIMIT p_max_conversations
    ) conv;
    
    -- Get key insights
    SELECT COALESCE(jsonb_agg(ins), '[]'::jsonb)
    INTO key_insights
    FROM (
        SELECT 
            insight_type,
            category,
            content,
            importance
        FROM public.customer_insights
        WHERE customer_id = p_customer_id 
        AND is_active = true
        ORDER BY 
            CASE importance 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            extracted_at DESC
        LIMIT 20
    ) ins;
    
    -- Build result
    result = jsonb_build_object(
        'customer', jsonb_build_object(
            'id', customer_record.id,
            'name', customer_record.name,
            'email', customer_record.email,
            'phone', customer_record.phone_number,
            'variables', customer_record.variables
        ),
        'memory', CASE WHEN memory_record IS NOT NULL THEN jsonb_build_object(
            'total_conversations', memory_record.total_conversations,
            'first_contact', memory_record.first_contact_date,
            'last_contact', memory_record.last_contact_date,
            'average_sentiment', memory_record.average_sentiment,
            'personality_traits', memory_record.personality_traits,
            'interests', memory_record.interests,
            'pain_points', memory_record.pain_points,
            'engagement_score', memory_record.engagement_score,
            'executive_summary', memory_record.executive_summary,
            'conversation_context', memory_record.conversation_context
        ) ELSE NULL END,
        'recent_conversations', recent_conversations,
        'key_insights', key_insights
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.customer_conversations IS 'Stores individual conversation transcripts and analysis for each customer interaction';
COMMENT ON TABLE public.customer_memories IS 'Aggregated memory profile for each customer, updated after each conversation';
COMMENT ON TABLE public.customer_insights IS 'Specific insights extracted from conversations (preferences, objections, opportunities, etc.)';
COMMENT ON FUNCTION get_customer_context IS 'Returns formatted customer context for AI assistant to use during calls';
