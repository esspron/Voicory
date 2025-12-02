// ============================================
// WHATSAPP OAUTH ROUTES - OAuth Callback
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, encrypt } = require('../config');

router.post('/api/whatsapp/oauth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(500).json({ error: 'Server configuration error: Missing Facebook credentials' });
    }

    // 1. Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Get WABA details using the access token
    // We first get the user's ID (System User) and their businesses/accounts
    const meResponse = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,accounts' // accounts usually contains the pages/WABAs
      }
    });

    // Note: The structure of the response depends on what the user shared.
    // For Embedded Signup, we typically look for the WABA in the shared accounts.
    // If 'accounts' is empty, we might need to check 'businesses' or specific edges.
    
    // However, a more direct way often used in Embedded Signup is to query the debug_token 
    // to see what granular scopes/assets were granted, OR just list the WABAs this token can access.
    
    // Let's try to fetch WABAs directly if possible, or iterate through accounts.
    // A common pattern for System Users created via Embedded Signup is that they have access to the WABA.
    
    // Let's try to fetch the WABAs associated with this token.
    // Since we don't know the WABA ID, we can try to list client_whatsapp_business_accounts if this was a Tech Provider flow,
    // but for direct integration, we check 'accounts'.
    
    // FALLBACK: If we can't easily determine the WABA from /me, we might need the frontend to pass the WABA ID 
    // if it was available in the client response (it often is in the 'config' object of the JS SDK response).
    // But let's assume we need to find it.
    
    // Strategy: Get the WABA ID.
    // The System User should have access to the WABA.
    // Let's try to get the WABA ID from the token debug endpoint or by listing accounts.
    
    // For now, let's assume the first account found is the target, or we return the token and let the user pick?
    // No, the UI expects a single config.
    
    // Let's try to fetch phone numbers directly if we can find the WABA.
    // Actually, let's fetch the WABA ID from the 'granularity' of the token if available, 
    // or just list the WABAs.
    
    // A reliable way:
    // GET /v21.0/me/accounts?fields=name,category,id
    // Filter for category = 'WhatsApp Business Account' (though sometimes it's not explicit).
    
    // Let's try a different approach:
    // The token belongs to a System User. That System User is added to the WABA.
    // We can query: GET /v21.0/me/assigned_business_accounts (if applicable) or just /me/accounts.
    
    // Let's stick to a simple flow:
    // 1. Get Token.
    // 2. Get WABA (we'll assume the token gives access to the one created/selected).
    // 3. Get Phone Number.

    // Let's try to get the shared WABA ID.
    // In many Embedded Signup implementations, the WABA ID is passed in the initial setup, 
    // but if we only have the code, we must discover it.
    
    // Let's try to fetch the WABAs this user has access to.
    const accountsResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: {
            access_token: accessToken,
            fields: 'id,name,category,access_token'
        }
    });
    
    // This endpoint usually returns Pages. WABAs are different.
    // WABAs are accessed via the Business Manager.
    
    // Let's try fetching the WABAs directly.
    // There isn't a direct /me/whatsapp_business_accounts endpoint for System Users in the same way.
    // However, we can try to get the business ID and then list WABAs.
    
    // SIMPLIFICATION FOR MVP:
    // We will return the access token and the user's name.
    // We will try to fetch the phone number if we can find a WABA.
    // If we can't find it automatically, we might need to ask the user to enter the WABA ID, 
    // but the UI expects us to return it.
    
    // Let's try to get the WABA ID from the debug_token endpoint which lists the granular scopes.
    const debugTokenResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
        params: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`
        }
    });
    
    const granularScopes = debugTokenResponse.data.data.granular_scopes || [];
    let wabaId = null;
    
    // Look for whatsapp_business_management scope and its target_ids
    const wabaScope = granularScopes.find(scope => scope.scope === 'whatsapp_business_management');
    if (wabaScope && wabaScope.target_ids && wabaScope.target_ids.length > 0) {
        wabaId = wabaScope.target_ids[0];
    }
    
    if (!wabaId) {
        // Fallback: Try to find it via other means or throw error
        // For now, let's try to proceed or return what we have.
        // If we can't find WABA ID, we can't find phone numbers.
        console.log('Could not find WABA ID in granular scopes. Response:', JSON.stringify(debugTokenResponse.data));
        // We might need to return an error or ask the user to provide it.
        // But let's try to fetch phone numbers from the 'me' endpoint if it acts as a WABA context? No.
    }

    let phoneNumberId = '';
    let displayPhoneNumber = '';
    let displayName = '';

    if (wabaId) {
        // Fetch phone numbers for this WABA
        const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`, {
            params: {
                access_token: accessToken
            }
        });
        
        if (phoneNumbersResponse.data.data && phoneNumbersResponse.data.data.length > 0) {
            const phoneData = phoneNumbersResponse.data.data[0];
            phoneNumberId = phoneData.id;
            displayPhoneNumber = phoneData.display_phone_number;
            displayName = phoneData.verified_name || phoneData.display_phone_number;
        }
    }

    res.json({
        accessToken,
        wabaId: wabaId || '',
        phoneNumberId,
        displayPhoneNumber,
        displayName: displayName || 'WhatsApp Business'
    });

  } catch (error) {
    console.error('OAuth Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
        error: 'Failed to complete OAuth flow', 
        details: error.response ? error.response.data : error.message 
    });
  }
});


module.exports = router;
