/**
 * ProviderConfigModal
 * 
 * Generic modal for configuring non-CRM provider integrations.
 * Handles: save API key, test connection, copy webhook URL, disconnect.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CircleNotch,
  Check,
  Warning,
  Key,
  Copy,
  Plugs,
  LinkSimple,
  Trash,
} from '@phosphor-icons/react';

import {
  getProviderConfig,
  saveProviderConfig,
  testProviderConnection,
  disconnectProvider,
  getProviderWebhookUrl,
  type ProviderConfig,
} from '@/services/providerConfigService';

interface ProviderConfigModalProps {
  isOpen: boolean;
  providerName: string;  // display name e.g. "Make"
  providerId: string;    // slug e.g. "make"
  onClose: () => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  isOpen,
  providerName,
  providerId,
  onClose,
  onConnectionChange,
}) => {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setApiKey('');
      setApiSecret('');
      setError(null);
      setTestResult(null);
      setSaved(false);
      setShowDisconnectConfirm(false);
    }
  }, [isOpen, providerId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getProviderConfig(providerId);
      setConfig(cfg);
      if (cfg?.webhookUrl) setWebhookUrl(cfg.webhookUrl);
    } catch {
      // not an error if nothing saved yet
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await saveProviderConfig(providerId, {
        apiKey: apiKey || undefined,
        apiSecret: apiSecret || undefined,
      });
      setConfig(updated);
      setSaved(true);
      onConnectionChange?.(updated.isConnected);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await testProviderConnection(providerId);
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectProvider(providerId);
      setConfig(null);
      setWebhookUrl('');
      onConnectionChange?.(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleGetWebhookUrl = async () => {
    setLoadingWebhook(true);
    try {
      const url = await getProviderWebhookUrl(providerId);
      setWebhookUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get webhook URL');
    } finally {
      setLoadingWebhook(false);
    }
  };

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Clipboard not available — copy manually: ' + webhookUrl);
    }
  };

  if (!isOpen) return null;

  const isConnected = config?.isConnected;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Plugs size={20} weight="bold" className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-textMain">{providerName}</h2>
              <p className="text-sm text-textMuted">
                {isConnected ? '✅ Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} className="text-textMuted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {loading && !config && (
            <div className="flex justify-center py-6">
              <CircleNotch size={24} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <Warning size={18} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {testResult && (
            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              testResult.success
                ? 'bg-green-500/10 border border-green-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {testResult.success
                ? <Check size={18} className="text-green-400 flex-shrink-0" />
                : <Warning size={18} className="text-red-400 flex-shrink-0" />
              }
              <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.message}
              </p>
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">API Key</label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isConnected ? '••••••••  (leave blank to keep)' : `Enter ${providerName} API key`}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* API Secret (optional) */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              API Secret <span className="text-textMuted font-normal">(if required)</span>
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Optional"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Webhook URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="text"
                  value={webhookUrl}
                  readOnly
                  placeholder="Click 'Get URL' to generate your webhook endpoint"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-textMain placeholder:text-textMuted/50 outline-none transition-all"
                />
              </div>
              {!webhookUrl ? (
                <button
                  onClick={handleGetWebhookUrl}
                  disabled={loadingWebhook}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-textMuted hover:border-primary/50 hover:text-primary transition-all whitespace-nowrap"
                >
                  {loadingWebhook ? <CircleNotch size={16} className="animate-spin" /> : 'Get URL'}
                </button>
              ) : (
                <button
                  onClick={handleCopyWebhook}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:border-primary/50 hover:text-primary transition-all"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-textMuted" />}
                </button>
              )}
            </div>
            {copied && (
              <p className="text-xs text-green-400 mt-1">Copied to clipboard!</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
          {/* Disconnect */}
          {isConnected && !showDisconnectConfirm && (
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash size={16} />
              Disconnect
            </button>
          )}
          {showDisconnectConfirm && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-textMuted">Confirm?</span>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="text-sm text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
              >
                Yes, disconnect
              </button>
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="text-sm text-textMuted hover:text-textMain px-2 py-1 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {!isConnected && !showDisconnectConfirm && <div />}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm text-textMuted hover:border-primary/30 hover:text-primary transition-all"
              >
                {loading ? <CircleNotch size={16} className="animate-spin inline mr-1" /> : null}
                Test Connection
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-sm text-textMuted hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || (!apiKey && !apiSecret)}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? <CircleNotch size={16} className="animate-spin" /> : null}
              {saved ? (
                <><Check size={16} /> Saved!</>
              ) : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ProviderConfigModal;
