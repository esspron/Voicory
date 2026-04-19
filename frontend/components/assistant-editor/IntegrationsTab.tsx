import React, { useState, useEffect } from 'react';
import {
  Plugs,
  Globe,
  Plus,
  Trash,
  CaretDown,
  CaretRight,
  Code,
  X,
  Eye,
  EyeSlash,
  ArrowSquareOut,
  Info,
  Broadcast,
  Database,
  TestTube,
  CircleNotch,
  Warning,
} from '@phosphor-icons/react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Badge } from '../ui/Badge';
import { Label } from '../ui/Label';
import { Tooltip } from '../ui/Tooltip';
import { useClipboard } from '../../hooks';
import type {
  AssistantIntegrations,
  CustomHTTPRequest,
  HTTPMethod,
  HTTPAuthType,
  HTTPTrigger,
  LiveKitConfig,
  AssistantCRMConfig,
} from '../../types/integrations';
import {
  HTTP_REQUEST_TEMPLATES,
  HTTP_TEMPLATE_VARIABLES,
} from '../../types/integrations';
import { getIntegrations } from '../../services/crmService';
import type { CRMIntegration } from '../../types/crm';

// ============================================
// PROPS
// ============================================

interface IntegrationsTabProps {
  integrations: AssistantIntegrations;
  onIntegrationsChange: (integrations: AssistantIntegrations) => void;
  assistantId?: string | null;
}

// ============================================
// SUBCOMPONENTS
// ============================================

// Section Header with expand/collapse
interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  description,
  isExpanded,
  onToggle,
  badge,
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors rounded-xl"
  >
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
        <Icon size={22} weight="duotone" className="text-primary" />
      </div>
      <div className="text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-textMain">{title}</h3>
          {badge}
        </div>
        <p className="text-sm text-textMuted">{description}</p>
      </div>
    </div>
    {isExpanded ? (
      <CaretDown size={20} className="text-textMuted" />
    ) : (
      <CaretRight size={20} className="text-textMuted" />
    )}
  </button>
);

// HTTP Request Editor
interface HTTPRequestEditorProps {
  request: CustomHTTPRequest;
  onUpdate: (request: CustomHTTPRequest) => void;
  onDelete: () => void;
  onTest?: () => void;
}

const HTTPRequestEditor: React.FC<HTTPRequestEditorProps> = ({
  request,
  onUpdate,
  onDelete,
  onTest,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const { copy, copied: _copied } = useClipboard(2000);

  const HTTP_METHODS: HTTPMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const AUTH_TYPES: { value: HTTPAuthType; label: string }[] = [
    { value: 'none', label: 'No Auth' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'api_key', label: 'API Key' },
    { value: 'basic', label: 'Basic Auth' },
    { value: 'custom_header', label: 'Custom Header' },
  ];
  const TRIGGERS: { value: HTTPTrigger; label: string; description: string }[] = [
    { value: 'call_started', label: 'Call Started', description: 'When a call begins' },
    { value: 'call_ended', label: 'Call Ended', description: 'When a call ends' },
    { value: 'appointment_booked', label: 'Appointment Booked', description: 'When AI books an appointment' },
    { value: 'transfer_requested', label: 'Transfer Requested', description: 'When transfer to human is requested' },
    { value: 'lead_qualified', label: 'Lead Qualified', description: 'When lead score exceeds threshold' },
    { value: 'custom_trigger', label: 'Custom Trigger', description: 'Triggered by specific phrase in call' },
  ];

  const methodColors: Record<HTTPMethod, string> = {
    GET: 'text-emerald-400 bg-emerald-500/10',
    POST: 'text-blue-400 bg-blue-500/10',
    PUT: 'text-amber-400 bg-amber-500/10',
    PATCH: 'text-purple-400 bg-purple-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
  };

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-surface/50 cursor-pointer hover:bg-surface/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 text-xs font-mono font-bold rounded ${methodColors[request.method]}`}>
            {request.method}
          </span>
          <div>
            <p className="text-sm font-medium text-textMain">{request.name || 'Untitled Request'}</p>
            <p className="text-xs text-textMuted truncate max-w-[300px]">{request.url || 'No URL set'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle
            checked={request.isEnabled}
            onChange={(checked) => onUpdate({ ...request, isEnabled: checked })}
            size="sm"
          />
          <Badge variant={request.isEnabled ? 'success' : 'default'} size="sm">
            {request.isEnabled ? 'Active' : 'Disabled'}
          </Badge>
          {isExpanded ? <CaretDown size={16} /> : <CaretRight size={16} />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-white/5 space-y-4">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={request.name}
                onChange={(e) => onUpdate({ ...request, name: e.target.value })}
                placeholder="e.g., Slack Notification"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={request.description || ''}
                onChange={(e) => onUpdate({ ...request, description: e.target.value })}
                placeholder="What does this request do?"
              />
            </div>
          </div>

          {/* URL & Method */}
          <div className="flex gap-2">
            <div className="w-28">
              <Label>Method</Label>
              <select
                value={request.method}
                onChange={(e) => onUpdate({ ...request, method: e.target.value as HTTPMethod })}
                className="w-full h-10 px-3 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label>URL</Label>
              <Input
                value={request.url}
                onChange={(e) => onUpdate({ ...request, url: e.target.value })}
                placeholder="https://api.example.com/webhook"
              />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <Label>Trigger Event</Label>
            <select
              value={request.trigger}
              onChange={(e) => onUpdate({ ...request, trigger: e.target.value as HTTPTrigger })}
              className="w-full h-10 px-3 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
            >
              {TRIGGERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label} - {t.description}</option>
              ))}
            </select>
            {request.trigger === 'custom_trigger' && (
              <div className="mt-2">
                <Input
                  value={request.customTriggerPhrase || ''}
                  onChange={(e) => onUpdate({ ...request, customTriggerPhrase: e.target.value })}
                  placeholder="Trigger phrase (e.g., 'send to slack')"
                />
              </div>
            )}
          </div>

          {/* Authentication */}
          <div>
            <Label>Authentication</Label>
            <select
              value={request.auth.type}
              onChange={(e) => onUpdate({ ...request, auth: { ...request.auth, type: e.target.value as HTTPAuthType } })}
              className="w-full h-10 px-3 bg-surface border border-white/10 rounded-lg text-textMain text-sm mb-2"
            >
              {AUTH_TYPES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            {request.auth.type === 'bearer' && (
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={request.auth.bearerToken || ''}
                  onChange={(e) => onUpdate({ ...request, auth: { ...request.auth, bearerToken: e.target.value } })}
                  placeholder="Bearer token"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
                >
                  {showSecret ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
            {request.auth.type === 'api_key' && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={request.auth.apiKeyHeader || ''}
                  onChange={(e) => onUpdate({ ...request, auth: { ...request.auth, apiKeyHeader: e.target.value } })}
                  placeholder="Header name (e.g., X-API-Key)"
                />
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={request.auth.apiKeyValue || ''}
                    onChange={(e) => onUpdate({ ...request, auth: { ...request.auth, apiKeyValue: e.target.value } })}
                    placeholder="API Key value"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
                  >
                    {showSecret ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            {request.auth.type === 'basic' && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={request.auth.username || ''}
                  onChange={(e) => onUpdate({ ...request, auth: { ...request.auth, username: e.target.value } })}
                  placeholder="Username"
                />
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={request.auth.password || ''}
                    onChange={(e) => onUpdate({ ...request, auth: { ...request.auth, password: e.target.value } })}
                    placeholder="Password"
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain"
                  >
                    {showSecret ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Request Body (for POST/PUT/PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(request.method) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Request Body (JSON)</Label>
                <Tooltip content="Use {{variable_name}} for dynamic values">
                  <Info size={14} className="text-textMuted" />
                </Tooltip>
              </div>
              <Textarea
                value={request.bodyTemplate || ''}
                onChange={(e) => onUpdate({ ...request, bodyTemplate: e.target.value })}
                placeholder={`{\n  "message": "Call from {{customer_name}}",\n  "phone": "{{phone_number}}"\n}`}
                className="font-mono text-sm"
                rows={6}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {HTTP_TEMPLATE_VARIABLES.slice(0, 6).map((v) => (
                  <button
                    key={v.name}
                    onClick={() => copy(`{{${v.name}}}`)}
                    className="px-2 py-1 bg-white/5 text-textMuted text-xs rounded hover:bg-white/10 hover:text-primary transition-colors"
                    title={v.description}
                  >
                    {`{{${v.name}}}`}
                  </button>
                ))}
                <span className="px-2 py-1 text-textMuted text-xs">+ more</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300">
              <Trash size={14} />
              Delete
            </Button>
            <div className="flex gap-2">
              {onTest && (
                <Button variant="outline" size="sm" onClick={onTest}>
                  <TestTube size={14} />
                  Test Request
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  integrations,
  onIntegrationsChange,
  assistantId: _assistantId,
}) => {
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    http: true,
    livekit: false,
    crm: false,
  });

  // CRM integrations from user's account
  const [userCRMIntegrations, setUserCRMIntegrations] = useState<CRMIntegration[]>([]);
  const [loadingCRM, setLoadingCRM] = useState(false);

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Load user's CRM integrations
  useEffect(() => {
    const loadCRMIntegrations = async () => {
      setLoadingCRM(true);
      try {
        const data = await getIntegrations();
        setUserCRMIntegrations(data);
      } catch (error) {
        console.error('Failed to load CRM integrations:', error);
      } finally {
        setLoadingCRM(false);
      }
    };
    loadCRMIntegrations();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // HTTP Request handlers
  const addHTTPRequest = (template?: Partial<CustomHTTPRequest>) => {
    const newRequest: CustomHTTPRequest = {
      id: `http_${Date.now()}`,
      name: template?.name || 'New HTTP Request',
      description: template?.description,
      url: template?.url || '',
      method: template?.method || 'POST',
      auth: template?.auth || { type: 'none' },
      bodyTemplate: template?.bodyTemplate,
      contentType: template?.contentType || 'application/json',
      trigger: 'call_ended',
      isEnabled: true,
    };
    onIntegrationsChange({
      ...integrations,
      httpRequests: [...integrations.httpRequests, newRequest],
    });
    setShowTemplateModal(false);
  };

  const updateHTTPRequest = (index: number, request: CustomHTTPRequest) => {
    const updated = [...integrations.httpRequests];
    updated[index] = request;
    onIntegrationsChange({ ...integrations, httpRequests: updated });
  };

  const deleteHTTPRequest = (index: number) => {
    const updated = integrations.httpRequests.filter((_, i) => i !== index);
    onIntegrationsChange({ ...integrations, httpRequests: updated });
  };

  // LiveKit handlers
  const updateLiveKit = (config: Partial<LiveKitConfig>) => {
    onIntegrationsChange({
      ...integrations,
      livekit: { ...integrations['livekit']!, ...config },
    });
  };

  // CRM handlers
  const updateCRM = (config: Partial<AssistantCRMConfig>) => {
    onIntegrationsChange({
      ...integrations,
      crm: { ...integrations['crm'], ...config },
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-textMain flex items-center gap-2">
              <Plugs size={24} weight="duotone" className="text-primary" />
              Integrations
            </h2>
            <p className="text-sm text-textMuted mt-1">
              Connect external services, CRMs, and configure real-time communication.
            </p>
          </div>
        </div>

        {/* Custom HTTP Requests Section */}
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
          <SectionHeader
            icon={Globe}
            title="Custom HTTP Requests"
            description="Make authenticated API calls during or after calls"
            isExpanded={expandedSections['http'] ?? false}
            onToggle={() => toggleSection('http')}
            badge={
              integrations.httpRequests.length > 0 ? (
                <Badge variant="default" size="sm">
                  {integrations.httpRequests.length} configured
                </Badge>
              ) : null
            }
          />
          {expandedSections['http'] && (
            <div className="p-4 border-t border-white/5 space-y-4">
              {/* Add Button */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
                  <Plus size={16} />
                  Add HTTP Request
                </Button>
                <Button variant="ghost" onClick={() => addHTTPRequest()}>
                  <Code size={16} />
                  Blank Request
                </Button>
              </div>

              {/* Existing Requests */}
              {integrations.httpRequests.length === 0 ? (
                <div className="text-center py-8 text-textMuted">
                  <Globe size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No HTTP requests configured</p>
                  <p className="text-sm">Add a request to call external APIs during calls</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {integrations.httpRequests.map((request, index) => (
                    <HTTPRequestEditor
                      key={request.id}
                      request={request}
                      onUpdate={(updated) => updateHTTPRequest(index, updated)}
                      onDelete={() => deleteHTTPRequest(index)}
                    />
                  ))}
                </div>
              )}

              {/* Available Variables Info */}
              <div className="bg-surface/50 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={16} className="text-primary" />
                  <span className="text-sm font-medium text-textMain">Available Variables</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {HTTP_TEMPLATE_VARIABLES.map((v) => (
                    <div key={v.name} className="text-xs">
                      <code className="text-primary">{`{{${v.name}}}`}</code>
                      <span className="text-textMuted ml-1">- {v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LiveKit Section */}
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
          <SectionHeader
            icon={Broadcast}
            title="LiveKit Integration"
            description="Real-time audio/video communication and recording"
            isExpanded={expandedSections['livekit'] ?? false}
            onToggle={() => toggleSection('livekit')}
            badge={
              integrations['livekit']?.isEnabled ? (
                <Badge variant="success" size="sm">Enabled</Badge>
              ) : null
            }
          />
          {expandedSections['livekit'] && (
            <div className="p-4 border-t border-white/5 space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-textMain">Enable LiveKit</p>
                  <p className="text-xs text-textMuted">Use LiveKit for real-time voice communication</p>
                </div>
                <Toggle
                  checked={integrations['livekit']?.isEnabled || false}
                  onChange={(checked) => updateLiveKit({ isEnabled: checked })}
                />
              </div>

              {integrations['livekit']?.isEnabled && (
                <>
                  {/* Server Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>LiveKit Server URL</Label>
                      <Input
                        value={integrations['livekit']?.serverUrl || ''}
                        onChange={(e) => updateLiveKit({ serverUrl: e.target.value })}
                        placeholder="wss://your-livekit-server.com"
                      />
                    </div>
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={integrations['livekit']?.apiKey || ''}
                        onChange={(e) => updateLiveKit({ apiKey: e.target.value })}
                        placeholder="API Key"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>API Secret</Label>
                    <Input
                      type="password"
                      value={integrations['livekit']?.apiSecret || ''}
                      onChange={(e) => updateLiveKit({ apiSecret: e.target.value })}
                      placeholder="API Secret"
                    />
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'audioEnabled', label: 'Audio' },
                      { key: 'videoEnabled', label: 'Video' },
                      { key: 'screenShareEnabled', label: 'Screen Share' },
                      { key: 'recordCalls', label: 'Recording' },
                    ].map((feature) => (
                      <div key={feature.key} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl">
                        <span className="text-sm text-textMain">{feature.label}</span>
                        <Toggle
                          checked={(integrations['livekit'] as Record<string, boolean>)?.[feature.key] || false}
                          onChange={(checked) => updateLiveKit({ [feature.key]: checked })}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Transcription */}
                  <div className="flex items-center justify-between p-4 bg-surface/50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-textMain">Live Transcription</p>
                      <p className="text-xs text-textMuted">Stream transcripts to webhook in real-time</p>
                    </div>
                    <Toggle
                      checked={integrations['livekit']?.transcriptionEnabled || false}
                      onChange={(checked) => updateLiveKit({ transcriptionEnabled: checked })}
                    />
                  </div>

                  {integrations['livekit']?.transcriptionEnabled && (
                    <div>
                      <Label>Transcript Webhook URL</Label>
                      <Input
                        value={integrations['livekit']?.liveTranscriptUrl || ''}
                        onChange={(e) => updateLiveKit({ liveTranscriptUrl: e.target.value })}
                        placeholder="https://your-server.com/transcript-webhook"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* CRM Section */}
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
          <SectionHeader
            icon={Database}
            title="CRM Integration"
            description="Sync calls and contacts with your CRM"
            isExpanded={expandedSections['crm'] ?? false}
            onToggle={() => toggleSection('crm')}
            badge={
              integrations['crm']?.integrationId ? (
                <Badge variant="success" size="sm">Connected</Badge>
              ) : null
            }
          />
          {expandedSections['crm'] && (
            <div className="p-4 border-t border-white/5 space-y-4">
              {loadingCRM ? (
                <div className="text-center py-8">
                  <CircleNotch size={24} className="animate-spin mx-auto text-primary" />
                  <p className="text-sm text-textMuted mt-2">Loading CRM integrations...</p>
                </div>
              ) : userCRMIntegrations.length === 0 ? (
                <div className="text-center py-8">
                  <Warning size={40} className="mx-auto mb-3 text-amber-400 opacity-50" />
                  <p className="text-textMain mb-2">No CRM integrations found</p>
                  <p className="text-sm text-textMuted mb-4">
                    Connect a CRM in Settings → Integrations first
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open('/settings/integrations', '_blank')}
                  >
                    <ArrowSquareOut size={16} />
                    Go to Integrations
                  </Button>
                </div>
              ) : (
                <>
                  {/* Select CRM */}
                  <div>
                    <Label>Select CRM Integration</Label>
                    <select
                      value={integrations['crm']?.integrationId || ''}
                      onChange={(e) => updateCRM({ integrationId: e.target.value || undefined })}
                      className="w-full h-10 px-3 bg-surface border border-white/10 rounded-lg text-textMain text-sm"
                    >
                      <option value="">None</option>
                      {userCRMIntegrations.map((crm) => (
                        <option key={crm.id} value={crm.id}>
                          {crm.providerName} {crm.isConnected ? '✓' : '(Not Connected)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {integrations['crm']?.integrationId && (
                    <>
                      {/* Sync Options */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'syncCalls', label: 'Sync Calls', desc: 'Log calls to CRM' },
                          { key: 'syncContacts', label: 'Sync Contacts', desc: 'Create/update contacts' },
                          { key: 'syncNotes', label: 'Sync Notes', desc: 'Add call notes' },
                          { key: 'autoCreateContacts', label: 'Auto Create', desc: 'Create new contacts' },
                        ].map((opt) => (
                          <div key={opt.key} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl">
                            <div>
                              <p className="text-sm text-textMain">{opt.label}</p>
                              <p className="text-xs text-textMuted">{opt.desc}</p>
                            </div>
                            <Toggle
                              checked={(integrations['crm'] as Record<string, boolean>)?.[opt.key] ?? true}
                              onChange={(checked) => updateCRM({ [opt.key]: checked })}
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Post-call Task */}
                      <div className="flex items-center justify-between p-4 bg-surface/50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-textMain">Create Task After Call</p>
                          <p className="text-xs text-textMuted">Auto-create a follow-up task in CRM</p>
                        </div>
                        <Toggle
                          checked={integrations['crm']?.createTaskOnEnd || false}
                          onChange={(checked) => updateCRM({ createTaskOnEnd: checked })}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-semibold text-textMain">Choose a Template</h3>
                  <p className="text-sm text-textMuted">Start with a pre-built template or create blank</p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-white/5 rounded-lg"
                >
                  <X size={20} className="text-textMuted" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {HTTP_REQUEST_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addHTTPRequest(template.template)}
                    className="p-4 bg-surface/50 border border-white/5 rounded-xl text-left hover:border-primary/30 hover:bg-surface transition-all"
                  >
                    <p className="text-sm font-medium text-textMain mb-1">{template.name}</p>
                    <p className="text-xs text-textMuted">{template.description}</p>
                    <Badge variant="default" size="sm" className="mt-2">
                      {template.category}
                    </Badge>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-white/5 flex justify-end">
                <Button variant="ghost" onClick={() => setShowTemplateModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationsTab;
