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
 * Balanced approach: RAG for factual business info, but allows system prompt for identity/general questions
 */
function formatRAGContext(documents, ragInstructions = '') {
    if (!documents || documents.length === 0) {
        // No documents found - but DON'T override the system prompt completely
        // The AI should still use its identity and general instructions
        return `

--- KNOWLEDGE BASE STATUS ---
No specific information was found in the knowledge base for this query.

GUIDELINES:
- For questions about your identity, role, or how you can help: Use your system instructions above.
- For specific factual questions about products, pricing, policies, or business details: Say "I don't have specific information about that in my knowledge base. Is there something else I can help you with?"
- You can still have natural conversations and respond to greetings, small talk, and general questions using your personality from the system instructions.
--- END KNOWLEDGE BASE STATUS ---`;
    }
    
    let context = '\n\n--- KNOWLEDGE BASE CONTEXT (VERIFIED INFORMATION) ---\n';
    context += 'Use this verified information to answer questions about products, pricing, policies, and business details.\n\n';
    
    documents.forEach((doc, i) => {
        const content = doc.content?.slice(0, 3000) || '';
        context += `[Source ${i + 1}: ${doc.name}]\n${content}\n\n`;
    });
    
    context += '--- END KNOWLEDGE BASE CONTEXT ---\n\n';
    
    // Balanced anti-hallucination rules
    context += `📋 KNOWLEDGE BASE RULES:
1. For factual business questions (pricing, features, policies): Use ONLY the knowledge base above
2. For identity questions ("who are you", "what's your name"): Use your system instructions
3. For general conversation (greetings, small talk): Respond naturally using your personality
4. DO NOT make up prices, features, dates, or business details not in the knowledge base
5. If asked about something factual that's NOT in the knowledge base, say you don't have that information`;

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
