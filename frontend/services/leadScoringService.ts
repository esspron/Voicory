/**
 * Lead Scoring Service
 * Frontend API calls for lead qualification & scoring
 */

import { authFetch } from '../lib/api';
import type {
    LeadScore,
    LeadScoringRules,
    CampaignScoreSummary,
    ScoreLeadResult,
    BatchScoreResult,
    ScoringWeightsInfo,
    AIQualificationAnalysis,
    LeadScoreBreakdown,
    LeadGrade
} from '../types';

// ============================================
// HELPER: Map snake_case to camelCase
// ============================================

function mapLeadScore(data: Record<string, unknown>): LeadScore {
    return {
        id: data['id'] as string,
        leadId: data['lead_id'] as string,
        callId: data['call_id'] as string | undefined,
        userId: data['user_id'] as string,
        overallScore: data['overall_score'] as number,
        timeline: data['timeline'] as LeadScore['timeline'],
        timelineScore: data['timeline_score'] as number,
        motivation: data['motivation'] as LeadScore['motivation'],
        motivationScore: data['motivation_score'] as number,
        priceAlignment: data['price_alignment'] as boolean,
        priceAlignmentScore: data['price_alignment_score'] as number,
        preApproved: data['pre_approved'] as boolean,
        preApprovedScore: data['pre_approved_score'] as number,
        mustSell: data['must_sell'] as boolean,
        mustSellScore: data['must_sell_score'] as number,
        appointmentBooked: data['appointment_booked'] as boolean,
        appointmentBookedScore: data['appointment_booked_score'] as number,
        objections: (data['objections'] as string[]) || [],
        keyInsights: data['key_insights'] as string,
        lifeEvents: (data['life_events'] as string[]) || [],
        interestLevel: data['interest_level'] as LeadScore['interestLevel'],
        recommendedAction: data['recommended_action'] as LeadScore['recommendedAction'],
        recommendedActionReason: data['recommended_action_reason'] as string,
        aiAnalysis: data['ai_analysis'] as AIQualificationAnalysis,
        aiConfidence: data['ai_confidence'] as number,
        scoreSource: data['score_source'] as LeadScore['scoreSource'],
        transcriptHash: data['transcript_hash'] as string | undefined,
        scoringVersion: data['scoring_version'] as string,
        processingTimeMs: data['processing_time_ms'] as number | undefined,
        createdAt: data['created_at'] as string,
        updatedAt: data['updated_at'] as string
    };
}

function mapScoringRules(data: Record<string, unknown>): LeadScoringRules {
    return {
        id: data['id'] as string | undefined,
        userId: data['user_id'] as string | undefined,
        name: data['name'] as string || 'Custom Rules',
        description: data['description'] as string | undefined,
        timelineWeights: (data['timeline_weights'] || data['timelineWeights']) as LeadScoringRules['timelineWeights'],
        motivationWeights: (data['motivation_weights'] || data['motivationWeights']) as LeadScoringRules['motivationWeights'],
        priceAlignmentWeight: (data['price_alignment_weight'] ?? data['priceAlignmentWeight']) as number,
        preApprovedWeight: (data['pre_approved_weight'] ?? data['preApprovedWeight']) as number,
        mustSellWeight: (data['must_sell_weight'] ?? data['mustSellWeight']) as number,
        appointmentBookedWeight: (data['appointment_booked_weight'] ?? data['appointmentBookedWeight']) as number,
        hotLeadThreshold: (data['hot_lead_threshold'] ?? data['hotLeadThreshold']) as number,
        warmLeadThreshold: (data['warm_lead_threshold'] ?? data['warmLeadThreshold']) as number,
        isActive: data['is_active'] as boolean ?? true,
        isDefault: data['isDefault'] as boolean | undefined,
        createdAt: data['created_at'] as string | undefined,
        updatedAt: data['updated_at'] as string | undefined
    };
}

function mapCampaignScoreSummary(data: Record<string, unknown>): CampaignScoreSummary {
    return {
        totalLeads: data['total_leads'] as number,
        scoredLeads: data['scored_leads'] as number,
        hotLeads: data['hot_leads'] as number,
        warmLeads: data['warm_leads'] as number,
        coldLeads: data['cold_leads'] as number,
        averageScore: data['average_score'] as number | null,
        scoreDistribution: data['score_distribution'] as CampaignScoreSummary['scoreDistribution']
    };
}

// ============================================
// LEAD SCORING OPERATIONS
// ============================================

/**
 * Score a lead with a transcript
 */
export async function scoreLead(
    leadId: string, 
    transcript: string, 
    callId?: string,
    forceRescore = false
): Promise<ScoreLeadResult> {
    const response = await authFetch(`/api/lead-scoring/leads/${leadId}/score`, {
        method: 'POST',
        body: JSON.stringify({ transcript, callId, forceRescore })
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to score lead');
    }
    
    return data;
}

/**
 * Get the latest score for a lead
 */
export async function getLeadScore(leadId: string): Promise<LeadScore | null> {
    const response = await authFetch(`/api/lead-scoring/leads/${leadId}/score`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get lead score');
    }
    
    return data.score ? mapLeadScore(data.score) : null;
}

/**
 * Get score history for a lead
 */
export async function getLeadScoreHistory(leadId: string): Promise<LeadScore[]> {
    const response = await authFetch(`/api/lead-scoring/leads/${leadId}/history`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get lead score history');
    }
    
    return (data.history || []).map(mapLeadScore);
}

/**
 * Re-score a lead using its latest call transcript
 */
export async function rescoreLead(leadId: string): Promise<ScoreLeadResult> {
    const response = await authFetch(`/api/lead-scoring/leads/${leadId}/rescore`, {
        method: 'POST'
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to re-score lead');
    }
    
    return data;
}

// ============================================
// CAMPAIGN SCORING OPERATIONS
// ============================================

/**
 * Get score summary for a campaign
 */
export async function getCampaignScoreSummary(campaignId: string): Promise<CampaignScoreSummary> {
    const response = await authFetch(`/api/lead-scoring/campaigns/${campaignId}/summary`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get campaign score summary');
    }
    
    return mapCampaignScoreSummary(data.summary);
}

/**
 * Batch score leads in a campaign
 */
export async function batchScoreLeads(
    campaignId: string,
    options?: { limit?: number; onlyUnscored?: boolean }
): Promise<BatchScoreResult> {
    const response = await authFetch(`/api/lead-scoring/campaigns/${campaignId}/batch-score`, {
        method: 'POST',
        body: JSON.stringify(options || {})
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to batch score leads');
    }
    
    return data.results;
}

/**
 * Get leads by grade for a campaign
 */
export async function getLeadsByGrade(
    campaignId: string,
    grade?: LeadGrade | 'all',
    options?: { limit?: number; offset?: number }
): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (grade && grade !== 'all') params.append('grade', grade);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const response = await authFetch(
        `/api/lead-scoring/campaigns/${campaignId}/leads-by-grade?${params}`
    );
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get leads by grade');
    }
    
    return data.leads;
}

// ============================================
// SCORING RULES OPERATIONS
// ============================================

/**
 * Get user's scoring rules
 */
export async function getScoringRules(): Promise<LeadScoringRules> {
    const response = await authFetch('/api/lead-scoring/rules');
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get scoring rules');
    }
    
    return mapScoringRules(data.rules);
}

/**
 * Update user's scoring rules
 */
export async function updateScoringRules(rules: Partial<LeadScoringRules>): Promise<LeadScoringRules> {
    const response = await authFetch('/api/lead-scoring/rules', {
        method: 'PUT',
        body: JSON.stringify(rules)
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to update scoring rules');
    }
    
    return mapScoringRules(data.rules);
}

// ============================================
// ANALYSIS OPERATIONS
// ============================================

/**
 * Preview score analysis without saving
 */
export async function previewAnalysis(
    transcript: string,
    leadContext?: {
        firstName?: string;
        lastName?: string;
        propertyAddress?: string;
        leadSource?: string;
        listingPrice?: number;
    }
): Promise<{
    score: number;
    grade: LeadGrade;
    breakdown: LeadScoreBreakdown;
    analysis: AIQualificationAnalysis;
    processingTimeMs: number;
}> {
    const response = await authFetch('/api/lead-scoring/analyze-preview', {
        method: 'POST',
        body: JSON.stringify({ transcript, leadContext })
    });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to preview analysis');
    }
    
    return {
        score: data.preview.score,
        grade: data.preview.grade,
        breakdown: data.preview.breakdown,
        analysis: data.preview.analysis,
        processingTimeMs: data.processingTimeMs
    };
}

/**
 * Get scoring weights explanation
 */
export async function getScoringWeightsInfo(): Promise<ScoringWeightsInfo> {
    const response = await authFetch('/api/lead-scoring/weights-info');
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to get scoring weights info');
    }
    
    return data;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get grade color for display
 */
export function getGradeColor(grade: LeadGrade | undefined): string {
    switch (grade) {
        case 'hot':
            return 'text-red-400';
        case 'warm':
            return 'text-orange-400';
        case 'cold':
            return 'text-blue-400';
        default:
            return 'text-textMuted';
    }
}

/**
 * Get grade background color for badges
 */
export function getGradeBgColor(grade: LeadGrade | undefined): string {
    switch (grade) {
        case 'hot':
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'warm':
            return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case 'cold':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        default:
            return 'bg-white/5 text-textMuted border-white/10';
    }
}

/**
 * Get score color based on value
 */
export function getScoreColor(score: number | undefined | null): string {
    if (score === undefined || score === null) return 'text-textMuted';
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-blue-400';
}

/**
 * Get score background color based on value
 */
export function getScoreBgColor(score: number | undefined | null): string {
    if (score === undefined || score === null) return 'bg-white/5';
    if (score >= 70) return 'bg-red-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-blue-500/20';
}

/**
 * Format score for display
 */
export function formatScore(score: number | undefined | null): string {
    if (score === undefined || score === null) return '--';
    return score.toString();
}

/**
 * Get grade label
 */
export function getGradeLabel(grade: LeadGrade | undefined): string {
    switch (grade) {
        case 'hot':
            return '🔥 Hot';
        case 'warm':
            return '☀️ Warm';
        case 'cold':
            return '❄️ Cold';
        default:
            return 'Unscored';
    }
}

/**
 * Get recommended action label
 */
export function getRecommendedActionLabel(action: string | undefined): string {
    switch (action) {
        case 'call_immediately':
            return 'Call Immediately';
        case 'schedule_followup':
            return 'Schedule Follow-up';
        case 'send_information':
            return 'Send Information';
        case 'add_to_nurture':
            return 'Add to Nurture';
        case 'mark_not_interested':
            return 'Not Interested';
        case 'book_appointment':
            return 'Book Appointment';
        default:
            return 'Unknown';
    }
}

/**
 * Get timeline label
 */
export function getTimelineLabel(timeline: string | undefined): string {
    switch (timeline) {
        case 'immediate':
            return 'Within 30 days';
        case '1-3months':
            return '1-3 months';
        case '3-6months':
            return '3-6 months';
        case '6months+':
            return '6+ months';
        default:
            return 'Unknown';
    }
}

/**
 * Get motivation label
 */
export function getMotivationLabel(motivation: string | undefined): string {
    switch (motivation) {
        case 'high':
            return 'High';
        case 'medium':
            return 'Medium';
        case 'low':
            return 'Low';
        default:
            return 'Unknown';
    }
}
