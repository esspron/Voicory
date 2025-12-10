// ============================================
// LLM PROVIDERS - Streaming Language Models
// Supports: OpenAI, Anthropic, Groq, Together, Fireworks
// ============================================

const { openai } = require('../../../config');

// ============================================
// STREAMING LLM RESPONSE
// ============================================

/**
 * Stream LLM response with token-by-token callbacks
 * @param {Object} config - LLM configuration
 * @param {string} config.provider - LLM provider (openai, anthropic, groq, together, fireworks)
 * @param {string} config.model - Model ID
 * @param {Array} config.messages - Conversation messages
 * @param {number} config.temperature - Response temperature
 * @param {number} config.maxTokens - Max response tokens
 * @param {Function} config.onToken - Callback for each token
 * @returns {Promise<string>} - Full response text
 */
async function streamLLMResponse(config) {
    const {
        provider = 'openai',
        model,
        messages,
        temperature = 0.7,
        maxTokens = 300,
        onToken,
        onError,
    } = config;
    
    switch (provider.toLowerCase()) {
        case 'openai':
            return streamOpenAI({ model, messages, temperature, maxTokens, onToken, onError });
        case 'anthropic':
            return streamAnthropic({ model, messages, temperature, maxTokens, onToken, onError });
        case 'groq':
            return streamGroq({ model, messages, temperature, maxTokens, onToken, onError });
        case 'together':
            return streamTogether({ model, messages, temperature, maxTokens, onToken, onError });
        case 'fireworks':
            return streamFireworks({ model, messages, temperature, maxTokens, onToken, onError });
        default:
            throw new Error(`Unknown LLM provider: ${provider}`);
    }
}

// ============================================
// OPENAI STREAMING
// ============================================
async function streamOpenAI({ model, messages, temperature, maxTokens, onToken, onError }) {
    try {
        if (!openai) {
            throw new Error('OpenAI client not configured');
        }
        
        const stream = await openai.chat.completions.create({
            model: model || 'gpt-4o',
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
        });
        
        let fullResponse = '';
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                fullResponse += content;
                if (onToken) onToken(content);
            }
        }
        
        return fullResponse;
        
    } catch (error) {
        console.error('[LLM:OpenAI] Stream error:', error);
        if (onError) onError(error);
        throw error;
    }
}

// ============================================
// ANTHROPIC STREAMING
// ============================================
async function streamAnthropic({ model, messages, temperature, maxTokens, onToken, onError }) {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY not configured');
        }
        
        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system')?.content || '';
        const chatMessages = messages.filter(m => m.role !== 'system');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: model || 'claude-3-5-sonnet-20241022',
                max_tokens: maxTokens,
                temperature,
                system: systemMessage,
                messages: chatMessages,
                stream: true,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Anthropic API error: ${response.status}`);
        }
        
        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            
            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta') {
                        const text = parsed.delta?.text;
                        if (text) {
                            fullResponse += text;
                            if (onToken) onToken(text);
                        }
                    }
                } catch (e) {
                    // Skip unparseable lines
                }
            }
        }
        
        return fullResponse;
        
    } catch (error) {
        console.error('[LLM:Anthropic] Stream error:', error);
        if (onError) onError(error);
        throw error;
    }
}

// ============================================
// GROQ STREAMING (Compatible with OpenAI API)
// ============================================
async function streamGroq({ model, messages, temperature, maxTokens, onToken, onError }) {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY not configured');
        }
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || 'llama-3.1-70b-versatile',
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }
        
        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            
            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;
                        if (onToken) onToken(content);
                    }
                } catch (e) {
                    // Skip unparseable lines
                }
            }
        }
        
        return fullResponse;
        
    } catch (error) {
        console.error('[LLM:Groq] Stream error:', error);
        if (onError) onError(error);
        throw error;
    }
}

// ============================================
// TOGETHER AI STREAMING
// ============================================
async function streamTogether({ model, messages, temperature, maxTokens, onToken, onError }) {
    try {
        const apiKey = process.env.TOGETHER_API_KEY;
        if (!apiKey) {
            throw new Error('TOGETHER_API_KEY not configured');
        }
        
        const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Together API error: ${response.status}`);
        }
        
        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            
            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;
                        if (onToken) onToken(content);
                    }
                } catch (e) {
                    // Skip
                }
            }
        }
        
        return fullResponse;
        
    } catch (error) {
        console.error('[LLM:Together] Stream error:', error);
        if (onError) onError(error);
        throw error;
    }
}

// ============================================
// FIREWORKS AI STREAMING
// ============================================
async function streamFireworks({ model, messages, temperature, maxTokens, onToken, onError }) {
    try {
        const apiKey = process.env.FIREWORKS_API_KEY;
        if (!apiKey) {
            throw new Error('FIREWORKS_API_KEY not configured');
        }
        
        const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model || 'accounts/fireworks/models/llama-v3p1-70b-instruct',
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: true,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Fireworks API error: ${response.status}`);
        }
        
        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            
            for (const line of lines) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        fullResponse += content;
                        if (onToken) onToken(content);
                    }
                } catch (e) {
                    // Skip
                }
            }
        }
        
        return fullResponse;
        
    } catch (error) {
        console.error('[LLM:Fireworks] Stream error:', error);
        if (onError) onError(error);
        throw error;
    }
}

// ============================================
// NON-STREAMING FALLBACK
// ============================================
async function generateLLMResponse(config) {
    const {
        provider = 'openai',
        model,
        messages,
        temperature = 0.7,
        maxTokens = 300,
    } = config;
    
    if (provider === 'openai' && openai) {
        const response = await openai.chat.completions.create({
            model: model || 'gpt-4o',
            messages,
            temperature,
            max_tokens: maxTokens,
        });
        
        return response.choices[0]?.message?.content || '';
    }
    
    // Fallback: use streaming and collect all tokens
    let result = '';
    await streamLLMResponse({
        ...config,
        onToken: (token) => { result += token; },
    });
    return result;
}

module.exports = {
    streamLLMResponse,
    generateLLMResponse,
};
