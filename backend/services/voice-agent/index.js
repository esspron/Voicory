// ============================================
// VOICE AGENT MODULE - Main Export
// LiveKit-style real-time voice AI
// ============================================

const { VoiceAgent, AgentState } = require('./VoiceAgent');
const { 
    initializeWebSocketServer, 
    closeWebSocketServer, 
    sessionManager 
} = require('./WebSocketServer');
const { createSTTClient } = require('./providers/stt');
const { streamLLMResponse, generateLLMResponse } = require('./providers/llm');
const { streamTTS, createTTSClient } = require('./providers/tts');

module.exports = {
    // Core
    VoiceAgent,
    AgentState,
    
    // WebSocket Server
    initializeWebSocketServer,
    closeWebSocketServer,
    sessionManager,
    
    // Providers
    createSTTClient,
    streamLLMResponse,
    generateLLMResponse,
    streamTTS,
    createTTSClient,
};
