/**
 * CRM Configuration Modal
 * 
 * Unified modal for configuring CRM integrations.
 * Handles both Follow Up Boss (API Key) and LionDesk (OAuth) authentication.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CircleNotch,
  Check,
  Warning,
  Key,
  ShieldCheck,
  ArrowSquareOut,
  Phone,
  Users,
  Note,
  UserPlus,
  Gear,
  Plugs,
  Lightning,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import {
  createIntegration,
  updateIntegration,
  testConnection,
  testCredentials,
  deleteIntegration,
  getLionDeskAuthUrl,
  getProviderInfo,
  type CRMIntegration,
  type CRMProvider,
  type CRMConnectionTestResult,
} from '@/services/crmService';
import { logger } from '@/lib/logger';

interface CRMConfigModalProps {
  isOpen: boolean;
  provider: CRMProvider;
  existingIntegration?: CRMIntegration;
  onClose: () => void;
  onSuccess: (integration: CRMIntegration) => void;
  onDelete?: () => void;
}

type ModalStep = 'credentials' | 'settings' | 'testing' | 'success';

const CRMConfigModal: React.FC<CRMConfigModalProps> = ({
  isOpen,
  provider,
  existingIntegration,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const providerInfo = getProviderInfo(provider);
  const isEditing = !!existingIntegration;
  const isOAuth = providerInfo?.authType === 'oauth';

  // Step management
  const [step, setStep] = useState<ModalStep>('credentials');

  // Form state
  const [apiKey, setApiKey] = useState(existingIntegration?.apiKey || '');
  // accessToken is primarily set via OAuth flow, but kept for manual entry if needed
  const [accessToken] = useState(existingIntegration?.accessToken || '');

  // Settings
  const [syncCalls, setSyncCalls] = useState(existingIntegration?.syncCalls ?? true);
  const [syncContacts, setSyncContacts] = useState(existingIntegration?.syncContacts ?? true);
  const [syncNotes, setSyncNotes] = useState(existingIntegration?.syncNotes ?? true);
  const [autoCreateContacts, setAutoCreateContacts] = useState(existingIntegration?.autoCreateContacts ?? true);
  const [isEnabled, setIsEnabled] = useState(existingIntegration?.isEnabled ?? true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<CRMConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(isEditing ? 'settings' : 'credentials');
      setError(null);
      setTestResult(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, isEditing]);

  // Handle OAuth flow for LionDesk
  const handleOAuthConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const authUrl = await getLionDeskAuthUrl();
      // Open in new window
      window.open(authUrl, '_blank', 'width=600,height=700');
      // User will be redirected back after authorization
      // The callback will handle creating the integration
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start OAuth flow';
      setError(msg);
      logger.error('OAuth start failed', { context: { error: err } });
    } finally {
      setLoading(false);
    }
  };

  // Test credentials before saving
  const handleTestCredentials = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await testCredentials(provider, { apiKey, accessToken });
      setTestResult(result);

      if (result.success) {
        // Move to settings step on success
        setTimeout(() => setStep('settings'), 1000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setError(msg);
      setTestResult({ success: false, error: msg, provider, message: msg });
    } finally {
      setLoading(false);
    }
  };

  // Save integration
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      let integration: CRMIntegration;

      if (isEditing && existingIntegration) {
        integration = await updateIntegration(existingIntegration.id, {
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          syncCalls,
          syncContacts,
          syncNotes,
          autoCreateContacts,
          isEnabled,
        });
      } else {
        const result = await createIntegration({
          provider,
          apiKey: apiKey || undefined,
          accessToken: accessToken || undefined,
          syncCalls,
          syncContacts,
          syncNotes,
          autoCreateContacts,
        });
        integration = result.integration;
      }

      setStep('success');
      setTimeout(() => {
        onSuccess(integration);
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save integration';
      setError(msg);
      logger.error('Failed to save CRM integration', { context: { error: err, provider } });
    } finally {
      setLoading(false);
    }
  };

  // Delete integration
  const handleDelete = async () => {
    if (!existingIntegration) return;

    setLoading(true);
    try {
      await deleteIntegration(existingIntegration.id);
      onDelete?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete integration';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Test existing connection
  const handleTestConnection = async () => {
    if (!existingIntegration) return;

    setLoading(true);
    setError(null);
    try {
      const result = await testConnection(existingIntegration.id);
      setTestResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Plugs size={20} weight="bold" className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-textMain">
                {isEditing ? 'Configure' : 'Connect'} {providerInfo?.name}
              </h2>
              <p className="text-sm text-textMuted">
                {isEditing ? 'Update your integration settings' : 'Set up your CRM integration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} className="text-textMuted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <Warning size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Check size={32} weight="bold" className="text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-textMain mb-2">
                {isEditing ? 'Settings Updated!' : 'Integration Connected!'}
              </h3>
              <p className="text-textMuted">
                {providerInfo?.name} is now {isEditing ? 'updated' : 'connected'} and ready to use.
              </p>
            </div>
          )}

          {/* Credentials Step */}
          {step === 'credentials' && (
            <>
              {isOAuth ? (
                // OAuth flow for LionDesk
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <ShieldCheck size={32} weight="bold" className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-textMain mb-2">
                    Connect with {providerInfo?.name}
                  </h3>
                  <p className="text-textMuted mb-6">
                    Click below to securely authorize access to your {providerInfo?.name} account.
                  </p>
                  <Button
                    onClick={handleOAuthConnect}
                    loading={loading}
                    className="w-full"
                  >
                    <Lightning size={18} weight="bold" />
                    Connect {providerInfo?.name}
                  </Button>
                  <p className="text-xs text-textMuted mt-4">
                    You'll be redirected to {providerInfo?.name} to authorize access.
                  </p>
                </div>
              ) : (
                // API Key flow for Follow Up Boss
                <>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      API Key
                    </label>
                    <div className="relative">
                      <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Follow Up Boss API key"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-textMuted mt-2">
                      Find your API key in Follow Up Boss under Admin → API.
                      <a
                        href="https://app.followupboss.com/2/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
                      >
                        Get API Key <ArrowSquareOut size={12} />
                      </a>
                    </p>
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl ${
                      testResult.success 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      {testResult.success ? (
                        <Check size={20} className="text-green-400 flex-shrink-0" />
                      ) : (
                        <Warning size={20} className="text-red-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                          {testResult.success ? 'Connection successful!' : testResult.error}
                        </p>
                        {testResult.accountInfo && (
                          <p className="text-xs text-textMuted mt-1">
                            Account: {testResult.accountInfo.name || testResult.accountInfo.email}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Settings Step */}
          {step === 'settings' && (
            <>
              {/* Sync Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-textMain">Sync Options</h4>
                
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-textMuted" />
                    <div>
                      <p className="text-sm text-textMain">Sync Calls</p>
                      <p className="text-xs text-textMuted">Push call logs after each call</p>
                    </div>
                  </div>
                  <Toggle checked={syncCalls} onChange={setSyncCalls} />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/5 opacity-60">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-textMuted" />
                    <div>
                      <p className="text-sm text-textMain flex items-center gap-2">
                        Sync Contacts
                        <Badge variant="secondary" size="sm">Coming Soon</Badge>
                      </p>
                      <p className="text-xs text-textMuted">Keep contacts in sync</p>
                    </div>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/5 opacity-60">
                  <div className="flex items-center gap-3">
                    <Note size={18} className="text-textMuted" />
                    <div>
                      <p className="text-sm text-textMain flex items-center gap-2">
                        Sync Notes
                        <Badge variant="secondary" size="sm">Coming Soon</Badge>
                      </p>
                      <p className="text-xs text-textMuted">Add call notes and transcripts</p>
                    </div>
                  </div>
                  <Toggle checked={false} onChange={() => {}} disabled />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <UserPlus size={18} className="text-textMuted" />
                    <div>
                      <p className="text-sm text-textMain">Auto-Create Contacts</p>
                      <p className="text-xs text-textMuted">Create new contacts if not found</p>
                    </div>
                  </div>
                  <Toggle checked={autoCreateContacts} onChange={setAutoCreateContacts} />
                </div>

                {isEditing && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Gear size={18} className="text-textMuted" />
                      <div>
                        <p className="text-sm text-textMain">Integration Enabled</p>
                        <p className="text-xs text-textMuted">Turn off to pause syncing</p>
                      </div>
                    </div>
                    <Toggle checked={isEnabled} onChange={setIsEnabled} />
                  </div>
                )}
              </div>

              {/* Connection Status for Editing */}
              {isEditing && existingIntegration && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-textMain">Connection Status</span>
                    <Badge variant={existingIntegration.isConnected ? 'success' : 'error'}>
                      {existingIntegration.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  {existingIntegration.lastSyncAt && (
                    <p className="text-xs text-textMuted">
                      Last synced: {new Date(existingIntegration.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                  {existingIntegration.lastError && (
                    <p className="text-xs text-red-400 mt-1">
                      Error: {existingIntegration.lastError}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTestConnection}
                    loading={loading}
                    className="mt-3"
                  >
                    Test Connection
                  </Button>
                </div>
              )}

              {/* Test Result */}
              {testResult && step === 'settings' && (
                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                  testResult.success 
                    ? 'bg-green-500/10 border border-green-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {testResult.success ? (
                    <Check size={20} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <Warning size={20} className="text-red-400 flex-shrink-0" />
                  )}
                  <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.success ? 'Connection successful!' : testResult.error}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
            {/* Delete button (only when editing) */}
            {isEditing && !showDeleteConfirm ? (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            ) : showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-textMuted">Are you sure?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  loading={loading}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  Yes, disconnect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div /> // Empty div for spacing
            )}

            <div className="flex items-center gap-3">
              {step === 'credentials' && !isOAuth && (
                <>
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTestCredentials}
                    loading={loading}
                    disabled={!apiKey.trim()}
                  >
                    {loading ? <CircleNotch size={18} className="animate-spin" /> : null}
                    Test & Continue
                  </Button>
                </>
              )}

              {step === 'settings' && (
                <>
                  {!isEditing && (
                    <Button variant="ghost" onClick={() => setStep('credentials')}>
                      Back
                    </Button>
                  )}
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} loading={loading}>
                    {loading ? <CircleNotch size={18} className="animate-spin" /> : null}
                    {isEditing ? 'Save Changes' : 'Connect'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CRMConfigModal;
