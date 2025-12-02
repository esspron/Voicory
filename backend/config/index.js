// ============================================
// CONFIGURATION AND DEPENDENCIES
// ============================================
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const OpenAI = require('openai');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Security stack imports
const { encrypt, decrypt, mask } = require('../lib/crypto');
const { 
    verifySupabaseAuth, 
    optionalSupabaseAuth,
    rateLimit, 
    auditLog 
} = require('../lib/auth');
const { 
    validateBody, 
    sanitizeRequest, 
    twilioImportSchema,
    stripSensitiveFields 
} = require('../lib/validators');
const { 
    securityHeaders, 
    requestId, 
    requestTimeout, 
    ipBlocker, 
    injectionDetector 
} = require('../lib/security');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    process.exit(1);
}

// Initialize clients
const supabase = createClient(supabaseUrl, supabaseKey);

let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI client initialized');
} else {
    console.warn('⚠️ OPENAI_API_KEY not set - AI features will be disabled');
}

module.exports = {
    // External packages
    express,
    cors,
    axios,
    cheerio,
    xml2js,
    
    // Clients
    supabase,
    openai,
    
    // Security middleware
    encrypt,
    decrypt,
    mask,
    verifySupabaseAuth,
    optionalSupabaseAuth,
    rateLimit,
    auditLog,
    validateBody,
    sanitizeRequest,
    twilioImportSchema,
    stripSensitiveFields,
    securityHeaders,
    requestId,
    requestTimeout,
    ipBlocker,
    injectionDetector,
    
    // Environment
    supabaseUrl,
    supabaseKey
};
