// ============================================
// MEMORY SERVICE - Customer Memory Management
// ============================================
const { openai } = require('../config');

/**
 * Format customer memory context for injection into system prompt
 */
function formatMemoryForPrompt(memoryContext, memoryConfig = {}) {
    if (!memoryContext) return '';
    
    const lines = [];
    lines.push('--- CUSTOMER MEMORY ---');
    
    // Customer basic info
    if (memoryContext.customer) {
        const c = memoryContext.customer;
        lines.push(`Customer: ${c.name || 'Unknown'}`);
        if (c.phone) lines.push(`Phone: ${c.phone}`);
    }
    
    // Memory/relationship overview
    if (memoryContext.memory && memoryConfig.includeSummary !== false) {
        const m = memoryContext.memory;
        lines.push('');
        lines.push('Relationship:');
        if (m.totalConversations) lines.push(`- Total conversations: ${m.totalConversations}`);
        if (m.lastContact) lines.push(`- Last contact: ${new Date(m.lastContact).toLocaleDateString()}`);
        if (m.averageSentiment !== undefined && m.averageSentiment !== null) {
            const sentiment = m.averageSentiment > 0.3 ? 'Positive' : m.averageSentiment < -0.3 ? 'Negative' : 'Neutral';
            lines.push(`- Overall sentiment: ${sentiment}`);
        }
        if (m.engagementScore) lines.push(`- Engagement score: ${m.engagementScore}/100`);
        
        // Personality and preferences
        if (m.personalityTraits && m.personalityTraits.length > 0) {
            lines.push('');
            lines.push(`Personality: ${m.personalityTraits.join(', ')}`);
        }
        
        if (m.interests && m.interests.length > 0) {
            lines.push('');
            lines.push(`Interests: ${m.interests.join(', ')}`);
        }
        
        if (m.painPoints && m.painPoints.length > 0) {
            lines.push('');
            lines.push(`Pain points: ${m.painPoints.join(', ')}`);
        }
        
        // Executive summary
        if (m.executiveSummary) {
            lines.push('');
            lines.push(`Summary: ${m.executiveSummary}`);
        }
    }
    
    // Recent conversations
    if (memoryContext.recentConversations && memoryContext.recentConversations.length > 0 && memoryConfig.rememberConversations !== false) {
        lines.push('');
        lines.push('--- RECENT CONVERSATIONS ---');
        memoryContext.recentConversations.slice(0, 3).forEach((conv, i) => {
            const date = new Date(conv.startedAt).toLocaleDateString();
            const outcome = conv.outcome ? ` (${conv.outcome})` : '';
            lines.push(`[${i + 1}] ${date}${outcome}`);
            if (conv.summary) lines.push(`Summary: ${conv.summary}`);
            if (conv.keyPoints && conv.keyPoints.length > 0) {
                lines.push('Key points:');
                conv.keyPoints.forEach(point => lines.push(`  - ${point}`));
            }
            lines.push('');
        });
    }
    
    // Key insights
    if (memoryContext.keyInsights && memoryContext.keyInsights.length > 0 && memoryConfig.includeInsights !== false) {
        lines.push('--- KEY INSIGHTS ---');
        memoryContext.keyInsights.slice(0, 10).forEach(insight => {
            const type = insight.insightType?.toUpperCase() || 'INFO';
            lines.push(`[${type}] ${insight.content}`);
        });
    }
    
    lines.push('--- END MEMORY ---');
    
    return lines.join('\n');
}

/**
 * Analyze conversation and extract insights using AI
 */
async function analyzeConversationWithAI(transcript, assistantName) {
    if (!openai) return null;
    
    try {
        const messages = transcript.map(m => 
            `${m.role === 'user' ? 'Customer' : assistantName}: ${m.content}`
        ).join('\n');
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert at analyzing customer conversations. Extract insights and customer information.

Return a JSON object with:
{
    "summary": "Brief 1-2 sentence summary",
    "keyPoints": ["key point 1", "key point 2"],
    "sentiment": "positive" | "neutral" | "negative",
    "sentimentScore": -1.0 to 1.0,
    "topicsDiscussed": ["topic1", "topic2"],
    "insights": [
        {"type": "preference" | "objection" | "interest" | "pain_point" | "opportunity" | "personal_info", "content": "insight text", "importance": "low" | "medium" | "high"}
    ],
    "actionItems": [{"task": "follow up on X", "priority": "high" | "medium" | "low"}],
    "extractedInfo": {
        "email": null,
        "name": null,
        "address": null,
        "company": null
    }
}`
                },
                {
                    role: 'user',
                    content: `Analyze this conversation:\n\n${messages}`
                }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });
        
        return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        return null;
    }
}

module.exports = {
    formatMemoryForPrompt,
    analyzeConversationWithAI
};
