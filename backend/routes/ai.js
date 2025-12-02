// ============================================
// AI ROUTES - Prompt Generation
// ============================================
const express = require('express');
const router = express.Router();
const { openai } = require('../config');

// ============================================
// SYSTEM PROMPT GENERATOR - AI-powered prompt creation
// Generates professional system prompts based on user description
// ============================================
router.post('/api/generate-prompt', async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not available' });
        }

        const { description, businessName, agentName, generateMessaging = false } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log('Generating prompt for:', description, 'with messaging:', generateMessaging);

        const systemPromptForGenerator = `You are an expert prompt engineer specializing in creating system prompts for AI assistants. Your task is to generate professional, detailed SYSTEM PROMPTS (instructions FOR the AI) based on the user's description.

CRITICAL: You are writing INSTRUCTIONS for an AI assistant, NOT writing what the assistant would say. The system prompt should be in second person ("You are...", "Your role is...", "You should...") telling the AI how to behave.

=== STRUCTURE YOUR VOICE SYSTEM PROMPT WITH THESE SECTIONS ===

1. **IDENTITY & CONTEXT** (Use variables here)
   - Start with: "You are {{assistant_name}}, a [role] for [business]."
   - Include business context using variables like {{business_name}}, {{business_type}}
   - Set the scene: what kind of calls will this handle?

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
   - Pacing for voice (keep responses concise for phone)

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
- Keep each response instruction focused on VOICE (short, clear, conversational)
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

=== FIRST MESSAGE (VOICE) ===
Generate a natural, warm first message that:
- Uses {{assistant_name}} and business name
- Is SHORT (under 20 words for voice)
- Sounds natural when spoken aloud
- Invites the customer to share their need

${generateMessaging ? `
=== MESSAGING SYSTEM PROMPT ===
ALSO generate a separate messaging-optimized system prompt for WhatsApp/SMS with these differences:
- CAN be slightly longer in responses (text is scannable)
- CAN include emojis sparingly (😊, ✅, etc.)
- CAN include clickable links and formatted lists
- Should mention that conversations are asynchronous (customer may reply later)
- Should be mobile-friendly (under 300 chars per message ideal)
- Include ability to share images, documents, locations when relevant
- Structure should be similar but optimized for TEXT not VOICE

=== MESSAGING FIRST MESSAGE ===
Generate a friendly messaging welcome that:
- Can include 1-2 emojis
- Is mobile-friendly
- Feels casual but professional
- Example: "Hey! 👋 Thanks for reaching out to [Business]. I'm {{assistant_name}}, how can I help?"
` : ''}

=== CRITICAL OUTPUT RULES ===
1. The "systemPrompt" field must contain ONLY the voice system prompt text - no JSON, no metadata
2. The "firstMessage" field must contain a short greeting for voice calls
3. Do NOT leave any field empty or null
4. Do NOT include the JSON structure inside the systemPrompt text
${generateMessaging ? `5. The "messagingSystemPrompt" field must contain the messaging-optimized prompt
6. The "messagingFirstMessage" field must contain a messaging-friendly welcome` : ''}

Return your response in this exact JSON format:
{
    "systemPrompt": "You are {{assistant_name}}... [VOICE SYSTEM PROMPT - NO JSON INSIDE]",
    "firstMessage": "Hi! Thanks for calling [Business]. I'm {{assistant_name}}, how can I help?"${generateMessaging ? `,
    "messagingSystemPrompt": "You are {{assistant_name}}... [MESSAGING SYSTEM PROMPT - OPTIMIZED FOR TEXT]",
    "messagingFirstMessage": "Hey! 👋 Thanks for reaching out to [Business]. How can I help?"` : ''},
    "suggestedVariables": [
        {"name": "variable_name", "description": "Clear description", "example": "Example value"}
    ],
    "suggestedAgentName": "A fitting name for this type of assistant"
}`;

        const userMessage = `Create a comprehensive SYSTEM PROMPT (instructions for the AI) for:

Business/Use Case: ${description}
${businessName ? `Business Name: ${businessName}` : 'Business Name: [Let AI suggest or use a variable {{business_name}}]'}
${agentName ? `Agent Name: ${agentName}` : 'Agent Name: [Let AI suggest a fitting name]'}
${generateMessaging ? 'Generate for BOTH voice calls AND messaging (WhatsApp/SMS)' : 'Generate for voice calls only'}

Remember:
1. Write in SECOND PERSON as instructions TO the AI ("You are...", "You should...", "Your role is...")
2. Include ALL relevant {{variables}} for dynamic personalization
3. Be SPECIFIC to this business type - avoid generic customer service language
4. Structure with clear sections using ** headers
5. Keep voice-appropriate (concise responses, natural phrasing)
6. Suggest 5-8 business-specific custom variables
${generateMessaging ? '7. Make the messaging prompt TEXT-optimized (can use emojis, links, slightly longer responses)' : ''}

Generate a production-ready system prompt that makes this AI assistant highly effective.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPromptForGenerator },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.6,
            max_tokens: generateMessaging ? 5000 : 3000,
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
        if (!result.systemPrompt || typeof result.systemPrompt !== 'string') {
            console.error('Invalid systemPrompt in response:', result);
            return res.status(500).json({ error: 'Invalid response: missing systemPrompt' });
        }

        // Ensure firstMessage is not empty - provide a fallback if needed
        if (!result.firstMessage || result.firstMessage.trim() === '') {
            const businessNameStr = businessName || 'our company';
            const agentNameStr = result.suggestedAgentName || agentName || 'your assistant';
            result.firstMessage = `Hi! Thanks for calling ${businessNameStr}. I'm ${agentNameStr}, how can I help you today?`;
        }

        // Ensure messaging prompts have fallbacks if requested
        if (generateMessaging) {
            if (!result.messagingSystemPrompt || result.messagingSystemPrompt.trim() === '') {
                // Create a messaging version from the voice prompt
                result.messagingSystemPrompt = result.systemPrompt.replace(
                    /voice|spoken|phone call/gi,
                    'messaging'
                ) + '\n\nAdditional Messaging Guidelines:\n- Keep messages mobile-friendly (under 300 chars ideal)\n- Use emojis sparingly to add warmth 😊\n- Share clickable links when helpful\n- Remember conversations are asynchronous';
            }
            if (!result.messagingFirstMessage || result.messagingFirstMessage.trim() === '') {
                const businessNameStr = businessName || 'our company';
                const agentNameStr = result.suggestedAgentName || agentName || 'your assistant';
                result.messagingFirstMessage = `Hey! 👋 Thanks for reaching out to ${businessNameStr}. I'm ${agentNameStr}, how can I help you today?`;
            }
        }

        // Log usage
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        console.log('Prompt generation completed:', { inputTokens, outputTokens, generateMessaging });

        const response = {
            systemPrompt: result.systemPrompt,
            firstMessage: result.firstMessage,
            suggestedVariables: result.suggestedVariables || [],
            suggestedAgentName: result.suggestedAgentName,
            usage: { inputTokens, outputTokens }
        };

        // Include messaging prompts if requested
        if (generateMessaging) {
            response.messagingSystemPrompt = result.messagingSystemPrompt;
            response.messagingFirstMessage = result.messagingFirstMessage;
        }

        res.json(response);

    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate prompt' });
    }
});


module.exports = router;
