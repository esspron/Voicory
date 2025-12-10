// ============================================
// VOICE AGENT CLIENT
// Real-time voice conversation with AI assistant
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
    Microphone, 
    MicrophoneSlash, 
    Phone, 
    PhoneDisconnect, 
    SpeakerHigh, 
    SpeakerSlash,
    CircleNotch,
    Waveform,
    Warning,
    CheckCircle,
} from '@phosphor-icons/react';

// Alias for animated waveform icon
const WaveformCircle = Waveform;
import { Button } from './ui';
import { logger } from '@/lib/logger';
import { API } from '@/lib/constants';

// ============================================
// TYPES
// ============================================

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type AgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted';

interface VoiceAgentClientProps {
    /** Assistant ID to connect to */
    assistantId: string;
    /** User ID for authentication */
    userId: string;
    /** Optional customer ID for memory */
    customerId?: string;
    /** Called when conversation ends */
    onConversationEnd?: (transcript: TranscriptEntry[]) => void;
    /** Called on connection state change */
    onStateChange?: (state: ConnectionState) => void;
    /** Called when an error occurs */
    onError?: (error: string) => void;
    /** Custom styling */
    className?: string;
    /** Compact mode (just a button) */
    compact?: boolean;
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

// ============================================
// AUDIO UTILITIES
// ============================================

class PCMAudioPlayer {
    private audioContext: AudioContext | null = null;
    private audioQueue: Float32Array[] = [];
    private isPlaying = false;
    private nextTime = 0;
    private gainNode: GainNode | null = null;
    private sampleRate: number = 24000;
    
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
            this.gainNode.connect(this.audioContext.destination);
            logger.debug('Audio context initialized', { context: { sampleRate: this.sampleRate } });
        } catch (error) {
            logger.error('Failed to create AudioContext', { context: { error } });
        }
    }
    
    // Convert raw PCM Int16 to Float32 for Web Audio API
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
        
        // Create buffer and source
        const audioBuffer = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(floatData);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.gainNode);
        
        // Schedule playback
        const currentTime = this.audioContext.currentTime;
        const startTime = Math.max(currentTime, this.nextTime);
        source.start(startTime);
        
        this.nextTime = startTime + audioBuffer.duration;
        
        // Schedule next chunk
        source.onended = () => {
            this.processQueue();
        };
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
                // Convert to 16-bit PCM
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const inputSample = inputData[i];
                    pcmData[i] = Math.max(-32768, Math.min(32767, (inputSample !== undefined ? inputSample : 0) * 32767));
                }
                this.onAudioData?.(pcmData);
                
                // Calculate audio level for visualization
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
// COMPONENT
// ============================================

export function VoiceAgentClient({
    assistantId,
    userId,
    customerId,
    onConversationEnd,
    onStateChange,
    onError,
    className = '',
    compact = false,
}: VoiceAgentClientProps) {
    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [agentState, setAgentState] = useState<AgentState>('idle');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [assistantName, setAssistantName] = useState<string>('');
    
    // Audio state
    const [isMuted, setIsMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    
    // Transcript
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [interimText, setInterimText] = useState('');
    
    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioPlayerRef = useRef<PCMAudioPlayer | null>(null);
    const audioRecorderRef = useRef<AudioRecorder | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    
    // Update external state
    useEffect(() => {
        onStateChange?.(connectionState);
    }, [connectionState, onStateChange]);
    
    // Auto-scroll transcript
    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript, interimText]);
    
    // ============================================
    // AUDIO TRANSMISSION (define first - no hook deps)
    // ============================================
    
    const sendAudioData = useCallback((data: Int16Array) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
            // Convert Int16Array to ArrayBuffer and send as binary
            wsRef.current.send(data.buffer);
        }
    }, [isMuted]);
    
    // ============================================
    // CLEANUP (define second - basic deps only)
    // ============================================
    
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
        
        // Call completion handler
        if (transcript.length > 0) {
            onConversationEnd?.(transcript.filter(t => t.isFinal));
        }
    }, [transcript, onConversationEnd]);
    
    // ============================================
    // DISCONNECT (depends on cleanup)
    // ============================================
    
    const disconnect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop', sessionId }));
        }
        cleanup();
    }, [sessionId, cleanup]);
    
    // ============================================
    // MESSAGE HANDLING (depends on disconnect, cleanup)
    // ============================================
    
    const handleMessage = useCallback((message: VoiceAgentMessage) => {
        switch (message.type) {
            case 'ready':
                logger.info('Voice agent ready');
                break;
                
            case 'session_created': {
                setSessionId(message.sessionId ?? null);
                setAssistantName(message.assistantName ?? '');
                setConnectionState('connected');
                
                // Start recording
                audioRecorderRef.current = new AudioRecorder();
                audioRecorderRef.current.onAudioData = sendAudioData;
                void audioRecorderRef.current.start().then(started => {
                    if (!started) {
                        onError?.('Failed to access microphone');
                        disconnect();
                    }
                });
                
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
                        // Update last assistant message if interim, or add new
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
                
            case 'clear_audio':
                audioPlayerRef.current?.clearQueue();
                break;
                
            case 'interrupted':
                audioPlayerRef.current?.clearQueue();
                break;
                
            case 'session_ended':
                logger.info('Session ended');
                cleanup();
                break;
                
            case 'error':
                logger.error('Voice agent error', { context: { errorMsg: message.error } });
                onError?.(message.error || 'Unknown error');
                break;
        }
    }, [sendAudioData, disconnect, cleanup, onError]);
    
    // ============================================
    // CONNECTION (depends on handleMessage, cleanup)
    // ============================================
    
    const connect = useCallback(() => {
        if (connectionState !== 'disconnected') return;
        
        setConnectionState('connecting');
        
        try {
            // Initialize audio player
            audioPlayerRef.current = new PCMAudioPlayer();
            
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
                    // Binary PCM audio data - play directly
                    audioPlayerRef.current?.playPCMAudio(event.data);
                } else if (event.data instanceof Blob) {
                    // Blob data - convert to ArrayBuffer and play
                    void event.data.arrayBuffer().then(arrayBuffer => {
                        audioPlayerRef.current?.playPCMAudio(arrayBuffer);
                    });
                } else {
                    // JSON message
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
                onError?.('Connection error');
                setConnectionState('error');
            };
            
            ws.onclose = () => {
                logger.info('WebSocket closed');
                cleanup();
            };
            
        } catch (connectError) {
            logger.error('Failed to connect', { context: { connectError } });
            onError?.('Failed to connect');
            setConnectionState('error');
        }
    }, [connectionState, assistantId, userId, customerId, onError, handleMessage, cleanup]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);
    
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
    
    // ============================================
    // RENDER
    // ============================================
    
    // Compact mode - just a call button
    if (compact) {
        return (
            <Button
                onClick={connectionState === 'disconnected' ? connect : disconnect}
                variant={connectionState === 'connected' ? 'destructive' : 'default'}
                size="lg"
                loading={connectionState === 'connecting'}
                className={className}
            >
                {connectionState === 'disconnected' && <Phone size={20} weight="fill" />}
                {connectionState === 'connecting' && <CircleNotch size={20} className="animate-spin" />}
                {connectionState === 'connected' && <PhoneDisconnect size={20} weight="fill" />}
                {connectionState === 'error' && <Warning size={20} weight="fill" />}
                <span className="ml-2">
                    {connectionState === 'disconnected' && 'Call'}
                    {connectionState === 'connecting' && 'Connecting...'}
                    {connectionState === 'connected' && 'End Call'}
                    {connectionState === 'error' && 'Error'}
                </span>
            </Button>
        );
    }
    
    // Full interface
    return (
        <div className={`flex flex-col bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        connectionState === 'connected' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-white/5 text-textMuted'
                    }`}>
                        {agentState === 'speaking' ? (
                            <WaveformCircle size={24} weight="fill" className="animate-pulse" />
                        ) : (
                            <Microphone size={24} weight="fill" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-textMain">
                            {assistantName || 'Voice Agent'}
                        </h3>
                        <p className="text-xs text-textMuted">
                            {connectionState === 'disconnected' && 'Ready to connect'}
                            {connectionState === 'connecting' && 'Connecting...'}
                            {connectionState === 'connected' && getAgentStateText(agentState)}
                            {connectionState === 'error' && 'Connection error'}
                        </p>
                    </div>
                </div>
                
                {/* Status indicator */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
                    connectionState === 'connected' 
                        ? 'bg-green-500/20 text-green-400' 
                        : connectionState === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-white/5 text-textMuted'
                }`}>
                    {connectionState === 'connected' ? (
                        <CheckCircle size={14} weight="fill" />
                    ) : connectionState === 'error' ? (
                        <Warning size={14} weight="fill" />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                    {connectionState}
                </div>
            </div>
            
            {/* Transcript */}
            <div 
                ref={transcriptRef}
                className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto p-4 space-y-3"
            >
                {transcript.length === 0 && !interimText && (
                    <div className="flex items-center justify-center h-full text-textMuted text-sm">
                        {connectionState === 'connected' 
                            ? 'Start speaking...' 
                            : 'Click "Start Call" to begin'}
                    </div>
                )}
                
                {transcript.map((entry, index) => (
                    <div
                        key={index}
                        className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                            entry.role === 'user'
                                ? 'bg-primary/20 text-textMain'
                                : 'bg-white/5 text-textMain'
                        } ${!entry.isFinal ? 'opacity-60' : ''}`}>
                            {entry.content}
                        </div>
                    </div>
                ))}
                
                {interimText && (
                    <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 rounded-xl text-sm bg-primary/10 text-textMuted italic">
                            {interimText}...
                        </div>
                    </div>
                )}
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-background/50">
                {connectionState === 'connected' ? (
                    <>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className={`p-2 rounded-full transition-colors ${
                                    isMuted 
                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                        : 'bg-white/5 text-textMain hover:bg-white/10'
                                }`}
                                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                            >
                                {isMuted ? <MicrophoneSlash size={20} /> : <Microphone size={20} />}
                            </button>
                            
                            <button
                                onClick={toggleOutputMute}
                                className={`p-2 rounded-full transition-colors ${
                                    isOutputMuted 
                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                        : 'bg-white/5 text-textMain hover:bg-white/10'
                                }`}
                                title={isOutputMuted ? 'Unmute speaker' : 'Mute speaker'}
                            >
                                {isOutputMuted ? <SpeakerSlash size={20} /> : <SpeakerHigh size={20} />}
                            </button>
                        </div>
                        
                        <Button
                            onClick={disconnect}
                            variant="destructive"
                            size="default"
                        >
                            <PhoneDisconnect size={18} weight="fill" />
                            <span className="ml-2">End Call</span>
                        </Button>
                    </>
                ) : (
                    <div className="flex-1 flex justify-center">
                        <Button
                            onClick={connect}
                            variant="default"
                            size="lg"
                            loading={connectionState === 'connecting'}
                            disabled={connectionState === 'connecting'}
                            className="w-full max-w-xs"
                        >
                            <Phone size={20} weight="fill" />
                            <span className="ml-2">
                                {connectionState === 'connecting' ? 'Connecting...' : 'Start Call'}
                            </span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper function
function getAgentStateText(state: AgentState): string {
    switch (state) {
        case 'idle': return 'Ready';
        case 'listening': return 'Listening...';
        case 'processing': return 'Thinking...';
        case 'speaking': return 'Speaking...';
        case 'interrupted': return 'Interrupted';
        default: return 'Unknown';
    }
}

export default VoiceAgentClient;
