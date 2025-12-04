import {
    Robot, X, Microphone, MicrophoneSlash, Phone, PhoneDisconnect,
    SpeakerHigh, SpeakerSlash, Warning, CircleNotch, Waveform
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

interface VoiceChatSidebarProps {
    assistantId: string | null;
    formData: AssistantFormData;
    selectedVoice: Voice | null;
    onClose: () => void;
}

// ============================================
// LIVE WAVEFORM VISUALIZER COMPONENT
// ============================================
const LiveWaveform: React.FC<{
    isActive: boolean;
    color?: string;
    bars?: number;
    isSpeaking?: boolean;
}> = ({ isActive, color = 'bg-primary', bars = 5, isSpeaking = false }) => {
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
                    .map(() => (isSpeaking ? 8 + Math.random() * 24 : 4 + Math.random() * 12))
            );
        }, 100);

        return () => clearInterval(interval);
    }, [isActive, bars, isSpeaking]);

    return (
        <div className="flex items-center justify-center gap-1 h-8">
            {heights.map((height, i) => (
                <div
                    key={i}
                    className={`w-1 ${color} rounded-full transition-all duration-100`}
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
const VoiceChatSidebar: React.FC<VoiceChatSidebarProps> = ({
    assistantId,
    formData,
    selectedVoice,
    onClose
}) => {
    // State
    const [messages, setMessages] = useState<VoiceMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcription, setTranscription] = useState('');
    const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
    const [callState, setCallState] = useState<'idle' | 'connecting' | 'speaking' | 'listening' | 'processing'>('idle');

    // Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hasSpokenRef = useRef<boolean>(false);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // Get language code from settings
    const getLanguageCode = useCallback(() => {
        const langMap: Record<string, string> = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'hi-Latn': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'mr': 'mr-IN',
            'bn': 'bn-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
        };
        const defaultLang = formData.languageSettings?.default || 'en';
        return langMap[defaultLang] || 'en-IN';
    }, [formData.languageSettings]);

    // Play audio from base64
    const playAudio = useCallback(async (base64Audio: string, messageId: string, autoListenAfter = true) => {
        if (isMuted) {
            if (autoListenAfter && isConnected) {
                setCallState('listening');
                startRecordingInternal();
            }
            return;
        }

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(blob);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            setCurrentPlayingId(messageId);
            setIsPlaying(true);
            setCallState('speaking');

            audio.onended = () => {
                setIsPlaying(false);
                setCurrentPlayingId(null);
                URL.revokeObjectURL(audioUrl);
                // Auto-start listening after assistant speaks
                if (autoListenAfter && isConnected) {
                    setCallState('listening');
                    startRecordingInternal();
                }
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                setIsPlaying(false);
                setCurrentPlayingId(null);
                if (autoListenAfter && isConnected) {
                    setCallState('listening');
                    startRecordingInternal();
                }
            };

            await audio.play();
        } catch (err) {
            console.error('Failed to play audio:', err);
            setIsPlaying(false);
            setCurrentPlayingId(null);
            if (autoListenAfter && isConnected) {
                setCallState('listening');
                startRecordingInternal();
            }
        }
    }, [isMuted, isConnected]);

    // Stop audio playback
    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlaying(false);
        setCurrentPlayingId(null);
    }, []);

    // VAD Configuration
    const VAD_CONFIG = {
        silenceThreshold: 0.01, // Volume threshold for silence detection
        silenceDuration: 1500, // ms of silence before auto-stop
        minSpeechDuration: 500, // minimum ms of speech before considering it valid
    };

    // Internal start recording with VAD (Voice Activity Detection)
    const startRecordingInternal = async () => {
        if (isRecording || isPlaying) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio analysis for VAD
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            audioChunksRef.current = [];
            hasSpokenRef.current = false;
            let speechStartTime: number | null = null;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Clean up audio context
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                
                if (audioChunksRef.current.length > 0 && hasSpokenRef.current) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await processVoiceInput(audioBlob);
                } else if (!hasSpokenRef.current) {
                    // No speech detected, restart listening
                    setTranscription('No speech detected...');
                    setTimeout(() => {
                        setTranscription('');
                        if (isConnected && !isPlaying && !isProcessing) {
                            startRecordingInternal();
                        }
                    }, 1000);
                }
            };

            // Start VAD monitoring
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const checkAudioLevel = () => {
                if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
                    return;
                }

                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
                
                if (average > VAD_CONFIG.silenceThreshold) {
                    // Voice detected
                    if (!speechStartTime) {
                        speechStartTime = Date.now();
                    }
                    
                    // Clear silence timer
                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = null;
                    }
                    
                    // Mark as spoken if speech duration is sufficient
                    if (Date.now() - speechStartTime > VAD_CONFIG.minSpeechDuration) {
                        hasSpokenRef.current = true;
                        setTranscription('Listening...');
                    }
                } else if (hasSpokenRef.current && !silenceTimerRef.current) {
                    // Silence detected after speech - start silence timer
                    setTranscription('Processing...');
                    silenceTimerRef.current = setTimeout(() => {
                        // Auto-stop recording after silence
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                            mediaRecorderRef.current.stop();
                            if (streamRef.current) {
                                streamRef.current.getTracks().forEach((track) => track.stop());
                                streamRef.current = null;
                            }
                            setIsRecording(false);
                        }
                    }, VAD_CONFIG.silenceDuration);
                }

                // Continue monitoring
                requestAnimationFrame(checkAudioLevel);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);
            setTranscription('Listening...');
            
            // Start VAD
            checkAudioLevel();
            
        } catch (err) {
            console.error('Failed to start recording:', err);
            setError('Microphone access denied. Please allow microphone access.');
        }
    };

    // Connect and play first message
    const handleConnect = async () => {
        setCallState('connecting');
        setError(null);

        // Small delay for animation
        await new Promise((r) => setTimeout(r, 800));

        setIsConnected(true);

        // Get and play first message with TTS
        if (formData.firstMessage) {
            setIsProcessing(true);
            setCallState('speaking');
            try {
                const response = await authFetch('/api/voice-preview/first-message', {
                    method: 'POST',
                    body: JSON.stringify({
                        assistantId,
                        assistantConfig: assistantId ? undefined : {
                            name: formData.name,
                            firstMessage: formData.firstMessage,
                            voiceId: formData.voiceId,
                        },
                        languageCode: getLanguageCode()
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to get first message');
                }

                const firstMessage: VoiceMessage = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: data.message,
                    timestamp: new Date()
                };
                setMessages([firstMessage]);

                if (data.audio?.content) {
                    await playAudio(data.audio.content, firstMessage.id, true);
                } else {
                    setCallState('listening');
                    startRecordingInternal();
                }
            } catch (err) {
                console.error('Failed to get first message:', err);
                setError(err instanceof Error ? err.message : 'Failed to start call');
                setCallState('listening');
                startRecordingInternal();
            } finally {
                setIsProcessing(false);
            }
        } else {
            setCallState('listening');
            startRecordingInternal();
        }
    };

    // Disconnect call
    const handleDisconnect = () => {
        stopAudio();
        stopRecording();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        setIsConnected(false);
        setIsRecording(false);
        setTranscription('');
        setCallState('idle');
        setMessages([]);
    };

    // Stop recording (used internally and for cleanup)
    const stopRecording = () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsRecording(false);
    };

    // Process voice input - Send to STT then to LLM
    const processVoiceInput = async (audioBlob: Blob) => {
        setCallState('processing');
        setTranscription('Processing speech...');

        try {
            // Convert blob to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64 = result?.split(',')[1];
                    if (base64) {
                        resolve(base64);
                    } else {
                        reject(new Error('Failed to convert audio to base64'));
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read audio file'));
            });
            reader.readAsDataURL(audioBlob);
            const base64Audio = await base64Promise;

            // Call STT API
            const sttResponse = await authFetch('/api/stt/transcribe-base64', {
                method: 'POST',
                body: JSON.stringify({
                    audio: base64Audio,
                    mimeType: 'audio/webm',
                    language: formData.languageSettings?.default || 'en'
                })
            });

            const sttData = await sttResponse.json();

            if (!sttResponse.ok) {
                throw new Error(sttData.error || 'Speech recognition failed');
            }

            const transcribedText = sttData.text?.trim();

            if (!transcribedText) {
                setTranscription('No speech detected. Try again.');
                setTimeout(() => {
                    setTranscription('');
                    if (isConnected) {
                        setCallState('listening');
                        startRecordingInternal();
                    }
                }, 1500);
                return;
            }

            setTranscription(`You: "${transcribedText}"`);

            // Send to LLM
            await sendMessage(transcribedText);

        } catch (err) {
            console.error('Voice processing error:', err);
            setError(err instanceof Error ? err.message : 'Voice processing failed');
            setTranscription('');
            setCallState('listening');
            // Restart listening after error
            setTimeout(() => {
                if (isConnected) startRecordingInternal();
            }, 2000);
        }
    };

    // Send message with voice response
    const sendMessage = async (text: string) => {
        if (!text.trim() || isProcessing) return;

        setError(null);
        setIsProcessing(true);
        setCallState('processing');

        const userMessage: VoiceMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date()
        };
        setMessages((prev) => [...prev, userMessage]);

        try {
            const conversationHistory = messages.map((msg) => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await authFetch('/api/voice-preview/speak', {
                method: 'POST',
                body: JSON.stringify({
                    message: text,
                    assistantId,
                    assistantConfig: assistantId
                        ? undefined
                        : {
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
                          },
                    voiceId: formData.voiceId,
                    languageCode: getLanguageCode(),
                    conversationHistory,
                    channel: 'calls'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            const assistantMessage: VoiceMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setTranscription('');

            if (data.audio?.content) {
                await playAudio(data.audio.content, assistantMessage.id, true);
            } else {
                if (data.ttsError) {
                    console.warn('TTS error:', data.ttsError);
                }
                setCallState('listening');
                startRecordingInternal();
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError(err instanceof Error ? err.message : 'Failed to get response');
            setCallState('listening');
            startRecordingInternal();
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get state message
    const getStateMessage = () => {
        switch (callState) {
            case 'connecting':
                return 'Connecting...';
            case 'speaking':
                return 'Assistant speaking...';
            case 'listening':
                return 'Listening to you...';
            case 'processing':
                return 'Processing...';
            default:
                return '';
        }
    };

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
                        <h4 className="text-sm font-semibold text-textMain">
                            {formData.name || 'Assistant'}
                        </h4>
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
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`p-2 rounded-lg transition-colors ${
                                isMuted
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'text-textMuted hover:text-textMain hover:bg-surface'
                            }`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <SpeakerSlash size={16} /> : <SpeakerHigh size={16} />}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-surface rounded-lg transition-colors"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Not Connected State */}
            {!isConnected && callState !== 'connecting' ? (
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
                            Test {formData.name || 'Assistant'}
                        </h4>
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

                        {!formData.voiceId && (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
                                ⚠️ Please select a voice first
                            </p>
                        )}

                        <button
                            onClick={handleConnect}
                            disabled={!formData.voiceId || isProcessing}
                            className="group flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Phone
                                size={20}
                                weight="fill"
                                className="group-hover:scale-110 transition-transform"
                            />
                            Start Test Call
                        </button>
                    </div>
                </div>
            ) : callState === 'connecting' ? (
                // Connecting Animation
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center">
                        <div className="relative w-40 h-40 mx-auto mb-6">
                            {/* Ripple effects */}
                            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
                            <div
                                className="absolute inset-4 rounded-full border-2 border-emerald-500/40 animate-ping"
                                style={{ animationDelay: '0.2s' }}
                            />
                            <div
                                className="absolute inset-8 rounded-full border-2 border-emerald-500/50 animate-ping"
                                style={{ animationDelay: '0.4s' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                                    <Phone size={32} weight="fill" className="text-white" />
                                </div>
                            </div>
                        </div>
                        <p className="text-lg font-medium text-textMain">Connecting...</p>
                        <p className="text-sm text-textMuted mt-1">Starting voice call</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Live Call Interface */}
                    <div className="flex-1 flex flex-col">
                        {/* Active Call Visual */}
                        <div className="flex-shrink-0 p-6 bg-gradient-to-b from-surface/50 to-transparent">
                            <div className="flex flex-col items-center">
                                {/* Avatar with animation */}
                                <div className="relative mb-4">
                                    <div
                                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                                            callState === 'speaking'
                                                ? 'bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30'
                                                : callState === 'listening'
                                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30'
                                                : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30'
                                        }`}
                                    >
                                        {callState === 'speaking' ? (
                                            <Robot size={40} weight="fill" className="text-white" />
                                        ) : callState === 'listening' ? (
                                            <Microphone size={40} weight="fill" className="text-white" />
                                        ) : (
                                            <CircleNotch size={40} className="text-white animate-spin" />
                                        )}
                                    </div>

                                    {/* Pulse ring */}
                                    {(callState === 'speaking' || callState === 'listening') && (
                                        <div
                                            className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                                                callState === 'speaking' ? 'bg-primary' : 'bg-emerald-500'
                                            }`}
                                        />
                                    )}
                                </div>

                                {/* State label */}
                                <p className="text-sm font-medium text-textMain mb-2">
                                    {getStateMessage()}
                                </p>

                                {/* Live Waveform */}
                                <div className="h-12 w-48">
                                    <LiveWaveform
                                        isActive={callState === 'speaking' || callState === 'listening'}
                                        color={callState === 'speaking' ? 'bg-primary' : 'bg-emerald-500'}
                                        bars={12}
                                        isSpeaking={callState === 'speaking'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Messages (compact) */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div
                                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                            message.role === 'user'
                                                ? 'bg-blue-500/20'
                                                : 'bg-primary/20'
                                        }`}
                                    >
                                        {message.role === 'user' ? (
                                            <Microphone size={12} className="text-blue-400" />
                                        ) : (
                                            <Robot size={12} className="text-primary" />
                                        )}
                                    </div>
                                    <div
                                        className={`flex flex-col max-w-[80%] ${
                                            message.role === 'user' ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        <div
                                            className={`px-3 py-2 rounded-xl text-sm ${
                                                message.role === 'user'
                                                    ? 'bg-blue-500/20 text-textMain rounded-tr-none'
                                                    : 'bg-surface border border-white/5 text-textMain rounded-tl-none'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                            {message.role === 'assistant' && currentPlayingId === message.id && (
                                                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/5">
                                                    <Waveform size={12} className="text-primary animate-pulse" />
                                                    <span className="text-[10px] text-primary">Playing</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-textMuted mt-0.5 px-1">
                                            {formatTime(message.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Transcription in progress */}
                            {transcription && (
                                <div className="text-center">
                                    <span className="inline-flex items-center gap-2 text-xs text-textMuted bg-surface/50 px-3 py-1.5 rounded-full">
                                        <Waveform size={14} className="animate-pulse" />
                                        {transcription}
                                    </span>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex gap-2 items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <Warning size={12} className="text-red-400" />
                                    </div>
                                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl rounded-tl-none text-sm">
                                        <p className="text-red-400">{error}</p>
                                        <button
                                            onClick={() => setError(null)}
                                            className="text-[10px] text-red-400/70 hover:text-red-400 mt-1"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Bottom Controls - Single Hang Up Button */}
                        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-surface/50">
                            <div className="flex items-center justify-center">
                                {/* End Call Button - The only button needed */}
                                <button
                                    onClick={handleDisconnect}
                                    className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                                >
                                    <PhoneDisconnect size={28} weight="fill" />
                                </button>
                            </div>

                            {/* Status indicators */}
                            <div className="flex items-center justify-center gap-4 mt-4">
                                {/* Mute indicator */}
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                                        isMuted
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-surface/50 text-textMuted hover:text-textMain'
                                    }`}
                                >
                                    {isMuted ? <MicrophoneSlash size={14} /> : <Microphone size={14} />}
                                    {isMuted ? 'Muted' : 'Mic On'}
                                </button>
                                
                                {/* Speaker indicator */}
                                <button
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                                        isMuted
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-surface/50 text-textMuted hover:text-textMain'
                                    }`}
                                >
                                    {isMuted ? <SpeakerSlash size={14} /> : <SpeakerHigh size={14} />}
                                    {isMuted ? 'Speaker Off' : 'Speaker On'}
                                </button>
                            </div>

                            <p className="text-[10px] text-textMuted text-center mt-3">
                                {isRecording
                                    ? '🎤 Listening... (auto-detects when you stop)'
                                    : isPlaying
                                    ? '🔊 Assistant speaking...'
                                    : isProcessing
                                    ? '⏳ Processing...'
                                    : '🎤 Speak naturally - auto-detects your voice'}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default VoiceChatSidebar;
