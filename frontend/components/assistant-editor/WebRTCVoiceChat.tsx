import {
    Robot, X, Microphone, MicrophoneSlash, Phone, PhoneDisconnect,
    Warning, CircleNotch, Waveform, Lightning, Timer, ChartBar
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

interface WebRTCMessage {
    type: string;
    state?: string;
    text?: string;
    isFinal?: boolean;
    metrics?: LatencyMetrics;
    error?: string;
}

interface WebRTCVoiceChatProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
    onClose: () => void;
}

type CallState = 'idle' | 'connecting' | 'listening' | 'processing' | 'speaking';

interface LatencyMetrics {
    turnCount: number;
    stt: { avg: number; p50: number; p99: number };
    llm: { firstToken: { avg: number; p50: number; p99: number } };
    tts: { firstChunk: { avg: number; p50: number; p99: number } };
    total: { toFirstAudio: { avg: number; p50: number; p99: number } };
}

// ============================================
// LATENCY METRICS DISPLAY
// ============================================
const LatencyDisplay: React.FC<{ metrics: LatencyMetrics | null }> = ({ metrics }) => {
    if (!metrics || metrics.turnCount === 0) return null;

    const getLatencyColor = (ms: number) => {
        if (ms < 500) return 'text-emerald-400';
        if (ms < 1000) return 'text-amber-400';
        return 'text-red-400';
    };

    const sttP50 = metrics.stt?.p50 ?? 0;
    const llmP50 = metrics.llm?.firstToken?.p50 ?? 0;
    const ttsP50 = metrics.tts?.firstChunk?.p50 ?? 0;
    const totalP50 = metrics.total?.toFirstAudio?.p50 ?? 0;

    return (
        <div className="px-4 py-2 border-t border-white/5 bg-surface/50">
            <div className="flex items-center gap-2 mb-2">
                <Timer size={14} className="text-primary" />
                <span className="text-xs font-medium text-textMuted">Latency (P50)</span>
                <span className="text-[10px] text-textMuted/60 ml-auto">
                    {metrics.turnCount} turn{metrics.turnCount > 1 ? 's' : ''}
                </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
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
// MAIN COMPONENT - WebRTC with OpenAI Realtime STT
// ============================================
const WebRTCVoiceChat: React.FC<WebRTCVoiceChatProps> = ({
    assistantId,
    formData,
    selectedVoice: _selectedVoice, // Unused but kept for API compatibility
    onClose
}) => {
    const AUDIO_CONFIG = {
        sampleRate: 24000,
        channelCount: 1,
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
    const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics | null>(null);
    const [showMetrics, setShowMetrics] = useState(true);

    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const callStateRef = useRef<CallState>('idle');
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const isStreamingRef = useRef(false);
    const audioLevelFrameRef = useRef<number | null>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Keep callStateRef in sync
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

        // Pre-initialize playback AudioContext
        if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
            playbackContextRef.current = new AudioContext();
            console.log('[WebRTC] 🔊 Pre-initialized playback AudioContext');
        }
        if (playbackContextRef.current.state === 'suspended') {
            await playbackContextRef.current.resume();
        }

        try {
            // Step 1: Create session via REST API
            const response = await authFetch('/api/webrtc-voice/session', {
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
            
            console.log('[WebRTC] Connecting to:', fullWsUrl);

            const ws = new WebSocket(fullWsUrl);
            wsRef.current = ws;
            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                console.log('[WebRTC] WebSocket connected');
                setIsConnected(true);
                startMicrophone();
            };

            ws.onmessage = async (event) => {
                if (event.data instanceof ArrayBuffer) {
                    console.log('[WebRTC] 🔊 Received audio:', event.data.byteLength, 'bytes');
                    await handleAudioData(event.data);
                } else if (event.data instanceof Blob) {
                    const arrayBuffer = await event.data.arrayBuffer();
                    await handleAudioData(arrayBuffer);
                } else if (typeof event.data === 'string') {
                    try {
                        const message = JSON.parse(event.data);
                        handleMessage(message);
                    } catch (e) {
                        console.error('[WebRTC] Invalid message:', e);
                    }
                }
            };

            ws.onerror = (event) => {
                console.error('[WebRTC] WebSocket error:', event);
                setError('Connection error');
            };

            ws.onclose = () => {
                console.log('[WebRTC] WebSocket closed');
                setIsConnected(false);
                setCallState('idle');
                stopMicrophone();
            };

        } catch (err) {
            console.error('[WebRTC] Connection error:', err);
            setError(err instanceof Error ? err.message : 'Failed to connect');
            setCallState('idle');
        }
    };

    const disconnect = () => {
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
    // MESSAGE HANDLING
    // ============================================

    const handleMessage = (message: WebRTCMessage) => {
        console.log('[WebRTC] Message:', message);

        switch (message.type) {
            case 'state':
                setCallState(message.state as CallState);
                break;

            case 'speech_started':
                setIsSpeechDetected(true);
                break;

            case 'speech_ended':
                setIsSpeechDetected(false);
                break;

            case 'transcript':
                setTranscription(message.text || '');
                if (message.isFinal) {
                    const userMsg: VoiceMessage = {
                        id: `user-${Date.now()}`,
                        role: 'user',
                        content: message.text || '',
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, userMsg]);
                    setTranscription('');
                }
                break;

            case 'partial_response':
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.id.startsWith('streaming-')) {
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMsg, content: message.text || '' }
                        ];
                    } else {
                        return [
                            ...prev,
                            {
                                id: `streaming-${Date.now()}`,
                                role: 'assistant' as const,
                                content: message.text || '',
                                timestamp: new Date()
                            }
                        ];
                    }
                });
                break;

            case 'response':
                setMessages(prev => {
                    const filtered = prev.filter(m => !m.id.startsWith('streaming-'));
                    return [
                        ...filtered,
                        {
                            id: `assistant-${Date.now()}`,
                            role: 'assistant' as const,
                            content: message.text || '',
                            timestamp: new Date()
                        }
                    ];
                });
                break;

            case 'metrics':
                if (message.metrics) {
                    setLatencyMetrics(message.metrics);
                }
                break;

            case 'interrupted':
                // Assistant was interrupted
                console.log('[WebRTC] 🛑 Interrupted');
                stopAudioPlayback();
                break;

            case 'error':
                setError(message.error || 'Unknown error');
                break;
        }
    };

    // ============================================
    // MICROPHONE HANDLING - PCM16 STREAMING
    // ============================================

    const startMicrophone = async () => {
        try {
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

            const audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate });
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (event) => {
                if (!isStreamingRef.current || !wsRef.current) return;
                if (wsRef.current.readyState !== WebSocket.OPEN) return;

                const inputData = event.inputBuffer.getChannelData(0);
                
                // Convert Float32 to Int16 (PCM16)
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const sample = inputData[i] ?? 0;
                    const s = Math.max(-1, Math.min(1, sample));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                wsRef.current.send(pcm16.buffer);
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            isStreamingRef.current = true;
            startAudioLevelMonitoring();

            console.log('[WebRTC] 🎤 Microphone started - streaming PCM16 at 24kHz');

        } catch (err) {
            console.error('[WebRTC] Microphone error:', err);
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

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const normalized = (dataArray[i] ?? 0) / 255;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            setAudioLevel(rms);

            audioLevelFrameRef.current = requestAnimationFrame(updateLevel);
        };

        audioLevelFrameRef.current = requestAnimationFrame(updateLevel);
    };

    const stopMicrophone = () => {
        isStreamingRef.current = false;

        if (audioLevelFrameRef.current) {
            cancelAnimationFrame(audioLevelFrameRef.current);
            audioLevelFrameRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

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
            if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
                playbackContextRef.current = new AudioContext();
            }

            if (playbackContextRef.current.state === 'suspended') {
                await playbackContextRef.current.resume();
            }

            const audioContext = playbackContextRef.current;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            
            audioQueueRef.current.push(audioBuffer);

            if (!isPlayingRef.current) {
                playNextInQueue();
            }

        } catch (err) {
            console.error('[WebRTC] ❌ Audio decode error:', err);
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
        console.log('[WebRTC] Stopping playback');
        
        if (currentSourceRef.current) {
            try {
                currentSourceRef.current.stop();
            } catch (e) {
                // Source might have already ended
            }
            currentSourceRef.current = null;
        }
        
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
    };

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
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/10 rounded text-cyan-400">
                                <Lightning size={10} weight="fill" />
                                <span className="text-[10px] font-medium">WebRTC</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <>
                                    <span className="flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-xs text-emerald-400">Connected</span>
                                    <span className="text-xs text-textMuted">•</span>
                                    <CallTimer isActive={isConnected} />
                                </>
                            ) : (
                                <span className="text-xs text-textMuted">
                                    {callState === 'connecting' ? 'Connecting...' : 'Click to start'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                    <X size={16} className="text-textMuted" />
                </button>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 border-b border-white/5 bg-surface/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {callState === 'listening' && (
                            <>
                                <Microphone
                                    size={14}
                                    weight={isSpeechDetected ? 'fill' : 'regular'}
                                    className={isSpeechDetected ? 'text-emerald-400' : 'text-textMuted'}
                                />
                                <span className="text-xs text-textMuted">
                                    {isSpeechDetected ? 'Listening...' : 'Ready'}
                                </span>
                            </>
                        )}
                        {callState === 'processing' && (
                            <>
                                <CircleNotch size={14} className="text-amber-400 animate-spin" />
                                <span className="text-xs text-amber-400">Processing...</span>
                            </>
                        )}
                        {callState === 'speaking' && (
                            <>
                                <Waveform size={14} weight="fill" className="text-primary" />
                                <span className="text-xs text-primary">Speaking</span>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => setShowMetrics(!showMetrics)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
                            showMetrics
                                ? 'bg-primary/10 text-primary'
                                : 'bg-white/5 text-textMuted hover:text-textMain'
                        }`}
                    >
                        <ChartBar size={12} />
                        Metrics
                    </button>
                </div>
            </div>

            {/* Latency Metrics */}
            {showMetrics && <LatencyDisplay metrics={latencyMetrics} />}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && !isConnected && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Robot size={32} className="text-primary" />
                        </div>
                        <p className="text-sm text-textMuted">
                            Click the phone button to start talking
                        </p>
                        <p className="text-xs text-textMuted/60 mt-1">
                            WebRTC • Ultra-low latency
                        </p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 ${
                                msg.role === 'user'
                                    ? 'bg-primary/20 text-textMain'
                                    : 'bg-surface border border-white/5 text-textMain'
                            } ${msg.id.startsWith('streaming-') ? 'animate-pulse' : ''}`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-[10px] text-textMuted/60 mt-1">
                                {formatTime(msg.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Transcription in progress */}
                {transcription && (
                    <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl px-3 py-2 bg-primary/10 border border-primary/20">
                            <p className="text-sm text-textMuted italic">{transcription}</p>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Audio Level */}
            <AudioLevelIndicator level={audioLevel} isActive={isConnected && !isMuted} />

            {/* Error Display */}
            {error && (
                <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
                    <div className="flex items-center gap-2">
                        <Warning size={14} className="text-red-400" />
                        <span className="text-xs text-red-400">{error}</span>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="p-4 border-t border-white/5 bg-surface/80 backdrop-blur-xl">
                <div className="flex items-center justify-center gap-4">
                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        disabled={!isConnected}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            !isConnected
                                ? 'bg-white/5 text-textMuted cursor-not-allowed'
                                : isMuted
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-white/5 text-textMain hover:bg-white/10'
                        }`}
                    >
                        {isMuted ? (
                            <MicrophoneSlash size={20} weight="fill" />
                        ) : (
                            <Microphone size={20} weight="fill" />
                        )}
                    </button>

                    {/* Call Button */}
                    {!isConnected ? (
                        <button
                            onClick={connect}
                            disabled={callState === 'connecting'}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-emerald-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {callState === 'connecting' ? (
                                <CircleNotch size={28} className="animate-spin" />
                            ) : (
                                <Phone size={28} weight="fill" />
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={disconnect}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center hover:shadow-lg hover:shadow-red-500/25 transition-all hover:-translate-y-0.5"
                        >
                            <PhoneDisconnect size={28} weight="fill" />
                        </button>
                    )}

                    {/* Interrupt Button */}
                    <button
                        onClick={handleInterrupt}
                        disabled={!isConnected || callState !== 'speaking'}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            !isConnected || callState !== 'speaking'
                                ? 'bg-white/5 text-textMuted cursor-not-allowed'
                                : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        }`}
                    >
                        <Warning size={20} weight="fill" />
                    </button>
                </div>

                {/* Voice indicator */}
                {isConnected && (
                    <div className="mt-4 flex justify-center">
                        <LiveWaveform
                            isActive={callState === 'speaking'}
                            color={callState === 'speaking' ? 'bg-primary' : 'bg-textMuted/30'}
                            intensity={isPlayingAudio ? 1 : 0.3}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebRTCVoiceChat;
