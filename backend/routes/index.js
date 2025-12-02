// ============================================
// ROUTES INDEX - Export All Routes
// ============================================
const healthRoutes = require('./health');
const crawlerRoutes = require('./crawler');
const knowledgeBaseRoutes = require('./knowledgeBase');

// Note: The following routes need conversion to Express Router format
// They will be imported in the main index.js for now

module.exports = {
    healthRoutes,
    crawlerRoutes,
    knowledgeBaseRoutes
};
