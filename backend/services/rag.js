// ============================================
// RAG SERVICE - Knowledge Base Search
// ============================================
const { supabase } = require('../config');
const { generateEmbedding } = require('./embedding');

/**
 * Search knowledge base documents using semantic similarity
 */
async function searchKnowledgeBase(query, knowledgeBaseIds, threshold = 0.5, maxResults = 5) {
    if (!query || !knowledgeBaseIds || knowledgeBaseIds.length === 0) {
        return [];
    }
    
    try {
        const queryEmbedding = await generateEmbedding(query);
        if (!queryEmbedding) {
            console.log('Failed to generate query embedding for RAG');
            return [];
        }
        
        const { data, error } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_threshold: threshold,
            match_count: maxResults,
            p_knowledge_base_ids: knowledgeBaseIds
        });
        
        if (error) {
            console.error('Error searching knowledge base:', error);
            return [];
        }
        
        console.log(`RAG search found ${data?.length || 0} relevant documents`);
        return data || [];
    } catch (error) {
        console.error('Error in RAG knowledge base search:', error.message);
        return [];
    }
}

/**
 * Format RAG context for injection into system prompt
 */
function formatRAGContext(documents) {
    if (!documents || documents.length === 0) {
        return '';
    }
    
    let context = '\n\n--- KNOWLEDGE BASE CONTEXT ---\n';
    context += 'Use the following verified information to answer questions:\n\n';
    
    documents.forEach((doc, i) => {
        const content = doc.content?.slice(0, 2000) || '';
        context += `[Source ${i + 1}: ${doc.name}]\n${content}\n\n`;
    });
    
    context += '--- END KNOWLEDGE BASE CONTEXT ---\n';
    context += 'IMPORTANT: If the user asks about something not covered in the knowledge base, clearly state that you don\'t have that specific information.';
    
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
