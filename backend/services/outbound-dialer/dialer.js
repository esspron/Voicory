// ============================================
// DIALER SERVICE
// Handles actual outbound call placement via Twilio
// ============================================
const { supabase, axios } = require('../../config');
const { decrypt } = require('../../lib/crypto');
const callQueue = require('./callQueue');
const tcpaChecker = require('./tcpaChecker');

// Active dialer instances per campaign
const activeDialers = new Map();

/**
 * Start the dialer for a campaign
 */
async function startDialer(userId, campaignId) {
    // Check if already running
    if (activeDialers.has(campaignId)) {
        console.log(`Dialer already running for campaign ${campaignId}`);
        return { status: 'already_running' };
    }
    
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
        .from('outbound_campaigns')
        .select(`
            *,
            phone_number:phone_numbers(*)
        `)
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();
    
    if (campaignError || !campaign) {
        throw new Error('Campaign not found');
    }
    
    if (!campaign.phone_number) {
        throw new Error('Campaign has no phone number assigned');
    }
    
    // Get user's dialer settings
    const { data: settings } = await supabase
        .from('user_dialer_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    const maxConcurrent = Math.min(
        campaign.max_concurrent_calls || 5,
        settings?.concurrent_call_slots || 1
    );
    
    // Initialize the call queue
    const queueSize = await callQueue.initializeCampaignQueue(campaignId);
    
    if (queueSize === 0) {
        throw new Error('No leads to call');
    }
    
    // Create dialer instance
    const dialerInstance = {
        campaignId,
        userId,
        campaign,
        maxConcurrent,
        isRunning: true,
        callsMade: 0,
        startedAt: new Date(),
        intervalId: null
    };
    
    activeDialers.set(campaignId, dialerInstance);
    
    // Start the dialing loop
    dialerInstance.intervalId = setInterval(async () => {
        await dialerLoop(dialerInstance);
    }, 2000); // Check every 2 seconds
    
    // Initial dial
    await dialerLoop(dialerInstance);
    
    console.log(`Dialer started for campaign ${campaignId} with ${queueSize} leads`);
    
    return {
        status: 'started',
        queueSize,
        maxConcurrent
    };
}

/**
 * Main dialer loop - places calls up to max concurrent
 */
async function dialerLoop(dialerInstance) {
    if (!dialerInstance.isRunning) return;
    
    const { campaignId, campaign, maxConcurrent, userId } = dialerInstance;
    
    // Check if within calling hours
    if (!isWithinCallingHours(campaign)) {
        console.log(`Campaign ${campaignId} outside calling hours`);
        return;
    }
    
    // Check current active calls
    const activeCount = callQueue.getActiveCallCount(campaignId);
    const availableSlots = maxConcurrent - activeCount;
    
    if (availableSlots <= 0) {
        return; // All slots busy
    }

    // Pre-flight credit check before placing more calls
    const billing = require('../billing.js');
    try {
        const { balance, hasCredits } = await billing.checkBalance(userId);
        if (!hasCredits) {
            console.warn(`[dialer] Campaign ${campaignId}: zero credits, auto-pausing`);
            dialerInstance.isRunning = false;
            // Update campaign status in DB
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
            await supabase.from('campaigns').update({ status: 'paused', paused_reason: 'insufficient_credits' }).eq('id', campaignId);
            return;
        }
        // Warn if balance is getting low (< $2 per available slot)
        if (balance < availableSlots * 2) {
            console.warn(`[dialer] Campaign ${campaignId}: low balance $${balance.toFixed(2)} for ${availableSlots} slots`);
        }
    } catch (e) {
        console.error(`[dialer] Campaign ${campaignId}: billing check failed, pausing for safety:`, e.message);
        dialerInstance.isRunning = false;
        return;
    }
    
    // Check daily limit
    const callsToday = await getTodayCallCount(campaignId);
    if (callsToday >= (campaign.max_calls_per_day || 500)) {
        console.log(`Campaign ${campaignId} reached daily limit`);
        return;
    }
    
    // Get next leads to call
    for (let i = 0; i < availableSlots; i++) {
        const lead = await callQueue.getNextLead(campaignId);
        
        if (!lead) {
            // No more leads - check if campaign should complete
            const queueStatus = callQueue.getQueueStatus(campaignId);
            if (queueStatus.queueLength === 0 && queueStatus.activeCalls === 0) {
                await completeCampaign(userId, campaignId);
            }
            break;
        }
        
        // Place the call asynchronously
        placeCall(dialerInstance, lead).catch(err => {
            console.error(`Error placing call to ${lead.phone_number}:`, err.message);
            callQueue.failLeadCall(campaignId, lead.id, err);
        });
    }
}

/**
 * Place a single outbound call
 */
async function placeCall(dialerInstance, lead) {
    const { campaignId, campaign, userId } = dialerInstance;
    const phoneConfig = campaign.phone_number;
    
    // TCPA compliance check
    const tcpaResult = await tcpaChecker.checkCompliance(userId, lead.phone_number, campaign.timezone);
    
    if (!tcpaResult.compliant) {
        console.log(`TCPA check failed for ${lead.phone_number}: ${tcpaResult.reason}`);
        await callQueue.completeLeadCall(campaignId, lead.id, {
            outcome: 'skipped',
            notes: `TCPA: ${tcpaResult.reason}`,
            shouldRetry: false
        });
        return;
    }
    
    // Mark lead as calling
    await callQueue.markLeadCalling(campaignId, lead.id);
    
    // Decrypt Twilio credentials
    let authToken;
    try {
        authToken = decrypt(phoneConfig.twilio_auth_token);
    } catch (err) {
        throw new Error('Failed to decrypt Twilio credentials');
    }
    
    // Get backend URL for webhook
    const backendUrl = process.env.BACKEND_URL || 'https://voicory-backend-783942490798.asia-south1.run.app';
    
    // Create call log entry
    const { data: callLog, error: logError } = await supabase
        .from('campaign_call_logs')
        .insert({
            campaign_id: campaignId,
            lead_id: lead.id,
            user_id: userId,
            twilio_account_sid: phoneConfig.twilio_account_sid,
            from_number: phoneConfig.twilio_phone_number,
            to_number: lead.phone_number,
            status: 'initiated',
            tcpa_compliant: true,
            compliance_checks: tcpaResult.checks,
            recipient_timezone: tcpaResult.timezone,
            recipient_local_time: tcpaResult.localTime
        })
        .select()
        .single();
    
    if (logError) {
        console.error('Error creating call log:', logError);
    }
    
    // Place call via Twilio
    try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${phoneConfig.twilio_account_sid}/Calls.json`;
        
        const callParams = new URLSearchParams({
            To: lead.phone_number,
            From: phoneConfig.twilio_phone_number,
            Url: `${backendUrl}/api/outbound-dialer/voice-handler?campaignId=${campaignId}&leadId=${lead.id}&assistantId=${campaign.assistant_id}`,
            StatusCallback: `${backendUrl}/api/outbound-dialer/status-callback?callLogId=${callLog?.id}&campaignId=${campaignId}&leadId=${lead.id}`,
            StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'].join(' '),
            Timeout: campaign.ring_timeout_seconds || 30,
            // MachineDetection: 'DetectMessageEnd', // Enable when voicemail handling is added
        });
        
        const response = await axios.post(twilioUrl, callParams.toString(), {
            auth: {
                username: phoneConfig.twilio_account_sid,
                password: authToken
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        // Update call log with Twilio SID
        if (callLog) {
            await supabase
                .from('campaign_call_logs')
                .update({ twilio_call_sid: response.data.sid })
                .eq('id', callLog.id);
        }
        
        console.log(`Call placed to ${lead.phone_number}, SID: ${response.data.sid}`);
        dialerInstance.callsMade++;
        
    } catch (error) {
        console.error('Twilio call error:', error.response?.data || error.message);
        
        // Update call log with error
        if (callLog) {
            await supabase
                .from('campaign_call_logs')
                .update({
                    status: 'failed',
                    error_code: error.response?.data?.code || 'UNKNOWN',
                    error_message: error.response?.data?.message || error.message,
                    ended_at: new Date().toISOString()
                })
                .eq('id', callLog.id);
        }
        
        throw error;
    }
}

/**
 * Stop the dialer for a campaign
 */
function stopDialer(campaignId) {
    const dialer = activeDialers.get(campaignId);
    
    if (dialer) {
        dialer.isRunning = false;
        if (dialer.intervalId) {
            clearInterval(dialer.intervalId);
        }
        activeDialers.delete(campaignId);
        callQueue.clearCampaignQueue(campaignId);
        console.log(`Dialer stopped for campaign ${campaignId}`);
    }
    
    return { status: 'stopped' };
}

/**
 * Check if current time is within campaign calling hours
 */
function isWithinCallingHours(campaign) {
    const now = new Date();
    const timezone = campaign.timezone || 'America/New_York';
    
    // Get current time in campaign timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short'
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);
    const dayName = parts.find(p => p.type === 'weekday').value;
    
    // Map day name to number (0=Sunday)
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[dayName];
    
    // Check if today is a calling day
    if (!campaign.call_days.includes(currentDay)) {
        return false;
    }
    
    // Parse start/end times
    const [startHour, startMin] = campaign.call_start_time.split(':').map(Number);
    const [endHour, endMin] = campaign.call_end_time.split(':').map(Number);
    
    const currentMinutes = hour * 60 + minute;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Get today's call count for a campaign
 */
async function getTodayCallCount(campaignId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count } = await supabase
        .from('campaign_call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .gte('initiated_at', today.toISOString());
    
    return count || 0;
}

/**
 * Complete a campaign when all calls are done
 */
async function completeCampaign(userId, campaignId) {
    stopDialer(campaignId);
    
    await supabase
        .from('outbound_campaigns')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', userId);
    
    console.log(`Campaign ${campaignId} completed`);
}

/**
 * Get dialer status
 */
function getDialerStatus(campaignId) {
    const dialer = activeDialers.get(campaignId);
    
    if (!dialer) {
        return { isRunning: false };
    }
    
    const queueStatus = callQueue.getQueueStatus(campaignId);
    
    return {
        isRunning: dialer.isRunning,
        callsMade: dialer.callsMade,
        startedAt: dialer.startedAt,
        ...queueStatus
    };
}

/**
 * Get all active dialers for a user
 */
function getActiveDialersForUser(userId) {
    const userDialers = [];
    
    for (const [campaignId, dialer] of activeDialers) {
        if (dialer.userId === userId) {
            userDialers.push({
                campaignId,
                ...getDialerStatus(campaignId)
            });
        }
    }
    
    return userDialers;
}

module.exports = {
    startDialer,
    stopDialer,
    placeCall,
    isWithinCallingHours,
    getDialerStatus,
    getActiveDialersForUser
};
