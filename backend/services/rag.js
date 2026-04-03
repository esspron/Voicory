// ============================================
// RAG SERVICE - Knowledge Base Search
// ============================================
const { supabase } = require('../config');
const { generateEmbedding } = require('./embedding');

// Wraps a promise with a timeout; resolves to fallback if time expires
const withTimeout = (promise, ms, fallback) =>
    Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);

// Maximum total context chars returned (800 tokens * ~4 chars/token)
const RAG_MAX_CONTEXT_CHARS = 3200;
const RAG_TIMEOUT_MS = 2000;

/**
 * Search knowledge base documents using semantic similarity.
 * - Times out after 2 seconds (graceful degradation: returns [])
 * - Truncates total returned content to ≤ 800 tokens (~3200 chars)
 */
async function searchKnowledgeBase(query, knowledgeBaseIds, threshold = 0.5, maxResults = 5) {
    console.log('[RAG] searchKnowledgeBase called:', { 
        queryLen: query?.length, 
        kbIds: knowledgeBaseIds, 
        threshold, 
        maxResults 
    });
    
    if (!query || !knowledgeBaseIds || knowledgeBaseIds.length === 0) {
        console.log('[RAG] Early return - missing query or KB IDs');
        return [];
    }
    
    try {
        // Wrap embedding fetch + vector search in a 2-second timeout for graceful degradation
        const searchPromise = (async () => {
            console.log('[RAG] Generating embedding for query...');
            const queryEmbedding = await generateEmbedding(query);
            if (!queryEmbedding) {
                console.log('[RAG] Failed to generate query embedding');
                return null;
            }
            console.log('[RAG] Query embedding generated, calling match_documents RPC...');
            
            const { data, error } = await supabase.rpc('match_documents', {
                query_embedding: queryEmbedding,
                match_threshold: threshold,
                match_count: maxResults,
                p_knowledge_base_ids: knowledgeBaseIds
            });
            
            if (error) {
                console.error('[RAG] Error from match_documents RPC:', error);
                return null;
            }
            return data || [];
        })();

        const result = await withTimeout(searchPromise, RAG_TIMEOUT_MS, null);

        if (result === null) {
            console.warn('[RAG] searchKnowledgeBase timed out or failed — returning empty (graceful degradation)');
            return [];
        }

        console.log(`[RAG] match_documents returned ${result.length} documents`);
        if (result.length > 0) {
            console.log('[RAG] Top results:', result.map(d => ({ name: d.name, similarity: d.similarity })));
        }

        // Apply token limit: accumulate chunks until total chars ≤ RAG_MAX_CONTEXT_CHARS
        let totalChars = 0;
        const trimmed = [];
        for (const doc of result) {
            const contentLen = (doc.content?.length || 0);
            if (totalChars + contentLen > RAG_MAX_CONTEXT_CHARS) {
                // Partially include this chunk if there's remaining budget
                const remaining = RAG_MAX_CONTEXT_CHARS - totalChars;
                if (remaining > 0) {
                    trimmed.push({ ...doc, content: doc.content.slice(0, remaining) });
                }
                break;
            }
            trimmed.push(doc);
            totalChars += contentLen;
        }

        if (trimmed.length < result.length) {
            console.log(`[RAG] Context trimmed from ${result.length} to ${trimmed.length} chunks (${totalChars} chars, ~${Math.round(totalChars / 4)} tokens)`);
        }

        return trimmed;
    } catch (error) {
        console.error('[RAG] Error in searchKnowledgeBase:', error.message);
        return [];
    }
}

/**
 * Format RAG context for injection into system prompt
 * Balanced approach: RAG for factual business info, but allows system prompt for identity/general questions
 */
function formatRAGContext(documents, ragInstructions = '') {
    if (!documents || documents.length === 0) {
        // No documents found - minimal guidance, let the system prompt handle it
        // Only restrict factual business questions, not identity/conversation
        return `

[Knowledge Base: No relevant documents found for this query]
Note: If user asks about specific products, pricing, or policies not in your instructions, say you'll need to check on that.`;
    }
    
    let context = '\n\n--- KNOWLEDGE BASE CONTEXT ---\n';
    context += 'Use this information to answer questions about products, pricing, policies, and business details:\n\n';
    
    documents.forEach((doc, i) => {
        const content = doc.content?.slice(0, 3000) || '';
        context += `[${doc.name}]\n${content}\n\n`;
    });
    
    context += '--- END KNOWLEDGE BASE ---\n';
    context += 'For factual questions, use the knowledge base above. For identity/general questions, use your system instructions.';

    // Add custom RAG instructions if provided
    if (ragInstructions && ragInstructions.trim()) {
        context += `\n${ragInstructions}`;
    }
    
    return context;
}

/**
 * Generate and store embedding for a knowledge base document
 */
async function generateDocumentEmbedding(documentId, content) {
    if (!content || content.length < 10) {
        console.log('Skipping embedding - content too short');
        return false;
    }
    
    try {
        const embedding = await generateEmbedding(content);
        if (!embedding) {
            console.error('Failed to generate embedding for document:', documentId);
            return false;
        }
        
        const { error } = await supabase
            .from('knowledge_base_documents')
            .update({ 
                embedding: embedding,
                processing_status: 'completed'
            })
            .eq('id', documentId);
        
        if (error) {
            console.error('Failed to store document embedding:', error);
            return false;
        }
        
        console.log('Generated and stored embedding for document:', documentId);
        return true;
    } catch (error) {
        console.error('Error generating document embedding:', error.message);
        return false;
    }
}

/**
 * Generate embeddings for all documents in a knowledge base
 */
async function generateKnowledgeBaseEmbeddings(knowledgeBaseId) {
    try {
        const { data: documents, error } = await supabase
            .from('knowledge_base_documents')
            .select('id, content, text_content')
            .eq('knowledge_base_id', knowledgeBaseId)
            .is('embedding', null);
        
        if (error || !documents) {
            console.error('Error fetching documents for embedding:', error);
            return { success: 0, failed: 0 };
        }
        
        console.log(`Generating embeddings for ${documents.length} documents in KB:`, knowledgeBaseId);
        
        let success = 0;
        let failed = 0;
        
        for (const doc of documents) {
            const content = doc.content || doc.text_content;
            const result = await generateDocumentEmbedding(doc.id, content);
            if (result) success++;
            else failed++;
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Embedding generation complete: ${success} success, ${failed} failed`);
        return { success, failed };
    } catch (error) {
        console.error('Error in batch embedding generation:', error.message);
        return { success: 0, failed: 0 };
    }
}

module.exports = {
    searchKnowledgeBase,
    formatRAGContext,
    generateDocumentEmbedding,
    generateKnowledgeBaseEmbeddings
};
