// ============================================
// USE VOICE AGENT HOOK
// React hook for managing voice agent state
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { API } from '@/lib/constants';

// ============================================
// TYPES
// ============================================

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type VoiceAgentState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted';

export interface VoiceTranscript {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isFinal: boolean;
}

export interface UseVoiceAgentOptions {
    /** Assistant ID to connect to */
    assistantId: string;
    /** User ID for authentication */
    userId: string;
    /** Optional customer ID for memory */
    customerId?: string;
    /** Session type */
    sessionType?: 'widget' | 'phone' | 'test';
    /** Called when conversation ends */
    onConversationEnd?: (transcript: VoiceTranscript[]) => void;
    /** Called on transcript update */
    onTranscriptUpdate?: (transcript: VoiceTranscript[]) => void;
    /** Called on error */
    onError?: (error: string) => void;
    /** Auto-connect on mount */
    autoConnect?: boolean;
}

export interface UseVoiceAgentReturn {
    // State
    connectionState: VoiceConnectionState;
    agentState: VoiceAgentState;
    sessionId: string | null;
    assistantName: string;
    transcript: VoiceTranscript[];
    interimText: string;
    isMicMuted: boolean;
    isOutputMuted: boolean;
    
    // Actions
    connect: () => Promise<void>;
    disconnect: () => void;
    toggleMicMute: () => void;
    toggleOutputMute: () => void;
    
    // Computed
    isConnected: boolean;
    isActive: boolean;
}

// ============================================
// AUDIO CONTEXT
// ============================================

class VoiceAudioManager {
    private audioContext: AudioContext | null = null;
    private gainNode: GainNode | null = null;
    private audioQueue: ArrayBuffer[] = [];
    private isPlaying = false;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    
    onAudioData: ((data: ArrayBuffer) => void) | null = null;
    
    async init(): Promise<boolean> {
        try {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.audioContext = new AudioContextClass();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            return true;
        } catch (error) {
            logger.error('Failed to init audio context:', { error });
            return false;
        }
    }
    
    async startRecording(): Promise<boolean> {
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
            
            if (!this.audioContext) return false;
            
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            this.processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                // Convert to 16-bit PCM
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32767));
                }
                this.onAudioData?.(pcmData.buffer);
            };
            
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            return true;
        } catch (error) {
            logger.error('Failed to start recording:', { error });
            return false;
        }
    }
    
    stopRecording(): void {
        this.processor?.disconnect();
        this.source?.disconnect();
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.processor = null;
        this.source = null;
        this.mediaStream = null;
    }
    
    async playAudio(arrayBuffer: ArrayBuffer): Promise<void> {
        this.audioQueue.push(arrayBuffer);
        if (!this.isPlaying) {
            await this.playNext();
        }
    }
    
    private async playNext(): Promise<void> {
        if (this.audioQueue.length === 0 || !this.audioContext || !this.gainNode) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const arrayBuffer = this.audioQueue.shift()!;
        
        try {
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.gainNode);
            
            source.onended = () => {
                this.playNext();
            };
            
            source.start();
        } catch (error) {
            logger.error('Failed to play audio:', { error });
            this.playNext();
        }
    }
    
    clearPlayback(): void {
        this.audioQueue = [];
        this.isPlaying = false;
    }
    
    setOutputMuted(muted: boolean): void {
        if (this.gainNode) {
            this.gainNode.gain.value = muted ? 0 : 1;
        }
    }
    
    resume(): void {
        this.audioContext?.resume();
    }
    
    destroy(): void {
        this.stopRecording();
        this.clearPlayback();
        this.audioContext?.close();
        this.audioContext = null;
    }
}

// ============================================
// HOOK
// ============================================

export function useVoiceAgent(options: UseVoiceAgentOptions): UseVoiceAgentReturn {
    const {
        assistantId,
        userId,
        customerId,
        sessionType = 'widget',
        onConversationEnd,
        onTranscriptUpdate,
        onError,
        autoConnect = false,
    } = options;
    
    // State
    const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected');
    const [agentState, setAgentState] = useState<VoiceAgentState>('idle');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [assistantName, setAssistantName] = useState<string>('');
    const [transcript, setTranscript] = useState<VoiceTranscript[]>([]);
    const [interimText, setInterimText] = useState<string>('');
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    
    // Refs
    const wsRef = useRef<WebSocket | null>(null);
    const audioManagerRef = useRef<VoiceAudioManager | null>(null);
    const micMutedRef = useRef(false);
    
    // Keep ref in sync with state
    useEffect(() => {
        micMutedRef.current = isMicMuted;
    }, [isMicMuted]);
    
    // Notify on transcript changes
    useEffect(() => {
        onTranscriptUpdate?.(transcript);
    }, [transcript, onTranscriptUpdate]);
    
    // Auto-connect
    useEffect(() => {
        if (autoConnect) {
            connect();
        }
        return () => {
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // ============================================
    // CONNECTION
    // ============================================
    
    const connect = useCallback(async () => {
        if (connectionState !== 'disconnected') return;
        
        setConnectionState('connecting');
        
        try {
            // Initialize audio manager
            audioManagerRef.current = new VoiceAudioManager();
            const audioReady = await audioManagerRef.current.init();
            
            if (!audioReady) {
                throw new Error('Failed to initialize audio');
            }
            
            // Build WebSocket URL
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const backendHost = new URL(API.BACKEND_URL).host;
            const wsUrl = `${wsProtocol}//${backendHost}/ws/voice-agent`;
            
            logger.info('Connecting to voice agent:', { wsUrl, assistantId });
            
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = 'arraybuffer';
            
            ws.onopen = () => {
                logger.info('WebSocket connected');
                ws.send(JSON.stringify({
                    type: 'start',
                    assistantId,
                    userId,
                    customerId,
                    sessionType,
                }));
            };
            
            ws.onmessage = async (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Binary audio
                    await audioManagerRef.current?.playAudio(event.data);
                } else {
                    // JSON message
                    handleMessage(JSON.parse(event.data));
                }
            };
            
            ws.onerror = () => {
                logger.error('WebSocket error');
                onError?.('Connection error');
                setConnectionState('error');
            };
            
            ws.onclose = () => {
                logger.info('WebSocket closed');
                handleSessionEnd();
            };
            
        } catch (error) {
            logger.error('Failed to connect:', { error });
            onError?.((error as Error).message || 'Failed to connect');
            setConnectionState('error');
        }
    }, [connectionState, assistantId, userId, customerId, sessionType, onError]);
    
    const handleMessage = useCallback((data: Record<string, unknown>) => {
        switch (data.type) {
            case 'ready':
                logger.info('Voice agent ready');
                break;
                
            case 'session_created':
                setSessionId(data.sessionId as string || null);
                setAssistantName(data.assistantName as string || '');
                setConnectionState('connected');
                
                // Start recording
                if (audioManagerRef.current) {
                    audioManagerRef.current.onAudioData = (audioData) => {
                        if (!micMutedRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
                            wsRef.current.send(audioData);
                        }
                    };
                    audioManagerRef.current.startRecording();
                    audioManagerRef.current.resume();
                }
                break;
                
            case 'state_change':
                setAgentState((data.state as VoiceAgentState) || 'idle');
                break;
                
            case 'transcript':
                handleTranscript(data);
                break;
                
            case 'clear_audio':
            case 'interrupted':
                audioManagerRef.current?.clearPlayback();
                break;
                
            case 'session_ended':
                handleSessionEnd();
                break;
                
            case 'error':
                onError?.(data.error as string || 'Unknown error');
                break;
        }
    }, [onError]);
    
    const handleTranscript = useCallback((data: Record<string, unknown>) => {
        const role = data.role as 'user' | 'assistant';
        const text = data.text as string;
        const isFinal = data.isFinal as boolean;
        const timestamp = data.timestamp as number || Date.now();
        
        if (role === 'user') {
            if (isFinal && text) {
                setTranscript(prev => [...prev, { role: 'user', content: text, timestamp, isFinal: true }]);
                setInterimText('');
            } else if (text) {
                setInterimText(text);
            }
        } else if (role === 'assistant' && text) {
            setTranscript(prev => {
                const lastIdx = prev.length - 1;
                if (lastIdx >= 0 && prev[lastIdx].role === 'assistant' && !prev[lastIdx].isFinal) {
                    const updated = [...prev];
                    updated[lastIdx] = { ...updated[lastIdx], content: text, isFinal: isFinal || false };
                    return updated;
                }
                return [...prev, { role: 'assistant', content: text, timestamp, isFinal: isFinal || false }];
            });
        }
    }, []);
    
    const handleSessionEnd = useCallback(() => {
        const finalTranscript = transcript.filter(t => t.isFinal);
        if (finalTranscript.length > 0) {
            onConversationEnd?.(finalTranscript);
        }
        cleanup();
    }, [transcript, onConversationEnd]);
    
    const cleanup = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        
        audioManagerRef.current?.destroy();
        audioManagerRef.current = null;
        
        setConnectionState('disconnected');
        setAgentState('idle');
        setSessionId(null);
    }, []);
    
    const disconnect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop', sessionId }));
        }
        handleSessionEnd();
    }, [sessionId, handleSessionEnd]);
    
    // ============================================
    // CONTROLS
    // ============================================
    
    const toggleMicMute = useCallback(() => {
        setIsMicMuted(prev => !prev);
    }, []);
    
    const toggleOutputMute = useCallback(() => {
        setIsOutputMuted(prev => {
            audioManagerRef.current?.setOutputMuted(!prev);
            return !prev;
        });
    }, []);
    
    // ============================================
    // RETURN
    // ============================================
    
    return {
        // State
        connectionState,
        agentState,
        sessionId,
        assistantName,
        transcript,
        interimText,
        isMicMuted,
        isOutputMuted,
        
        // Actions
        connect,
        disconnect,
        toggleMicMute,
        toggleOutputMute,
        
        // Computed
        isConnected: connectionState === 'connected',
        isActive: connectionState === 'connected' && agentState !== 'idle',
    };
}

export default useVoiceAgent;
