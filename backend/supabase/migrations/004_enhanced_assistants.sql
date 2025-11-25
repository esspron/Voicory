-- Enhanced Assistants Schema Migration
-- Adds new fields to support the full Assistant Editor functionality

-- ============================================
-- ALTER ASSISTANTS TABLE
-- ============================================

-- Add new columns to assistants table
ALTER TABLE public.assistants 
ADD COLUMN IF NOT EXISTS system_prompt TEXT,
ADD COLUMN IF NOT EXISTS first_message TEXT,
ADD COLUMN IF NOT EXISTS elevenlabs_model_id TEXT DEFAULT 'eleven_multilingual_v2',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3, 2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 1024,
ADD COLUMN IF NOT EXISTS interruptible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS use_default_personality BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rag_similarity_threshold DECIMAL(3, 2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS rag_max_results INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS rag_instructions TEXT,
ADD COLUMN IF NOT EXISTS knowledge_base_ids UUID[] DEFAULT '{}';

-- Update status constraint to include 'draft'
ALTER TABLE public.assistants 
DROP CONSTRAINT IF EXISTS assistants_status_check;

ALTER TABLE public.assistants 
ADD CONSTRAINT assistants_status_check 
CHECK (status IN ('active', 'inactive', 'draft'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assistants_status ON public.assistants(status);
CREATE INDEX IF NOT EXISTS idx_assistants_llm_provider ON public.assistants(llm_provider);

-- ============================================
-- ASSISTANT TOOLS TABLE
-- ============================================
-- Links assistants to their configured tools

CREATE TABLE IF NOT EXISTS public.assistant_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
    tool_type TEXT NOT NULL CHECK (tool_type IN ('function', 'webhook', 'transfer', 'dtmf', 'end_call')),
    name TEXT NOT NULL,
    description TEXT,
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assistant_tools_assistant_id ON public.assistant_tools(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_tools_tool_type ON public.assistant_tools(tool_type);

-- Enable RLS
ALTER TABLE public.assistant_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assistant_tools (inherit from assistant ownership)
CREATE POLICY "Users can view tools for their own assistants"
    ON public.assistant_tools FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_tools.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tools for their own assistants"
    ON public.assistant_tools FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_tools.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tools for their own assistants"
    ON public.assistant_tools FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_tools.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tools for their own assistants"
    ON public.assistant_tools FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_tools.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

-- Trigger for updated_at on assistant_tools
CREATE TRIGGER update_assistant_tools_updated_at 
    BEFORE UPDATE ON public.assistant_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ASSISTANT KNOWLEDGE BASE LINK TABLE
-- ============================================
-- Links assistants to knowledge base items

CREATE TABLE IF NOT EXISTS public.assistant_knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID NOT NULL REFERENCES public.assistants(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assistant_id, knowledge_base_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assistant_kb_assistant_id ON public.assistant_knowledge_bases(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_kb_knowledge_base_id ON public.assistant_knowledge_bases(knowledge_base_id);

-- Enable RLS
ALTER TABLE public.assistant_knowledge_bases ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from assistant ownership)
CREATE POLICY "Users can view knowledge base links for their own assistants"
    ON public.assistant_knowledge_bases FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_knowledge_bases.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert knowledge base links for their own assistants"
    ON public.assistant_knowledge_bases FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_knowledge_bases.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete knowledge base links for their own assistants"
    ON public.assistant_knowledge_bases FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.assistants 
            WHERE assistants.id = assistant_knowledge_bases.assistant_id 
            AND assistants.user_id = auth.uid()
        )
    );

-- ============================================
-- UPDATE CALL LOGS TO REFERENCE ASSISTANT
-- ============================================

-- Add assistant_id reference to call logs for better querying
ALTER TABLE public.callyy_call_logs 
ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.assistants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_callyy_call_logs_assistant_id ON public.callyy_call_logs(assistant_id);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.assistants.system_prompt IS 'The system prompt that defines the assistant behavior';
COMMENT ON COLUMN public.assistants.first_message IS 'The first message the assistant sends when starting a call';
COMMENT ON COLUMN public.assistants.elevenlabs_model_id IS 'ElevenLabs model for TTS (eleven_multilingual_v2, eleven_turbo_v2_5, eleven_flash_v2_5)';
COMMENT ON COLUMN public.assistants.language IS 'Primary language code (en, hi, ta, etc.)';
COMMENT ON COLUMN public.assistants.llm_provider IS 'LLM provider (openai, anthropic, groq, together)';
COMMENT ON COLUMN public.assistants.llm_model IS 'Specific model ID from the provider';
COMMENT ON COLUMN public.assistants.temperature IS 'LLM temperature setting (0.0 to 1.0)';
COMMENT ON COLUMN public.assistants.max_tokens IS 'Maximum tokens for LLM response';
COMMENT ON COLUMN public.assistants.interruptible IS 'Whether the assistant can be interrupted during speech';
COMMENT ON COLUMN public.assistants.use_default_personality IS 'Use default personality traits in system prompt';
COMMENT ON COLUMN public.assistants.rag_enabled IS 'Whether RAG (Retrieval-Augmented Generation) is enabled';
COMMENT ON COLUMN public.assistants.rag_similarity_threshold IS 'Minimum similarity score for RAG results (0.0 to 1.0)';
COMMENT ON COLUMN public.assistants.rag_max_results IS 'Maximum number of RAG chunks to include in context';
COMMENT ON COLUMN public.assistants.rag_instructions IS 'Instructions for how to use RAG results';
