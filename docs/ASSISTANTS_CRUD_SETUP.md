# Assistants CRUD Setup Complete

## Summary

The database and frontend have been updated to support full assistant create/update/delete operations.

## Database Changes (Migration 004_enhanced_assistants.sql)

### New Columns Added to `assistants` Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `system_prompt` | TEXT | null | The system prompt that defines assistant behavior |
| `first_message` | TEXT | null | First message the assistant sends when starting a call |
| `elevenlabs_model_id` | TEXT | 'eleven_multilingual_v2' | ElevenLabs TTS model |
| `language` | TEXT | 'en' | Primary language code |
| `llm_provider` | TEXT | 'openai' | LLM provider (openai, anthropic, groq, together) |
| `llm_model` | TEXT | 'gpt-4o' | Specific model ID |
| `temperature` | DECIMAL(3,2) | 0.7 | LLM temperature (0.0 to 1.0) |
| `max_tokens` | INTEGER | 1024 | Max tokens for LLM response |
| `interruptible` | BOOLEAN | true | Can assistant be interrupted during speech |
| `use_default_personality` | BOOLEAN | true | Use default personality traits |
| `rag_enabled` | BOOLEAN | false | Enable RAG |
| `rag_similarity_threshold` | DECIMAL(3,2) | 0.7 | RAG similarity threshold |
| `rag_max_results` | INTEGER | 5 | Max RAG chunks to include |
| `rag_instructions` | TEXT | null | Instructions for RAG usage |
| `knowledge_base_ids` | UUID[] | {} | Linked knowledge base IDs |

### Updated Constraints

- Status now allows: `'active'`, `'inactive'`, `'draft'`

### New Index

- `idx_assistants_llm_provider` on `llm_provider`

### Call Logs Enhancement

- Added `assistant_id` column to `callyy_call_logs` for filtering by assistant

## Frontend Changes

### Updated Types (`frontend/types.ts`)

- Extended `Assistant` interface with all new fields
- Added `AssistantInput` interface for create/update operations
- Added `AssistantTool` interface for future tools support

### New Service Functions (`frontend/services/callyyService.ts`)

| Function | Description |
|----------|-------------|
| `createAssistant(input)` | Creates a new assistant |
| `updateAssistant(id, input)` | Updates an existing assistant |
| `deleteAssistant(id)` | Deletes an assistant |
| `duplicateAssistant(id)` | Creates a copy of an assistant |
| `getAssistantCallLogs(assistantId)` | Gets call logs for a specific assistant |

### Updated AssistantEditor (`frontend/pages/AssistantEditor.tsx`)

- Added `handleSave()` function that creates or updates assistants
- "Save Draft" button saves without publishing
- "Publish" button saves and sets status to 'active'
- "Update" button appears when editing a published assistant
- Shows "Unsaved" badge when there are pending changes
- Navigates to the new assistant URL after creation

## How to Apply the Migration

The migration has already been applied to your Supabase project. If you need to apply it to another environment:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `backend/supabase/migrations/004_enhanced_assistants.sql`
3. Run the SQL

## Usage Example

```typescript
import { createAssistant, updateAssistant, deleteAssistant } from '../services/callyyService';

// Create a new assistant
const newAssistant = await createAssistant({
    name: 'Sales Bot',
    systemPrompt: 'You are a helpful sales assistant...',
    firstMessage: 'Hi! How can I help you today?',
    llmProvider: 'openai',
    llmModel: 'gpt-4o',
    status: 'draft'
});

// Update an assistant
await updateAssistant(assistantId, {
    systemPrompt: 'Updated prompt...',
    status: 'active'
});

// Delete an assistant
await deleteAssistant(assistantId);
```

## Next Steps

1. ✅ Database migration applied
2. ✅ Types updated
3. ✅ CRUD functions added
4. ✅ AssistantEditor wired up
5. 🔲 Add delete confirmation dialog
6. 🔲 Add duplicate assistant button to Assistants list
7. 🔲 Add assistant-specific call logs in Analysis tab
