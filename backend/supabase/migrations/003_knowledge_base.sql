-- Supabase Knowledge Base Schema Migration
-- This creates tables for the Knowledge Base feature

-- ============================================
-- KNOWLEDGE BASES TABLE
-- ============================================
-- Main table to store knowledge base collections
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'processing')),
    total_documents INTEGER DEFAULT 0,
    total_characters INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_knowledge_bases_user_id ON public.knowledge_bases(user_id);
CREATE INDEX idx_knowledge_bases_status ON public.knowledge_bases(status);
CREATE INDEX idx_knowledge_bases_created_at ON public.knowledge_bases(created_at DESC);

-- Enable RLS
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_bases
CREATE POLICY "Users can view their own knowledge bases"
    ON public.knowledge_bases FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge bases"
    ON public.knowledge_bases FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge bases"
    ON public.knowledge_bases FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge bases"
    ON public.knowledge_bases FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- KNOWLEDGE BASE DOCUMENTS TABLE
-- ============================================
-- Table to store individual documents within a knowledge base
-- Supports three types: file, url, text
CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    knowledge_base_id UUID NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
    
    -- Document type: 'file' (uploaded), 'url' (web crawled), 'text' (manual input)
    type TEXT NOT NULL CHECK (type IN ('file', 'url', 'text')),
    
    -- Document name/title
    name TEXT NOT NULL,
    
    -- For 'file' type: original filename and storage path
    original_filename TEXT,
    file_extension TEXT CHECK (file_extension IN ('txt', 'json', 'md', NULL)),
    file_size_bytes INTEGER,
    storage_path TEXT, -- Supabase Storage path
    
    -- For 'url' type: source URL and crawl metadata
    source_url TEXT,
    crawl_depth INTEGER DEFAULT 1, -- How many levels deep to crawl
    last_crawled_at TIMESTAMPTZ,
    
    -- For 'text' type: direct text content (max 10,000 characters enforced by constraint)
    text_content TEXT CHECK (char_length(text_content) <= 10000),
    
    -- Common fields for all types
    content TEXT, -- Processed/extracted content for all types
    character_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    
    -- Processing status
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    
    -- Metadata as JSONB for flexibility
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_kb_documents_knowledge_base_id ON public.knowledge_base_documents(knowledge_base_id);
CREATE INDEX idx_kb_documents_user_id ON public.knowledge_base_documents(user_id);
CREATE INDEX idx_kb_documents_type ON public.knowledge_base_documents(type);
CREATE INDEX idx_kb_documents_processing_status ON public.knowledge_base_documents(processing_status);
CREATE INDEX idx_kb_documents_created_at ON public.knowledge_base_documents(created_at DESC);

-- Enable RLS
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base_documents
CREATE POLICY "Users can view their own knowledge base documents"
    ON public.knowledge_base_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge base documents"
    ON public.knowledge_base_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge base documents"
    ON public.knowledge_base_documents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge base documents"
    ON public.knowledge_base_documents FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- URL CRAWL PAGES TABLE
-- ============================================
-- Table to store individual pages crawled from a URL document
CREATE TABLE IF NOT EXISTS public.knowledge_base_crawled_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.knowledge_base_documents(id) ON DELETE CASCADE,
    
    -- Page URL and metadata
    page_url TEXT NOT NULL,
    page_title TEXT,
    
    -- Extracted content from the page
    content TEXT,
    character_count INTEGER DEFAULT 0,
    
    -- Crawl metadata
    crawl_status TEXT NOT NULL DEFAULT 'pending' CHECK (crawl_status IN ('pending', 'crawling', 'completed', 'failed')),
    crawl_error TEXT,
    http_status_code INTEGER,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    crawled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Ensure unique URL per document
    UNIQUE(document_id, page_url)
);

-- Create indexes
CREATE INDEX idx_kb_crawled_pages_document_id ON public.knowledge_base_crawled_pages(document_id);
CREATE INDEX idx_kb_crawled_pages_user_id ON public.knowledge_base_crawled_pages(user_id);
CREATE INDEX idx_kb_crawled_pages_crawl_status ON public.knowledge_base_crawled_pages(crawl_status);

-- Enable RLS
ALTER TABLE public.knowledge_base_crawled_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_base_crawled_pages
CREATE POLICY "Users can view their own crawled pages"
    ON public.knowledge_base_crawled_pages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own crawled pages"
    ON public.knowledge_base_crawled_pages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own crawled pages"
    ON public.knowledge_base_crawled_pages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own crawled pages"
    ON public.knowledge_base_crawled_pages FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update knowledge base document counts
CREATE OR REPLACE FUNCTION update_knowledge_base_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.knowledge_bases
        SET 
            total_documents = total_documents + 1,
            total_characters = total_characters + COALESCE(NEW.character_count, 0),
            updated_at = NOW()
        WHERE id = NEW.knowledge_base_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.knowledge_bases
        SET 
            total_documents = GREATEST(total_documents - 1, 0),
            total_characters = GREATEST(total_characters - COALESCE(OLD.character_count, 0), 0),
            updated_at = NOW()
        WHERE id = OLD.knowledge_base_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only update if character_count changed
        IF OLD.character_count IS DISTINCT FROM NEW.character_count THEN
            UPDATE public.knowledge_bases
            SET 
                total_characters = total_characters - COALESCE(OLD.character_count, 0) + COALESCE(NEW.character_count, 0),
                updated_at = NOW()
            WHERE id = NEW.knowledge_base_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger for document count updates
CREATE TRIGGER update_kb_counts_on_document_change
    AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_base_documents
    FOR EACH ROW EXECUTE FUNCTION update_knowledge_base_counts();

-- Trigger for updated_at on knowledge_bases
CREATE TRIGGER update_knowledge_bases_updated_at 
    BEFORE UPDATE ON public.knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on knowledge_base_documents
CREATE TRIGGER update_kb_documents_updated_at 
    BEFORE UPDATE ON public.knowledge_base_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate word count from text
CREATE OR REPLACE FUNCTION calculate_word_count(input_text TEXT)
RETURNS INTEGER AS $$
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN 0;
    END IF;
    RETURN array_length(regexp_split_to_array(trim(input_text), '\s+'), 1);
END;
$$ LANGUAGE 'plpgsql' IMMUTABLE;

-- Function to auto-populate character and word counts on insert/update
CREATE OR REPLACE FUNCTION auto_populate_document_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- For text type, use text_content
    IF NEW.type = 'text' AND NEW.text_content IS NOT NULL THEN
        NEW.character_count := char_length(NEW.text_content);
        NEW.word_count := calculate_word_count(NEW.text_content);
        NEW.content := NEW.text_content; -- Copy to content field for consistency
    -- For other types, use content field
    ELSIF NEW.content IS NOT NULL THEN
        NEW.character_count := char_length(NEW.content);
        NEW.word_count := calculate_word_count(NEW.content);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger for auto-populating counts
CREATE TRIGGER auto_populate_document_counts_trigger
    BEFORE INSERT OR UPDATE ON public.knowledge_base_documents
    FOR EACH ROW EXECUTE FUNCTION auto_populate_document_counts();

-- ============================================
-- STORAGE BUCKET (Run this separately in Supabase Dashboard)
-- ============================================
-- Note: Storage bucket creation must be done via Supabase Dashboard or API
-- Create a bucket named 'knowledge-base-files' with the following settings:
-- - Public: false (private)
-- - Allowed MIME types: text/plain, application/json, text/markdown
-- - Max file size: 100MB

-- Storage RLS Policies (to be added in Supabase Dashboard):
-- 1. Users can upload to their own folder: `(bucket_id = 'knowledge-base-files' AND auth.uid()::text = (storage.foldername(name))[1])`
-- 2. Users can read their own files: `(bucket_id = 'knowledge-base-files' AND auth.uid()::text = (storage.foldername(name))[1])`
-- 3. Users can delete their own files: `(bucket_id = 'knowledge-base-files' AND auth.uid()::text = (storage.foldername(name))[1])`

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.knowledge_bases IS 'Stores knowledge base collections for each user';
COMMENT ON TABLE public.knowledge_base_documents IS 'Stores individual documents within knowledge bases (files, URLs, or text)';
COMMENT ON TABLE public.knowledge_base_crawled_pages IS 'Stores individual pages crawled from URL documents';

COMMENT ON COLUMN public.knowledge_base_documents.type IS 'Document type: file (uploaded .txt/.json/.md), url (web crawled), text (manual input with 10k char limit)';
COMMENT ON COLUMN public.knowledge_base_documents.text_content IS 'For text type only: stores direct text input (max 10,000 characters)';
COMMENT ON COLUMN public.knowledge_base_documents.content IS 'Processed/extracted content for all document types';
COMMENT ON COLUMN public.knowledge_base_documents.storage_path IS 'Supabase Storage path for uploaded files (format: user_id/kb_id/filename)';
