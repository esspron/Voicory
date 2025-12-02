// ============================================
// ASSISTANT SERVICE - Cached Database Lookups
// ============================================
const { supabase, decrypt } = require('../config');
const { cacheGet, cacheSet, cacheDelete, CACHE_TTL } = require('./cache');

// Get assistant with caching
async function getCachedAssistant(assistantId) {
    const cacheKey = `assistant:${assistantId}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[CACHE HIT] Assistant ${assistantId}`);
        return cached;
    }
    
    console.log(`[CACHE MISS] Assistant ${assistantId}`);
    const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
    
    if (data && !error) {
        await cacheSet(cacheKey, data, CACHE_TTL.ASSISTANT);
    }
    return data;
}

// Get WhatsApp config with caching
async function getCachedWhatsAppConfig(wabaId) {
    const cacheKey = `waba:${wabaId}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[CACHE HIT] WhatsApp config ${wabaId}`);
        return cached;
    }
    
    console.log(`[CACHE MISS] WhatsApp config ${wabaId}`);
    const { data, error } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('waba_id', wabaId)
        .single();
    
    if (data && !error) {
        await cacheSet(cacheKey, data, CACHE_TTL.WHATSAPP_CONFIG);
    }
    return data;
}

// Get phone number config with caching (for voice calls)
async function getCachedPhoneConfig(phoneNumber) {
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    const cacheKey = `phone:${normalized}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[CACHE HIT] Phone config ${normalized}`);
        if (cached.twilio_auth_token) {
            cached.twilio_auth_token = decrypt(cached.twilio_auth_token);
        }
        return cached;
    }
    
    console.log(`[CACHE MISS] Phone config ${normalized}`);
    const { data, error } = await supabase
        .from('phone_numbers')
        .select('*, assistants(*)')
        .eq('twilio_phone_number', normalized)
        .single();
    
    if (data && !error) {
        await cacheSet(cacheKey, data, CACHE_TTL.PHONE_CONFIG);
        if (data.twilio_auth_token) {
            data.twilio_auth_token = decrypt(data.twilio_auth_token);
        }
    }
    return data;
}

// Invalidate cache when data changes
async function invalidateAssistantCache(assistantId) {
    await cacheDelete(`assistant:${assistantId}`);
    console.log(`[CACHE INVALIDATED] Assistant ${assistantId}`);
}

async function invalidateWhatsAppConfigCache(wabaId) {
    await cacheDelete(`waba:${wabaId}`);
    console.log(`[CACHE INVALIDATED] WhatsApp config ${wabaId}`);
}

async function invalidatePhoneConfigCache(phoneNumber) {
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    await cacheDelete(`phone:${normalized}`);
    console.log(`[CACHE INVALIDATED] Phone config ${normalized}`);
}

module.exports = {
    getCachedAssistant,
    getCachedWhatsAppConfig,
    getCachedPhoneConfig,
    invalidateAssistantCache,
    invalidateWhatsAppConfigCache,
    invalidatePhoneConfigCache
};
