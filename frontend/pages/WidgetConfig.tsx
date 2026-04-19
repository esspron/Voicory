/**
 * Widget Configuration Page
 * Allows users to configure and get embed code for their assistant widget
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code,
  Palette,
  ChatCircle,
  Phone,
  Gear,
  Copy,
  Check,
  Eye,
  CaretLeft,
  Globe,
  Sun,
  Moon,
  Robot,
  Plus,
  Trash,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { supabase } from '../services/supabase';
import { getAssistant } from '../services/voicoryService';
import { useClipboard } from '../hooks';
import { Button, Input, Badge, Toggle, Card, Skeleton } from '../components/ui';
import { logger } from '../lib/logger';

// Raw database response type for widget_settings (not in generated types yet)
interface WidgetSettingsRow {
  id: string;
  assistant_id: string;
  user_id: string;
  mode: string;
  position: string;
  theme: string;
  size: string;
  colors: Record<string, string> | null;
  custom_text: Record<string, string> | null;
  avatar_url: string | null;
  show_branding: boolean;
  auto_open: boolean;
  auto_open_delay: number;
  sound_effects: boolean;
  z_index: number;
  allowed_domains: string[] | null;
  created_at: string;
  updated_at: string;
}

// Types
interface WidgetSettings {
  mode: 'voice' | 'chat' | 'both';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme: 'light' | 'dark' | 'auto';
  size: 'small' | 'medium' | 'large';
  colors: {
    primary?: string;
    background?: string;
    text?: string;
  };
  customText: {
    greeting?: string;
    inputPlaceholder?: string;
    startCallText?: string;
  };
  avatarUrl?: string;
  showBranding: boolean;
  autoOpen: boolean;
  autoOpenDelay: number;
  soundEffects: boolean;
  zIndex: number;
  allowedDomains: string[];
}

interface ApiKeyInfo {
  id: string;
  key: string;
  label: string;
}

const DEFAULT_SETTINGS: WidgetSettings = {
  mode: 'both',
  position: 'bottom-right',
  theme: 'dark',
  size: 'medium',
  colors: {},
  customText: {},
  showBranding: true,
  autoOpen: false,
  autoOpenDelay: 3000,
  soundEffects: true,
  zIndex: 999999,
  allowedDomains: [],
};

export default function WidgetConfig() {
  const { assistantId } = useParams<{ assistantId: string }>();
  const navigate = useNavigate();
  const { copy, copied } = useClipboard();
  
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [assistant, setAssistant] = useState<any>(null);
  const [settings, setSettings] = useState<WidgetSettings>(DEFAULT_SETTINGS);
  const [publicKey, setPublicKey] = useState<ApiKeyInfo | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [activeTab, setActiveTab] = useState<'embed' | 'appearance' | 'behavior' | 'security'>('embed');
  const [previewOpen] = useState(false);
  
  // Fetch data
  useEffect(() => {
    if (assistantId) {
      loadData();
    }
  }, [assistantId]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Load assistant
      const assistantData = await getAssistant(assistantId!);
      if (!assistantData) {
        navigate('/assistants');
        return;
      }
      setAssistant(assistantData);
      
      // Load widget settings - cast to our known type since table is new
      const { data: settingsData } = await supabase
        .from('widget_settings' as any)
        .select('*')
        .eq('assistant_id', assistantId!)
        .single() as { data: WidgetSettingsRow | null };
      
      if (settingsData) {
        setSettings({
          mode: settingsData.mode as WidgetSettings['mode'],
          position: settingsData.position as WidgetSettings['position'],
          theme: settingsData.theme as WidgetSettings['theme'],
          size: settingsData.size as WidgetSettings['size'],
          colors: (settingsData.colors || {}) as WidgetSettings['colors'],
          customText: (settingsData.custom_text || {}) as WidgetSettings['customText'],
          avatarUrl: settingsData.avatar_url || undefined,
          showBranding: settingsData.show_branding,
          autoOpen: settingsData.auto_open,
          autoOpenDelay: settingsData.auto_open_delay,
          soundEffects: settingsData.sound_effects,
          zIndex: settingsData.z_index,
          allowedDomains: settingsData.allowed_domains || [],
        });
      }
      
      // Load public API key
      const { data: keysData } = await supabase
        .from('api_keys')
        .select('id, key, label')
        .eq('type', 'public')
        .limit(1)
        .single();
      
      setPublicKey(keysData as ApiKeyInfo | null);
      
    } catch (err) {
      logger.error('Error loading widget config');
    } finally {
      setLoading(false);
    }
  };
  
  // Save settings
  const saveSettings = async () => {
    if (!assistantId) return;
    
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Save to Supabase directly
      const { error } = await supabase
        .from('widget_settings' as any)
        .upsert({
          assistant_id: assistantId,
          user_id: user.id,
          mode: settings.mode,
          position: settings.position,
          theme: settings.theme,
          size: settings.size,
          colors: settings.colors,
          custom_text: settings.customText,
          avatar_url: settings.avatarUrl || null,
          show_branding: settings.showBranding,
          auto_open: settings.autoOpen,
          auto_open_delay: settings.autoOpenDelay,
          sound_effects: settings.soundEffects,
          z_index: settings.zIndex,
          allowed_domains: settings.allowedDomains,
        } as any, {
          onConflict: 'assistant_id',
        });
      
      if (error) throw error;

      // Also sync to backend API
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (token) {
        const apiUrl = (import.meta as any).env.VITE_API_URL || 'https://voicory-backend-783942490798.asia-south1.run.app/api';
        await fetch(`${apiUrl}/widget/settings/${assistantId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            mode: settings.mode,
            position: settings.position,
            theme: settings.theme,
            size: settings.size,
            colors: settings.colors,
            customText: settings.customText,
            avatarUrl: settings.avatarUrl,
            showBranding: settings.showBranding,
            autoOpen: settings.autoOpen,
            autoOpenDelay: settings.autoOpenDelay,
            soundEffects: settings.soundEffects,
            zIndex: settings.zIndex,
            allowedDomains: settings.allowedDomains,
          }),
        }).catch(err => logger.error('Backend sync error: ' + err.message));
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      logger.info('Widget settings saved');
    } catch (err) {
      logger.error('Error saving widget settings');
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setSettings({ ...DEFAULT_SETTINGS });
  };

  // Preview widget in new tab
  const previewInNewTab = () => {
    const backendUrl = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'https://voicory-backend-783942490798.asia-south1.run.app';
    window.open(`${backendUrl}/api/widget/preview/${assistantId}`, '_blank');
  };
  
  // Backend URL — use env var if set, fallback to production Cloud Run URL
  const BACKEND_URL = (import.meta as any).env.VITE_API_URL?.replace('/api', '') || 'https://voicory-backend-783942490798.asia-south1.run.app';

  // Generate embed code using correct backend URL and data-attributes pattern
  const generateEmbedCode = () => {
    if (!assistantId) return '';

    // Build data-attributes from non-default settings
    const dataAttrs: string[] = [];
    dataAttrs.push(`data-assistant-id='${assistantId}'`);
    dataAttrs.push(`data-theme='${settings.theme}'`);
    if (settings.mode !== 'both') dataAttrs.push(`data-mode='${settings.mode}'`);
    if (settings.position !== 'bottom-right') dataAttrs.push(`data-position='${settings.position}'`);
    if (settings.size !== 'medium') dataAttrs.push(`data-size='${settings.size}'`);
    if (settings.colors.primary) dataAttrs.push(`data-primary-color='${settings.colors.primary}'`);
    if (settings.avatarUrl) dataAttrs.push(`data-avatar-url='${settings.avatarUrl}'`);
    if (!settings.showBranding) dataAttrs.push(`data-show-branding='false'`);
    if (settings.autoOpen) dataAttrs.push(`data-auto-open='true'`);

    return `<!-- Voicory Widget -->\n<script src='${BACKEND_URL}/widget.js'\n  ${dataAttrs.join('\n  ')}\n  async></script>`;
  };
  
  // Generate NPM code
  const generateNpmCode = () => {
    if (!publicKey || !assistantId) return '';
    
    return `import { VoicoryWidget } from '@voicory/widget';

const widget = new VoicoryWidget({
  apiKey: '${publicKey.key}',
  assistantId: '${assistantId}',
  mode: '${settings.mode}',
  theme: '${settings.theme}',
  position: '${settings.position}',
  ${assistant?.name ? `assistantName: '${assistant.name}',` : ''}
});

// Event listeners
widget.on('message', (event) => {
  if (import.meta.env.DEV) console.log('Message:', event.data);
});

widget.on('call-start', (event) => {
  if (import.meta.env.DEV) console.log('Call started:', event.data.sessionId);
});

// Control methods
widget.open();
widget.close();
widget.startCall();
widget.sendMessage('Hello!');`;
  };
  
  // Add domain
  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    
    // Basic validation
    if (!/^(\*\.)?[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
      return;
    }
    
    if (!settings.allowedDomains.includes(domain)) {
      setSettings({
        ...settings,
        allowedDomains: [...settings.allowedDomains, domain],
      });
    }
    setNewDomain('');
  };
  
  // Remove domain
  const removeDomain = (domain: string) => {
    setSettings({
      ...settings,
      allowedDomains: settings.allowedDomains.filter(d => d !== domain),
    });
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/assistants/${assistantId}`)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <CaretLeft size={20} className="text-textMuted" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-textMain">Widget Configuration</h1>
              <Badge variant="primary" size="sm">
                {assistant?.name || 'Assistant'}
              </Badge>
            </div>
            <p className="text-textMuted mt-1">
              Embed this assistant on your website with voice and chat capabilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button variant="outline" size="sm" onClick={previewInNewTab}>
              <Eye size={16} />
              Preview
            </Button>
            <Button onClick={saveSettings} loading={saving}>
              {saveSuccess ? <Check size={16} /> : null}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface/50 rounded-xl w-fit">
          {[
            { id: 'embed', label: 'Embed Code', icon: Code },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'behavior', label: 'Behavior', icon: Gear },
            { id: 'security', label: 'Security', icon: Globe },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-textMuted hover:text-textMain hover:bg-white/5'
              }`}
            >
              <tab.icon size={18} weight={activeTab === tab.id ? 'fill' : 'regular'} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* No API Key Warning (only for NPM tab) */}
        {!publicKey && activeTab === 'embed' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-400">
            <strong>Note:</strong> Create a public API key in API Keys settings to use the NPM package integration.
          </div>
        )}
        
        {/* Content */}
        {(publicKey || activeTab !== 'embed' || true) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settings Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Embed Code Tab */}
              {activeTab === 'embed' && (
                <div className="space-y-6">
                  {/* Script Tag */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-textMain">HTML Script Tag</h3>
                        <p className="text-sm text-textMuted">
                          Add this to your website's HTML (before &lt;/body&gt;)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copy(generateEmbedCode())}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <pre className="p-4 bg-black/50 rounded-xl text-sm text-green-400 overflow-x-auto font-mono">
                      <code>{generateEmbedCode()}</code>
                    </pre>
                  </Card>
                  
                  {/* NPM Package */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-textMain">React / NPM Package</h3>
                        <p className="text-sm text-textMuted">
                          For React, Next.js, or other frameworks
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copy(generateNpmCode())}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <div className="p-3 bg-black/50 rounded-lg text-sm text-textMuted font-mono mb-4">
                      npm install @voicory/widget
                    </div>
                    <pre className="p-4 bg-black/50 rounded-xl text-sm text-blue-400 overflow-x-auto font-mono max-h-80">
                      <code>{generateNpmCode()}</code>
                    </pre>
                  </Card>
                </div>
              )}
              
              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <Card className="p-6 space-y-6">
                  <h3 className="font-semibold text-textMain">Visual Settings</h3>
                  
                  {/* Mode */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Widget Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'voice', label: 'Voice Only', icon: Phone },
                        { value: 'chat', label: 'Chat Only', icon: ChatCircle },
                        { value: 'both', label: 'Voice & Chat', icon: Robot },
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setSettings({ ...settings, mode: mode.value as any })}
                          className={`p-4 rounded-xl border transition-all ${
                            settings.mode === mode.value
                              ? 'border-primary bg-primary/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <mode.icon 
                            size={24} 
                            weight={settings.mode === mode.value ? 'fill' : 'regular'}
                            className={settings.mode === mode.value ? 'text-primary' : 'text-textMuted'}
                          />
                          <span className="block mt-2 text-sm font-medium text-textMain">
                            {mode.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Theme
                    </label>
                    <div className="flex gap-3">
                      {[
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => setSettings({ ...settings, theme: theme.value as any })}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                            settings.theme === theme.value
                              ? 'border-primary bg-primary/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <theme.icon 
                            size={20}
                            weight={settings.theme === theme.value ? 'fill' : 'regular'}
                            className={settings.theme === theme.value ? 'text-primary' : 'text-textMuted'}
                          />
                          <span className="text-sm font-medium text-textMain">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Position
                    </label>
                    <select
                      value={settings.position}
                      onChange={(e) => setSettings({ ...settings, position: e.target.value as WidgetSettings['position'] })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface/80 border border-white/10 text-textMain text-sm focus:outline-none focus:border-primary/50"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                  
                  {/* Size */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Size
                    </label>
                    <select
                      value={settings.size}
                      onChange={(e) => setSettings({ ...settings, size: e.target.value as WidgetSettings['size'] })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface/80 border border-white/10 text-textMain text-sm focus:outline-none focus:border-primary/50"
                    >
                      <option value="small">Small (320px)</option>
                      <option value="medium">Medium (380px)</option>
                      <option value="large">Large (440px)</option>
                    </select>
                  </div>
                  
                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Primary Color
                    </label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={settings.colors.primary || '#0ea5e9'}
                        onChange={(e) => setSettings({
                          ...settings,
                          colors: { ...settings.colors, primary: e.target.value },
                        })}
                        className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer"
                      />
                      <Input
                        value={settings.colors.primary || '#0ea5e9'}
                        onChange={(e) => setSettings({
                          ...settings,
                          colors: { ...settings.colors, primary: e.target.value },
                        })}
                        placeholder="#0ea5e9"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  {/* Avatar URL */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Custom Avatar URL (optional)
                    </label>
                    <Input
                      value={settings.avatarUrl || ''}
                      onChange={(e) => setSettings({ ...settings, avatarUrl: e.target.value })}
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                  
                  {/* Show Branding */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-textMain">
                        Show Voicory Branding
                      </label>
                      <p className="text-xs text-textMuted">
                        Display "Powered by Voicory" in the widget
                      </p>
                    </div>
                    <Toggle
                      checked={settings.showBranding}
                      onChange={(checked) => setSettings({ ...settings, showBranding: checked })}
                    />
                  </div>
                </Card>
              )}
              
              {/* Behavior Tab */}
              {activeTab === 'behavior' && (
                <Card className="p-6 space-y-6">
                  <h3 className="font-semibold text-textMain">Behavior Settings</h3>
                  
                  {/* Auto Open */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-textMain">
                        Auto-open Widget
                      </label>
                      <p className="text-xs text-textMuted">
                        Automatically open the widget after page load
                      </p>
                    </div>
                    <Toggle
                      checked={settings.autoOpen}
                      onChange={(checked) => setSettings({ ...settings, autoOpen: checked })}
                    />
                  </div>
                  
                  {settings.autoOpen && (
                    <div>
                      <label className="block text-sm font-medium text-textMain mb-2">
                        Auto-open Delay (ms)
                      </label>
                      <Input
                        type="number"
                        value={settings.autoOpenDelay}
                        onChange={(e) => setSettings({
                          ...settings,
                          autoOpenDelay: parseInt(e.target.value) || 3000,
                        })}
                        min={0}
                        max={30000}
                      />
                    </div>
                  )}
                  
                  {/* Sound Effects */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-textMain">
                        Sound Effects
                      </label>
                      <p className="text-xs text-textMuted">
                        Play sounds for notifications and actions
                      </p>
                    </div>
                    <Toggle
                      checked={settings.soundEffects}
                      onChange={(checked) => setSettings({ ...settings, soundEffects: checked })}
                    />
                  </div>
                  
                  {/* Custom Greeting */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Custom Greeting
                    </label>
                    <Input
                      value={settings.customText.greeting || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        customText: { ...settings.customText, greeting: e.target.value },
                      })}
                      placeholder="Hi! How can I help you today?"
                    />
                  </div>
                  
                  {/* Input Placeholder */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Input Placeholder
                    </label>
                    <Input
                      value={settings.customText.inputPlaceholder || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        customText: { ...settings.customText, inputPlaceholder: e.target.value },
                      })}
                      placeholder="Type a message..."
                    />
                  </div>
                  
                  {/* Z-Index */}
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Z-Index
                    </label>
                    <Input
                      type="number"
                      value={settings.zIndex}
                      onChange={(e) => setSettings({
                        ...settings,
                        zIndex: parseInt(e.target.value) || 999999,
                      })}
                      min={1}
                      max={2147483647}
                    />
                    <p className="text-xs text-textMuted mt-1">
                      Higher values appear above other elements on the page
                    </p>
                  </div>
                </Card>
              )}
              
              {/* Security Tab */}
              {activeTab === 'security' && (
                <Card className="p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-textMain">Domain Allowlist</h3>
                    <p className="text-sm text-textMuted">
                      Restrict which domains can use this widget (leave empty to allow all)
                    </p>
                  </div>
                  
                  {/* Add Domain */}
                  <div className="flex gap-3">
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="example.com or *.example.com"
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                    />
                    <Button onClick={addDomain} variant="outline">
                      <Plus size={16} />
                      Add
                    </Button>
                  </div>
                  
                  {/* Domain List */}
                  {settings.allowedDomains.length > 0 ? (
                    <div className="space-y-2">
                      {settings.allowedDomains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Globe size={16} className="text-textMuted" />
                            <span className="text-sm font-mono text-textMain">{domain}</span>
                          </div>
                          <button
                            onClick={() => removeDomain(domain)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-textMuted hover:text-red-400 transition-colors"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-white/10 rounded-xl text-center text-textMuted text-sm">
                      No domains added. Widget will work on any domain.
                    </div>
                  )}
                  
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-sm text-amber-400">
                      <strong>Tip:</strong> Use <code className="px-1 py-0.5 bg-black/30 rounded">*.example.com</code> to allow all subdomains of a domain.
                    </p>
                  </div>
                </Card>
              )}
            </div>
            
            {/* Preview Panel */}
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-textMain">Preview</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={previewInNewTab}
                  >
                    <ArrowSquareOut size={16} />
                    Open Preview
                  </Button>
                </div>
                
                {/* Mini preview */}
                <div 
                  className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden"
                  style={{ 
                    height: previewOpen ? '400px' : '200px',
                    transition: 'height 0.3s ease',
                  }}
                >
                  {/* Simulated widget preview */}
                  <div 
                    className="absolute"
                    style={{
                      [settings.position.includes('bottom') ? 'bottom' : 'top']: '12px',
                      [settings.position.includes('right') ? 'right' : 'left']: '12px',
                    }}
                  >
                    {previewOpen && (
                      <div 
                        className="mb-3 rounded-2xl shadow-2xl overflow-hidden"
                        style={{
                          width: settings.size === 'small' ? '200px' : settings.size === 'large' ? '280px' : '240px',
                          height: settings.size === 'small' ? '280px' : settings.size === 'large' ? '380px' : '320px',
                          background: settings.theme === 'light' ? '#ffffff' : '#0f172a',
                          border: `1px solid ${settings.theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {/* Header */}
                        <div 
                          className="p-3 border-b flex items-center gap-2"
                          style={{
                            borderColor: settings.theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ 
                              background: `linear-gradient(135deg, ${settings.colors.primary || '#0ea5e9'}, ${settings.colors.primary || '#0ea5e9'}cc)` 
                            }}
                          >
                            <Robot size={16} weight="fill" className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-xs font-semibold truncate"
                              style={{ color: settings.theme === 'light' ? '#0f172a' : '#f8fafc' }}
                            >
                              {assistant?.name || 'AI Assistant'}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <span 
                                className="text-[10px]"
                                style={{ color: settings.theme === 'light' ? '#64748b' : '#94a3b8' }}
                              >
                                Online
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Content placeholder */}
                        <div className="flex-1 p-3">
                          <div 
                            className="text-xs text-center py-4"
                            style={{ color: settings.theme === 'light' ? '#64748b' : '#94a3b8' }}
                          >
                            {settings.customText.greeting || 'Hi! How can I help you today?'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Launcher button */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                      style={{
                        background: `linear-gradient(135deg, ${settings.colors.primary || '#0ea5e9'}, ${settings.colors.primary || '#0ea5e9'}cc)`,
                        marginLeft: settings.position.includes('right') ? 'auto' : undefined,
                      }}
                    >
                      <ChatCircle size={24} weight="fill" className="text-white" />
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* Quick Links */}
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-textMain text-sm">Quick Links</h3>
                <a
                  href="https://docs.voicory.com/widget"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ArrowSquareOut size={14} />
                  Widget Documentation
                </a>
                <a
                  href={`/assistants/${assistantId}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Robot size={14} />
                  Edit Assistant
                </a>
                <a
                  href="/api-keys"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Code size={14} />
                  API Keys
                </a>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
