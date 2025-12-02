// ============================================
// SERVICES INDEX - Export All Services
// ============================================

const cache = require('./cache');
const assistant = require('./assistant');
const embedding = require('./embedding');
const rag = require('./rag');
const template = require('./template');
const memory = require('./memory');

module.exports = {
    // Cache
    ...cache,
    
    // Assistant
    ...assistant,
    
    // Embedding
    ...embedding,
    
    // RAG (Knowledge Base)
    ...rag,
    
    // Template
    ...template,
    
    // Memory
    ...memory
};
