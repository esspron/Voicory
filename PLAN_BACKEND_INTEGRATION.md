# Backend Integration & Configuration Plan

This plan outlines the steps to fully enable backend configurations for Voice Libraries, Phone Numbers, Knowledge Bases, Customers, API Keys, and Call Logs.

## 1. Database Schema Updates
We need to extend the Supabase schema to support Knowledge Bases, which are currently missing.

### New Migration: `003_knowledge_base.sql`
- **Table**: `knowledge_bases`
  - `id`: UUID (PK)
  - `name`: Text
  - `type`: Text (Enum: 'text', 'file', 'url')
  - `content`: Text (Stores the raw text, URL, or file path)
  - `status`: Text (Enum: 'processing', 'ready', 'error')
  - `user_id`: UUID (FK to auth.users)
  - `created_at`, `updated_at`
- **RLS Policies**: Standard CRUD for owner.

## 2. Storage Configuration
For Knowledge Base files (PDFs, Docs), we need a Supabase Storage Bucket.
- **Bucket Name**: `knowledge-base-files`
- **Policies**: Authenticated users can upload/read their own files.

## 3. Backend Service Updates (`frontend/services/callyyService.ts`)
We need to implement the missing methods to connect the frontend to the database.

### Knowledge Base
- `getKnowledgeBases()`
- `createKnowledgeBase(kb)`
- `deleteKnowledgeBase(id)`
- *Note*: File upload logic will need to interact with Supabase Storage.

### API Keys
- `createApiKey(key)`
- `deleteApiKey(id)`

### Call Logs
- Ensure `getCallLogs` is wired up (already exists).
- *Future*: Add `ingestCallLog` webhook in Node.js backend to receive real logs from Callyy.

## 4. Phone Number Import Logic
To "import and configure mobile numbers from different platforms" (e.g., Twilio), we cannot call 3rd party APIs directly from the browser due to CORS and security.

### Node.js Backend (`backend/index.js`)
We will add proxy endpoints that use the user's stored credentials to fetch data.
- `POST /api/providers/twilio/list-numbers`: Accepts Twilio credentials, returns list of numbers.
- `POST /api/providers/vonage/list-numbers`: Similar for Vonage.

## 5. Voice Library Integration
To "add voice libraries", we need to fetch available voices from providers (11Labs, Callyy, etc.).
- **Strategy**:
  - If using a platform-wide key: Proxy through `backend/index.js`.
  - If using user's key: Proxy through `backend/index.js` (to avoid CORS).
- **Action**: Add `POST /api/voices/list-available` to backend.

## 6. Execution Steps
1.  **Apply Migration**: Create and run `003_knowledge_base.sql`.
2.  **Update Service**: Edit `callyyService.ts` to include Knowledge Base and API Key methods.
3.  **Enhance Backend**: Update `backend/index.js` with proxy routes for Twilio/Voice providers.
4.  **Frontend Integration**: Update `KnowledgeBase.tsx`, `PhoneNumbers.tsx`, etc., to use the new service methods and backend endpoints.

---
**Next Step**: Shall I proceed with creating the `003_knowledge_base.sql` migration file?
