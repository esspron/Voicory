// ============================================
// EMBEDDING SERVICE - OpenAI Embeddings
// ============================================
const { supabase, openai } = require('../config');

// Generate embedding for text using OpenAI
async function generateEmbedding(text) {
    if (!openai || !text) return null;
    
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000)
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        return null;
    }
}

// Store message embedding
async function storeMessageEmbedding(messageId, customerId, userId, content, role) {
    if (!content || content.length < 5) return;
    
    const embedding = await generateEmbedding(content);
    if (!embedding) return;
    
    try {
        await supabase
            .from('message_embeddings')
            .insert({
                message_id: messageId,
                customer_id: customerId,
                user_id: userId,
                content: content,
                role: role,
                embedding: embedding
            });
        console.log('Stored embedding for message');
    } catch (error) {
        console.error('Error storing embedding:', error.message);
    }
}

// Search for relevant messages using semantic similarity
async function searchRelevantMessages(customerId, query, limit = 8) {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];
    
    try {
        const { data, error } = await supabase.rpc('search_customer_messages', {
            p_customer_id: customerId,
            p_query_embedding: queryEmbedding,
            p_limit: limit
        });
        
        if (error) {
            console.error('Error searching messages:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error in semantic search:', error.message);
        return [];
    }
}

module.exports = {
    generateEmbedding,
    storeMessageEmbedding,
    searchRelevantMessages
};
