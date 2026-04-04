/**
 * Voicory Widget Types
 * Type definitions for the embeddable widget SDK
 */

// ============================================
// CONFIGURATION TYPES
// ============================================

export type WidgetMode = 'voice' | 'chat' | 'both';
export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type WidgetTheme = 'light' | 'dark' | 'auto';
export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetColors {
  /** Primary brand color (button, highlights) */
  primary?: string;
  /** Primary hover state */
  primaryHover?: string;
  /** Background color of the widget */
  background?: string;
  /** Text color */
  text?: string;
  /** Muted text color */
  textMuted?: string;
  /** Border color */
  border?: string;
  /** User message bubble color */
  userBubble?: string;
  /** Assistant message bubble color */
  assistantBubble?: string;
}

export interface WidgetText {
  /** Greeting shown when widget opens */
  greeting?: string;
  /** Placeholder for chat input */
  inputPlaceholder?: string;
  /** Text on voice call button */
  startCallText?: string;
  /** Text shown while connecting */
  connectingText?: string;
  /** Text shown during active call */
  activeCallText?: string;
  /** Text on end call button */
  endCallText?: string;
  /** Powered by text (set to empty to hide) */
  poweredByText?: string;
}

export interface WidgetConfig {
  /** Your Voicory public API key (required) */
  apiKey: string;
  
  /** Assistant ID to use (required) */
  assistantId: string;
  
  /** Override backend URL (defaults to https://api.voicory.com, useful for self-hosted or staging) */
  backendUrl?: string;
  
  /** Widget mode: 'voice', 'chat', or 'both' */
  mode?: WidgetMode;
  
  /** Widget position on the page */
  position?: WidgetPosition;
  
  /** Color theme */
  theme?: WidgetTheme;
  
  /** Widget size */
  size?: WidgetSize;
  
  /** Custom colors */
  colors?: WidgetColors;
  
  /** Custom text strings */
  text?: WidgetText;
  
  /** Custom avatar URL for the assistant */
  avatarUrl?: string;
  
  /** Assistant display name */
  assistantName?: string;
  
  /** Show/hide branding */
  showBranding?: boolean;
  
  /** Auto-open widget on page load */
  autoOpen?: boolean;
  
  /** Delay before auto-open (ms) */
  autoOpenDelay?: number;
  
  /** Enable sound effects */
  soundEffects?: boolean;
  
  /** Z-index for the widget */
  zIndex?: number;
  
  /** Dynamic variables to pass to the assistant */
  variables?: Record<string, string>;
  
  /** Customer information for personalization */
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: string | undefined;
  };
  
  /** Allowed domains (for security) */
  allowedDomains?: string[];
  
  /** Callback URL for events */
  webhookUrl?: string;
}

// ============================================
// STATE TYPES
// ============================================

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
export type CallState = 'idle' | 'ringing' | 'active' | 'ended';

export interface WidgetState {
  isOpen: boolean;
  isMinimized: boolean;
  connectionState: ConnectionState;
  callState: CallState;
  isMuted: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  volume: number;
  error: string | null;
  activeMode: 'voice' | 'chat';
}

// ============================================
// MESSAGE TYPES
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  metadata?: Record<string, unknown>;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

// ============================================
// EVENT TYPES
// ============================================

export type WidgetEventType =
  | 'ready'
  | 'open'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'call-start'
  | 'call-end'
  | 'call-error'
  | 'speech-start'
  | 'speech-end'
  | 'message'
  | 'transcript'
  | 'error'
  | 'connection-change'
  | 'mute-change'
  | 'volume-change';

export interface WidgetEvent {
  type: WidgetEventType;
  timestamp: Date;
  data?: unknown;
}

export interface CallStartEvent extends WidgetEvent {
  type: 'call-start';
  data: {
    sessionId: string;
    assistantId: string;
  };
}

export interface CallEndEvent extends WidgetEvent {
  type: 'call-end';
  data: {
    sessionId: string;
    duration: number;
    reason: 'user' | 'assistant' | 'error' | 'timeout';
  };
}

export interface MessageEvent extends WidgetEvent {
  type: 'message';
  data: ChatMessage;
}

export interface TranscriptEvent extends WidgetEvent {
  type: 'transcript';
  data: TranscriptEntry;
}

export interface ErrorEvent extends WidgetEvent {
  type: 'error';
  data: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type WidgetEventCallback<T extends WidgetEvent = WidgetEvent> = (event: T) => void;

// ============================================
// API TYPES
// ============================================

export interface SessionResponse {
  sessionId: string;
  roomUrl?: string;
  token?: string;
  expiresAt: string;
}

export interface SendMessageResponse {
  messageId: string;
  response?: string;
}

// ============================================
// WIDGET INSTANCE INTERFACE
// ============================================

export interface VoicoryWidgetInstance {
  /** Open the widget */
  open(): void;
  
  /** Close the widget */
  close(): void;
  
  /** Toggle widget open/closed */
  toggle(): void;
  
  /** Minimize the widget */
  minimize(): void;
  
  /** Maximize the widget */
  maximize(): void;
  
  /** Start a voice call */
  startCall(): Promise<void>;
  
  /** End the current call */
  endCall(): void;
  
  /** Send a chat message */
  sendMessage(message: string): Promise<void>;
  
  /** Mute/unmute microphone */
  setMuted(muted: boolean): void;
  
  /** Check if muted */
  isMuted(): boolean;
  
  /** Set volume (0-1) */
  setVolume(volume: number): void;
  
  /** Get current volume */
  getVolume(): number;
  
  /** Add event listener */
  on<T extends WidgetEvent>(event: WidgetEventType, callback: WidgetEventCallback<T>): void;
  
  /** Remove event listener */
  off(event: WidgetEventType, callback: WidgetEventCallback): void;
  
  /** Get current state */
  getState(): WidgetState;
  
  /** Update configuration */
  updateConfig(config: Partial<WidgetConfig>): void;
  
  /** Destroy the widget */
  destroy(): void;
}
