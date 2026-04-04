// ============================================
// KNOWLEDGE BASE ROUTES
// SECURITY: All routes require authentication
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../config');
const { generateKnowledgeBaseEmbeddings, generateDocumentEmbedding } = require('../services');
const { verifySupabaseAuth } = require('../lib/auth');

// Multer: memory storage, accept PDF/TXT/DOCX up to 20MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword', 'text/markdown', 'application/json'];
        // Also check extension for txt/md/json
        const ext = file.originalname.split('.').pop().toLowerCase();
        const allowedExt = ['pdf', 'txt', 'docx', 'doc', 'md', 'json'];
        if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    }
});

/**
 * Generate embeddings for documents in a knowledge base
 * POST /api/knowledge-base/:knowledgeBaseId/generate-embeddings
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/:knowledgeBaseId/generate-embeddings', verifySupabaseAuth, async (req, res) => {
    try {
        const { knowledgeBaseId } = req.params;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.userId;

        if (!knowledgeBaseId) {
            return res.status(400).json({ error: 'knowledgeBaseId is required' });
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
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/document/:documentId/generate-embedding', verifySupabaseAuth, async (req, res) => {
    try {
        const { documentId } = req.params;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.userId;

        if (!documentId) {
            return res.status(400).json({ error: 'documentId is required' });
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

/**
 * POST /api/knowledge-base/upload
 * Multipart upload: accepts PDF, TXT, DOCX, MD, JSON
 * Extracts text content, creates document record, triggers embedding
 */
router.post('/upload', verifySupabaseAuth, upload.single('file'), async (req, res) => {
    try {
        const userId = req.userId;
        const { knowledge_base_id, name } = req.body;

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        if (!knowledge_base_id) return res.status(400).json({ error: 'knowledge_base_id is required' });

        // Verify KB ownership
        const { data: kb } = await supabase
            .from('knowledge_bases')
            .select('id')
            .eq('id', knowledge_base_id)
            .eq('user_id', userId)
            .single();
        if (!kb) return res.status(404).json({ error: 'Knowledge base not found' });

        const file = req.file;
        const ext = file.originalname.split('.').pop().toLowerCase();
        let textContent = '';

        if (ext === 'pdf') {
            // Use pdf-parse to extract text
            const pdfParse = require('pdf-parse');
            const parsed = await pdfParse(file.buffer);
            textContent = parsed.text || '';
        } else if (ext === 'docx' || ext === 'doc') {
            // Use mammoth to extract text from DOCX
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            textContent = result.value || '';
        } else {
            // TXT / MD / JSON — direct text
            textContent = file.buffer.toString('utf-8');
        }

        if (!textContent || textContent.trim().length < 5) {
            return res.status(400).json({ error: 'Could not extract text from file' });
        }

        // Upload raw file to Supabase Storage
        const storagePath = `${userId}/${knowledge_base_id}/${Date.now()}_${file.originalname}`;
        await supabase.storage
            .from('knowledge-base-files')
            .upload(storagePath, file.buffer, { contentType: file.mimetype });

        // Create document record
        const { data: doc, error: dbError } = await supabase
            .from('knowledge_base_documents')
            .insert({
                knowledge_base_id,
                type: 'file',
                name: name || file.originalname,
                original_filename: file.originalname,
                file_extension: ext,
                file_size_bytes: file.size,
                storage_path: storagePath,
                content: textContent,
                text_content: textContent,
                character_count: textContent.length,
                processing_status: 'completed',
                user_id: userId,
            })
            .select()
            .single();

        if (dbError) {
            await supabase.storage.from('knowledge-base-files').remove([storagePath]);
            throw dbError;
        }

        // Trigger embedding asynchronously
        generateDocumentEmbedding(doc.id, textContent)
            .then(() => console.log(`[KB] Embedding generated for uploaded file: ${doc.name}`))
            .catch(err => console.error('[KB] Embedding error:', err.message));

        res.json({ success: true, document: doc });
    } catch (error) {
        console.error('Error uploading file to knowledge base:', error);
        res.status(500).json({ error: error.message || 'Upload failed' });
    }
});

/**
 * DELETE /api/knowledge-base/document/:documentId
 * Remove a document and its embedding from the knowledge base
 */
router.delete('/document/:documentId', verifySupabaseAuth, async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.userId;

        // Fetch document with ownership check
        const { data: doc } = await supabase
            .from('knowledge_base_documents')
            .select('id, storage_path, name')
            .eq('id', documentId)
            .eq('user_id', userId)
            .single();

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Remove file from storage if present
        if (doc.storage_path) {
            await supabase.storage
                .from('knowledge-base-files')
                .remove([doc.storage_path]);
        }

        // Delete embeddings (document_embeddings table — best-effort)
        await supabase
            .from('document_embeddings')
            .delete()
            .eq('document_id', documentId);

        // Delete the document
        const { error } = await supabase
            .from('knowledge_base_documents')
            .delete()
            .eq('id', documentId)
            .eq('user_id', userId);

        if (error) throw error;

        console.log(`[KB] Deleted document: ${doc.name}`);
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: error.message || 'Delete failed' });
    }
});

/**
 * POST /api/knowledge-base/document/:documentId/reindex
 * Re-generate embeddings for an existing document
 */
router.post('/document/:documentId/reindex', verifySupabaseAuth, async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.userId;

        const { data: doc } = await supabase
            .from('knowledge_base_documents')
            .select('id, content, text_content, name, processing_status')
            .eq('id', documentId)
            .eq('user_id', userId)
            .single();

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        const content = doc.content || doc.text_content;
        if (!content || content.length < 5) {
            return res.status(400).json({ error: 'Document has no content to re-index' });
        }

        // Mark as processing
        await supabase
            .from('knowledge_base_documents')
            .update({ processing_status: 'processing' })
            .eq('id', documentId);

        // Re-generate embedding async, then mark completed/failed
        generateDocumentEmbedding(documentId, content)
            .then(ok => supabase
                .from('knowledge_base_documents')
                .update({ processing_status: ok ? 'completed' : 'failed' })
                .eq('id', documentId)
            )
            .catch(err => {
                console.error('[KB] Reindex embedding error:', err.message);
                supabase.from('knowledge_base_documents')
                    .update({ processing_status: 'failed' })
                    .eq('id', documentId);
            });

        res.json({ success: true, message: 'Reindexing started', documentId });
    } catch (error) {
        console.error('Error reindexing document:', error);
        res.status(500).json({ error: error.message || 'Reindex failed' });
    }
});

/**
 * GET /api/knowledge-base/document/:documentId/status
 * Returns current processing status + embedding presence
 */
router.get('/document/:documentId/status', verifySupabaseAuth, async (req, res) => {
    try {
        const { documentId } = req.params;
        const userId = req.userId;

        const { data: doc } = await supabase
            .from('knowledge_base_documents')
            .select('id, name, processing_status, processing_error, character_count, updated_at')
            .eq('id', documentId)
            .eq('user_id', userId)
            .single();

        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Check if embedding exists
        const { data: embedding } = await supabase
            .from('document_embeddings')
            .select('id')
            .eq('document_id', documentId)
            .limit(1)
            .maybeSingle();

        res.json({
            id: doc.id,
            name: doc.name,
            processing_status: doc.processing_status,
            processing_error: doc.processing_error,
            character_count: doc.character_count,
            has_embedding: !!embedding,
            updated_at: doc.updated_at,
        });
    } catch (error) {
        console.error('Error fetching document status:', error);
        res.status(500).json({ error: error.message || 'Status fetch failed' });
    }
});

/**
 * Generate embeddings for documents in a knowledge base
 * POST /api/knowledge-base/:knowledgeBaseId/generate-embeddings
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/:knowledgeBaseId/generate-embeddings', verifySupabaseAuth, async (req, res) => {
    try {
        const { knowledgeBaseId } = req.params;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.userId;

        if (!knowledgeBaseId) {
            return res.status(400).json({ error: 'knowledgeBaseId is required' });
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
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/document/:documentId/generate-embedding', verifySupabaseAuth, async (req, res) => {
    try {
        const { documentId } = req.params;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.userId;

        if (!documentId) {
            return res.status(400).json({ error: 'documentId is required' });
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
