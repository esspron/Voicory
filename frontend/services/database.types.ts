// TypeScript types for Supabase database schema
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            voices: {
                Row: {
                    id: string
                    name: string
                    provider: '11labs' | 'playht' | 'callyy' | 'azure'
                    language: string
                    accent: string
                    gender: 'Male' | 'Female'
                    cost_per_min: number
                    preview_url: string
                    tags: string[]
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    provider: '11labs' | 'playht' | 'callyy' | 'azure'
                    language: string
                    accent: string
                    gender: 'Male' | 'Female'
                    cost_per_min: number
                    preview_url: string
                    tags?: string[]
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    provider?: '11labs' | 'playht' | 'callyy' | 'azure'
                    language?: string
                    accent?: string
                    gender?: 'Male' | 'Female'
                    cost_per_min?: number
                    preview_url?: string
                    tags?: string[]
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            assistants: {
                Row: {
                    id: string
                    name: string
                    model: string
                    voice_id: string
                    transcriber: string
                    status: 'active' | 'inactive'
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    model: string
                    voice_id: string
                    transcriber: string
                    status?: 'active' | 'inactive'
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    model?: string
                    voice_id?: string
                    transcriber?: string
                    status?: 'active' | 'inactive'
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            phone_numbers: {
                Row: {
                    id: string
                    number: string
                    provider: 'Callyy' | 'Twilio' | 'Vonage'
                    assistant_id: string | null
                    label: string | null
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    number: string
                    provider: 'Callyy' | 'Twilio' | 'Vonage'
                    assistant_id?: string | null
                    label?: string | null
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    number?: string
                    provider?: 'Callyy' | 'Twilio' | 'Vonage'
                    assistant_id?: string | null
                    label?: string | null
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            api_keys: {
                Row: {
                    id: string
                    label: string
                    key: string
                    type: 'public' | 'private'
                    created_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    label: string
                    key: string
                    type: 'public' | 'private'
                    created_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    label?: string
                    key?: string
                    type?: 'public' | 'private'
                    created_at?: string
                    user_id?: string
                }
            }
            call_logs: {
                Row: {
                    id: string
                    assistant_name: string
                    phone_number: string
                    duration: string
                    cost: number
                    status: 'completed' | 'failed' | 'ongoing'
                    created_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    assistant_name: string
                    phone_number: string
                    duration: string
                    cost: number
                    status: 'completed' | 'failed' | 'ongoing'
                    created_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    assistant_name?: string
                    phone_number?: string
                    duration?: string
                    cost?: number
                    status?: 'completed' | 'failed' | 'ongoing'
                    created_at?: string
                    user_id?: string
                }
            }
            customers: {
                Row: {
                    id: string
                    name: string
                    email: string
                    phone_number: string
                    variables: Json
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    phone_number: string
                    variables?: Json
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    phone_number?: string
                    variables?: Json
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            knowledge_bases: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    status: 'active' | 'inactive' | 'processing'
                    total_documents: number
                    total_characters: number
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    status?: 'active' | 'inactive' | 'processing'
                    total_documents?: number
                    total_characters?: number
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    status?: 'active' | 'inactive' | 'processing'
                    total_documents?: number
                    total_characters?: number
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            knowledge_base_documents: {
                Row: {
                    id: string
                    knowledge_base_id: string
                    type: 'file' | 'url' | 'text'
                    name: string
                    original_filename: string | null
                    file_extension: 'txt' | 'json' | 'md' | null
                    file_size_bytes: number | null
                    storage_path: string | null
                    source_url: string | null
                    crawl_depth: number | null
                    last_crawled_at: string | null
                    text_content: string | null
                    content: string | null
                    character_count: number
                    word_count: number
                    processing_status: 'pending' | 'processing' | 'completed' | 'failed'
                    processing_error: string | null
                    metadata: Json
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    knowledge_base_id: string
                    type: 'file' | 'url' | 'text'
                    name: string
                    original_filename?: string | null
                    file_extension?: 'txt' | 'json' | 'md' | null
                    file_size_bytes?: number | null
                    storage_path?: string | null
                    source_url?: string | null
                    crawl_depth?: number | null
                    last_crawled_at?: string | null
                    text_content?: string | null
                    content?: string | null
                    character_count?: number
                    word_count?: number
                    processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
                    processing_error?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    knowledge_base_id?: string
                    type?: 'file' | 'url' | 'text'
                    name?: string
                    original_filename?: string | null
                    file_extension?: 'txt' | 'json' | 'md' | null
                    file_size_bytes?: number | null
                    storage_path?: string | null
                    source_url?: string | null
                    crawl_depth?: number | null
                    last_crawled_at?: string | null
                    text_content?: string | null
                    content?: string | null
                    character_count?: number
                    word_count?: number
                    processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
                    processing_error?: string | null
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            knowledge_base_crawled_pages: {
                Row: {
                    id: string
                    document_id: string
                    page_url: string
                    page_title: string | null
                    content: string | null
                    character_count: number
                    crawl_status: 'pending' | 'crawling' | 'completed' | 'failed'
                    crawl_error: string | null
                    http_status_code: number | null
                    metadata: Json
                    crawled_at: string | null
                    created_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    document_id: string
                    page_url: string
                    page_title?: string | null
                    content?: string | null
                    character_count?: number
                    crawl_status?: 'pending' | 'crawling' | 'completed' | 'failed'
                    crawl_error?: string | null
                    http_status_code?: number | null
                    metadata?: Json
                    crawled_at?: string | null
                    created_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    document_id?: string
                    page_url?: string
                    page_title?: string | null
                    content?: string | null
                    character_count?: number
                    crawl_status?: 'pending' | 'crawling' | 'completed' | 'failed'
                    crawl_error?: string | null
                    http_status_code?: number | null
                    metadata?: Json
                    crawled_at?: string | null
                    created_at?: string
                    user_id?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            calculate_word_count: {
                Args: { input_text: string }
                Returns: number
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}
