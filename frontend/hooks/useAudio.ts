// ============================================
// AUDIO HOOKS - Reusable audio utilities
// For voice visualization and audio processing
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// USE AUDIO LEVEL HOOK
// ============================================

interface UseAudioLevelOptions {
    /** Smoothing factor (0-1, higher = smoother) */
    smoothing?: number;
    /** Update interval in ms */
    updateInterval?: number;
}

interface UseAudioLevelReturn {
    level: number;
    isActive: boolean;
    start: () => Promise<boolean>;
    stop: () => void;
}

/**
 * Hook for getting microphone audio levels for visualization
 */
export function useAudioLevel(options: UseAudioLevelOptions = {}): UseAudioLevelReturn {
    const { smoothing = 0.8 } = options;
    
    const [level, setLevel] = useState(0);
    const [isActive, setIsActive] = useState(false);
    
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);
    const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const previousLevelRef = useRef(0);
    
    const updateLevel = useCallback(() => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate average level
        const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
        const average = sum / dataArrayRef.current.length / 255;
        
        // Apply smoothing
        const smoothedLevel = previousLevelRef.current * smoothing + average * (1 - smoothing);
        previousLevelRef.current = smoothedLevel;
        
        setLevel(smoothedLevel);
        
        animationRef.current = requestAnimationFrame(updateLevel);
    }, [smoothing]);
    
    const start = useCallback(async (): Promise<boolean> => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            source.connect(analyserRef.current);
            
            dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array<ArrayBuffer>;
            
            setIsActive(true);
            updateLevel();
            
            return true;
        } catch (error) {
            console.error('Failed to start audio level monitoring:', error);
            return false;
        }
    }, [updateLevel]);
    
    const stop = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        
        audioContextRef.current?.close();
        audioContextRef.current = null;
        
        analyserRef.current = null;
        dataArrayRef.current = null;
        previousLevelRef.current = 0;
        
        setLevel(0);
        setIsActive(false);
    }, []);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);
    
    return { level, isActive, start, stop };
}

// ============================================
// USE AUDIO VISUALIZER HOOK
// ============================================

interface UseAudioVisualizerOptions {
    barCount?: number;
    minHeight?: number;
    maxHeight?: number;
}

interface UseAudioVisualizerReturn {
    bars: number[];
    level: number;
    isActive: boolean;
    start: () => Promise<boolean>;
    stop: () => void;
}

/**
 * Hook for generating bar visualization data from audio levels
 */
export function useAudioVisualizer(options: UseAudioVisualizerOptions = {}): UseAudioVisualizerReturn {
    const { barCount = 16, minHeight = 0.1, maxHeight = 1 } = options;
    
    const audioLevel = useAudioLevel();
    const [bars, setBars] = useState<number[]>(Array(barCount).fill(minHeight));
    
    useEffect(() => {
        if (!audioLevel.isActive) {
            setBars(Array(barCount).fill(minHeight));
            return;
        }
        
        // Generate bars based on level with some randomness
        const newBars = Array.from({ length: barCount }, (_, i) => {
            const baseHeight = Math.sin((i / barCount) * Math.PI) * 0.5 + 0.5;
            const animatedHeight = baseHeight * (0.3 + audioLevel.level * 0.7) + (Math.random() * 0.2 * audioLevel.level);
            return Math.max(minHeight, Math.min(maxHeight, animatedHeight));
        });
        
        setBars(newBars);
    }, [audioLevel.level, audioLevel.isActive, barCount, minHeight, maxHeight]);
    
    return {
        bars,
        level: audioLevel.level,
        isActive: audioLevel.isActive,
        start: audioLevel.start,
        stop: audioLevel.stop,
    };
}

// ============================================
// USE VOICE ACTIVITY DETECTION HOOK
// ============================================

interface UseVADOptions {
    /** Threshold for detecting speech (0-1) */
    threshold?: number;
    /** Minimum speech duration in ms */
    minSpeechDuration?: number;
    /** Silence duration before end of speech */
    silenceDuration?: number;
}

interface UseVADReturn {
    isSpeaking: boolean;
    speechDuration: number;
    silenceDuration: number;
    level: number;
    start: () => Promise<boolean>;
    stop: () => void;
}

/**
 * Hook for voice activity detection
 */
export function useVAD(options: UseVADOptions = {}): UseVADReturn {
    const { threshold = 0.15, minSpeechDuration = 200, silenceDuration = 500 } = options;
    
    const audioLevel = useAudioLevel({ smoothing: 0.5 });
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechDurationMs, setSpeechDurationMs] = useState(0);
    const [silenceDurationMs, setSilenceDurationMs] = useState(0);
    
    const speechStartRef = useRef<number | null>(null);
    const lastSpeechRef = useRef<number | null>(null);
    
    useEffect(() => {
        if (!audioLevel.isActive) return;
        
        const now = Date.now();
        const isAboveThreshold = audioLevel.level > threshold;
        
        if (isAboveThreshold) {
            if (!speechStartRef.current) {
                speechStartRef.current = now;
            }
            lastSpeechRef.current = now;
            
            const duration = now - speechStartRef.current;
            setSpeechDurationMs(duration);
            setSilenceDurationMs(0);
            
            if (duration >= minSpeechDuration) {
                setIsSpeaking(true);
            }
        } else {
            if (lastSpeechRef.current) {
                const silence = now - lastSpeechRef.current;
                setSilenceDurationMs(silence);
                
                if (silence >= silenceDuration) {
                    setIsSpeaking(false);
                    speechStartRef.current = null;
                    lastSpeechRef.current = null;
                    setSpeechDurationMs(0);
                }
            }
        }
    }, [audioLevel.level, audioLevel.isActive, threshold, minSpeechDuration, silenceDuration]);
    
    const handleStop = useCallback(() => {
        audioLevel.stop();
        setIsSpeaking(false);
        setSpeechDurationMs(0);
        setSilenceDurationMs(0);
        speechStartRef.current = null;
        lastSpeechRef.current = null;
    }, [audioLevel]);
    
    return {
        isSpeaking,
        speechDuration: speechDurationMs,
        silenceDuration: silenceDurationMs,
        level: audioLevel.level,
        start: audioLevel.start,
        stop: handleStop,
    };
}

// ============================================
// USE AUDIO RECORDER HOOK
// ============================================

interface UseAudioRecorderOptions {
    sampleRate?: number;
    channelCount?: number;
    bufferSize?: number;
}

interface UseAudioRecorderReturn {
    isRecording: boolean;
    audioLevel: number;
    start: (onAudioData: (data: Int16Array) => void) => Promise<boolean>;
    stop: () => void;
    setMuted: (muted: boolean) => void;
}

/**
 * Hook for recording audio with PCM data callback
 */
export function useAudioRecorder(options: UseAudioRecorderOptions = {}): UseAudioRecorderReturn {
    const { sampleRate = 16000, channelCount = 1, bufferSize = 4096 } = options;
    
    const [isRecording, setIsRecording] = useState(false);
    const [level, setLevel] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const onAudioDataRef = useRef<((data: Int16Array) => void) | null>(null);
    
    const start = useCallback(async (onAudioData: (data: Int16Array) => void): Promise<boolean> => {
        try {
            onAudioDataRef.current = onAudioData;
            
            streamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount,
                    sampleRate,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });
            
            audioContextRef.current = new AudioContext({ sampleRate });
            
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            processorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, channelCount, channelCount);
            
            source.connect(analyserRef.current);
            analyserRef.current.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);
            
            processorRef.current.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                
                for (let i = 0; i < inputData.length; i++) {
                    const sample = inputData[i] ?? 0;
                    pcmData[i] = Math.max(-32768, Math.min(32767, sample * 32767));
                }
                
                if (!isMuted && onAudioDataRef.current) {
                    onAudioDataRef.current(pcmData);
                }
                
                // Update level
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                    setLevel(average / 255);
                }
            };
            
            setIsRecording(true);
            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }, [sampleRate, channelCount, bufferSize, isMuted]);
    
    const stop = useCallback(() => {
        processorRef.current?.disconnect();
        streamRef.current?.getTracks().forEach(track => track.stop());
        audioContextRef.current?.close();
        
        processorRef.current = null;
        streamRef.current = null;
        audioContextRef.current = null;
        analyserRef.current = null;
        onAudioDataRef.current = null;
        
        setIsRecording(false);
        setLevel(0);
    }, []);
    
    const handleSetMuted = useCallback((muted: boolean) => {
        setIsMuted(muted);
    }, []);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);
    
    return {
        isRecording,
        audioLevel: level,
        start,
        stop,
        setMuted: handleSetMuted,
    };
}

// ============================================
// USE AUDIO PLAYER HOOK
// ============================================

interface UseAudioPlayerOptions {
    sampleRate?: number;
}

interface UseAudioPlayerReturn {
    isPlaying: boolean;
    volume: number;
    audioLevel: number;
    play: (data: ArrayBuffer) => void;
    clearQueue: () => void;
    setVolume: (volume: number) => void;
    setMuted: (muted: boolean) => void;
    resume: () => Promise<void>;
    destroy: () => void;
}

/**
 * Hook for playing PCM audio data
 */
export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
    const { sampleRate = 24000 } = options;
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolumeState] = useState(1);
    const [audioLevel, setAudioLevel] = useState(0);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const queueRef = useRef<Float32Array[]>([]);
    const nextTimeRef = useRef(0);
    const isPlayingRef = useRef(false);
    
    // Initialize audio context
    useEffect(() => {
        audioContextRef.current = new AudioContext({ sampleRate });
        gainNodeRef.current = audioContextRef.current.createGain();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        gainNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        
        return () => {
            audioContextRef.current?.close();
        };
    }, [sampleRate]);
    
    const pcmToFloat32 = useCallback((data: ArrayBuffer): Float32Array => {
        const int16 = new Int16Array(data);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
            const sample = int16[i] ?? 0;
            float32[i] = sample / 32768.0;
        }
        return float32;
    }, []);
    
    const processQueue = useCallback(() => {
        if (!audioContextRef.current || !gainNodeRef.current || queueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            return;
        }
        
        isPlayingRef.current = true;
        setIsPlaying(true);
        
        const floatData = queueRef.current.shift()!;
        const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, sampleRate);
        audioBuffer.getChannelData(0).set(floatData);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNodeRef.current);
        
        const currentTime = audioContextRef.current.currentTime;
        const startTime = Math.max(currentTime, nextTimeRef.current);
        source.start(startTime);
        
        nextTimeRef.current = startTime + audioBuffer.duration;
        
        // Update audio level
        if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevel(average / 255);
        }
        
        source.onended = () => {
            processQueue();
        };
    }, [sampleRate]);
    
    const play = useCallback((data: ArrayBuffer) => {
        const floatData = pcmToFloat32(data);
        queueRef.current.push(floatData);
        
        if (!isPlayingRef.current) {
            processQueue();
        }
    }, [pcmToFloat32, processQueue]);
    
    const clearQueue = useCallback(() => {
        queueRef.current = [];
        isPlayingRef.current = false;
        nextTimeRef.current = 0;
        setIsPlaying(false);
        setAudioLevel(0);
    }, []);
    
    const setVolume = useCallback((vol: number) => {
        const clampedVol = Math.max(0, Math.min(1, vol));
        setVolumeState(clampedVol);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = clampedVol;
        }
    }, []);
    
    const setMuted = useCallback((muted: boolean) => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = muted ? 0 : volume;
        }
    }, [volume]);
    
    const resume = useCallback(async () => {
        await audioContextRef.current?.resume();
    }, []);
    
    const destroy = useCallback(() => {
        clearQueue();
        audioContextRef.current?.close();
    }, [clearQueue]);
    
    return {
        isPlaying,
        volume,
        audioLevel,
        play,
        clearQueue,
        setVolume,
        setMuted,
        resume,
        destroy,
    };
}

export default {
    useAudioLevel,
    useAudioVisualizer,
    useVAD,
    useAudioRecorder,
    useAudioPlayer,
};
