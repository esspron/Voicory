/**
 * Voicory Widget - Main Class
 * The core widget implementation with voice and chat capabilities
 */

import type {
  WidgetConfig,
  WidgetState,
  VoicoryWidgetInstance,
  WidgetEventType,
  WidgetEventCallback,
  WidgetEvent,
  ChatMessage,
  TranscriptEntry,
} from './types';
import { injectStyles, removeStyles } from './styles';
import { getIcon } from './icons';

// Default configuration
const DEFAULT_CONFIG: Partial<WidgetConfig> = {
  mode: 'both',
  position: 'bottom-right',
  theme: 'dark',
  size: 'medium',
  showBranding: true,
  autoOpen: false,
  autoOpenDelay: 3000,
  soundEffects: true,
  zIndex: 999999,
  text: {
    greeting: 'Hi! How can I help you today?',
    inputPlaceholder: 'Type a message...',
    startCallText: 'Start Call',
    connectingText: 'Connecting...',
    activeCallText: 'Call in progress',
    endCallText: 'End Call',
    poweredByText: 'Powered by Voicory',
  },
};

// API Base URL — can be overridden via config.backendUrl for self-hosted or staging deployments
const DEFAULT_API_BASE_URL = 'https://api.voicory.com';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export class VoicoryWidget implements VoicoryWidgetInstance {
  private config: WidgetConfig;
  private state: WidgetState;
  private container: HTMLElement | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private styleElement: HTMLStyleElement | null = null;
  private eventListeners: Map<WidgetEventType, Set<WidgetEventCallback>> = new Map();
  private messages: ChatMessage[] = [];
  private transcript: TranscriptEntry[] = [];
  private sessionId: string | null = null;
  private dailyCall: any = null; // Daily.co instance
  private isTyping: boolean = false;
  private autoOpenTimeout: ReturnType<typeof setTimeout> | null = null;
  
  constructor(config: WidgetConfig) {
    // Validate required fields
    if (!config.apiKey) {
      throw new Error('VoicoryWidget: apiKey is required');
    }
    if (!config.assistantId) {
      throw new Error('VoicoryWidget: assistantId is required');
    }
    
    // Merge config with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      text: { ...DEFAULT_CONFIG.text, ...config.text },
      colors: { ...config.colors },
    };
    
    // Initialize state
    this.state = {
      isOpen: false,
      isMinimized: false,
      connectionState: 'idle',
      callState: 'idle',
      isMuted: false,
      isSpeaking: false,
      isListening: false,
      volume: 1,
      error: null,
      activeMode: this.config.mode === 'chat' ? 'chat' : 'voice',
    };
    
    // Initialize widget
    this.init();
  }
  
  /**
   * Initialize the widget
   */
  private init(): void {
    // Inject styles
    this.styleElement = injectStyles(this.config);
    
    // Create container
    this.createContainer();
    
    // Render widget
    this.render();
    
    // Auto-open if configured
    if (this.config.autoOpen) {
      this.autoOpenTimeout = setTimeout(() => {
        this.open();
      }, this.config.autoOpenDelay || 3000);
    }
    
    // Emit ready event
    this.emit({ type: 'ready', timestamp: new Date() });
  }
  
  /**
   * Create the widget container
   */
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'voicory-widget';
    this.container.className = 'voicory-widget-root';
    document.body.appendChild(this.container);
  }
  
  /**
   * Main render method
   */
  private render(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="voicory-widget-container">
        ${this.renderPanel()}
        ${this.renderLauncher()}
      </div>
    `;
    
    // Attach event listeners
    this.attachEventListeners();
  }
  
  /**
   * Render the launcher button
   */
  private renderLauncher(): string {
    const isActive = this.state.callState === 'active';
    return `
      <button 
        class="voicory-launcher ${this.state.isOpen ? 'is-open' : ''} ${isActive ? 'is-active' : ''}"
        aria-label="${this.state.isOpen ? 'Close chat' : 'Open chat'}"
        aria-expanded="${this.state.isOpen}"
      >
        <span class="icon-open">${getIcon('chat')}</span>
        <span class="icon-close">${getIcon('close')}</span>
      </button>
    `;
  }
  
  /**
   * Render the main panel
   */
  private renderPanel(): string {
    const panelClass = `voicory-panel ${this.state.isOpen ? 'is-open' : ''} ${this.state.isMinimized ? 'is-minimized' : ''}`;
    
    return `
      <div class="${panelClass}" role="dialog" aria-label="Chat widget">
        ${this.renderHeader()}
        ${!this.state.isMinimized ? this.renderContent() : ''}
      </div>
    `;
  }
  
  /**
   * Render the header
   */
  private renderHeader(): string {
    const assistantName = this.config.assistantName || 'AI Assistant';
    const statusText = this.getStatusText();
    const statusClass = this.getStatusClass();
    
    return `
      <div class="voicory-header">
        <div class="voicory-avatar">
          ${this.config.avatarUrl 
            ? `<img src="${this.config.avatarUrl}" alt="${assistantName}" />`
            : getIcon('robot')
          }
        </div>
        <div class="voicory-header-info">
          <div class="voicory-assistant-name">${assistantName}</div>
          <div class="voicory-status">
            <span class="voicory-status-dot ${statusClass}"></span>
            <span>${statusText}</span>
          </div>
        </div>
        <div class="voicory-header-actions">
          <button class="voicory-header-btn" data-action="minimize" aria-label="${this.state.isMinimized ? 'Maximize' : 'Minimize'}">
            ${this.state.isMinimized ? getIcon('maximize') : getIcon('minimize')}
          </button>
          <button class="voicory-header-btn" data-action="close" aria-label="Close">
            ${getIcon('close')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render the content area
   */
  private renderContent(): string {
    const showTabs = this.config.mode === 'both';
    
    return `
      ${showTabs ? this.renderTabs() : ''}
      <div class="voicory-content">
        ${this.state.error ? this.renderError() : ''}
        ${this.state.activeMode === 'voice' ? this.renderVoiceMode() : this.renderChatMode()}
      </div>
      ${this.config.showBranding ? this.renderFooter() : ''}
    `;
  }
  
  /**
   * Render mode tabs
   */
  private renderTabs(): string {
    return `
      <div class="voicory-tabs" role="tablist">
        <button 
          class="voicory-tab ${this.state.activeMode === 'voice' ? 'is-active' : ''}"
          data-tab="voice"
          role="tab"
          aria-selected="${this.state.activeMode === 'voice'}"
        >
          ${getIcon('phone')}
          <span>Voice</span>
        </button>
        <button 
          class="voicory-tab ${this.state.activeMode === 'chat' ? 'is-active' : ''}"
          data-tab="chat"
          role="tab"
          aria-selected="${this.state.activeMode === 'chat'}"
        >
          ${getIcon('message')}
          <span>Chat</span>
        </button>
      </div>
    `;
  }
  
  /**
   * Render voice mode UI
   */
  private renderVoiceMode(): string {
    const isIdle = this.state.callState === 'idle';
    const isConnecting = this.state.connectionState === 'connecting';
    const isActive = this.state.callState === 'active';
    
    let statusTitle = this.config.text?.startCallText || 'Start Call';
    let statusSubtitle = 'Click to begin voice conversation';
    
    if (isConnecting) {
      statusTitle = this.config.text?.connectingText || 'Connecting...';
      statusSubtitle = 'Please wait';
    } else if (isActive) {
      statusTitle = this.config.text?.activeCallText || 'Call in progress';
      statusSubtitle = this.state.isSpeaking ? 'Speaking...' : (this.state.isListening ? 'Listening...' : 'Ready');
    }
    
    return `
      <div class="voicory-voice">
        <div class="voicory-voice-avatar ${this.state.isSpeaking ? 'is-speaking' : ''}">
          ${this.config.avatarUrl 
            ? `<img src="${this.config.avatarUrl}" alt="Assistant" />`
            : getIcon('robot')
          }
        </div>
        
        <div class="voicory-voice-status">
          <h3 class="voicory-voice-title">${statusTitle}</h3>
          <p class="voicory-voice-subtitle">${statusSubtitle}</p>
        </div>
        
        ${this.transcript.length > 0 ? this.renderTranscript() : ''}
        
        <div class="voicory-voice-controls">
          ${isActive ? `
            <button 
              class="voicory-control-btn ${this.state.isMuted ? 'is-active' : ''}"
              data-action="mute"
              aria-label="${this.state.isMuted ? 'Unmute' : 'Mute'}"
            >
              ${this.state.isMuted ? getIcon('micOff') : getIcon('mic')}
            </button>
          ` : ''}
          
          <button 
            class="voicory-call-btn ${isActive ? 'end' : 'start'}"
            data-action="${isActive ? 'end-call' : 'start-call'}"
            ${isConnecting ? 'disabled' : ''}
            aria-label="${isActive ? 'End call' : 'Start call'}"
          >
            ${isConnecting 
              ? '<div class="voicory-spinner"></div>'
              : (isActive ? getIcon('phoneOff') : getIcon('phoneCall'))
            }
          </button>
          
          ${isActive ? `
            <button 
              class="voicory-control-btn"
              data-action="volume"
              aria-label="Volume"
            >
              ${getIcon('volume')}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render transcript during call
   */
  private renderTranscript(): string {
    const recentTranscript = this.transcript.slice(-5);
    
    return `
      <div class="voicory-transcript">
        ${recentTranscript.map(entry => `
          <div class="voicory-transcript-entry ${entry.role === 'user' ? 'is-user' : 'is-assistant'}">
            <span class="voicory-transcript-label">${entry.role === 'user' ? 'You' : 'Assistant'}</span>
            <div class="voicory-transcript-text ${!entry.isFinal ? 'is-interim' : ''}">${entry.text}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Render chat mode UI
   */
  private renderChatMode(): string {
    return `
      <div class="voicory-chat">
        <div class="voicory-messages" role="log" aria-live="polite">
          ${this.messages.length === 0 ? this.renderEmptyState() : this.renderMessages()}
          ${this.isTyping ? this.renderTypingIndicator() : ''}
        </div>
        ${this.renderChatInput()}
      </div>
    `;
  }
  
  /**
   * Render empty state
   */
  private renderEmptyState(): string {
    return `
      <div class="voicory-empty">
        ${getIcon('message')}
        <p>${this.config.text?.greeting || 'Hi! How can I help you today?'}</p>
      </div>
    `;
  }
  
  /**
   * Render chat messages
   */
  private renderMessages(): string {
    return this.messages.map(msg => `
      <div class="voicory-message ${msg.role === 'user' ? 'is-user' : 'is-assistant'}">
        <div class="voicory-message-bubble">${this.escapeHtml(msg.content)}</div>
        <span class="voicory-message-time">${formatTime(msg.timestamp)}</span>
      </div>
    `).join('');
  }
  
  /**
   * Render typing indicator
   */
  private renderTypingIndicator(): string {
    return `
      <div class="voicory-message is-assistant">
        <div class="voicory-typing">
          <div class="voicory-typing-dot"></div>
          <div class="voicory-typing-dot"></div>
          <div class="voicory-typing-dot"></div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render chat input
   */
  private renderChatInput(): string {
    return `
      <div class="voicory-input-area">
        <div class="voicory-input-wrapper">
          <textarea 
            class="voicory-input"
            placeholder="${this.config.text?.inputPlaceholder || 'Type a message...'}"
            rows="1"
            aria-label="Message input"
          ></textarea>
          <button 
            class="voicory-send-btn"
            data-action="send"
            aria-label="Send message"
          >
            ${getIcon('send')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render error message
   */
  private renderError(): string {
    return `
      <div class="voicory-error" role="alert">
        ${getIcon('alertCircle')}
        <span>${this.state.error}</span>
      </div>
    `;
  }
  
  /**
   * Render footer with branding
   */
  private renderFooter(): string {
    const text = this.config.text?.poweredByText || 'Powered by Voicory';
    if (!text) return '';
    
    return `
      <div class="voicory-footer">
        <a href="https://voicory.com" target="_blank" rel="noopener noreferrer" class="voicory-branding">
          ${getIcon('voicory')}
          <span>${text}</span>
        </a>
      </div>
    `;
  }
  
  /**
   * Get status text based on current state
   */
  private getStatusText(): string {
    if (this.state.callState === 'active') return 'In call';
    if (this.state.connectionState === 'connecting') return 'Connecting...';
    if (this.state.connectionState === 'error') return 'Connection error';
    return 'Online';
  }
  
  /**
   * Get status dot class
   */
  private getStatusClass(): string {
    if (this.state.connectionState === 'connecting') return 'is-connecting';
    if (this.state.connectionState === 'error') return 'is-error';
    return '';
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Attach event listeners to the DOM
   */
  private attachEventListeners(): void {
    if (!this.container) return;
    
    // Launcher click
    const launcher = this.container.querySelector('.voicory-launcher');
    launcher?.addEventListener('click', () => this.toggle());
    
    // Header actions
    const minimizeBtn = this.container.querySelector('[data-action="minimize"]');
    minimizeBtn?.addEventListener('click', () => this.state.isMinimized ? this.maximize() : this.minimize());
    
    const closeBtn = this.container.querySelector('[data-action="close"]');
    closeBtn?.addEventListener('click', () => this.close());
    
    // Tab switching
    const tabs = this.container.querySelectorAll('[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.getAttribute('data-tab') as 'voice' | 'chat';
        this.setActiveMode(mode);
      });
    });
    
    // Voice controls
    const startCallBtn = this.container.querySelector('[data-action="start-call"]');
    startCallBtn?.addEventListener('click', () => this.startCall());
    
    const endCallBtn = this.container.querySelector('[data-action="end-call"]');
    endCallBtn?.addEventListener('click', () => this.endCall());
    
    const muteBtn = this.container.querySelector('[data-action="mute"]');
    muteBtn?.addEventListener('click', () => this.setMuted(!this.state.isMuted));
    
    // Chat input
    const input = this.container.querySelector('.voicory-input') as HTMLTextAreaElement;
    const sendBtn = this.container.querySelector('[data-action="send"]');
    
    input?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage(input.value);
        input.value = '';
      }
    });
    
    input?.addEventListener('input', () => {
      // Auto-resize textarea
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    
    sendBtn?.addEventListener('click', () => {
      if (input && input.value.trim()) {
        this.handleSendMessage(input.value);
        input.value = '';
        input.style.height = 'auto';
      }
    });
  }
  
  /**
   * Handle sending a message
   */
  private async handleSendMessage(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) return;
    
    await this.sendMessage(trimmed);
  }
  
  /**
   * Set active mode (voice/chat)
   */
  private setActiveMode(mode: 'voice' | 'chat'): void {
    this.state.activeMode = mode;
    this.render();
  }
  
  /**
   * Update state and re-render
   */
  private setState(updates: Partial<WidgetState>): void {
    this.state = { ...this.state, ...updates };
    this.render();
  }
  
  /**
   * Emit an event to listeners
   */
  private emit(event: WidgetEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`VoicoryWidget: Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }
  
  // ============================================
  // PUBLIC API
  // ============================================
  
  open(): void {
    this.setState({ isOpen: true, isMinimized: false });
    this.emit({ type: 'open', timestamp: new Date() });
  }
  
  close(): void {
    this.setState({ isOpen: false });
    this.emit({ type: 'close', timestamp: new Date() });
  }
  
  toggle(): void {
    if (this.state.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  minimize(): void {
    this.setState({ isMinimized: true });
    this.emit({ type: 'minimize', timestamp: new Date() });
  }
  
  maximize(): void {
    this.setState({ isMinimized: false });
    this.emit({ type: 'maximize', timestamp: new Date() });
  }
  
  async startCall(): Promise<void> {
    if (this.state.callState !== 'idle') {
      console.warn('VoicoryWidget: Call already in progress');
      return;
    }
    
    this.setState({
      connectionState: 'connecting',
      error: null,
    });
    
    try {
      // Create session with backend
      const response = await fetch(`${this.config.backendUrl || DEFAULT_API_BASE_URL}/api/widget/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          assistantId: this.config.assistantId,
          mode: 'voice',
          variables: this.config.variables,
          customer: this.config.customer,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }
      
      const session = await response.json();
      this.sessionId = session.sessionId;
      
      // Initialize Daily.co call if room URL provided
      if (session.roomUrl) {
        await this.initializeDailyCall(session.roomUrl, session.token);
      }
      
      this.setState({
        connectionState: 'connected',
        callState: 'active',
      });
      
      this.emit({
        type: 'call-start',
        timestamp: new Date(),
        data: {
          sessionId: this.sessionId,
          assistantId: this.config.assistantId,
        },
      });
      
    } catch (error: any) {
      console.error('VoicoryWidget: Failed to start call:', error);
      this.setState({
        connectionState: 'error',
        callState: 'idle',
        error: error.message || 'Failed to start call',
      });
      
      this.emit({
        type: 'call-error',
        timestamp: new Date(),
        data: { code: 'START_FAILED', message: error.message },
      });
    }
  }
  
  /**
   * Initialize Daily.co call
   */
  private async initializeDailyCall(roomUrl: string, token?: string): Promise<void> {
    // Dynamic import Daily.co SDK
    const DailyIframe = (window as any).DailyIframe || await import('@daily-co/daily-js').then(m => m.default);
    
    // Create call frame (audio only)
    this.dailyCall = DailyIframe.createFrame({
      showLeaveButton: false,
      showFullscreenButton: false,
      showLocalVideo: false,
      showParticipantsBar: false,
      iframeStyle: {
        display: 'none', // Hidden - audio only
      },
    });
    
    // Set up event handlers
    this.dailyCall.on('track-started', (event: any) => {
      if (event.participant?.local) {
        this.setState({ isListening: true });
      } else {
        this.setState({ isSpeaking: true });
        this.emit({ type: 'speech-start', timestamp: new Date() });
      }
    });
    
    this.dailyCall.on('track-stopped', (event: any) => {
      if (!event.participant?.local) {
        this.setState({ isSpeaking: false });
        this.emit({ type: 'speech-end', timestamp: new Date() });
      }
    });
    
    this.dailyCall.on('left-meeting', () => {
      this.handleCallEnded('user');
    });
    
    this.dailyCall.on('error', (event: any) => {
      console.error('Daily.co error:', event);
      this.setState({
        connectionState: 'error',
        error: 'Connection error',
      });
    });
    
    // Join the call
    await this.dailyCall.join({
      url: roomUrl,
      token: token,
    });
  }
  
  endCall(): void {
    if (this.dailyCall) {
      this.dailyCall.leave();
      this.dailyCall.destroy();
      this.dailyCall = null;
    }
    
    this.handleCallEnded('user');
  }
  
  /**
   * Handle call ended
   */
  private handleCallEnded(reason: 'user' | 'assistant' | 'error' | 'timeout'): void {
    const duration = 0; // TODO: Calculate actual duration
    
    this.setState({
      connectionState: 'idle',
      callState: 'idle',
      isSpeaking: false,
      isListening: false,
    });
    
    this.emit({
      type: 'call-end',
      timestamp: new Date(),
      data: {
        sessionId: this.sessionId || '',
        duration,
        reason,
      },
    });
    
    this.sessionId = null;
    this.transcript = [];
  }
  
  async sendMessage(message: string): Promise<void> {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      status: 'sending',
    };
    
    this.messages.push(userMessage);
    this.isTyping = true;
    this.render();
    
    // Scroll to bottom
    this.scrollToBottom();
    
    try {
      const response = await fetch(`${this.config.backendUrl || DEFAULT_API_BASE_URL}/api/widget/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({
          assistantId: this.config.assistantId,
          sessionId: this.sessionId,
          message,
          variables: this.config.variables,
          customer: this.config.customer,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      
      const data = await response.json();
      
      // Update user message status
      userMessage.status = 'sent';
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      
      this.messages.push(assistantMessage);
      this.isTyping = false;
      this.render();
      this.scrollToBottom();
      
      // Emit events
      this.emit({ type: 'message', timestamp: new Date(), data: userMessage });
      this.emit({ type: 'message', timestamp: new Date(), data: assistantMessage });
      
    } catch (error: any) {
      console.error('VoicoryWidget: Failed to send message:', error);
      userMessage.status = 'error';
      this.isTyping = false;
      this.setState({ error: error.message || 'Failed to send message' });
      
      this.emit({
        type: 'error',
        timestamp: new Date(),
        data: { code: 'MESSAGE_FAILED', message: error.message },
      });
    }
  }
  
  /**
   * Scroll chat to bottom
   */
  private scrollToBottom(): void {
    const messages = this.container?.querySelector('.voicory-messages');
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }
  
  setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    
    if (this.dailyCall) {
      this.dailyCall.setLocalAudio(!muted);
    }
    
    this.render();
    this.emit({
      type: 'mute-change',
      timestamp: new Date(),
      data: { muted },
    });
  }
  
  isMuted(): boolean {
    return this.state.isMuted;
  }
  
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.emit({
      type: 'volume-change',
      timestamp: new Date(),
      data: { volume: this.state.volume },
    });
  }
  
  getVolume(): number {
    return this.state.volume;
  }
  
  on<T extends WidgetEvent>(event: WidgetEventType, callback: WidgetEventCallback<T>): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as WidgetEventCallback);
  }
  
  off(event: WidgetEventType, callback: WidgetEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  getState(): WidgetState {
    return { ...this.state };
  }
  
  updateConfig(config: Partial<WidgetConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      text: { ...this.config.text, ...config.text },
      colors: { ...this.config.colors, ...config.colors },
    };
    
    // Re-inject styles if visual config changed
    if (config.theme || config.colors || config.size || config.position) {
      this.styleElement = injectStyles(this.config);
    }
    
    this.render();
  }
  
  destroy(): void {
    // End call if active
    if (this.state.callState === 'active') {
      this.endCall();
    }
    
    // Clear timeout
    if (this.autoOpenTimeout) {
      clearTimeout(this.autoOpenTimeout);
    }
    
    // Remove DOM elements
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    // Remove styles
    removeStyles();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Clear messages
    this.messages = [];
    this.transcript = [];
  }
}
