// ============================================
// VOICE CALL PREVIEW - Premium Call Interface
// High-quality real-time voice conversation with AI assistant
// ============================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Microphone,
    MicrophoneSlash,
    Phone,
    PhoneDisconnect,
    SpeakerHigh,
    SpeakerSlash,
    CircleNotch,
    Warning,
    X,
    Timer,
    Lightning,
    ArrowsClockwise,
    WifiHigh,
    WifiMedium,
    WifiLow,
    Robot,
    User,
} from '@phosphor-icons/react';
import { logger } from '@/lib/logger';
import { API } from '@/lib/constants';

// ============================================
// TYPES
// ============================================

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type AgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted';

interface VoiceCallPreviewProps {
    /** Assistant ID to call */
    assistantId: string;
    /** User ID for authentication */
    userId: string;
    /** Assistant name for display */
    assistantName: string;
    /** Optional customer ID for memory */
    customerId?: string;
    /** Whether the modal is open */
    isOpen: boolean;
    /** Close handler */
    onClose: () => void;
    /** Called when conversation ends */
    onConversationEnd?: (transcript: TranscriptEntry[]) => void;
}

interface TranscriptEntry {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isFinal: boolean;
}

interface VoiceAgentMessage {
    type: string;
    sessionId?: string;
    state?: AgentState;
    text?: string;
    isFinal?: boolean;
    isUser?: boolean;
    role?: 'user' | 'assistant';
    error?: string;
    timestamp?: number;
    assistantName?: string;
    config?: {
        sampleRate: number;
        encoding: string;
        outputSampleRate?: number;
    };
}

interface LatencyMetrics {
    stt: number[];
    llm: number[];
    tts: number[];
    total: number[];
}

// ============================================
// AUDIO UTILITIES
// ============================================

class PCMAudioPlayer {
    private audioContext: AudioContext | null = null;
    private audioQueue: Float32Array[] = [];
    private isPlaying = false;
    private nextTime = 0;
    private gainNode: GainNode | null = null;
    private analyserNode: AnalyserNode | null = null;
    private sampleRate: number;
    private dataArray: Uint8Array<ArrayBuffer> | null = null;
    
    onAudioLevel?: (level: number) => void;
    
    constructor(sampleRate: number = 24000) {
        this.sampleRate = sampleRate;
        this.initAudioContext();
    }
    
    private initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
                sampleRate: this.sampleRate,
            });
            
            this.gainNode = this.audioContext.createGain();
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>;
            
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
            
        } catch (error) {
            logger.error('Failed to create AudioContext', { context: { error } });
        }
    }
    
    private pcmToFloat32(pcmData: ArrayBuffer): Float32Array {
        const int16 = new Int16Array(pcmData);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            const sample = int16[i] ?? 0;
            float32[i] = sample / 32768.0;
        }
        return float32;
    }
    
    playPCMAudio(arrayBuffer: ArrayBuffer) {
        if (!this.audioContext || !this.gainNode) return;
        
        const floatData = this.pcmToFloat32(arrayBuffer);
        this.audioQueue.push(floatData);
        
        if (!this.isPlaying) {
            this.processQueue();
        }
    }
    
    private processQueue() {
        if (!this.audioContext || !this.gainNode || this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const floatData = this.audioQueue.shift()!;
        
        const audioBuffer = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(floatData);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);
        
        const currentTime = this.audioContext.currentTime;
        const startTime = Math.max(currentTime, this.nextTime);
        source.start(startTime);
        
        this.nextTime = startTime + audioBuffer.duration;
        
        // Update audio level
        this.updateAudioLevel();
        
        source.onended = () => {
            this.processQueue();
        };
    }
    
    private updateAudioLevel() {
        if (!this.analyserNode || !this.dataArray) return;
        
        this.analyserNode.getByteFrequencyData(this.dataArray);
        const average = this.dataArray.reduce((a, b) => a + b, 0) / this.dataArray.length;
        this.onAudioLevel?.(average / 255);
    }
    
    clearQueue() {
        this.audioQueue = [];
        this.isPlaying = false;
        this.nextTime = 0;
    }
    
    setMuted(muted: boolean) {
        if (this.gainNode) {
            this.gainNode.gain.value = muted ? 0 : 1;
        }
    }
    
    setVolume(volume: number) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
    
    resume() {
        this.audioContext?.resume();
    }
    
    destroy() {
        this.clearQueue();
        this.audioContext?.close();
    }
}

class AudioRecorder {
    private mediaStream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    
    onAudioData: ((data: Int16Array) => void) | null = null;
    onAudioLevel: ((level: number) => void) | null = null;
    
    async start(): Promise<boolean> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
                sampleRate: 16000,
            });
            
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            this.source.connect(this.analyser);
            this.analyser.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            this.processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const inputSample = inputData[i];
                    pcmData[i] = Math.max(-32768, Math.min(32767, (inputSample !== undefined ? inputSample : 0) * 32767));
                }
                this.onAudioData?.(pcmData);
                
                if (this.analyser && this.onAudioLevel) {
                    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                    this.analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                    this.onAudioLevel(average / 255);
                }
            };
            
            return true;
        } catch (error) {
            logger.error('Failed to start recording', { context: { error } });
            return false;
        }
    }
    
    stop() {
        this.processor?.disconnect();
        this.source?.disconnect();
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.audioContext?.close();
        
        this.processor = null;
        this.source = null;
        this.mediaStream = null;
        this.audioContext = null;
    }
}

// ============================================
// WAVEFORM VISUALIZER COMPONENT
// ============================================

function WaveformVisualizer({ 
    level, 
    isActive, 
    color = 'primary',
    barCount = 24 
}: { 
    level: number; 
    isActive: boolean; 
    color?: 'primary' | 'white';
    barCount?: number;
}) {
    const bars = useMemo(() => {
        return Array.from({ length: barCount }, (_, i) => {
            const baseHeight = Math.sin((i / barCount) * Math.PI) * 0.5 + 0.5;
            const animatedHeight = isActive 
                ? baseHeight * (0.3 + level * 0.7) + (Math.random() * 0.2 * level)
                : baseHeight * 0.15;
            return Math.max(0.1, Math.min(1, animatedHeight));
        });
    }, [level, isActive, barCount]);
    
    return (
        <div className="flex items-center justify-center gap-0.5 h-8">
            {bars.map((height, i) => (
                <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                        color === 'primary' ? 'bg-primary' : 'bg-white/80'
                    }`}
                    style={{
                        height: `${height * 100}%`,
                        opacity: isActive ? 0.6 + height * 0.4 : 0.3,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// LATENCY INDICATOR
// ============================================

function LatencyIndicator({ latency }: { latency: number }) {
    const getColor = () => {
        if (latency < 300) return 'text-green-400';
        if (latency < 600) return 'text-yellow-400';
        return 'text-red-400';
    };
    
    const getIcon = () => {
        if (latency < 300) return WifiHigh;
        if (latency < 600) return WifiMedium;
        return WifiLow;
    };
    
    const Icon = getIcon();
    
    return (
        <div className={`flex items-center gap-1.5 text-xs ${getColor()}`}>
            <Icon size={14} weight="fill" />
            <span>{latency}ms</span>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function VoiceCallPreview({
    assistantId,
    userId,
    assistantName,
    customerId,
    isOpen,
    onClose,
    onConversationEnd,
}: VoiceCallPreviewProps) {
    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [agentState, setAgentState] = useState<AgentState>('idle');
    const [sessionId, setSessionId] = useState<string | null>(null);
    
    // Audio state
    const [isMuted, setIsMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    const [inputLevel, setInputLevel] = useState(0);
    const [outputLevel, setOutputLevel] = useState(0);
    
    // Transcript
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [interimText, setInterimText] = useState('');
    
    // Call metrics
    const [callDuration, setCallDuration] = useState(0);
    const [latencyMetrics, setLatencyMetrics] = useState<LatencyMetrics>({
        stt: [], llm: [], tts: [], total: []
    });
    
    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioPlayerRef = useRef<PCMAudioPlayer | null>(null);
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const callStartTimeRef = useRef<number | null>(null);
    const reconnectAttemptRef = useRef(0);
    const maxReconnectAttempts = 3;
    
    // Calculate average latency
    const avgLatency = useMemo(() => {
        if (latencyMetrics.total.length === 0) return 0;
        return Math.round(
            latencyMetrics.total.reduce((a, b) => a + b, 0) / latencyMetrics.total.length
        );
    }, [latencyMetrics.total]);
    
    // Call duration timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        
        if (connectionState === 'connected' && callStartTimeRef.current) {
            interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current!) / 1000));
            }, 1000);
        }
        
        return () => clearInterval(interval);
    }, [connectionState]);
    
    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, interimText]);
    
    // Cleanup on unmount or close
    useEffect(() => {
        if (!isOpen) {
            disconnect();
        }
        return () => {
            disconnect();
        };
    }, [isOpen]);
    
    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // ============================================
    // MESSAGE HANDLING
    // ============================================
    
    const handleMessage = useCallback((message: VoiceAgentMessage) => {
        switch (message.type) {
            case 'ready':
                logger.info('Voice agent ready');
                break;
                
            case 'session_created': {
                setSessionId(message.sessionId ?? null);
                setConnectionState('connected');
                callStartTimeRef.current = Date.now();
                reconnectAttemptRef.current = 0;
                
                // Start recording
                audioRecorderRef.current = new AudioRecorder();
                audioRecorderRef.current.onAudioData = sendAudioData;
                audioRecorderRef.current.onAudioLevel = setInputLevel;
                void audioRecorderRef.current.start().then(started => {
                    if (!started) {
                        setConnectionState('error');
                        logger.error('Failed to access microphone');
                    }
                });
                
                // Setup audio player level callback
                if (audioPlayerRef.current) {
                    audioPlayerRef.current.onAudioLevel = setOutputLevel;
                }
                
                // Resume audio context (for Safari)
                audioPlayerRef.current?.resume();
                break;
            }
                
            case 'state_change':
                setAgentState((message.state as AgentState) || 'idle');
                break;
                
            case 'transcript':
                if (message.role === 'user') {
                    if (message.isFinal && message.text) {
                        setTranscript(prev => [...prev, {
                            role: 'user',
                            content: message.text!,
                            timestamp: message.timestamp || Date.now(),
                            isFinal: true,
                        }]);
                        setInterimText('');
                    } else if (message.text) {
                        setInterimText(message.text);
                    }
                } else if (message.role === 'assistant' && message.text) {
                    setTranscript(prev => {
                        const lastEntry = prev[prev.length - 1];
                        if (lastEntry && lastEntry.role === 'assistant' && !lastEntry.isFinal) {
                            const updated = [...prev];
                            updated[prev.length - 1] = {
                                role: 'assistant' as const,
                                content: message.text!,
                                timestamp: lastEntry.timestamp,
                                isFinal: message.isFinal || false,
                            };
                            return updated;
                        } else {
                            return [...prev, {
                                role: 'assistant' as const,
                                content: message.text!,
                                timestamp: message.timestamp || Date.now(),
                                isFinal: message.isFinal || false,
                            }];
                        }
                    });
                }
                break;
                
            case 'latency':
                // Update latency metrics
                if (message.timestamp) {
                    setLatencyMetrics(prev => ({
                        ...prev,
                        total: [...prev.total.slice(-19), message.timestamp!],
                    }));
                }
                break;
                
            case 'clear_audio':
            case 'interrupted':
                audioPlayerRef.current?.clearQueue();
                break;
                
            case 'session_ended':
                logger.info('Session ended');
                cleanup();
                break;
                
            case 'error':
                logger.error('Voice agent error', { context: { errorMsg: message.error } });
                setConnectionState('error');
                break;
        }
    }, []);
    
    // ============================================
    // AUDIO TRANSMISSION
    // ============================================
    
    const sendAudioData = useCallback((data: Int16Array) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
            wsRef.current.send(data.buffer);
        }
    }, [isMuted]);
    
    // ============================================
    // CONNECTION
    // ============================================
    
    const connect = useCallback(() => {
        if (connectionState !== 'disconnected' && connectionState !== 'error') return;
        
        setConnectionState('connecting');
        setTranscript([]);
        setInterimText('');
        setCallDuration(0);
        setLatencyMetrics({ stt: [], llm: [], tts: [], total: [] });
        
        try {
            // Initialize audio player
            audioPlayerRef.current = new PCMAudioPlayer(24000);
            
            // Build WebSocket URL
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const backendHost = new URL(API.BACKEND_URL).host;
            const wsUrl = `${wsProtocol}//${backendHost}/ws/voice-agent`;
            
            logger.info('Connecting to voice agent', { context: { wsUrl } });
            
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            
            ws.binaryType = 'arraybuffer';
            
            ws.onopen = () => {
                logger.info('WebSocket connected');
                
                // Send start message
                ws.send(JSON.stringify({
                    type: 'start',
                    assistantId,
                    userId,
                    customerId,
                    sessionType: 'widget',
                }));
            };
            
            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    audioPlayerRef.current?.playPCMAudio(event.data);
                } else if (event.data instanceof Blob) {
                    void event.data.arrayBuffer().then(arrayBuffer => {
                        audioPlayerRef.current?.playPCMAudio(arrayBuffer);
                    });
                } else {
                    try {
                        const message: VoiceAgentMessage = JSON.parse(event.data as string);
                        handleMessage(message);
                    } catch (parseError) {
                        logger.error('Failed to parse message', { context: { parseError } });
                    }
                }
            };
            
            ws.onerror = () => {
                logger.error('WebSocket error');
                
                // Try reconnect
                if (reconnectAttemptRef.current < maxReconnectAttempts) {
                    setConnectionState('reconnecting');
                    reconnectAttemptRef.current++;
                    setTimeout(() => connect(), 1000 * reconnectAttemptRef.current);
                } else {
                    setConnectionState('error');
                }
            };
            
            ws.onclose = (event) => {
                logger.info('WebSocket closed', { context: { code: event.code } });
                
                // Try reconnect on abnormal closure
                if (event.code !== 1000 && reconnectAttemptRef.current < maxReconnectAttempts) {
                    setConnectionState('reconnecting');
                    reconnectAttemptRef.current++;
                    setTimeout(() => connect(), 1000 * reconnectAttemptRef.current);
                } else {
                    cleanup();
                }
            };
            
        } catch (connectError) {
            logger.error('Failed to connect', { context: { connectError } });
            setConnectionState('error');
        }
    }, [connectionState, assistantId, userId, customerId, handleMessage]);
    
    const disconnect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop', sessionId }));
        }
        cleanup();
    }, [sessionId]);
    
    const cleanup = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        
        audioRecorderRef.current?.stop();
        audioRecorderRef.current = null;
        
        audioPlayerRef.current?.destroy();
        audioPlayerRef.current = null;
        
        setConnectionState('disconnected');
        setAgentState('idle');
        setSessionId(null);
        setInputLevel(0);
        setOutputLevel(0);
        callStartTimeRef.current = null;
        
        // Call completion handler
        if (transcript.length > 0) {
            onConversationEnd?.(transcript.filter(t => t.isFinal));
        }
    }, [transcript, onConversationEnd]);
    
    // ============================================
    // CONTROLS
    // ============================================
    
    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);
    
    const toggleOutputMute = useCallback(() => {
        setIsOutputMuted(prev => {
            audioPlayerRef.current?.setMuted(!prev);
            return !prev;
        });
    }, []);
    
    // Helper function
    const getAgentStateText = (state: AgentState): string => {
        switch (state) {
            case 'idle': return 'Ready';
            case 'listening': return 'Listening...';
            case 'processing': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            case 'interrupted': return 'Interrupted';
            default: return 'Unknown';
        }
    };
    
    const getAgentStateColor = (state: AgentState): string => {
        switch (state) {
            case 'listening': return 'text-green-400';
            case 'processing': return 'text-yellow-400';
            case 'speaking': return 'text-primary';
            case 'interrupted': return 'text-orange-400';
            default: return 'text-textMuted';
        }
    };
    
    if (!isOpen) return null;
    
    // ============================================
    // RENDER
    // ============================================
    
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-gradient-to-b from-surface to-background rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 blur-3xl pointer-events-none" />
                
                {/* Header */}
                <div className="relative flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            connectionState === 'connected' 
                                ? 'bg-gradient-to-br from-primary/30 to-primary/10' 
                                : 'bg-white/5'
                        }`}>
                            <Robot size={24} weight="duotone" className={
                                connectionState === 'connected' ? 'text-primary' : 'text-textMuted'
                            } />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">{assistantName}</h2>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm ${getAgentStateColor(agentState)}`}>
                                    {connectionState === 'disconnected' && 'Ready to call'}
                                    {connectionState === 'connecting' && 'Connecting...'}
                                    {connectionState === 'reconnecting' && 'Reconnecting...'}
                                    {connectionState === 'connected' && getAgentStateText(agentState)}
                                    {connectionState === 'error' && 'Connection error'}
                                </span>
                                {connectionState === 'connected' && avgLatency > 0 && (
                                    <LatencyIndicator latency={avgLatency} />
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-textMuted hover:text-textMain hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Call Duration Bar */}
                {connectionState === 'connected' && (
                    <div className="px-6 py-2 bg-primary/5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            <Timer size={16} className="text-primary" />
                            <span className="font-mono text-textMain">{formatDuration(callDuration)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-textMuted">
                            <span>{transcript.length} messages</span>
                            {latencyMetrics.total.length > 0 && (
                                <span className="flex items-center gap-1">
                                    <Lightning size={12} className="text-yellow-400" />
                                    Avg: {avgLatency}ms
                                </span>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Waveform Visualization */}
                <div className="relative h-24 flex items-center justify-center bg-gradient-to-b from-transparent to-white/[0.02] border-b border-white/5">
                    {connectionState === 'connected' ? (
                        <div className="flex items-center gap-8">
                            {/* User waveform */}
                            <div className="text-center">
                                <WaveformVisualizer 
                                    level={inputLevel} 
                                    isActive={agentState === 'listening' && !isMuted}
                                    color="white"
                                    barCount={16}
                                />
                                <span className="text-xs text-textMuted mt-1 block">You</span>
                            </div>
                            
                            {/* Divider */}
                            <div className="w-px h-12 bg-white/10" />
                            
                            {/* Agent waveform */}
                            <div className="text-center">
                                <WaveformVisualizer 
                                    level={outputLevel} 
                                    isActive={agentState === 'speaking'}
                                    color="primary"
                                    barCount={16}
                                />
                                <span className="text-xs text-textMuted mt-1 block">Agent</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            {connectionState === 'connecting' || connectionState === 'reconnecting' ? (
                                <>
                                    <CircleNotch size={32} className="text-primary animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-textMuted">
                                        {connectionState === 'reconnecting' 
                                            ? `Reconnecting... (${reconnectAttemptRef.current}/${maxReconnectAttempts})`
                                            : 'Establishing connection...'
                                        }
                                    </p>
                                </>
                            ) : connectionState === 'error' ? (
                                <>
                                    <Warning size={32} className="text-red-400 mx-auto mb-2" />
                                    <p className="text-sm text-red-400">Connection failed</p>
                                    <button 
                                        onClick={connect}
                                        className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1 mx-auto"
                                    >
                                        <ArrowsClockwise size={12} />
                                        Try again
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Phone size={32} className="text-textMuted mx-auto mb-2" />
                                    <p className="text-sm text-textMuted">Click Start Call to begin</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Transcript */}
                <div 
                    ref={transcriptRef}
                    className="h-64 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                    {transcript.length === 0 && !interimText && connectionState === 'connected' && (
                        <div className="flex items-center justify-center h-full text-textMuted text-sm">
                            Start speaking to begin the conversation...
                        </div>
                    )}
                    
                    {transcript.map((entry, index) => (
                        <div
                            key={index}
                            className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {entry.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Robot size={14} className="text-primary" />
                                </div>
                            )}
                            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                                entry.role === 'user'
                                    ? 'bg-primary/20 text-textMain rounded-tr-md'
                                    : 'bg-white/5 text-textMain rounded-tl-md'
                            } ${!entry.isFinal ? 'opacity-60' : ''}`}>
                                {entry.content}
                            </div>
                            {entry.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <User size={14} className="text-textMain" />
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {interimText && (
                        <div className="flex gap-3 justify-end">
                            <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-md text-sm bg-primary/10 text-textMuted italic">
                                {interimText}...
                            </div>
                            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 animate-pulse">
                                <Microphone size={14} className="text-primary" />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Controls */}
                <div className="px-6 py-4 border-t border-white/5 bg-background/50">
                    {connectionState === 'connected' ? (
                        <div className="flex items-center justify-between">
                            {/* Audio controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleMute}
                                    className={`p-3 rounded-xl transition-all ${
                                        isMuted 
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                            : 'bg-white/5 text-textMain hover:bg-white/10'
                                    }`}
                                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                                >
                                    {isMuted ? <MicrophoneSlash size={22} /> : <Microphone size={22} />}
                                </button>
                                
                                <button
                                    onClick={toggleOutputMute}
                                    className={`p-3 rounded-xl transition-all ${
                                        isOutputMuted 
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                            : 'bg-white/5 text-textMain hover:bg-white/10'
                                    }`}
                                    title={isOutputMuted ? 'Unmute speaker' : 'Mute speaker'}
                                >
                                    {isOutputMuted ? <SpeakerSlash size={22} /> : <SpeakerHigh size={22} />}
                                </button>
                            </div>
                            
                            {/* End call button */}
                            <button
                                onClick={disconnect}
                                className="flex items-center gap-2 px-6 py-3 bg-red-500/90 hover:bg-red-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-red-500/25"
                            >
                                <PhoneDisconnect size={20} weight="fill" />
                                End Call
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={connect}
                            disabled={connectionState === 'connecting' || connectionState === 'reconnecting'}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {connectionState === 'connecting' || connectionState === 'reconnecting' ? (
                                <>
                                    <CircleNotch size={22} className="animate-spin" />
                                    {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
                                </>
                            ) : (
                                <>
                                    <Phone size={22} weight="fill" />
                                    Start Call
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default VoiceCallPreview;
