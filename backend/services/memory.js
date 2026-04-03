// ============================================
// MEMORY SERVICE - Customer Memory Management
// ============================================
const { openai, supabase } = require('../config');

/**
 * Fetch complete customer memory context from database
 * Includes: customer info, memory record, recent conversations, insights
 */
async function getCustomerMemory(customerId, userId, memoryConfig = {}) {
    if (!customerId) return null;
    
    try {
        const maxConversations = memoryConfig.maxContextConversations || 5;
        
        // Fetch all memory data in parallel
        const [customerResult, memoryResult, conversationsResult, insightsResult] = await Promise.all([
            // Customer basic info
            supabase
                .from('customers')
                .select('id, name, email, phone_number, variables, interaction_count, last_interaction')
                .eq('id', customerId)
                .single(),
            
            // Customer memory record (personality, engagement, etc.)
            supabase
                .from('customer_memories')
                .select('*')
                .eq('customer_id', customerId)
                .single(),
            
            // Recent conversation summaries
            supabase
                .from('customer_conversations')
                .select('id, started_at, summary, key_points, sentiment, sentiment_score, outcome, topics_discussed, channel')
                .eq('customer_id', customerId)
                .order('started_at', { ascending: false })
                .limit(maxConversations),
            
            // Key insights about this customer
            supabase
                .from('customer_insights')
                .select('id, insight_type, content, importance, confidence, extracted_at')
                .eq('customer_id', customerId)
                .eq('is_active', true)
                .order('importance', { ascending: false })
                .order('extracted_at', { ascending: false })
                .limit(15)
        ]);
        
        const customer = customerResult.data;
        const memory = memoryResult.data;
        const conversations = conversationsResult.data || [];
        const insights = insightsResult.data || [];
        
        if (!customer) {
            console.log('[Memory] Customer not found:', customerId);
            return null;
        }
        
        // Build memory context object
        const memoryContext = {
            customer: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone_number,
                interactionCount: customer.interaction_count,
                lastInteraction: customer.last_interaction,
                variables: customer.variables || {}
            },
            memory: memory ? {
                totalConversations: memory.total_conversations,
                lastContact: memory.last_contact_date,
                averageSentiment: memory.average_sentiment,
                engagementScore: memory.engagement_score,
                personalityTraits: memory.personality_traits || [],
                interests: memory.interests || [],
                painPoints: memory.pain_points || [],
                productInterests: memory.product_interests || [],
                objectionsRaised: memory.objections_raised || [],
                executiveSummary: memory.executive_summary,
                communicationPreferences: memory.communication_preferences || {}
            } : null,
            recentConversations: conversations.map(c => ({
                id: c.id,
                startedAt: c.started_at,
                summary: c.summary,
                keyPoints: c.key_points || [],
                sentiment: c.sentiment,
                sentimentScore: c.sentiment_score,
                outcome: c.outcome,
                topics: c.topics_discussed || [],
                channel: c.channel
            })),
            keyInsights: insights.map(i => ({
                insightType: i.insight_type,
                content: i.content,
                importance: i.importance,
                confidence: i.confidence,
                extractedAt: i.extracted_at
            }))
        };
        
        console.log(`[Memory] Loaded memory for customer ${customerId}: ${conversations.length} conversations, ${insights.length} insights`);
        
        return memoryContext;
    } catch (error) {
        console.error('[Memory] Error fetching customer memory:', error.message);
        return null;
    }
}

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
    
    let result = lines.join('\n');

    // Truncate to 500 chars to keep system prompts lean
    if (result.length > 500) {
        result = result.slice(0, 497) + '...';
    }

    return result;
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

/**
 * Trim memory string if > 2000 chars by summarizing with GPT-4o-mini.
 * Saves the resulting summary back to customer_memories table.
 * @param {string} phoneNumber
 * @param {uuid|null} agentId
 * @param {Array} conversationHistory - [{role, content}]
 */
async function trimAndSaveMemory(phoneNumber, agentId, conversationHistory = []) {
    if (!phoneNumber) return;

    const OpenAI = require('openai');
    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        // Fetch existing record
        const { data: existing } = await supabase
            .from('customer_memories')
            .select('id, memories, summary')
            .eq('phone_number', phoneNumber)
            .eq('agent_id', agentId)
            .maybeSingle();

        let memories = existing?.memories || [];
        let summary = existing?.summary || '';

        // Append new conversation messages
        if (conversationHistory.length > 0) {
            memories = memories.concat(conversationHistory);
        }

        const memoriesStr = JSON.stringify(memories);

        // If over 2000 chars, compress with GPT-4o-mini
        if (memoriesStr.length > 2000) {
            const messages = memories.map(m =>
                `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`
            ).join('\n');

            const completion = await openaiClient.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Summarize the following customer conversation in 3-5 concise bullet points that capture key facts, preferences, and unresolved issues. Output only the bullet points, no headers.'
                    },
                    { role: 'user', content: messages }
                ],
                max_tokens: 300,
                temperature: 0.3
            });

            summary = completion.choices[0]?.message?.content || summary;
            // Keep only last 20 messages after compression
            memories = memories.slice(-20);
            console.log(`[Memory] Compressed memories for ${phoneNumber} (was ${memoriesStr.length} chars)`);
        }

        // Upsert into customer_memories
        await supabase
            .from('customer_memories')
            .upsert({
                phone_number: phoneNumber,
                agent_id: agentId,
                memories,
                summary,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'phone_number,agent_id'
            });

        console.log(`[Memory] Saved memory for ${phoneNumber}`);
    } catch (err) {
        console.error('[Memory] trimAndSaveMemory error:', err.message);
    }
}

module.exports = {
    getCustomerMemory,
    formatMemoryForPrompt,
    analyzeConversationWithAI,
    trimAndSaveMemory
};
