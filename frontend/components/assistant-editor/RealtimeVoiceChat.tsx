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

// V2: Latency metrics type
interface LatencyMetrics {
    turnCount: number;
    stt: { avg: number; p50: number; p99: number };
    llm: { avg: number; p50: number; p99: number };
    tts: { avg: number; p50: number; p99: number };
    total: { avg: number; p50: number; p99: number };
}

// ============================================
// LATENCY METRICS DISPLAY (V2)
// ============================================
const LatencyDisplay: React.FC<{ metrics: LatencyMetrics | null }> = ({ metrics }) => {
    if (!metrics || metrics.turnCount === 0) return null;

    const getLatencyColor = (ms: number) => {
        if (ms < 500) return 'text-emerald-400';
        if (ms < 1000) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <div className="px-4 py-2 border-t border-white/5 bg-surface/50">
            <div className="flex items-center gap-2 mb-2">
                <Timer size={14} className="text-primary" />
                <span className="text-xs font-medium text-textMuted">Latency (P50)</span>
                <span className="text-[10px] text-textMuted/60 ml-auto">
                    {metrics.turnCount} turn{metrics.turnCount > 1 ? 's' : ''}
                </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                    <div className={`text-sm font-mono ${getLatencyColor(metrics.stt.p50)}`}>
                        {metrics.stt.p50}ms
                    </div>
                    <div className="text-[10px] text-textMuted">STT</div>
                </div>
                <div>
                    <div className={`text-sm font-mono ${getLatencyColor(metrics.llm.p50)}`}>
                        {metrics.llm.p50}ms
                    </div>
                    <div className="text-[10px] text-textMuted">LLM</div>
                </div>
                <div>
                    <div className={`text-sm font-mono ${getLatencyColor(metrics.tts.p50)}`}>
                        {metrics.tts.p50}ms
                    </div>
                    <div className="text-[10px] text-textMuted">TTS</div>
                </div>
                <div>
                    <div className={`text-sm font-mono font-bold ${getLatencyColor(metrics.total.p50)}`}>
                        {metrics.total.p50}ms
                    </div>
                    <div className="text-[10px] text-textMuted">Total</div>
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
// MAIN COMPONENT
// ============================================
const RealtimeVoiceChat: React.FC<RealtimeVoiceChatProps> = ({
    assistantId,
    formData,
    selectedVoice,
    onClose
}) => {
    // VAD Configuration - Tuned for professional call quality
    const VAD_CONFIG = {
        silenceThreshold: 0.02,     // RMS threshold (slightly higher to avoid false triggers)
        silenceDuration: 800,       // ms of silence before processing (faster response)
        minSpeechDuration: 200,     // ms of speech required (faster detection)
        interruptThreshold: 0.03,   // Higher threshold for barge-in during TTS
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
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef(false);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null); // Track current audio source for interruption
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const callStateRef = useRef<CallState>('idle'); // Ref for VAD to access current state
    
    // VAD refs
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const speechStartTimeRef = useRef<number | null>(null);
    const hasSpokenRef = useRef(false);
    const vadFrameRef = useRef<number | null>(null); // Track VAD animation frame
    
    // Audio collection refs (fix for WebM chunk corruption)
    const audioChunksRef = useRef<Blob[]>([]);
    const isCollectingRef = useRef(false);

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
                if (event.data instanceof ArrayBuffer) {
                    // Binary = audio from TTS
                    await handleAudioData(event.data);
                } else {
                    // JSON = control messages
                    try {
                        const message = JSON.parse(event.data);
                        handleMessage(message);
                    } catch (e) {
                        console.error('[RealtimeVoice] Invalid message:', e);
                    }
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
    // MESSAGE HANDLING (V2 with metrics)
    // ============================================

    const handleMessage = (message: any) => {
        console.log('[RealtimeVoiceV2] Message:', message);

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
                // V2: Real-time partial transcription
                setTranscription(message.text);
                break;

            case 'response':
                const assistantMsg: VoiceMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: message.text,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMsg]);
                break;

            case 'metrics':
                // V2: Latency metrics update
                console.log('[RealtimeVoiceV2] ⏱️ Metrics:', message.metrics);
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
    // MICROPHONE HANDLING WITH VAD
    // ============================================

    const startMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                }
            });
            streamRef.current = stream;

            // Set up audio analysis for VAD
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            analyserRef.current = analyser;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Set up MediaRecorder - collect chunks locally, send complete file on speech_end
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            mediaRecorderRef.current = mediaRecorder;

            // Collect chunks locally (don't stream - WebM needs proper headers)
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && isCollectingRef.current) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // Collect audio every 100ms
            mediaRecorder.start(100);
            isCollectingRef.current = true;

            // Reset VAD state
            hasSpokenRef.current = false;
            speechStartTimeRef.current = null;
            
            // Start VAD monitoring
            startVADMonitoring();

            console.log('[RealtimeVoice] Microphone started with VAD');

        } catch (err) {
            console.error('[RealtimeVoice] Microphone error:', err);
            setError('Microphone access denied');
        }
    };

    const startVADMonitoring = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const checkVAD = () => {
            if (!analyserRef.current || !wsRef.current) {
                vadFrameRef.current = null;
                return;
            }

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate RMS for voice detection
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const normalized = (dataArray[i] ?? 0) / 255;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            setAudioLevel(rms);

            const currentState = callStateRef.current;
            
            // BARGE-IN: Detect user speech during assistant speaking
            if (currentState === 'speaking' && isPlayingRef.current) {
                const isBargeIn = rms > VAD_CONFIG.interruptThreshold;
                if (isBargeIn) {
                    console.log('[VAD] BARGE-IN detected! User interrupting assistant');
                    // Immediately stop playback and send interrupt
                    stopAudioPlayback();
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
                    }
                    // Start tracking user speech
                    speechStartTimeRef.current = Date.now();
                    hasSpokenRef.current = false;
                    setIsSpeechDetected(true);
                }
                vadFrameRef.current = requestAnimationFrame(checkVAD);
                return;
            }

            // During processing, just update visuals but don't trigger VAD logic
            if (currentState === 'processing') {
                setIsSpeechDetected(rms > VAD_CONFIG.silenceThreshold);
                vadFrameRef.current = requestAnimationFrame(checkVAD);
                return;
            }

            // Normal VAD during listening state
            const isSpeaking = rms > VAD_CONFIG.silenceThreshold;
            setIsSpeechDetected(isSpeaking);

            if (isSpeaking) {
                // User is speaking
                if (!speechStartTimeRef.current) {
                    speechStartTimeRef.current = Date.now();
                    // Clear previous chunks and start fresh collection
                    audioChunksRef.current = [];
                    isCollectingRef.current = true;
                    console.log('[VAD] Speech started - collecting audio');
                }

                // Clear silence timer
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }

                // Mark as spoken if duration is sufficient
                const speechDuration = Date.now() - speechStartTimeRef.current;
                if (speechDuration > VAD_CONFIG.minSpeechDuration) {
                    hasSpokenRef.current = true;
                    setTranscription('Listening...');
                }
            } else if (hasSpokenRef.current && !silenceTimerRef.current) {
                // Silence detected after speech - start timer
                console.log('[VAD] Silence detected, starting timer');
                setTranscription('Processing...');
                
                silenceTimerRef.current = setTimeout(async () => {
                    console.log('[VAD] Silence timeout - sending complete audio');
                    
                    // Stop collecting
                    isCollectingRef.current = false;
                    
                    // Create complete WebM blob from collected chunks
                    if (audioChunksRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
                        const audioBuffer = await audioBlob.arrayBuffer();
                        
                        console.log(`[VAD] Sending ${audioChunksRef.current.length} chunks as complete file (${audioBuffer.byteLength} bytes)`);
                        
                        // Send complete audio file
                        wsRef.current.send(audioBuffer);
                        
                        // Then signal speech end
                        wsRef.current.send(JSON.stringify({ type: 'speech_end' }));
                    }
                    
                    // Clear chunks
                    audioChunksRef.current = [];
                    
                    // Reset VAD state
                    hasSpokenRef.current = false;
                    speechStartTimeRef.current = null;
                    silenceTimerRef.current = null;
                }, VAD_CONFIG.silenceDuration);
            }

            vadFrameRef.current = requestAnimationFrame(checkVAD);
        };

        vadFrameRef.current = requestAnimationFrame(checkVAD);
    };

    const stopMicrophone = () => {
        // Cancel VAD animation frame
        if (vadFrameRef.current) {
            cancelAnimationFrame(vadFrameRef.current);
            vadFrameRef.current = null;
        }

        // Clear VAD timer
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }

        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current = null;
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
            // Use separate playback context to avoid conflicts with recording
            if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
                playbackContextRef.current = new AudioContext();
            }

            const audioContext = playbackContextRef.current;

            // Decode audio data
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            
            // Queue for playback
            audioQueueRef.current.push(audioBuffer);

            // Start playing if not already
            if (!isPlayingRef.current) {
                playNextInQueue();
            }

        } catch (err) {
            console.error('[RealtimeVoice] Audio decode error:', err);
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
                <div className="flex-1 flex flex-col">
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

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
