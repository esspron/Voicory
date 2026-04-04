// ============================================
// OUTBOUND DIALER ROUTES
// Campaign management, leads, and dialer control
// ============================================
const express = require('express');
const router = express.Router();
const { verifySupabaseAuth } = require('../lib/auth');
const { 
    createCampaign, 
    updateCampaign, 
    getCampaign, 
    listCampaigns, 
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    completeCampaign,
    getCampaignStats
} = require('../services/outbound-dialer/campaignManager');
const {
    startDialer,
    stopDialer,
    getDialerStatus,
    getActiveDialersForUser
} = require('../services/outbound-dialer/dialer');
const {
    importLeadsFromCSV,
    createLead,
    updateLead,
    deleteLead,
    getLeads,
    bulkUpdateLeads,
    bulkDeleteLeads,
    getLeadCallHistory
} = require('../services/outbound-dialer/leadProcessor');
const {
    addToDNC,
    removeFromDNC,
    recordConsent,
    getDNCList
} = require('../services/outbound-dialer/tcpaChecker');
const { supabase } = require('../config');

// ============================================
// CAMPAIGN ROUTES
// ============================================

/**
 * Create a new campaign
 * POST /api/outbound-dialer/campaigns
 */
router.post('/campaigns', verifySupabaseAuth, async (req, res) => {
    try {
        const campaign = await createCampaign(req.userId, req.body);
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * List all campaigns
 * GET /api/outbound-dialer/campaigns
 */
router.get('/campaigns', verifySupabaseAuth, async (req, res) => {
    try {
        const { status, campaignType, limit, offset } = req.query;
        const campaigns = await listCampaigns(req.userId, {
            status,
            campaignType,
            limit: parseInt(limit) || undefined,
            offset: parseInt(offset) || undefined
        });
        res.json({ success: true, campaigns });
    } catch (error) {
        console.error('Error listing campaigns:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get a single campaign
 * GET /api/outbound-dialer/campaigns/:id
 */
router.get('/campaigns/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const campaign = await getCampaign(req.userId, req.params.id);
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update a campaign
 * PUT /api/outbound-dialer/campaigns/:id
 */
router.put('/campaigns/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const campaign = await updateCampaign(req.userId, req.params.id, req.body);
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a campaign
 * DELETE /api/outbound-dialer/campaigns/:id
 */
router.delete('/campaigns/:id', verifySupabaseAuth, async (req, res) => {
    try {
        await deleteCampaign(req.userId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get campaign statistics
 * GET /api/outbound-dialer/campaigns/:id/stats
 */
router.get('/campaigns/:id/stats', verifySupabaseAuth, async (req, res) => {
    try {
        const stats = await getCampaignStats(req.userId, req.params.id);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error fetching campaign stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DIALER CONTROL ROUTES
// ============================================

/**
 * Start a campaign (changes status to active)
 * POST /api/outbound-dialer/campaigns/:id/start
 */
router.post('/campaigns/:id/start', verifySupabaseAuth, async (req, res) => {
    try {
        // First update campaign status
        const campaign = await startCampaign(req.userId, req.params.id);
        
        // Then start the dialer
        const dialerResult = await startDialer(req.userId, req.params.id);
        
        res.json({ 
            success: true, 
            campaign,
            dialer: dialerResult
        });
    } catch (error) {
        console.error('Error starting campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Pause a campaign
 * POST /api/outbound-dialer/campaigns/:id/pause
 */
router.post('/campaigns/:id/pause', verifySupabaseAuth, async (req, res) => {
    try {
        // Stop the dialer first
        stopDialer(req.params.id);
        
        // Then update campaign status
        const campaign = await pauseCampaign(req.userId, req.params.id);
        
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error pausing campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Resume a paused campaign
 * POST /api/outbound-dialer/campaigns/:id/resume
 */
router.post('/campaigns/:id/resume', verifySupabaseAuth, async (req, res) => {
    try {
        // Update campaign status
        const campaign = await resumeCampaign(req.userId, req.params.id);
        
        // Restart the dialer
        const dialerResult = await startDialer(req.userId, req.params.id);
        
        res.json({ 
            success: true, 
            campaign,
            dialer: dialerResult
        });
    } catch (error) {
        console.error('Error resuming campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Stop/complete a campaign
 * POST /api/outbound-dialer/campaigns/:id/stop
 */
router.post('/campaigns/:id/stop', verifySupabaseAuth, async (req, res) => {
    try {
        // Stop the dialer
        stopDialer(req.params.id);
        
        // Mark campaign as completed or paused based on query param
        const markComplete = req.query.complete === 'true';
        const campaign = markComplete 
            ? await completeCampaign(req.userId, req.params.id)
            : await pauseCampaign(req.userId, req.params.id);
        
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error stopping campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get dialer status for a campaign
 * GET /api/outbound-dialer/campaigns/:id/dialer-status
 */
router.get('/campaigns/:id/dialer-status', verifySupabaseAuth, async (req, res) => {
    try {
        const status = getDialerStatus(req.params.id);
        res.json({ success: true, status });
    } catch (error) {
        console.error('Error getting dialer status:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all active dialers for user
 * GET /api/outbound-dialer/active-dialers
 */
router.get('/active-dialers', verifySupabaseAuth, async (req, res) => {
    try {
        const dialers = getActiveDialersForUser(req.userId);
        res.json({ success: true, dialers });
    } catch (error) {
        console.error('Error getting active dialers:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LEAD ROUTES
// ============================================

/**
 * Get leads for a campaign
 * GET /api/outbound-dialer/campaigns/:id/leads
 */
router.get('/campaigns/:id/leads', verifySupabaseAuth, async (req, res) => {
    try {
        const { status, disposition, search, sortField, sortOrder, page, limit } = req.query;
        const result = await getLeads(req.userId, req.params.id, {
            status,
            disposition,
            search,
            sortField,
            sortOrder,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50
        });
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create a single lead
 * POST /api/outbound-dialer/campaigns/:id/leads
 */
router.post('/campaigns/:id/leads', verifySupabaseAuth, async (req, res) => {
    try {
        const lead = await createLead(req.userId, req.params.id, req.body);
        res.json({ success: true, lead });
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Import leads from CSV data
 * POST /api/outbound-dialer/campaigns/:id/leads/import
 */
router.post('/campaigns/:id/leads/import', verifySupabaseAuth, async (req, res) => {
    try {
        const { data, mappings } = req.body;
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }
        
        const result = await importLeadsFromCSV(req.userId, req.params.id, data, mappings);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error importing leads:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update a lead
 * PUT /api/outbound-dialer/leads/:id
 */
router.put('/leads/:id', verifySupabaseAuth, async (req, res) => {
    try {
        const lead = await updateLead(req.userId, req.params.id, req.body);
        res.json({ success: true, lead });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete a lead
 * DELETE /api/outbound-dialer/leads/:id
 */
router.delete('/leads/:id', verifySupabaseAuth, async (req, res) => {
    try {
        await deleteLead(req.userId, req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get lead call history
 * GET /api/outbound-dialer/leads/:id/calls
 */
router.get('/leads/:id/calls', verifySupabaseAuth, async (req, res) => {
    try {
        const calls = await getLeadCallHistory(req.userId, req.params.id);
        res.json({ success: true, calls });
    } catch (error) {
        console.error('Error fetching lead call history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Bulk update leads
 * POST /api/outbound-dialer/leads/bulk-update
 */
router.post('/leads/bulk-update', verifySupabaseAuth, async (req, res) => {
    try {
        const { leadIds, updates } = req.body;
        
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'No lead IDs provided' });
        }
        
        const result = await bulkUpdateLeads(req.userId, leadIds, updates);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error bulk updating leads:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Bulk delete leads
 * POST /api/outbound-dialer/leads/bulk-delete
 */
router.post('/leads/bulk-delete', verifySupabaseAuth, async (req, res) => {
    try {
        const { leadIds } = req.body;
        
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'No lead IDs provided' });
        }
        
        const result = await bulkDeleteLeads(req.userId, leadIds);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error bulk deleting leads:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DNC & CONSENT ROUTES
// ============================================

/**
 * Get DNC list
 * GET /api/outbound-dialer/dnc
 */
router.get('/dnc', verifySupabaseAuth, async (req, res) => {
    try {
        const { limit } = req.query;
        const list = await getDNCList(req.userId, { 
            limit: parseInt(limit) || 100 
        });
        res.json({ success: true, list });
    } catch (error) {
        console.error('Error fetching DNC list:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Add to DNC list
 * POST /api/outbound-dialer/dnc
 */
router.post('/dnc', verifySupabaseAuth, async (req, res) => {
    try {
        const { phoneNumber, reason } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        const entry = await addToDNC(req.userId, phoneNumber, reason, 'manual');
        res.json({ success: true, entry });
    } catch (error) {
        console.error('Error adding to DNC:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Remove from DNC list
 * DELETE /api/outbound-dialer/dnc/:phoneNumber
 */
router.delete('/dnc/:phoneNumber', verifySupabaseAuth, async (req, res) => {
    try {
        await removeFromDNC(req.userId, decodeURIComponent(req.params.phoneNumber));
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing from DNC:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Record consent
 * POST /api/outbound-dialer/consent
 */
router.post('/consent', verifySupabaseAuth, async (req, res) => {
    try {
        const { phoneNumber, type, source, proofUrl, metadata } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number required' });
        }
        
        const consent = await recordConsent(req.userId, phoneNumber, {
            type: type || 'implied',
            source: source || 'manual_entry',
            proofUrl,
            ipAddress: req.ip,
            metadata
        });
        res.json({ success: true, consent });
    } catch (error) {
        console.error('Error recording consent:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DIALER SETTINGS ROUTES
// ============================================

/**
 * Get user dialer settings
 * GET /api/outbound-dialer/settings
 */
router.get('/settings', verifySupabaseAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_dialer_settings')
            .select('*')
            .eq('user_id', req.userId)
            .maybeSingle();
        
        if (error) throw error;
        
        // Return defaults if no settings exist
        res.json({
            success: true,
            settings: data || {
                concurrent_call_slots: 1,
                default_timezone: 'America/New_York',
                default_call_start_hour: 9,
                default_call_end_hour: 20,
                default_max_attempts: 3,
                default_retry_delay_hours: 4,
                respect_dnc: true,
                require_consent: true
            }
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update user dialer settings
 * PUT /api/outbound-dialer/settings
 */
router.put('/settings', verifySupabaseAuth, async (req, res) => {
    try {
        const updates = {
            user_id: req.userId,
            updated_at: new Date().toISOString()
        };
        
        if (req.body.concurrentCallSlots !== undefined) updates.concurrent_call_slots = req.body.concurrentCallSlots;
        if (req.body.defaultTimezone !== undefined) updates.default_timezone = req.body.defaultTimezone;
        if (req.body.defaultCallStartHour !== undefined) updates.default_call_start_hour = req.body.defaultCallStartHour;
        if (req.body.defaultCallEndHour !== undefined) updates.default_call_end_hour = req.body.defaultCallEndHour;
        if (req.body.defaultMaxAttempts !== undefined) updates.default_max_attempts = req.body.defaultMaxAttempts;
        if (req.body.defaultRetryDelayHours !== undefined) updates.default_retry_delay_hours = req.body.defaultRetryDelayHours;
        if (req.body.respectDnc !== undefined) updates.respect_dnc = req.body.respectDnc;
        if (req.body.requireConsent !== undefined) updates.require_consent = req.body.requireConsent;
        if (req.body.defaultCallerId !== undefined) updates.default_caller_id = req.body.defaultCallerId;
        
        const { data, error } = await supabase
            .from('user_dialer_settings')
            .upsert(updates, { onConflict: 'user_id' })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, settings: data });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TWILIO WEBHOOK HANDLERS
// ============================================

/**
 * Voice handler - connects call to voice assistant
 * GET/POST /api/outbound-dialer/voice-handler
 */
router.all('/voice-handler', async (req, res) => {
    try {
        const { campaignId, leadId, assistantId } = req.query;
        const callSid = req.body?.CallSid;
        
        console.log(`Voice handler called: campaign=${campaignId}, lead=${leadId}, callSid=${callSid}`);
        
        // Get the assistant configuration
        const { data: assistant } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', assistantId)
            .single();
        
        if (!assistant) {
            // If no assistant, just record the call
            return res.type('text/xml').send(`
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say>Thank you for answering. An agent will follow up with you shortly.</Say>
                    <Hangup/>
                </Response>
            `);
        }
        
        // Get lead info for personalization
        const { data: lead } = await supabase
            .from('campaign_leads')
            .select('*')
            .eq('id', leadId)
            .single();
        
        // Build the voice agent connect URL (assuming you have a voice agent service)
        const voiceAgentUrl = process.env.VOICE_AGENT_URL || `https://voicory-backend-783942490798.asia-south1.run.app/api/twilio/connect`;
        
        // Connect to voice agent with context
        const twiml = `
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Connect>
                    <Stream url="${voiceAgentUrl}">
                        <Parameter name="assistantId" value="${assistantId}"/>
                        <Parameter name="leadId" value="${leadId}"/>
                        <Parameter name="campaignId" value="${campaignId}"/>
                        <Parameter name="leadName" value="${lead?.first_name || ''} ${lead?.last_name || ''}"/>
                        <Parameter name="leadPhone" value="${lead?.phone_number || ''}"/>
                    </Stream>
                </Connect>
            </Response>
        `;
        
        res.type('text/xml').send(twiml);
    } catch (error) {
        console.error('Voice handler error:', error);
        res.type('text/xml').send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <Response>
                <Say>We're sorry, but we're experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Status callback - handles call status updates
 * POST /api/outbound-dialer/status-callback
 */
router.post('/status-callback', async (req, res) => {
    try {
        const { callLogId, campaignId, leadId } = req.query;
        const { 
            CallSid, 
            CallStatus, 
            CallDuration,
            AnsweredBy,
            RecordingUrl,
            RecordingDuration
        } = req.body;
        
        console.log(`Status callback: callSid=${CallSid}, status=${CallStatus}, duration=${CallDuration}`);
        
        // Map Twilio status to our status
        const statusMap = {
            'initiated': 'initiated',
            'ringing': 'ringing',
            'in-progress': 'in-progress',
            'completed': 'completed',
            'busy': 'busy',
            'no-answer': 'no-answer',
            'failed': 'failed',
            'canceled': 'canceled'
        };
        
        const updateData = {
            status: statusMap[CallStatus] || CallStatus
        };
        
        // Add timing based on status
        if (CallStatus === 'ringing') {
            updateData.ringing_at = new Date().toISOString();
        } else if (CallStatus === 'in-progress') {
            updateData.answered_at = new Date().toISOString();
            updateData.answered_by = AnsweredBy || 'unknown';
        } else if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus)) {
            updateData.ended_at = new Date().toISOString();
            updateData.duration_seconds = parseInt(CallDuration) || 0;
            
            // Determine outcome
            if (CallStatus === 'completed' && parseInt(CallDuration) > 0) {
                updateData.outcome = AnsweredBy === 'machine' ? 'voicemail' : 'answered';
            } else if (CallStatus === 'no-answer') {
                updateData.outcome = 'no_answer';
            } else if (CallStatus === 'busy') {
                updateData.outcome = 'busy';
            } else {
                updateData.outcome = 'failed';
            }
            
            // Add recording if available
            if (RecordingUrl) {
                updateData.recording_url = RecordingUrl;
                updateData.recording_duration_seconds = parseInt(RecordingDuration) || 0;
            }
        }
        
        // Update call log
        if (callLogId) {
            await supabase
                .from('campaign_call_logs')
                .update(updateData)
                .eq('id', callLogId);
        }
        
        // Update lead and campaign when call completes
        if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus) && leadId && campaignId) {
            const { completeLeadCall } = require('../services/outbound-dialer/callQueue');
            
            await completeLeadCall(campaignId, leadId, {
                outcome: updateData.outcome,
                duration: updateData.duration_seconds,
                shouldRetry: ['no_answer', 'busy'].includes(updateData.outcome)
            });

            // Auto-score the lead after call completion (non-blocking)
            // Only trigger for answered calls with meaningful duration
            if (updateData.outcome === 'answered' && updateData.duration_seconds >= 30 && callLogId) {
                // Get userId from campaign (async, non-blocking)
                (async () => {
                    try {
                        const { data: campaign } = await supabase
                            .from('outbound_campaigns')
                            .select('user_id')
                            .eq('id', campaignId)
                            .single();

                        if (campaign?.user_id) {
                            const { autoScoreAfterCall } = require('../services/lead-scoring');
                            // Small delay to allow transcript to be saved
                            setTimeout(() => {
                                autoScoreAfterCall(campaign.user_id, leadId, callLogId)
                                    .then(result => {
                                        if (result.success && !result.skipped) {
                                            console.log(`[AutoScore] Lead ${leadId} scored: ${result.score} (${result.grade})`);
                                        }
                                    })
                                    .catch(err => console.error('[AutoScore] Error:', err));
                            }, 2000); // 2 second delay for transcript processing
                        }
                    } catch (err) {
                        console.error('[AutoScore] Failed to get campaign userId:', err);
                    }
                })();
            }
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Status callback error:', error);
        res.sendStatus(500);
    }
});

/**
 * Duplicate a campaign (copies all settings, resets stats, status=draft)
 * POST /api/outbound-dialer/campaigns/:id/duplicate
 */
router.post('/campaigns/:id/duplicate', verifySupabaseAuth, async (req, res) => {
    try {
        const original = await getCampaign(req.userId, req.params.id);
        if (!original) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Build duplicate data — strip identity + stats fields
        const {
            id, userId, createdAt, updatedAt, startedAt, completedAt,
            totalLeads, leadsPending, leadsCompleted,
            callsMade, callsAnswered, callsVoicemail, callsNoAnswer, callsFailed,
            appointmentsBooked, totalTalkTimeSeconds,
            assistant, phoneNumber,
            ...rest
        } = original;

        const duplicateData = {
            ...rest,
            name: `${rest.name} (Copy)`,
            status: 'draft',
            start_date: rest.startDate,
            end_date: rest.endDate,
            call_days: rest.callDays,
            call_start_time: rest.callStartTime,
            call_end_time: rest.callEndTime,
            max_calls_per_hour: rest.maxCallsPerHour,
            max_calls_per_day: rest.maxCallsPerDay,
            max_concurrent_calls: rest.maxConcurrentCalls,
            max_attempts: rest.maxAttempts,
            retry_delay_hours: rest.retryDelayHours,
            ring_timeout_seconds: rest.ringTimeoutSeconds,
            campaign_type: rest.campaignType,
            assistant_id: rest.assistantId,
            phone_number_id: rest.phoneNumberId,
        };

        const campaign = await createCampaign(req.userId, duplicateData);
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error duplicating campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Export campaign call results as CSV
 * GET /api/outbound-dialer/campaigns/:id/export
 */
router.get('/campaigns/:id/export', verifySupabaseAuth, async (req, res) => {
    try {
        // Verify campaign belongs to user
        const campaign = await getCampaign(req.userId, req.params.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Fetch leads with call outcomes
        const { data: leads, error } = await supabase
            .from('campaign_leads')
            .select('*')
            .eq('campaign_id', req.params.id)
            .eq('user_id', req.userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Build CSV
        const headers = [
            'First Name', 'Last Name', 'Phone Number', 'Email', 'Company',
            'Status', 'Outcome', 'Disposition', 'Call Attempts',
            'Last Call At', 'Appointment Date', 'Notes', 'Lead Score'
        ];

        const rows = (leads || []).map(lead => [
            lead.first_name || '',
            lead.last_name || '',
            lead.phone_number || '',
            lead.email || '',
            lead.company || '',
            lead.status || '',
            lead.outcome || '',
            lead.disposition || '',
            lead.call_attempts || 0,
            lead.last_call_at || '',
            lead.appointment_date || '',
            (lead.notes || '').replace(/,/g, ';').replace(/\n/g, ' '),
            lead.lead_score || ''
        ]);

        const csvLines = [
            headers.join(','),
            ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ];

        const csvContent = csvLines.join('\n');
        const filename = `campaign-${campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-export.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting campaign:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
