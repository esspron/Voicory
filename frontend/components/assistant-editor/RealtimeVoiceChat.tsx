import {
    Robot, X, Microphone, MicrophoneSlash, Phone, PhoneDisconnect,
    Warning, CircleNotch, Waveform, Lightning, Timer, ChartBar, Record
} from '@phosphor-icons/react';
import React, { useState, useRef, useEffect } from 'react';

import { authFetch } from '../../lib/api';
import { API } from '../../lib/constants';
import { Voice, LanguageSettings, StyleSettings } from '../../types';

// ============================================
// TYPES
// ============================================

interface AssistantFormData {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    messagingSystemPrompt: string;
    messagingFirstMessage: string;
    voiceId: string | null;
    languageSettings: LanguageSettings;
    styleSettings: StyleSettings;
    llmModel: string;
    temperature: number;
    maxTokens: number;
    ragEnabled: boolean;
    ragSimilarityThreshold: number;
    ragMaxResults: number;
    ragInstructions: string;
    knowledgeBaseIds: string[];
}

interface VoiceMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface RealtimeVoiceChatProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
    onClose: () => void;
}

type CallState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';

// V4: Enhanced latency metrics type
interface LatencyMetrics {
    turnCount: number;
    stt: { avg: number; p50: number; p99: number; min?: number; max?: number };
    llm: {
        firstToken?: { avg: number; p50: number; p99: number };
        complete?: { avg: number; p50: number; p99: number };
        // Legacy format
        avg?: number;
        p50?: number;
        p99?: number;
    };
    tts: {
        firstChunk?: { avg: number; p50: number; p99: number };
        complete?: { avg: number; p50: number; p99: number };
        // Legacy format
        avg?: number;
        p50?: number;
        p99?: number;
    };
    total: {
        toFirstAudio?: { avg: number; p50: number; p99: number };
        turn?: { avg: number; p50: number; p99: number };
        // Legacy format
        avg?: number;
        p50?: number;
        p99?: number;
    };
}

// ============================================
// LATENCY METRICS DISPLAY (V4 - Time to First Audio!)
// ============================================
const LatencyDisplay: React.FC<{ metrics: LatencyMetrics | null }> = ({ metrics }) => {
    if (!metrics || metrics.turnCount === 0) return null;

    const getLatencyColor = (ms: number) => {
        if (ms < 500) return 'text-emerald-400';
        if (ms < 1000) return 'text-amber-400';
        return 'text-red-400';
    };

    // V4: Extract values with fallbacks for both new and legacy format
    const sttP50 = metrics.stt?.p50 ?? 0;
    const llmP50 = metrics.llm?.firstToken?.p50 ?? metrics.llm?.p50 ?? 0;
    const ttsP50 = metrics.tts?.firstChunk?.p50 ?? metrics.tts?.p50 ?? 0;
    const totalP50 = metrics.total?.toFirstAudio?.p50 ?? metrics.total?.p50 ?? 0;
    const turnP50 = metrics.total?.turn?.p50 ?? metrics.total?.p50 ?? 0;

    return (
        <div className="px-4 py-2 border-t border-white/5 bg-surface/50">
            <div className="flex items-center gap-2 mb-2">
                <Timer size={14} className="text-primary" />
                <span className="text-xs font-medium text-textMuted">Latency (P50)</span>
                <span className="text-[10px] text-textMuted/60 ml-auto">
                    {metrics.turnCount} turn{metrics.turnCount > 1 ? 's' : ''}
                </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
                <div>
                    <div className={`text-xs font-mono ${getLatencyColor(sttP50)}`}>
                        {sttP50}ms
                    </div>
                    <div className="text-[9px] text-textMuted">STT</div>
                </div>
                <div>
                    <div className={`text-xs font-mono ${getLatencyColor(llmP50)}`}>
                        {llmP50}ms
                    </div>
                    <div className="text-[9px] text-textMuted">LLM</div>
                </div>
                <div>
                    <div className={`text-xs font-mono ${getLatencyColor(ttsP50)}`}>
                        {ttsP50}ms
                    </div>
                    <div className="text-[9px] text-textMuted">TTS</div>
                </div>
                <div className="border-l border-white/10 pl-1.5">
                    <div className={`text-xs font-mono font-bold ${getLatencyColor(totalP50)}`}>
                        {totalP50}ms
                    </div>
                    <div className="text-[9px] text-primary">1st Audio</div>
                </div>
                <div>
                    <div className={`text-xs font-mono ${getLatencyColor(turnP50)}`}>
                        {turnP50}ms
                    </div>
                    <div className="text-[9px] text-textMuted">Turn</div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// LIVE WAVEFORM VISUALIZER
// ============================================
const LiveWaveform: React.FC<{
    isActive: boolean;
    color?: string;
    bars?: number;
    intensity?: number;
}> = ({ isActive, color = 'bg-primary', bars = 5, intensity = 1 }) => {
    const [heights, setHeights] = useState<number[]>(Array(bars).fill(4));

    useEffect(() => {
        if (!isActive) {
            setHeights(Array(bars).fill(4));
            return;
        }

        const interval = setInterval(() => {
            setHeights(
                Array(bars)
                    .fill(0)
                    .map(() => Math.max(4, 8 + Math.random() * 24 * intensity))
            );
        }, 80);

        return () => clearInterval(interval);
    }, [isActive, bars, intensity]);

    return (
        <div className="flex items-center justify-center gap-1 h-8">
            {heights.map((height, i) => (
                <div
                    key={i}
                    className={`w-1 ${color} rounded-full transition-all duration-75`}
                    style={{ height: `${height}px` }}
                />
            ))}
        </div>
    );
};

// ============================================
// AUDIO LEVEL INDICATOR
// ============================================
const AudioLevelIndicator: React.FC<{
    level: number;
    isActive: boolean;
}> = ({ level, isActive }) => {
    if (!isActive) return null;
    
    const percentage = Math.min(100, level * 100);
    
    return (
        <div className="w-full px-4 mt-2">
            <div className="flex items-center gap-2">
                <Microphone 
                    size={14} 
                    weight={level > 0.1 ? "fill" : "regular"}
                    className={level > 0.1 ? "text-emerald-400" : "text-textMuted"} 
                />
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-75 ${
                            level > 0.1 
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                                : 'bg-gradient-to-r from-textMuted/50 to-textMuted/30'
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

// ============================================
// CALL TIMER
// ============================================
const CallTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setSeconds(0);
            return;
        }

        const interval = setInterval(() => {
            setSeconds((s) => s + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <span className="text-xs font-mono text-textMuted">{formatTime(seconds)}</span>
    );
};

// ============================================
// MAIN COMPONENT - V3 with OpenAI Realtime STT
// ============================================
// UPGRADE: Streams PCM16 audio continuously to backend
// Server-side VAD via OpenAI Realtime handles speech detection
// Much faster transcription with streaming partials
// ============================================
const RealtimeVoiceChat: React.FC<RealtimeVoiceChatProps> = ({
    assistantId,
    formData,
    selectedVoice,
    onClose
}) => {
    // Audio streaming config for OpenAI Realtime STT
    // TUNED FOR LOW LATENCY + FAN NOISE FILTERING
    const AUDIO_CONFIG = {
        sampleRate: 24000,          // OpenAI Realtime expects 24kHz
        channelCount: 1,            // Mono audio
        chunkIntervalMs: 50,        // Send audio more frequently for lower latency
        interruptThreshold: 0.15,   // HIGHER threshold for barge-in (filter fan noise)
    };

    // State
    const [messages, setMessages] = useState<VoiceMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [callState, setCallState] = useState<CallState>('idle');
    const [audioLevel, setAudioLevel] = useState(0);
    const [transcription, setTranscription] = useState('');
    const [isSpeechDetected, setIsSpeechDetected] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    
    // V2: Latency metrics
    const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics | null>(null);
    const [showMetrics, setShowMetrics] = useState(true);
    const [isRecording] = useState(true); // V2: Recording enabled by default

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null); // Separate context for playback
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null); // Track current audio source for interruption
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const callStateRef = useRef<CallState>('idle'); // Ref for VAD to access current state
    
    // PCM16 streaming refs (V3)
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const isStreamingRef = useRef(false);
    const audioLevelFrameRef = useRef<number | null>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Keep callStateRef in sync for VAD access
    useEffect(() => {
        callStateRef.current = callState;
    }, [callState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, []);

    // ============================================
    // WEBSOCKET CONNECTION
    // ============================================

    const connect = async () => {
        setCallState('connecting');
        setError(null);

        // CRITICAL: Pre-initialize playback AudioContext during user interaction
        // This prevents "AudioContext was not allowed to start" errors
        // Browser autoplay policy requires user gesture to start AudioContext
        if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
            playbackContextRef.current = new AudioContext();
            console.log('[RealtimeVoice] 🔊 Pre-initialized playback AudioContext on user click');
        }
        if (playbackContextRef.current.state === 'suspended') {
            await playbackContextRef.current.resume();
            console.log('[RealtimeVoice] 🔊 Resumed playback AudioContext');
        }

        try {
            // Step 1: Create session via REST API
            const response = await authFetch('/api/voice-stream/session', {
                method: 'POST',
                body: JSON.stringify({
                    assistantId,
                    assistantConfig: {
                        name: formData.name,
                        systemPrompt: formData.systemPrompt,
                        firstMessage: formData.firstMessage,
                        voiceId: formData.voiceId,
                        languageSettings: formData.languageSettings,
                        styleSettings: formData.styleSettings,
                        llmModel: formData.llmModel,
                        temperature: formData.temperature,
                        maxTokens: formData.maxTokens,
                        ragEnabled: formData.ragEnabled,
                        ragSimilarityThreshold: formData.ragSimilarityThreshold,
                        ragMaxResults: formData.ragMaxResults,
                        ragInstructions: formData.ragInstructions,
                        knowledgeBaseIds: formData.knowledgeBaseIds
                    }
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create session');
            }

            const { wsUrl } = await response.json();

            // Step 2: Connect WebSocket
            const wsProtocol = API.BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
            const wsHost = API.BACKEND_URL.replace(/^https?:\/\//, '');
            const fullWsUrl = `${wsProtocol}://${wsHost}${wsUrl}`;
            
            console.log('[RealtimeVoice] Connecting to:', fullWsUrl);

            const ws = new WebSocket(fullWsUrl);
            wsRef.current = ws;

            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                console.log('[RealtimeVoice] WebSocket connected');
                setIsConnected(true);
                startMicrophone();
            };

            ws.onmessage = async (event) => {
                // Binary data can arrive as ArrayBuffer or Blob depending on browser/transport
                if (event.data instanceof ArrayBuffer) {
                    // Binary = audio from TTS (ArrayBuffer)
                    console.log('[RealtimeVoice] 🔊 Received audio ArrayBuffer:', event.data.byteLength, 'bytes');
                    await handleAudioData(event.data);
                } else if (event.data instanceof Blob) {
                    // Binary = audio from TTS (Blob) - convert to ArrayBuffer
                    console.log('[RealtimeVoice] 🔊 Received audio Blob:', event.data.size, 'bytes');
                    const arrayBuffer = await event.data.arrayBuffer();
                    await handleAudioData(arrayBuffer);
                } else if (typeof event.data === 'string') {
                    // JSON = control messages
                    try {
                        const message = JSON.parse(event.data);
                        handleMessage(message);
                    } catch (e) {
                        console.error('[RealtimeVoice] Invalid message:', e);
                    }
                } else {
                    console.warn('[RealtimeVoice] Unknown message type:', typeof event.data);
                }
            };

            ws.onerror = (event) => {
                console.error('[RealtimeVoice] WebSocket error:', event);
                setError('Connection error');
            };

            ws.onclose = () => {
                console.log('[RealtimeVoice] WebSocket closed');
                setIsConnected(false);
                setCallState('idle');
                stopMicrophone();
            };

        } catch (err) {
            console.error('[RealtimeVoice] Connection error:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect');
            setCallState('idle');
        }
    };

    const disconnect = () => {
        // Send end message
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'end' }));
            wsRef.current.close();
        }
        wsRef.current = null;

        stopMicrophone();
        stopAudioPlayback();

        setIsConnected(false);
        setCallState('idle');
        setMessages([]);
        setTranscription('');
    };

    // ============================================
    // MESSAGE HANDLING (V4 with streaming)
    // ============================================

    const handleMessage = (message: any) => {
        console.log('[RealtimeVoiceV4] Message:', message);

        switch (message.type) {
            case 'state':
                setCallState(message.state as CallState);
                break;

            case 'transcript':
                setTranscription(message.text);
                if (message.isFinal) {
                    const userMsg: VoiceMessage = {
                        id: `user-${Date.now()}`,
                        role: 'user',
                        content: message.text,
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, userMsg]);
                    setTranscription('');
                }
                break;

            case 'partial_transcript':
                // Real-time partial transcription
                setTranscription(message.text);
                break;

            case 'partial_response':
                // V4: Streaming LLM response - update last assistant message in real-time
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id.startsWith('streaming-')) {
                        // Update existing streaming message
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMsg, content: message.text }
                        ];
                    } else {
                        // Create new streaming message
                        return [
                            ...prev,
                            {
                                id: `streaming-${Date.now()}`,
                                role: 'assistant' as const,
                                content: message.text,
                                timestamp: new Date()
                            }
                        ];
                    }
                });
                break;

            case 'response':
                // V4: Final response - replace streaming message with final
                setMessages(prev => {
                    const filtered = prev.filter(m => !m.id.startsWith('streaming-'));
                    return [
                        ...filtered,
                        {
                            id: `assistant-${Date.now()}`,
                            role: 'assistant' as const,
                            content: message.text,
                            timestamp: new Date()
                        }
                    ];
                });
                break;

            case 'metrics':
                // V4: Enhanced latency metrics
                console.log('[RealtimeVoiceV4] ⏱️ Metrics:', message.metrics);
                setLatencyMetrics(message.metrics);
                break;

            case 'recording':
                // V2: Recording summary (on end)
                console.log('[RealtimeVoiceV2] 📼 Recording:', message.recording);
                break;

            case 'error':
                setError(message.error);
                break;
        }
    };

    // ============================================
    // MICROPHONE HANDLING - PCM16 STREAMING (V3)
    // ============================================
    // Streams raw PCM16 audio to backend continuously
    // Server-side VAD handles speech detection via OpenAI Realtime
    // ============================================

    const startMicrophone = async () => {
        try {
            // Request microphone with 24kHz for OpenAI Realtime
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: AUDIO_CONFIG.sampleRate,
                    channelCount: AUDIO_CONFIG.channelCount,
                }
            });
            streamRef.current = stream;

            // Create audio context at 24kHz for OpenAI Realtime
            const audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate });
            audioContextRef.current = audioContext;

            // Set up analyser for visual feedback
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Create ScriptProcessorNode to capture raw PCM samples
            // Buffer size 4096 at 24kHz = ~170ms chunks
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (event) => {
                if (!isStreamingRef.current || !wsRef.current) return;
                if (wsRef.current.readyState !== WebSocket.OPEN) return;

                // Get float32 samples from input
                const inputData = event.inputBuffer.getChannelData(0);
                
                // Convert Float32 to Int16 (PCM16)
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    // Clamp to [-1, 1] and scale to Int16 range
                    const sample = inputData[i] ?? 0;
                    const s = Math.max(-1, Math.min(1, sample));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Send PCM16 as binary ArrayBuffer
                wsRef.current.send(pcm16.buffer);
            };

            // Connect: source -> analyser -> scriptProcessor -> destination (for processing)
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            // Start streaming
            isStreamingRef.current = true;

            // Start audio level monitoring for UI
            startAudioLevelMonitoring();

            console.log('[RealtimeVoiceV3] 🎤 Microphone started - streaming PCM16 at 24kHz');

        } catch (err) {
            console.error('[RealtimeVoiceV3] Microphone error:', err);
            setError('Microphone access denied');
        }
    };

    const startAudioLevelMonitoring = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateLevel = () => {
            if (!analyserRef.current || !wsRef.current) {
                audioLevelFrameRef.current = null;
                return;
            }

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate RMS for visual feedback
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const normalized = (dataArray[i] ?? 0) / 255;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            setAudioLevel(rms);

            // Visual speech detection indicator (server handles actual VAD)
            setIsSpeechDetected(rms > 0.04);

            // BARGE-IN: Detect user speech during assistant speaking
            const currentState = callStateRef.current;
            if (currentState === 'speaking' && isPlayingRef.current) {
                const isBargeIn = rms > AUDIO_CONFIG.interruptThreshold;
                if (isBargeIn) {
                    console.log('[RealtimeVoiceV3] ⚡ BARGE-IN detected!');
                    stopAudioPlayback();
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
                    }
                }
            }

            audioLevelFrameRef.current = requestAnimationFrame(updateLevel);
        };

        audioLevelFrameRef.current = requestAnimationFrame(updateLevel);
    };

    const stopMicrophone = () => {
        // Stop streaming
        isStreamingRef.current = false;

        // Cancel audio level monitoring
        if (audioLevelFrameRef.current) {
            cancelAnimationFrame(audioLevelFrameRef.current);
            audioLevelFrameRef.current = null;
        }

        // Disconnect script processor
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setAudioLevel(0);
        setIsSpeechDetected(false);
    };

    // ============================================
    // AUDIO PLAYBACK (TTS)
    // ============================================

    const handleAudioData = async (arrayBuffer: ArrayBuffer) => {
        try {
            console.log('[RealtimeVoice] 🎵 Processing audio:', arrayBuffer.byteLength, 'bytes');
            
            // Use separate playback context to avoid conflicts with recording
            if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
                playbackContextRef.current = new AudioContext();
                console.log('[RealtimeVoice] Created new AudioContext for playback');
            }

            // Resume audio context if suspended (browser autoplay policy)
            if (playbackContextRef.current.state === 'suspended') {
                await playbackContextRef.current.resume();
                console.log('[RealtimeVoice] Resumed suspended AudioContext');
            }

            const audioContext = playbackContextRef.current;

            // Decode audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            console.log('[RealtimeVoice] ✅ Decoded audio:', audioBuffer.duration.toFixed(2), 'seconds');
            
            // Queue for playback
            audioQueueRef.current.push(audioBuffer);

            // Start playing if not already
            if (!isPlayingRef.current) {
                playNextInQueue();
            }

        } catch (err) {
            console.error('[RealtimeVoice] ❌ Audio decode error:', err);
        }
    };

    const playNextInQueue = async () => {
        if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsPlayingAudio(false);
            currentSourceRef.current = null;
            return;
        }

        isPlayingRef.current = true;
        setIsPlayingAudio(true);
        const audioBuffer = audioQueueRef.current.shift()!;

        if (!playbackContextRef.current) return;

        const source = playbackContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(playbackContextRef.current.destination);
        currentSourceRef.current = source;

        source.onended = () => {
            currentSourceRef.current = null;
            playNextInQueue();
        };

        source.start();
    };

    const stopAudioPlayback = () => {
        console.log('[Audio] Stopping playback (barge-in)');
        
        // Stop current audio source immediately
        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
            } catch (e) {
                // Source might have already ended
            }
            currentSourceRef.current = null;
        }
        
        // Clear queue
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
    };

    // Close playback context on unmount
    useEffect(() => {
        return () => {
            if (playbackContextRef.current) {
                playbackContextRef.current.close().catch(() => {});
            }
        };
    }, []);

    // ============================================
    // USER ACTIONS
    // ============================================

    const handleInterrupt = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
        }
        stopAudioPlayback();
    };

    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'mute', muted: newMuted }));
        }

        // Mute/unmute microphone
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !newMuted;
            });
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-background border-l border-white/10 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between bg-surface/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                            isConnected
                                ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10'
                                : 'bg-gradient-to-br from-primary/20 to-primary/10'
                        }`}
                    >
                        <Phone
                            size={20}
                            weight="fill"
                            className={isConnected ? 'text-emerald-400' : 'text-primary'}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-textMain">
                                {formData.name || 'Assistant'}
                            </h4>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400">
                                <Lightning size={10} weight="fill" />
                                <span className="text-[10px] font-medium">REALTIME</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <>
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-emerald-400">Live Call</span>
                                    <span className="text-textMuted">•</span>
                                    <CallTimer isActive={isConnected} />
                                </>
                            ) : (
                                <span className="text-xs text-textMuted">
                                    {selectedVoice?.name || 'Voice Preview'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isConnected && (
                        <>
                            {/* V2: Toggle Metrics */}
                            <button
                                onClick={() => setShowMetrics(!showMetrics)}
                                className={`p-2 rounded-lg transition-colors ${
                                    showMetrics
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-textMuted hover:text-textMain hover:bg-surface'
                                }`}
                                title="Toggle Latency Metrics"
                            >
                                <ChartBar size={16} />
                            </button>
                            <button
                                onClick={handleInterrupt}
                                className="p-2 text-textMuted hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Interrupt"
                            >
                                <Waveform size={16} />
                            </button>
                            <button
                                onClick={toggleMute}
                                className={`p-2 rounded-lg transition-colors ${
                                    isMuted
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'text-textMuted hover:text-textMain hover:bg-surface'
                                }`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <MicrophoneSlash size={16} /> : <Microphone size={16} />}
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg transition-colors"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {!isConnected ? (
                // Not Connected State
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center max-w-xs">
                        {/* Voice Visualization */}
                        <div className="relative w-32 h-32 mx-auto mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full animate-pulse" />
                            <div className="absolute inset-4 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Robot size={40} weight="duotone" className="text-primary" />
                            </div>
                        </div>

                        <h4 className="text-lg font-semibold text-textMain mb-2">
                            Real-time Voice Call
                        </h4>
                        <p className="text-sm text-textMuted mb-2">
                            Talk naturally with interruption support
                        </p>
                        <p className="text-sm text-textMuted mb-6">
                            {selectedVoice ? (
                                <>
                                    Voice:{' '}
                                    <span className="text-primary font-medium">{selectedVoice.name}</span>
                                </>
                            ) : (
                                'No voice selected'
                            )}
                        </p>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                                <Warning size={16} />
                                <span className="text-xs">{error}</span>
                            </div>
                        )}

                        {!formData.voiceId && (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                                ⚠️ Please select a voice first
                            </p>
                        )}

                        <button
                            onClick={connect}
                            disabled={!formData.voiceId || callState === 'connecting'}
                            className="group flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {callState === 'connecting' ? (
                                <>
                                    <CircleNotch size={20} className="animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Phone
                                        size={20}
                                        weight="fill"
                                        className="group-hover:scale-110 transition-transform"
                                    />
                                    Start Real-time Call
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                // Connected State
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Call Visual */}
                    <div className="flex-shrink-0 p-6 bg-gradient-to-b from-surface/50 to-transparent">
                        <div className="flex flex-col items-center">
                            {/* Avatar with state */}
                            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                                callState === 'speaking'
                                    ? 'bg-gradient-to-br from-primary/30 to-primary/10'
                                    : callState === 'listening'
                                    ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-500/10'
                                    : 'bg-gradient-to-br from-surface to-surface/50'
                            }`}>
                                {callState === 'speaking' && (
                                    <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
                                )}
                                <Robot
                                    size={40}
                                    weight="duotone"
                                    className={
                                        callState === 'speaking'
                                            ? 'text-primary'
                                            : callState === 'listening'
                                            ? 'text-emerald-400'
                                            : 'text-textMuted'
                                    }
                                />
                            </div>

                            {/* Waveform */}
                            <LiveWaveform
                                isActive={callState === 'speaking' || callState === 'listening'}
                                color={callState === 'speaking' ? 'bg-primary' : 'bg-emerald-400'}
                                intensity={callState === 'speaking' ? 1 : audioLevel * 5}
                            />

                            {/* State Text */}
                            <p className="text-sm text-textMuted mt-2">
                                {callState === 'speaking' && (isPlayingAudio ? '🔊 Assistant speaking...' : 'Generating response...')}
                                {callState === 'listening' && (isSpeechDetected ? '🎤 Voice detected...' : '👂 Listening...')}
                                {callState === 'processing' && '⏳ Processing...'}
                            </p>

                            {/* Live Transcription */}
                            {transcription && (
                                <p className="text-sm text-textMain mt-2 italic">
                                    "{transcription}"
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Audio Level */}
                    <AudioLevelIndicator level={audioLevel} isActive={callState === 'listening'} />

                    {/* V2: Latency Metrics */}
                    {showMetrics && <LatencyDisplay metrics={latencyMetrics} />}

                    {/* V2: Recording Indicator */}
                    {isRecording && isConnected && (
                        <div className="px-4 py-1 flex items-center gap-2 text-red-400 text-xs">
                            <Record size={12} weight="fill" className="animate-pulse" />
                            <span>Recording</span>
                        </div>
                    )}

                    {/* Messages - Scrollable Area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                        msg.role === 'user'
                                            ? 'bg-primary/20 text-textMain'
                                            : 'bg-surface border border-white/5 text-textMain'
                                    }`}
                                >
                                    <p className="text-sm">{msg.content}</p>
                                    <p className="text-[10px] text-textMuted mt-1">
                                        {formatTime(msg.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* End Call Button */}
                    <div className="p-4 border-t border-white/5">
                        <button
                            onClick={disconnect}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl transition-colors"
                        >
                            <PhoneDisconnect size={20} weight="fill" />
                            End Call
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealtimeVoiceChat;
