// ============================================
// LIVEKIT VOICE CALL PREVIEW - Real-Time Voice AI
// Ultra-low latency voice conversation with AI assistant
// Uses LiveKit for WebRTC transport (<200ms latency)
// ============================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReceivedDataMessage } from '@livekit/components-core';
import {
    LiveKitRoom,
    useRoomContext,
    useTracks,
    useParticipants,
    useConnectionState,
    useDataChannel,
    RoomAudioRenderer,
} from '@livekit/components-react';
import type {
    Participant,
    TrackPublication,
} from 'livekit-client';
import {
    Track,
    ConnectionState,
} from 'livekit-client';
import {
    Microphone,
    MicrophoneSlash,
    PhoneDisconnect,
    SpeakerHigh,
    SpeakerSlash,
    CircleNotch,
    Warning,
    X,
    Timer,
    WifiHigh,
    WifiMedium,
    WifiLow,
    Robot,
    User,
} from '@phosphor-icons/react';
import { logger } from '@/lib/logger';
import { authFetch } from '@/lib/api';

// ============================================
// TYPES
// ============================================

interface LiveKitVoiceCallProps {
    /** Assistant ID to call */
    assistantId: string;
    /** Assistant name for display */
    assistantName: string;
    /** Optional customer ID for context */
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

interface TokenResponse {
    token: string;
    roomName: string;
    livekitUrl: string;
    sessionId?: string;
}

// Agent state messages sent via data channel
interface AgentMessage {
    type: 'state' | 'transcript' | 'error' | 'metrics';
    state?: 'idle' | 'listening' | 'processing' | 'speaking';
    text?: string;
    role?: 'user' | 'assistant';
    isFinal?: boolean;
    latencyMs?: number;
    error?: string;
}

// ============================================
// WAVEFORM VISUALIZER
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
// VOICE CALL CONTENT (Inside LiveKit Room)
// ============================================

function VoiceCallContent({
    assistantName,
    onClose,
    onTranscriptUpdate,
}: {
    assistantName: string;
    onClose: () => void;
    onTranscriptUpdate: (entry: TranscriptEntry) => void;
}) {
    const room = useRoomContext();
    const connectionState = useConnectionState();
    const participants = useParticipants();
    
    // State
    const [isMuted, setIsMuted] = useState(false);
    const [isOutputMuted, setIsOutputMuted] = useState(false);
    const [agentState, setAgentState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [inputLevel, setInputLevel] = useState(0);
    const [outputLevel, setOutputLevel] = useState(0);
    const [callDuration, setCallDuration] = useState(0);
    const [latency, setLatency] = useState(0);
    const [interimText, setInterimText] = useState('');
    
    // Refs
    const callStartTimeRef = useRef<number | null>(null);
    
    // Find the agent participant (not the local user)
    const agentParticipant = useMemo(() => {
        return participants.find((p: Participant) => !p.isLocal && p.identity.startsWith('agent'));
    }, [participants]);
    
    // Get audio tracks (used for audio rendering)
    useTracks([Track.Source.Microphone, Track.Source.Unknown]);
    
    // Handle data channel messages from agent
    useDataChannel('agent-state', (msg: ReceivedDataMessage) => {
        try {
            const data: AgentMessage = JSON.parse(new TextDecoder().decode(msg.payload));
            
            switch (data.type) {
                case 'state':
                    if (data.state) setAgentState(data.state);
                    break;
                case 'transcript':
                    if (data.text && data.role) {
                        if (data.isFinal) {
                            onTranscriptUpdate({
                                role: data.role,
                                content: data.text,
                                timestamp: Date.now(),
                                isFinal: true,
                            });
                            setInterimText('');
                        } else if (data.role === 'user') {
                            setInterimText(data.text);
                        }
                    }
                    break;
                case 'metrics':
                    if (data.latencyMs) setLatency(data.latencyMs);
                    break;
                case 'error':
                    logger.error('Agent error', { context: { error: data.error } });
                    break;
            }
        } catch (e) {
            // Ignore parse errors
        }
    });
    
    // Call duration timer
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        
        if (connectionState === ConnectionState.Connected) {
            if (!callStartTimeRef.current) {
                callStartTimeRef.current = Date.now();
            }
            interval = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current!) / 1000));
            }, 1000);
        }
        
        return () => clearInterval(interval);
    }, [connectionState]);
    
    // Audio level analysis
    useEffect(() => {
        if (!room.localParticipant) return;
        
        const updateLevels = () => {
            // Input level from local microphone
            const localAudioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
            if (localAudioTrack?.track) {
                // Get audio level from track
                const level = (localAudioTrack.track as any).audioLevel || 0;
                setInputLevel(level);
            }
            
            // Output level from agent
            if (agentParticipant) {
                const agentAudioTrack = agentParticipant.getTrackPublication(Track.Source.Microphone);
                if (agentAudioTrack?.track) {
                    const level = (agentAudioTrack.track as any).audioLevel || 0;
                    setOutputLevel(level);
                }
            }
        };
        
        const interval = setInterval(updateLevels, 50);
        return () => clearInterval(interval);
    }, [room, agentParticipant]);
    
    // Mute/unmute handlers
    const toggleMute = useCallback(async () => {
        const newMuted = !isMuted;
        await room.localParticipant.setMicrophoneEnabled(!newMuted);
        setIsMuted(newMuted);
    }, [room, isMuted]);
    
    const toggleOutputMute = useCallback(() => {
        setIsOutputMuted(prev => !prev);
        // Mute all remote audio
        participants.forEach((p: Participant) => {
            if (!p.isLocal) {
                p.audioTrackPublications.forEach((pub: TrackPublication) => {
                    if (pub.track) {
                        (pub.track as unknown as { setMuted: (muted: boolean) => void }).setMuted(!isOutputMuted);
                    }
                });
            }
        });
    }, [participants, isOutputMuted]);
    
    // End call
    const endCall = useCallback(() => {
        room.disconnect();
        onClose();
    }, [room, onClose]);
    
    // Format duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Get status text
    const getStatusText = () => {
        switch (connectionState) {
            case ConnectionState.Connecting:
                return 'Connecting...';
            case ConnectionState.Reconnecting:
                return 'Reconnecting...';
            case ConnectionState.Disconnected:
                return 'Disconnected';
            case ConnectionState.Connected:
                switch (agentState) {
                    case 'listening': return 'Listening...';
                    case 'processing': return 'Thinking...';
                    case 'speaking': return 'Speaking...';
                    default: return 'Connected';
                }
            default:
                return 'Unknown';
        }
    };
    
    const isConnecting = connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting;
    const isConnected = connectionState === ConnectionState.Connected;
    
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <Robot size={20} weight="fill" className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-textMain">{assistantName}</h3>
                        <p className="text-xs text-textMuted">{getStatusText()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isConnected && latency > 0 && <LatencyIndicator latency={latency} />}
                    {isConnected && (
                        <div className="flex items-center gap-1.5 text-xs text-textMuted">
                            <Timer size={14} />
                            <span>{formatDuration(callDuration)}</span>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/5 text-textMuted hover:text-textMain transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
            
            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                {isConnecting ? (
                    <div className="flex flex-col items-center gap-4">
                        <CircleNotch size={48} className="text-primary animate-spin" />
                        <p className="text-textMuted">Connecting to voice agent...</p>
                    </div>
                ) : isConnected ? (
                    <>
                        {/* Agent visualization */}
                        <div className="relative">
                            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-all duration-300 ${
                                agentState === 'speaking' ? 'scale-110 shadow-2xl shadow-primary/20' : ''
                            }`}>
                                <Robot size={48} weight="fill" className="text-primary" />
                            </div>
                            {agentState === 'speaking' && (
                                <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                            )}
                        </div>
                        
                        {/* Waveform */}
                        <div className="w-full max-w-xs">
                            <WaveformVisualizer
                                level={agentState === 'speaking' ? outputLevel : inputLevel}
                                isActive={agentState === 'speaking' || agentState === 'listening'}
                            />
                        </div>
                        
                        {/* Interim text */}
                        {interimText && (
                            <div className="text-center text-textMuted text-sm italic max-w-md">
                                "{interimText}"
                            </div>
                        )}
                        
                        {/* User mic visualization */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isMuted ? 'bg-red-500/20' : 'bg-white/10'
                            }`}>
                                {isMuted ? (
                                    <MicrophoneSlash size={20} className="text-red-400" />
                                ) : (
                                    <User size={20} className="text-textMuted" />
                                )}
                            </div>
                            <div className="w-24">
                                <WaveformVisualizer
                                    level={isMuted ? 0 : inputLevel}
                                    isActive={!isMuted && agentState === 'listening'}
                                    color="white"
                                    barCount={12}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <Warning size={48} className="text-yellow-400" />
                        <p className="text-textMuted">Connection lost</p>
                    </div>
                )}
            </div>
            
            {/* Controls */}
            <div className="p-6 border-t border-white/10">
                <div className="flex items-center justify-center gap-4">
                    {/* Mute button */}
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all ${
                            isMuted
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-white/10 text-textMain hover:bg-white/20'
                        }`}
                    >
                        {isMuted ? <MicrophoneSlash size={24} /> : <Microphone size={24} />}
                    </button>
                    
                    {/* End call button */}
                    <button
                        onClick={endCall}
                        className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <PhoneDisconnect size={24} />
                    </button>
                    
                    {/* Speaker button */}
                    <button
                        onClick={toggleOutputMute}
                        className={`p-4 rounded-full transition-all ${
                            isOutputMuted
                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-white/10 text-textMain hover:bg-white/20'
                        }`}
                    >
                        {isOutputMuted ? <SpeakerSlash size={24} /> : <SpeakerHigh size={24} />}
                    </button>
                </div>
            </div>
            
            {/* Audio renderer (plays remote audio) */}
            <RoomAudioRenderer muted={isOutputMuted} />
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LiveKitVoiceCall({
    assistantId,
    assistantName,
    customerId,
    isOpen,
    onClose,
    onConversationEnd,
}: LiveKitVoiceCallProps) {
    const [token, setToken] = useState<string | null>(null);
    const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
    const [_roomName, setRoomName] = useState<string | null>(null); // Used for logging
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    
    // Fetch token when modal opens
    useEffect(() => {
        if (!isOpen) {
            setToken(null);
            setError(null);
            setTranscript([]);
            return;
        }
        
        const fetchToken = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const response = await authFetch('/api/livekit/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assistantId,
                        customerId,
                        sessionType: 'widget',
                    }),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to get token');
                }
                
                const data: TokenResponse = await response.json();
                setToken(data.token);
                setLivekitUrl(data.livekitUrl);
                setRoomName(data.roomName);
                setSessionId(data.sessionId || null);
                
                logger.info('LiveKit token received', { context: { roomName: data.roomName } });
                
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to connect';
                setError(message);
                logger.error('Failed to get LiveKit token', { context: { error: err } });
            } finally {
                setIsLoading(false);
            }
        };
        
        void fetchToken();
    }, [isOpen, assistantId, customerId]);
    
    // Handle transcript updates
    const handleTranscriptUpdate = useCallback((entry: TranscriptEntry) => {
        setTranscript(prev => [...prev, entry]);
    }, []);
    
    // Handle room disconnect
    const handleDisconnected = useCallback(() => {
        // Tell backend to end the session so concurrent limit is freed
        if (sessionId) {
            void authFetch(`/api/livekit/session/${sessionId}/end`, { method: 'POST' }).catch(() => {});
        }
        if (transcript.length > 0) {
            onConversationEnd?.(transcript.filter(t => t.isFinal));
        }
        onClose();
    }, [sessionId, transcript, onConversationEnd, onClose]);
    
    // Handle close
    const handleClose = useCallback(() => {
        if (sessionId) {
            void authFetch(`/api/livekit/session/${sessionId}/end`, { method: 'POST' }).catch(() => {});
        }
        if (transcript.length > 0) {
            onConversationEnd?.(transcript.filter(t => t.isFinal));
        }
        onClose();
    }, [sessionId, transcript, onConversationEnd, onClose]);
    
    if (!isOpen) return null;
    
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-96 gap-4">
                        <CircleNotch size={48} className="text-primary animate-spin" />
                        <p className="text-textMuted">Initializing voice call...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-96 gap-4 p-8">
                        <Warning size={48} className="text-red-400" />
                        <p className="text-red-400 text-center">{error}</p>
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 bg-white/10 rounded-lg text-textMain hover:bg-white/20 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                ) : token && livekitUrl ? (
                    <LiveKitRoom
                        token={token}
                        serverUrl={livekitUrl}
                        connect={true}
                        audio={true}
                        video={false}
                        onDisconnected={handleDisconnected}
                        onError={(err: Error) => {
                            logger.error('LiveKit room error', { context: { error: err } });
                            setError(err.message);
                        }}
                        options={{
                            // Optimize for voice
                            adaptiveStream: false,
                            dynacast: false,
                            // Audio settings
                            audioCaptureDefaults: {
                                autoGainControl: true,
                                echoCancellation: true,
                                noiseSuppression: true,
                            },
                        }}
                    >
                        <VoiceCallContent
                            assistantName={assistantName}
                            onClose={handleClose}
                            onTranscriptUpdate={handleTranscriptUpdate}
                        />
                    </LiveKitRoom>
                ) : null}
            </div>
            
            {/* Transcript sidebar (collapsed by default) */}
            {transcript.length > 0 && (
                <div className="hidden lg:block w-80 ml-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h4 className="font-semibold text-textMain">Transcript</h4>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto space-y-3">
                        {transcript.map((entry, i) => (
                            <div
                                key={i}
                                className={`p-3 rounded-lg text-sm ${
                                    entry.role === 'user'
                                        ? 'bg-white/5 ml-4'
                                        : 'bg-primary/10 mr-4'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {entry.role === 'user' ? (
                                        <User size={14} className="text-textMuted" />
                                    ) : (
                                        <Robot size={14} className="text-primary" />
                                    )}
                                    <span className="text-xs text-textMuted">
                                        {entry.role === 'user' ? 'You' : assistantName}
                                    </span>
                                </div>
                                <p className="text-textMain">{entry.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

export default LiveKitVoiceCall;
