// ============================================
// RAG SERVICE - Knowledge Base Search
// ============================================
const { supabase } = require('../config');
const { generateEmbedding } = require('./embedding');

/**
 * Search knowledge base documents using semantic similarity
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
        console.log('[RAG] Generating embedding for query...');
        const queryEmbedding = await generateEmbedding(query);
        if (!queryEmbedding) {
            console.log('[RAG] Failed to generate query embedding');
            return [];
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
            return [];
        }
        
        console.log(`[RAG] match_documents returned ${data?.length || 0} documents`);
        if (data && data.length > 0) {
            console.log('[RAG] Top results:', data.map(d => ({ name: d.name, similarity: d.similarity })));
        }
        return data || [];
    } catch (error) {
        console.error('[RAG] Error in searchKnowledgeBase:', error.message);
        return [];
    }
}

/**
 * Format RAG context for injection into system prompt
 * Includes strict anti-hallucination instructions
 */
function formatRAGContext(documents, ragInstructions = '') {
    if (!documents || documents.length === 0) {
        // No documents found - return strict "no info" instruction
        return `

--- KNOWLEDGE BASE STATUS ---
⚠️ NO RELEVANT INFORMATION FOUND in the knowledge base for this query.

STRICT INSTRUCTION: Since no relevant information was found, you MUST respond with:
"I don't have information about that in my knowledge base. Is there something else I can help you with?"

DO NOT make up information. DO NOT guess. DO NOT use your general knowledge.
--- END KNOWLEDGE BASE STATUS ---`;
    }
    
    let context = '\n\n--- KNOWLEDGE BASE CONTEXT (VERIFIED INFORMATION) ---\n';
    context += '⚠️ CRITICAL: You may ONLY use the information below to answer. DO NOT add any information not present here.\n\n';
    
    documents.forEach((doc, i) => {
        const content = doc.content?.slice(0, 3000) || '';
        context += `[Source ${i + 1}: ${doc.name}]\n${content}\n\n`;
    });
    
    context += '--- END KNOWLEDGE BASE CONTEXT ---\n\n';
    
    // Add strict anti-hallucination rules
    context += `🚫 ANTI-HALLUCINATION RULES (MANDATORY):
1. ONLY use information from the KNOWLEDGE BASE CONTEXT above
2. If the user asks about something NOT in the context above, say: "I don't have information about that in my knowledge base."
3. DO NOT make up prices, features, dates, names, or any other details
4. DO NOT use your general knowledge - ONLY use the knowledge base
5. If you're unsure, say you don't have that information
6. Be specific and quote from the knowledge base when possible`;

    // Add custom RAG instructions if provided
    if (ragInstructions && ragInstructions.trim()) {
        context += `\n\nADDITIONAL INSTRUCTIONS: ${ragInstructions}`;
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
