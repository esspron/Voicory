# Knowledge Base Database Schema - Setup Complete

## Overview

This document describes the database schema for the Knowledge Base feature, which supports three types of document sources:

1. **File Upload** - Upload `.txt`, `.json`, or `.md` files
2. **URL Crawling** - Crawl and save data from websites
3. **Text Input** - Manual text entry (up to 10,000 characters)

## Database Tables

### 1. `knowledge_bases`
Main table to store knowledge base collections.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Name of the knowledge base |
| `description` | TEXT | Optional description |
| `status` | TEXT | `active`, `inactive`, or `processing` |
| `total_documents` | INTEGER | Count of documents (auto-updated) |
| `total_characters` | INTEGER | Total characters (auto-updated) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `user_id` | UUID | Owner user ID (RLS enforced) |

### 2. `knowledge_base_documents`
Stores individual documents within a knowledge base.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `knowledge_base_id` | UUID | Reference to parent knowledge base |
| `type` | TEXT | `file`, `url`, or `text` |
| `name` | TEXT | Document name/title |
| **File-specific columns:** | | |
| `original_filename` | TEXT | Original uploaded filename |
| `file_extension` | TEXT | `txt`, `json`, or `md` |
| `file_size_bytes` | INTEGER | File size in bytes |
| `storage_path` | TEXT | Supabase Storage path |
| **URL-specific columns:** | | |
| `source_url` | TEXT | Source URL to crawl |
| `crawl_depth` | INTEGER | How many levels deep to crawl |
| `last_crawled_at` | TIMESTAMPTZ | Last successful crawl time |
| **Text-specific columns:** | | |
| `text_content` | TEXT | Direct text input (max 10,000 chars) |
| **Common columns:** | | |
| `content` | TEXT | Processed/extracted content |
| `character_count` | INTEGER | Character count (auto-calculated) |
| `word_count` | INTEGER | Word count (auto-calculated) |
| `processing_status` | TEXT | `pending`, `processing`, `completed`, `failed` |
| `processing_error` | TEXT | Error message if processing failed |
| `metadata` | JSONB | Flexible metadata storage |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `user_id` | UUID | Owner user ID (RLS enforced) |

### 3. `knowledge_base_crawled_pages`
Stores individual pages crawled from URL documents.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `document_id` | UUID | Reference to parent document |
| `page_url` | TEXT | URL of the crawled page |
| `page_title` | TEXT | Page title |
| `content` | TEXT | Extracted content |
| `character_count` | INTEGER | Character count |
| `crawl_status` | TEXT | `pending`, `crawling`, `completed`, `failed` |
| `crawl_error` | TEXT | Error message if crawl failed |
| `http_status_code` | INTEGER | HTTP response code |
| `metadata` | JSONB | Additional page metadata |
| `crawled_at` | TIMESTAMPTZ | Crawl timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `user_id` | UUID | Owner user ID (RLS enforced) |

## Features

### Auto-updating Counts
- `character_count` and `word_count` are automatically calculated when documents are inserted/updated
- `total_documents` and `total_characters` in `knowledge_bases` table are auto-maintained via triggers

### Text Content Limit
- The `text_content` field has a database-level constraint enforcing the 10,000 character limit
- Validation: `CHECK (char_length(text_content) <= 10000)`

### File Types Supported
- `.txt` - Plain text files
- `.json` - JSON files
- `.md` - Markdown files

### URL Crawling
- Supports configurable crawl depth
- Tracks individual crawled pages in `knowledge_base_crawled_pages`
- Stores HTTP status codes and errors for debugging

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring users can only:
- View their own data
- Insert data with their own `user_id`
- Update/Delete their own data

## Setup Instructions

### 1. Apply the Migration

Copy the contents of `backend/supabase/migrations/003_knowledge_base.sql` and run it in your Supabase Dashboard SQL Editor.

### 2. Create Storage Bucket

In Supabase Dashboard → Storage:

1. Create a new bucket named `knowledge-base-files`
2. Set it to **Private** (not public)
3. Configure allowed MIME types:
   - `text/plain`
   - `application/json`
   - `text/markdown`
4. Set max file size: 100MB

### 3. Storage Bucket Policies

Add the following RLS policies for the `knowledge-base-files` bucket:

**Policy: Users can upload files to their folder**
```sql
-- For INSERT operations
(bucket_id = 'knowledge-base-files' AND auth.uid()::text = (storage.foldername(name))[1])
```

**Policy: Users can read their files**
```sql
-- For SELECT operations
(bucket_id = 'knowledge-base-files' AND auth.uid()::text = (storage.foldername(name))[1])
```

**Policy: Users can delete their files**
```sql
-- For DELETE operations
(bucket_id = 'knowledge-base-files' AND auth.uid()::text = (storage.foldername(name))[1])
```

## Usage Examples

### Creating a Knowledge Base
```typescript
const { data, error } = await supabase
  .from('knowledge_bases')
  .insert({
    name: 'Product Documentation',
    description: 'All product-related docs',
    user_id: userId
  })
  .select()
  .single();
```

### Adding a Text Document
```typescript
const { data, error } = await supabase
  .from('knowledge_base_documents')
  .insert({
    knowledge_base_id: kbId,
    type: 'text',
    name: 'FAQ Content',
    text_content: 'Your text content here (max 10,000 characters)...',
    processing_status: 'completed',
    user_id: userId
  })
  .select()
  .single();
```

### Adding a File Document
```typescript
// 1. Upload file to storage
const filePath = `${userId}/${kbId}/${fileName}`;
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('knowledge-base-files')
  .upload(filePath, file);

// 2. Create document record
const { data, error } = await supabase
  .from('knowledge_base_documents')
  .insert({
    knowledge_base_id: kbId,
    type: 'file',
    name: fileName,
    original_filename: file.name,
    file_extension: 'txt',
    file_size_bytes: file.size,
    storage_path: filePath,
    processing_status: 'pending',
    user_id: userId
  })
  .select()
  .single();
```

### Adding a URL Document
```typescript
const { data, error } = await supabase
  .from('knowledge_base_documents')
  .insert({
    knowledge_base_id: kbId,
    type: 'url',
    name: 'Company Website',
    source_url: 'https://example.com',
    crawl_depth: 2,
    processing_status: 'pending',
    user_id: userId
  })
  .select()
  .single();
```

### Fetching Knowledge Bases with Document Count
```typescript
const { data, error } = await supabase
  .from('knowledge_bases')
  .select('*, knowledge_base_documents(count)')
  .order('created_at', { ascending: false });
```

## Storage Path Convention

Files are stored with the following path structure:
```
{user_id}/{knowledge_base_id}/{original_filename}
```

Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890/kb-uuid/documentation.md`

## Migration File Location

`backend/supabase/migrations/003_knowledge_base.sql`

---

**Schema Version:** 003
**Created:** November 2025
**Status:** ✅ Ready for deployment
