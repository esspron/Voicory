// ============================================
// KNOWLEDGE BASE ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { generateKnowledgeBaseEmbeddings, generateDocumentEmbedding } = require('../services');

/**
 * Generate embeddings for documents in a knowledge base
 * POST /api/knowledge-base/:knowledgeBaseId/generate-embeddings
 */
router.post('/:knowledgeBaseId/generate-embeddings', async (req, res) => {
    try {
        const { knowledgeBaseId } = req.params;
        const { userId } = req.body;

        if (!knowledgeBaseId || !userId) {
            return res.status(400).json({ error: 'knowledgeBaseId and userId are required' });
        }

        // Verify ownership
        const { data: kb } = await supabase
            .from('knowledge_bases')
            .select('id, name')
            .eq('id', knowledgeBaseId)
            .eq('user_id', userId)
            .single();

        if (!kb) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }

        console.log('Generating embeddings for knowledge base:', kb.name);
        
        const result = await generateKnowledgeBaseEmbeddings(knowledgeBaseId);

        res.json({
            success: true,
            knowledgeBase: kb.name,
            embeddings: result
        });

    } catch (error) {
        console.error('Error generating embeddings:', error);
        res.status(500).json({ error: error.message || 'Failed to generate embeddings' });
    }
});

/**
 * Generate embedding for a single document
 * POST /api/knowledge-base/document/:documentId/generate-embedding
 */
router.post('/document/:documentId/generate-embedding', async (req, res) => {
    try {
        const { documentId } = req.params;
        const { userId } = req.body;

        if (!documentId || !userId) {
            return res.status(400).json({ error: 'documentId and userId are required' });
        }

        // Fetch document with ownership check
        const { data: doc } = await supabase
            .from('knowledge_base_documents')
            .select('id, content, text_content, name')
            .eq('id', documentId)
            .eq('user_id', userId)
            .single();

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const content = doc.content || doc.text_content;
        if (!content || content.length < 10) {
            return res.status(400).json({ error: 'Document has no content to embed' });
        }

        console.log('Generating embedding for document:', doc.name);
        
        const result = await generateDocumentEmbedding(doc.id, content);

        res.json({
            success: result,
            document: doc.name,
            message: result ? 'Embedding generated successfully' : 'Failed to generate embedding'
        });

    } catch (error) {
        console.error('Error generating document embedding:', error);
        res.status(500).json({ error: error.message || 'Failed to generate embedding' });
    }
});

module.exports = router;
