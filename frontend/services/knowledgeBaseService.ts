// Knowledge Base Service
// Handles all CRUD operations for knowledge bases and documents

import { supabase } from './supabase';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type DocumentType = 'file' | 'url' | 'text';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type KnowledgeBaseStatus = 'active' | 'inactive' | 'processing';
export type FileExtension = 'txt' | 'json' | 'md';

export interface KnowledgeBase {
    id: string;
    name: string;
    description: string | null;
    status: KnowledgeBaseStatus;
    total_documents: number;
    total_characters: number;
    created_at: string;
    updated_at: string;
    user_id: string;
}

export interface KnowledgeBaseDocument {
    id: string;
    knowledge_base_id: string;
    type: DocumentType;
    name: string;
    original_filename: string | null;
    file_extension: FileExtension | null;
    file_size_bytes: number | null;
    storage_path: string | null;
    source_url: string | null;
    crawl_depth: number | null;
    last_crawled_at: string | null;
    text_content: string | null;
    content: string | null;
    character_count: number;
    word_count: number;
    processing_status: ProcessingStatus;
    processing_error: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
    user_id: string;
}

export interface CrawledPage {
    id: string;
    document_id: string;
    page_url: string;
    page_title: string | null;
    content: string | null;
    character_count: number;
    crawl_status: 'pending' | 'crawling' | 'completed' | 'failed';
    crawl_error: string | null;
    http_status_code: number | null;
    metadata: Record<string, any>;
    crawled_at: string | null;
    created_at: string;
    user_id: string;
}

// Input types for creating documents
export interface CreateTextDocumentInput {
    knowledge_base_id: string;
    name: string;
    text_content: string; // Max 10,000 characters
}

export interface CreateFileDocumentInput {
    knowledge_base_id: string;
    name: string;
    file: File;
}

export interface CreateUrlDocumentInput {
    knowledge_base_id: string;
    name: string;
    source_url: string;
    crawl_depth?: number;
}

// Constants
export const MAX_TEXT_LENGTH = 10000;
export const ALLOWED_FILE_EXTENSIONS: FileExtension[] = ['txt', 'json', 'md'];
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

// ============================================
// KNOWLEDGE BASE CRUD
// ============================================

/**
 * Get all knowledge bases for the current user
 */
export const getKnowledgeBases = async (): Promise<KnowledgeBase[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('knowledge_bases')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching knowledge bases:', error);
        return [];
    }
};

/**
 * Get a single knowledge base by ID
 */
export const getKnowledgeBase = async (id: string): Promise<KnowledgeBase | null> => {
    try {
        const { data, error } = await supabase
            .from('knowledge_bases')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching knowledge base:', error);
        return null;
    }
};

/**
 * Create a new knowledge base
 */
export const createKnowledgeBase = async (
    name: string,
    description?: string
): Promise<KnowledgeBase | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('knowledge_bases')
            .insert({
                name,
                description: description || null,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating knowledge base:', error);
        return null;
    }
};

/**
 * Update a knowledge base
 */
export const updateKnowledgeBase = async (
    id: string,
    updates: Partial<Pick<KnowledgeBase, 'name' | 'description' | 'status'>>
): Promise<KnowledgeBase | null> => {
    try {
        const { data, error } = await supabase
            .from('knowledge_bases')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating knowledge base:', error);
        return null;
    }
};

/**
 * Delete a knowledge base (cascades to documents)
 */
export const deleteKnowledgeBase = async (id: string): Promise<boolean> => {
    try {
        // First, delete all associated files from storage
        const documents = await getDocuments(id);
        for (const doc of documents) {
            if (doc.storage_path) {
                await supabase.storage
                    .from('knowledge-base-files')
                    .remove([doc.storage_path]);
            }
        }

        // Then delete the knowledge base (documents cascade)
        const { error } = await supabase
            .from('knowledge_bases')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting knowledge base:', error);
        return false;
    }
};

// ============================================
// DOCUMENT CRUD
// ============================================

/**
 * Get all documents for a knowledge base
 */
export const getDocuments = async (knowledgeBaseId: string): Promise<KnowledgeBaseDocument[]> => {
    try {
        const { data, error } = await supabase
            .from('knowledge_base_documents')
            .select('*')
            .eq('knowledge_base_id', knowledgeBaseId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching documents:', error);
        return [];
    }
};

/**
 * Get a single document by ID
 */
export const getDocument = async (id: string): Promise<KnowledgeBaseDocument | null> => {
    try {
        const { data, error } = await supabase
            .from('knowledge_base_documents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching document:', error);
        return null;
    }
};

/**
 * Create a text document (manual text input)
 */
export const createTextDocument = async (
    input: CreateTextDocumentInput
): Promise<KnowledgeBaseDocument | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Validate text length
        if (input.text_content.length > MAX_TEXT_LENGTH) {
            throw new Error(`Text content exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
        }

        const { data, error } = await supabase
            .from('knowledge_base_documents')
            .insert({
                knowledge_base_id: input.knowledge_base_id,
                type: 'text',
                name: input.name,
                text_content: input.text_content,
                processing_status: 'completed',
                user_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating text document:', error);
        return null;
    }
};

/**
 * Create a file document (upload file)
 */
export const createFileDocument = async (
    input: CreateFileDocumentInput
): Promise<KnowledgeBaseDocument | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const file = input.file;
        
        // Validate file size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error('File size exceeds 100MB limit');
        }

        // Get and validate file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase() as FileExtension;
        if (!ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
            throw new Error(`File type not allowed. Supported types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`);
        }

        // Generate storage path
        const storagePath = `${user.id}/${input.knowledge_base_id}/${Date.now()}_${file.name}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
            .from('knowledge-base-files')
            .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Read file content
        const fileContent = await file.text();

        // Create document record
        const { data, error } = await supabase
            .from('knowledge_base_documents')
            .insert({
                knowledge_base_id: input.knowledge_base_id,
                type: 'file',
                name: input.name,
                original_filename: file.name,
                file_extension: fileExtension,
                file_size_bytes: file.size,
                storage_path: storagePath,
                content: fileContent,
                processing_status: 'completed',
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            // Clean up uploaded file if document creation fails
            await supabase.storage.from('knowledge-base-files').remove([storagePath]);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creating file document:', error);
        return null;
    }
};

/**
 * Create a URL document (for web crawling)
 */
export const createUrlDocument = async (
    input: CreateUrlDocumentInput
): Promise<KnowledgeBaseDocument | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Validate URL
        try {
            new URL(input.source_url);
        } catch {
            throw new Error('Invalid URL format');
        }

        const { data, error } = await supabase
            .from('knowledge_base_documents')
            .insert({
                knowledge_base_id: input.knowledge_base_id,
                type: 'url',
                name: input.name,
                source_url: input.source_url,
                crawl_depth: input.crawl_depth || 1,
                processing_status: 'pending', // Will be processed by crawler
                user_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating URL document:', error);
        return null;
    }
};

/**
 * Update a document
 */
export const updateDocument = async (
    id: string,
    updates: Partial<Pick<KnowledgeBaseDocument, 'name' | 'text_content' | 'processing_status'>>
): Promise<KnowledgeBaseDocument | null> => {
    try {
        // Validate text length if updating text_content
        if (updates.text_content && updates.text_content.length > MAX_TEXT_LENGTH) {
            throw new Error(`Text content exceeds maximum length of ${MAX_TEXT_LENGTH} characters`);
        }

        const { data, error } = await supabase
            .from('knowledge_base_documents')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating document:', error);
        return null;
    }
};

/**
 * Delete a document
 */
export const deleteDocument = async (id: string): Promise<boolean> => {
    try {
        // First get the document to check for storage path
        const document = await getDocument(id);
        
        if (document?.storage_path) {
            // Delete file from storage
            await supabase.storage
                .from('knowledge-base-files')
                .remove([document.storage_path]);
        }

        const { error } = await supabase
            .from('knowledge_base_documents')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        return false;
    }
};

// ============================================
// CRAWLED PAGES
// ============================================

/**
 * Get all crawled pages for a URL document
 */
export const getCrawledPages = async (documentId: string): Promise<CrawledPage[]> => {
    try {
        const { data, error } = await supabase
            .from('knowledge_base_crawled_pages')
            .select('*')
            .eq('document_id', documentId)
            .order('crawled_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching crawled pages:', error);
        return [];
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get file download URL from storage
 */
export const getFileDownloadUrl = async (storagePath: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase.storage
            .from('knowledge-base-files')
            .createSignedUrl(storagePath, 3600); // 1 hour expiry

        if (error) throw error;
        return data.signedUrl;
    } catch (error) {
        console.error('Error getting file URL:', error);
        return null;
    }
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: 'File size exceeds 100MB limit' };
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_FILE_EXTENSIONS.includes(extension as FileExtension)) {
        return { 
            valid: false, 
            error: `Invalid file type. Supported types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}` 
        };
    }

    return { valid: true };
};

/**
 * Validate text content
 */
export const validateTextContent = (text: string): { valid: boolean; error?: string } => {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Text content cannot be empty' };
    }

    if (text.length > MAX_TEXT_LENGTH) {
        return { 
            valid: false, 
            error: `Text exceeds ${MAX_TEXT_LENGTH} character limit (current: ${text.length})` 
        };
    }

    return { valid: true };
};

/**
 * Validate URL
 */
export const validateUrl = (url: string): { valid: boolean; error?: string } => {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { valid: false, error: 'URL must use http or https protocol' };
        }
        return { valid: true };
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }
};

// ============================================
// KNOWLEDGE BASE WITH DOCUMENTS (Combined Fetch)
// ============================================

export interface KnowledgeBaseWithDocuments extends KnowledgeBase {
    documents: KnowledgeBaseDocument[];
}

/**
 * Get a knowledge base with all its documents
 */
export const getKnowledgeBaseWithDocuments = async (
    id: string
): Promise<KnowledgeBaseWithDocuments | null> => {
    try {
        const [knowledgeBase, documents] = await Promise.all([
            getKnowledgeBase(id),
            getDocuments(id),
        ]);

        if (!knowledgeBase) return null;

        return {
            ...knowledgeBase,
            documents,
        };
    } catch (error) {
        console.error('Error fetching knowledge base with documents:', error);
        return null;
    }
};

/**
 * Get all knowledge bases with document counts
 */
export const getKnowledgeBasesWithStats = async (): Promise<KnowledgeBase[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('knowledge_bases')
            .select(`
                *,
                knowledge_base_documents(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching knowledge bases with stats:', error);
        return [];
    }
};
