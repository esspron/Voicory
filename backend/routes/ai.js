// ============================================
// AI ROUTES - Prompt Generation
// SECURITY: All routes require authentication
// ============================================
const express = require('express');
const router = express.Router();
const { openai } = require('../config');
const { verifySupabaseAuth } = require('../lib/auth');

// ============================================
// SYSTEM PROMPT GENERATOR - AI-powered prompt creation
// Generates professional system prompts based on user description
// PROTECTED: Requires valid Supabase JWT token
// ============================================
router.post('/generate-prompt', verifySupabaseAuth, async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not available' });
        }

        const { description, businessName, agentName, generateUnified = true } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log('Generating unified instruction for:', description);

        const systemPromptForGenerator = `You are an expert prompt engineer specializing in creating system prompts for AI assistants. Your task is to generate professional, detailed INSTRUCTIONS (system prompt) for an AI assistant based on the user's description.

CRITICAL: You are writing INSTRUCTIONS for an AI assistant that will work for BOTH voice calls AND messaging channels (WhatsApp, SMS, Web Chat). The instruction should be in second person ("You are...", "Your role is...", "You should...") telling the AI how to behave.

=== STRUCTURE YOUR INSTRUCTION WITH THESE SECTIONS ===

1. **IDENTITY & CONTEXT** (Use variables here)
   - Start with: "You are {{assistant_name}}, a [role] for [business]."
   - Include business context using variables like {{business_name}}, {{business_type}}
   - Set the scene: what kind of interactions will this handle?

2. **CURRENT CUSTOMER CONTEXT** (Variable block)
   - Include a section with customer variables:
     "**Current Customer Context:**
     - Customer Name: {{customer_name}}
     - Phone: {{customer_phone}}
     - [Add business-specific variables like {{customer_id}}, {{last_order}}, {{membership_status}}, etc.]"
   - Add time context: "Current Time: {{current_time}}, Today's Date: {{current_date}}"

3. **CORE RESPONSIBILITIES**
   - List 4-6 specific things this assistant handles
   - Be specific to the business type (not generic)

4. **HOW TO COMMUNICATE**
   - Tone and personality guidelines
   - Language preferences
   - How to handle greetings and sign-offs
   - Keep responses conversational and natural
   - For voice: keep responses concise
   - For messaging: can use emojis sparingly, share links when helpful

5. **SCENARIO HANDLING**
   - How to handle the main use case (booking, support, etc.)
   - How to handle edge cases
   - What to do if customer is upset/confused
   - What to do when you need to escalate

6. **BUSINESS-SPECIFIC DETAILS**
   - Include placeholders for real business info using variables
   - Operating hours: {{business_hours}}
   - Location/address: {{business_address}}
   - Pricing if relevant: {{pricing_info}}
   - Policies: {{cancellation_policy}}, {{refund_policy}}

7. **BOUNDARIES & LIMITATIONS**
   - What the assistant should NOT do
   - When to transfer to human
   - Privacy/security guidelines

=== FORMATTING RULES ===
- Use ** for section headers (this renders well)
- Use - for bullet points
- Use {{variable_name}} syntax for ALL dynamic content
- Total length: 400-700 words

=== VARIABLE USAGE ===
System variables (always available):
- {{customer_name}}, {{customer_phone}}, {{customer_email}}
- {{current_time}}, {{current_date}}, {{assistant_name}}

You MUST suggest 5-8 CUSTOM variables specific to this business type. Examples:
- For appointments: {{appointment_date}}, {{appointment_time}}, {{service_type}}
- For restaurants: {{reservation_size}}, {{dietary_requirements}}, {{table_preference}}
- For e-commerce: {{order_id}}, {{order_status}}, {{tracking_number}}
- For services: {{service_address}}, {{service_date}}, {{price_estimate}}

=== CRITICAL OUTPUT RULES ===
1. The "instruction" field must contain the complete system prompt text - no JSON, no metadata
2. This instruction should work for BOTH voice calls AND messaging
3. Do NOT leave any field empty or null
4. Do NOT include the JSON structure inside the instruction text

Return your response in this exact JSON format:
{
    "instruction": "You are {{assistant_name}}... [COMPLETE INSTRUCTION - WORKS FOR CALLS AND MESSAGES]",
    "suggestedVariables": [
        {"name": "variable_name", "description": "Clear description", "example": "Example value"}
    ],
    "suggestedAgentName": "A fitting name for this type of assistant"
}`;

        const userMessage = `Create a comprehensive INSTRUCTION (system prompt) for an AI assistant that works for BOTH voice calls AND messaging:

Business/Use Case: ${description}
${businessName ? `Business Name: ${businessName}` : 'Business Name: [Let AI suggest or use a variable {{business_name}}]'}
${agentName ? `Agent Name: ${agentName}` : 'Agent Name: [Let AI suggest a fitting name]'}

Remember:
1. Write in SECOND PERSON as instructions TO the AI ("You are...", "You should...", "Your role is...")
2. Include ALL relevant {{variables}} for dynamic personalization
3. Be SPECIFIC to this business type - avoid generic customer service language
4. Structure with clear sections using ** headers
5. The instruction should work for BOTH voice calls AND text messaging
6. Suggest 5-8 business-specific custom variables

Generate a production-ready instruction that makes this AI assistant highly effective across all communication channels.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPromptForGenerator },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.6,
            max_tokens: 3000,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content;
        
        if (!responseText) {
            return res.status(500).json({ error: 'No response from AI' });
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        // Validate and clean up the response
        // Support both new 'instruction' field and legacy 'systemPrompt' field
        const instruction = result.instruction || result.systemPrompt;
        if (!instruction || typeof instruction !== 'string') {
            console.error('Invalid instruction in response:', result);
            return res.status(500).json({ error: 'Invalid response: missing instruction' });
        }

        // Log usage
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        console.log('Prompt generation completed:', { inputTokens, outputTokens });

        const response = {
            instruction: instruction,
            // Also include as systemPrompt for backward compatibility
            systemPrompt: instruction,
            suggestedVariables: result.suggestedVariables || [],
            suggestedAgentName: result.suggestedAgentName,
            usage: { inputTokens, outputTokens }
        };

        res.json(response);

    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate prompt' });
    }
});


module.exports = router;
