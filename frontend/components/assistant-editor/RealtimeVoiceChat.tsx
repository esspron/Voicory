// ============================================
// REALTIME VOICE CHAT - WebRTC-Style Voice Agent
// ============================================
// This component provides a natural conversation experience
// similar to Vapi, Bland.ai, using continuous audio streaming
// ============================================

import {
    Robot, X, Phone, PhoneDisconnect,
    SpeakerHigh, SpeakerSlash, Microphone, MicrophoneSlash,
    CircleNotch
} from '@phosphor-icons/react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { authFetch } from '../../lib/api';
import { Voice, LanguageSettings, StyleSettings } from '../../types';

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

// Call state enum
type CallState = 'idle' | 'connecting' | 'assistant-speaking' | 'user-speaking' | 'processing' | 'listening';

// ============================================
// LIVE WAVEFORM COMPONENT
// ============================================
const LiveWaveform: React.FC<{
    isActive: boolean;
    audioLevel: number;
    color: string;
}> = ({ isActive, audioLevel, color }) => {
    const bars = 12;
    const [heights, setHeights] = useState<number[]>(Array(bars).fill(4));

    useEffect(() => {
        if (!isActive) {
            setHeights(Array(bars).fill(4));
            return;
        }

        const interval = setInterval(() => {
            const baseHeight = audioLevel > 0.01 ? Math.max(8, audioLevel * 50) : 4;
            setHeights(
                Array(bars).fill(0).map(() => 
                    Math.max(4, baseHeight + Math.random() * (audioLevel * 30))
                )
            );
        }, 50);

        return () => clearInterval(interval);
    }, [isActive, audioLevel]);

    return (
        <div className="flex items-center justify-center gap-0.5 h-10">
            {heights.map((height, i) => (
                <div
                    key={i}
                    className={`w-1 ${color} rounded-full transition-all duration-50`}
                    style={{ height: `${height}px` }}
                />
            ))}
        </div>
    );
};

// ============================================
// CALL TIMER COMPONENT
// ============================================
const CallTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setSeconds(0);
            return;
        }
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
        <span className="text-xs font-mono text-textMuted">
            {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </span>
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
    // State
    const [callState, setCallState] = useState<CallState>('idle');
    const [messages, setMessages] = useState<VoiceMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOff, setIsSpeakerOff] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioLevel, setAudioLevel] = useState(0);
    const [statusText, setStatusText] = useState('');

    // Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const conversationHistoryRef = useRef<Array<{role: string, content: string}>>([]);
    const isProcessingRef = useRef(false);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Get language code
    const getLanguageCode = useCallback(() => {
        const langMap: Record<string, string> = {
            'en': 'en-IN', 'hi': 'hi-IN', 'hi-Latn': 'hi-IN',
            'ta': 'ta-IN', 'te': 'te-IN', 'mr': 'mr-IN',
            'bn': 'bn-IN', 'gu': 'gu-IN', 'kn': 'kn-IN', 'ml': 'ml-IN',
        };
        return langMap[formData.languageSettings?.default || 'en'] || 'en-IN';
    }, [formData.languageSettings]);

    // Build assistant config
    const getAssistantConfig = useCallback(() => ({
        name: formData.name,
        systemPrompt: formData.systemPrompt,
        firstMessage: formData.firstMessage,
        messagingSystemPrompt: formData.messagingSystemPrompt,
        messagingFirstMessage: formData.messagingFirstMessage,
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
    }), [formData]);

    // Play TTS audio
    const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
        if (isSpeakerOff) return;

        return new Promise((resolve, reject) => {
            try {
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(blob);

                const audio = new Audio(audioUrl);
                audioRef.current = audio;

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('Audio playback failed'));
                };

                audio.play().catch(reject);
            } catch (err) {
                reject(err);
            }
        });
    }, [isSpeakerOff]);

    // Process user speech and get response
    const processUserSpeech = useCallback(async (audioBlob: Blob) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setCallState('processing');
        setStatusText('Processing...');

        try {
            // Convert to base64
            const reader = new FileReader();
            const base64Audio = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.split(',')[1] || '');
                };
                reader.onerror = reject;
                reader.readAsDataURL(audioBlob);
            });

            console.log('[Voice] Sending audio for STT, size:', audioBlob.size);

            // STT: Convert speech to text
            const sttResponse = await authFetch('/api/stt/transcribe-base64', {
                method: 'POST',
                body: JSON.stringify({
                    audio: base64Audio,
                    mimeType: 'audio/webm',
                    language: formData.languageSettings?.default || 'en'
                })
            });

            const sttData = await sttResponse.json();
            if (!sttResponse.ok) throw new Error(sttData.error || 'STT failed');

            const userText = sttData.text?.trim();
            console.log('[Voice] STT result:', userText);

            if (!userText) {
                setStatusText('No speech detected');
                setTimeout(() => startListening(), 1000);
                return;
            }

            // Add user message
            const userMsg: VoiceMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: userText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, userMsg]);
            conversationHistoryRef.current.push({ role: 'user', content: userText });

            // LLM + TTS: Get response with audio
            setCallState('processing');
            setStatusText('Thinking...');

            const llmResponse = await authFetch('/api/voice-preview/speak', {
                method: 'POST',
                body: JSON.stringify({
                    message: userText,
                    assistantId,
                    assistantConfig: getAssistantConfig(),
                    voiceId: formData.voiceId,
                    languageCode: getLanguageCode(),
                    conversationHistory: conversationHistoryRef.current,
                    channel: 'calls'
                })
            });

            const llmData = await llmResponse.json();
            if (!llmResponse.ok) throw new Error(llmData.error || 'LLM failed');

            console.log('[Voice] LLM response:', llmData.response?.substring(0, 50));

            // Add assistant message
            const assistantMsg: VoiceMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: llmData.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMsg]);
            conversationHistoryRef.current.push({ role: 'assistant', content: llmData.response });

            // Play TTS
            if (llmData.audio?.content) {
                setCallState('assistant-speaking');
                setStatusText('Speaking...');
                await playAudio(llmData.audio.content);
            }

            // Resume listening
            startListening();

        } catch (err) {
            console.error('[Voice] Error:', err);
            setError(err instanceof Error ? err.message : 'Error processing speech');
            setCallState('listening');
            setTimeout(() => startListening(), 2000);
        } finally {
            isProcessingRef.current = false;
        }
    }, [assistantId, formData, getAssistantConfig, getLanguageCode, playAudio]);

    // Start listening for user speech
    const startListening = useCallback(async () => {
        if (callState === 'assistant-speaking' || isMuted) return;

        setCallState('listening');
        setStatusText('Listening...');
        setAudioLevel(0);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            streamRef.current = stream;

            // Audio analysis
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Media recorder
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            let hasSpoken = false;
            let speechStartTime: number | null = null;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (audioChunksRef.current.length > 0 && hasSpoken) {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await processUserSpeech(blob);
                }
            };

            // VAD monitoring
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkAudio = () => {
                if (!analyserRef.current || !mediaRecorderRef.current?.state || mediaRecorderRef.current.state !== 'recording') {
                    return;
                }

                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const val = dataArray[i] ?? 0;
                    sum += (val / 255) ** 2;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                setAudioLevel(rms);

                const threshold = 0.015; // Voice detection threshold
                
                if (rms > threshold) {
                    setCallState('user-speaking');
                    setStatusText('');
                    if (!speechStartTime) speechStartTime = Date.now();
                    
                    // Clear silence timer
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                    
                    // Mark as spoken after 200ms
                    if (Date.now() - speechStartTime > 200) {
                        hasSpoken = true;
                    }
                } else if (hasSpoken && !silenceTimerRef.current) {
                    // Silence after speech - stop after 1.5s
                    silenceTimerRef.current = setTimeout(() => {
                        if (mediaRecorderRef.current?.state === 'recording') {
                            mediaRecorderRef.current.stop();
                            streamRef.current?.getTracks().forEach(t => t.stop());
                        }
                    }, 1500);
                }

                requestAnimationFrame(checkAudio);
            };

            mediaRecorder.start(100);
            checkAudio();

        } catch (err) {
            console.error('[Voice] Mic error:', err);
            setError('Microphone access denied');
        }
    }, [callState, isMuted, processUserSpeech]);

    // Start call
    const startCall = async () => {
        setCallState('connecting');
        setError(null);
        setMessages([]);
        conversationHistoryRef.current = [];

        await new Promise(r => setTimeout(r, 500));
        setIsConnected(true);

        // Play first message
        if (formData.firstMessage) {
            try {
                setCallState('assistant-speaking');
                setStatusText('');

                const response = await authFetch('/api/voice-preview/first-message', {
                    method: 'POST',
                    body: JSON.stringify({
                        assistantId,
                        assistantConfig: getAssistantConfig(),
                        languageCode: getLanguageCode()
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error);

                const msg: VoiceMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.message,
                    timestamp: new Date()
                };
                setMessages([msg]);
                conversationHistoryRef.current.push({ role: 'assistant', content: data.message });

                if (data.audio?.content) {
                    await playAudio(data.audio.content);
                }

                // Start listening after greeting
                startListening();

            } catch (err) {
                console.error('[Voice] First message error:', err);
                setError(err instanceof Error ? err.message : 'Failed to start');
                startListening();
            }
        } else {
            startListening();
        }
    };

    // End call
    const endCall = () => {
        // Stop audio
        audioRef.current?.pause();
        
        // Stop recording
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        audioContextRef.current?.close();
        
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }

        setIsConnected(false);
        setCallState('idle');
        setAudioLevel(0);
        setStatusText('');
    };

    // Cleanup
    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            streamRef.current?.getTracks().forEach(t => t.stop());
            audioContextRef.current?.close();
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, []);

    // Get color based on state
    const getStateColor = () => {
        switch (callState) {
            case 'assistant-speaking': return 'bg-primary';
            case 'user-speaking': return 'bg-emerald-500';
            case 'processing': return 'bg-amber-500';
            default: return 'bg-emerald-500';
        }
    };

    const getStateText = () => {
        switch (callState) {
            case 'connecting': return 'Connecting...';
            case 'assistant-speaking': return 'Assistant speaking';
            case 'user-speaking': return 'Listening to you';
            case 'processing': return statusText || 'Processing...';
            case 'listening': return 'Listening...';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[420px] bg-background border-l border-white/10 shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between bg-surface/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        isConnected 
                            ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10' 
                            : 'bg-gradient-to-br from-primary/20 to-primary/10'
                    }`}>
                        <Phone size={20} weight={isConnected ? 'fill' : 'bold'} 
                            className={isConnected ? 'text-emerald-400' : 'text-primary'} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-textMain">{formData.name || 'Assistant'}</h4>
                        <div className="flex items-center gap-2">
                            {isConnected && (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs text-emerald-400">Live</span>
                                    <span className="text-xs text-textMuted">•</span>
                                </>
                            )}
                            <CallTimer isActive={isConnected} />
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg">
                    <X size={18} weight="bold" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {!isConnected ? (
                    /* Idle State */
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="relative mb-6">
                            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                                    <Robot size={40} weight="duotone" className="text-primary" />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-textMain mb-1">Test {formData.name || 'Assistant'}</h3>
                        <p className="text-sm text-textMuted mb-6">Voice: {selectedVoice?.name || 'Default'}</p>
                        
                        <button
                            onClick={startCall}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                        >
                            <Phone size={20} weight="fill" />
                            Start Test Call
                        </button>
                    </div>
                ) : (
                    /* Active Call */
                    <>
                        {/* Visual Feedback Area */}
                        <div className="px-6 py-8 border-b border-white/5 flex flex-col items-center">
                            {/* Avatar with pulse */}
                            <div className="relative mb-4">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                                    callState === 'assistant-speaking' 
                                        ? 'bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30'
                                        : callState === 'user-speaking'
                                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30'
                                        : callState === 'processing'
                                        ? 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30'
                                        : 'bg-gradient-to-br from-emerald-500/50 to-emerald-600/50'
                                }`}>
                                    {callState === 'processing' ? (
                                        <CircleNotch size={40} className="text-white animate-spin" />
                                    ) : callState === 'user-speaking' ? (
                                        <Microphone size={40} weight="fill" className="text-white" />
                                    ) : (
                                        <Robot size={40} weight="fill" className="text-white" />
                                    )}
                                </div>
                                {(callState === 'assistant-speaking' || callState === 'user-speaking') && (
                                    <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${getStateColor()}`} />
                                )}
                            </div>

                            {/* State Text */}
                            <p className="text-sm font-medium text-textMain mb-3">{getStateText()}</p>

                            {/* Waveform */}
                            <div className="h-12 w-48">
                                <LiveWaveform 
                                    isActive={callState !== 'idle' && callState !== 'connecting'}
                                    audioLevel={callState === 'user-speaking' ? audioLevel : (callState === 'assistant-speaking' ? 0.3 : 0.05)}
                                    color={getStateColor()}
                                />
                            </div>

                            {/* Audio Level Bar for User */}
                            {callState === 'listening' || callState === 'user-speaking' ? (
                                <div className="w-full mt-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <Microphone size={14} className={audioLevel > 0.015 ? 'text-emerald-400' : 'text-textMuted'} />
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-75 ${
                                                    audioLevel > 0.015 ? 'bg-emerald-500' : 'bg-textMuted/30'
                                                }`}
                                                style={{ width: `${Math.min(100, audioLevel * 500)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        msg.role === 'user' ? 'bg-blue-500/20' : 'bg-primary/20'
                                    }`}>
                                        {msg.role === 'user' 
                                            ? <Microphone size={12} className="text-blue-400" />
                                            : <Robot size={12} className="text-primary" />
                                        }
                                    </div>
                                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                                        <div className={`px-3 py-2 rounded-xl text-sm ${
                                            msg.role === 'user'
                                                ? 'bg-blue-500/20 text-textMain rounded-tr-none'
                                                : 'bg-surface border border-white/5 text-textMain rounded-tl-none'
                                        }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-textMuted mt-0.5 px-1">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-t border-white/5 bg-surface/50">
                            <div className="flex items-center justify-center gap-4">
                                {/* Mute Button */}
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                        isMuted 
                                            ? 'bg-red-500/20 text-red-400' 
                                            : 'bg-surface border border-white/10 text-textMain hover:bg-surfaceHover'
                                    }`}
                                >
                                    {isMuted ? <MicrophoneSlash size={20} /> : <Microphone size={20} />}
                                </button>

                                {/* Hang Up */}
                                <button
                                    onClick={endCall}
                                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105"
                                >
                                    <PhoneDisconnect size={28} weight="fill" className="text-white" />
                                </button>

                                {/* Speaker Button */}
                                <button
                                    onClick={() => setIsSpeakerOff(!isSpeakerOff)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                        isSpeakerOff 
                                            ? 'bg-red-500/20 text-red-400' 
                                            : 'bg-surface border border-white/10 text-textMain hover:bg-surfaceHover'
                                    }`}
                                >
                                    {isSpeakerOff ? <SpeakerSlash size={20} /> : <SpeakerHigh size={20} />}
                                </button>
                            </div>

                            {/* Status */}
                            <p className="text-xs text-textMuted text-center mt-3">
                                🎤 Speak naturally - auto-detects your voice
                            </p>
                        </div>
                    </>
                )}

                {/* Error Display */}
                {error && (
                    <div className="mx-4 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-sm text-red-400">{error}</p>
                        <button onClick={() => setError(null)} className="text-xs text-red-400/70 hover:text-red-400 mt-1">
                            Dismiss
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RealtimeVoiceChat;
