/**
 * Calendar Integration Setup Component
 * 
 * Setup wizard for connecting calendar providers.
 */

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  X,
  Calendar,
  GoogleLogo,
  CalendarBlank,
  Key,
  ArrowRight,
  CheckCircle,
  CircleNotch,
  Warning,
} from '@phosphor-icons/react';
import type { CalendarProvider, CalendarIntegrationFormData } from '@/types/appointments';
import { CALENDAR_PROVIDERS_LIST } from '@/types/appointments';
import { connectCalendar, testCalendarConnection } from '@/services/appointmentService';

interface CalendarIntegrationSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PROVIDER_DETAILS: Record<CalendarProvider, {
  name: string;
  description: string;
  icon: typeof Calendar;
  authType: 'api_key' | 'oauth';
  instructions: string[];
}> = {
  cal_com: {
    name: 'Cal.com',
    description: 'Open-source scheduling platform',
    icon: CalendarBlank,
    authType: 'api_key',
    instructions: [
      'Go to Cal.com Settings → API Keys',
      'Create a new API key',
      'Copy the API key and paste it below',
    ],
  },
  calendly: {
    name: 'Calendly',
    description: 'Popular scheduling automation',
    icon: CalendarBlank,
    authType: 'oauth',
    instructions: [
      'Click Connect below',
      'Sign in to your Calendly account',
      'Authorize access to your calendars',
    ],
  },
  google_calendar: {
    name: 'Google Calendar',
    description: 'Sync with Google Calendar',
    icon: GoogleLogo,
    authType: 'oauth',
    instructions: [
      'Click Connect below',
      'Sign in with your Google account',
      'Select calendars to sync',
    ],
  },
  follow_up_boss: {
    name: 'Follow Up Boss',
    description: 'Real estate CRM calendar',
    icon: Calendar,
    authType: 'api_key',
    instructions: [
      'Go to FUB Settings → API',
      'Copy your API key',
      'Paste the API key below',
    ],
  },
};

export function CalendarIntegrationSetup({
  isOpen,
  onClose,
  onSuccess,
}: CalendarIntegrationSetupProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'success'>('select');
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleSelectProvider = (provider: CalendarProvider) => {
    setSelectedProvider(provider);
    setStep('configure');
    setError(null);
    setApiKey('');
    setTestStatus('idle');
  };

  const handleConnect = async () => {
    if (!selectedProvider) return;

    const details = PROVIDER_DETAILS[selectedProvider];
    setError(null);
    setIsConnecting(true);

    try {
      if (details.authType === 'oauth') {
        // For OAuth, redirect to auth URL
        const authUrl = `/api/appointments/integrations/connect/${selectedProvider}`;
        window.location.href = authUrl;
        return;
      }

      // For API key auth
      if (!apiKey) {
        throw new Error('Please enter your API key');
      }

      // Test connection first
      setTestStatus('testing');
      const testResult = await testCalendarConnection(selectedProvider, { apiKey });

      if (!testResult.success) {
        setTestStatus('error');
        throw new Error(testResult.error || 'Failed to connect to calendar');
      }

      setTestStatus('success');

      // Create integration
      const input: CalendarIntegrationFormData = {
        provider: selectedProvider,
        apiKey,
        settings: {
          defaultCalendarId: 'primary',
          syncDirection: 'two_way',
          bufferBefore: 0,
          bufferAfter: 15,
        },
      };

      await connectCalendar(input);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
      setTestStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedProvider(null);
    setApiKey('');
    setError(null);
    setTestStatus('idle');
    onClose();
    if (step === 'success') {
      onSuccess?.();
    }
  };

  const details = selectedProvider ? PROVIDER_DETAILS[selectedProvider] : null;
  const Icon = details?.icon || Calendar;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-surface border border-white/10 rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                  <Dialog.Title className="text-lg font-semibold text-textMain">
                    {step === 'select' && 'Connect Calendar'}
                    {step === 'configure' && `Connect ${details?.name}`}
                    {step === 'success' && 'Connected!'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X size={20} className="text-textMuted" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Step 1: Select Provider */}
                  {step === 'select' && (
                    <div className="space-y-3">
                      <p className="text-sm text-textMuted mb-4">
                        Choose a calendar provider to connect. This will allow you to sync appointments
                        and check availability in real-time.
                      </p>

                      {CALENDAR_PROVIDERS_LIST.map((provider) => {
                        const info = PROVIDER_DETAILS[provider.id as CalendarProvider];
                        const ProviderIcon = info.icon;

                        return (
                          <button
                            key={provider.id}
                            onClick={() => handleSelectProvider(provider.id as CalendarProvider)}
                            className="w-full flex items-center gap-4 p-4 bg-background border border-white/10 rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                              <ProviderIcon size={24} weight="bold" className="text-textMain" />
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-textMain">{info.name}</h4>
                              <p className="text-sm text-textMuted">{info.description}</p>
                            </div>
                            <ArrowRight
                              size={20}
                              className="text-textMuted group-hover:text-primary transition-colors"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Step 2: Configure */}
                  {step === 'configure' && details && (
                    <div className="space-y-5">
                      {/* Provider Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Icon size={24} weight="bold" className="text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-textMain">{details.name}</h4>
                          <p className="text-sm text-textMuted">{details.description}</p>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="p-4 bg-background rounded-xl">
                        <h5 className="text-sm font-medium text-textMain mb-2">Setup Instructions</h5>
                        <ol className="space-y-2">
                          {details.instructions.map((instruction, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-textMuted">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                                {i + 1}
                              </span>
                              {instruction}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* API Key Input (for api_key auth) */}
                      {details.authType === 'api_key' && (
                        <div>
                          <label className="block text-sm font-medium text-textMuted mb-2">
                            <Key size={16} className="inline mr-1" />
                            API Key
                          </label>
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-textMain placeholder:text-textMuted focus:outline-none focus:border-primary/50"
                          />
                        </div>
                      )}

                      {/* Test Status */}
                      {testStatus !== 'idle' && (
                        <div
                          className={`p-3 rounded-xl flex items-center gap-2 ${
                            testStatus === 'testing'
                              ? 'bg-primary/10 border border-primary/30'
                              : testStatus === 'success'
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          {testStatus === 'testing' && (
                            <>
                              <CircleNotch size={18} className="animate-spin text-primary" />
                              <span className="text-sm text-primary">Testing connection...</span>
                            </>
                          )}
                          {testStatus === 'success' && (
                            <>
                              <CheckCircle size={18} weight="fill" className="text-green-400" />
                              <span className="text-sm text-green-400">Connection successful!</span>
                            </>
                          )}
                          {testStatus === 'error' && (
                            <>
                              <Warning size={18} weight="fill" className="text-red-400" />
                              <span className="text-sm text-red-400">Connection failed</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Error */}
                      {error && testStatus !== 'error' && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <p className="text-sm text-red-400">{error}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStep('select')}
                          className="flex-1 px-4 py-2.5 bg-background border border-white/10 text-textMain rounded-xl hover:bg-surfaceHover transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleConnect}
                          disabled={isConnecting || (details.authType === 'api_key' && !apiKey)}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50"
                        >
                          {isConnecting ? (
                            <CircleNotch size={20} className="animate-spin mx-auto" />
                          ) : (
                            'Connect'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Success */}
                  {step === 'success' && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle size={40} weight="fill" className="text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-textMain mb-2">
                        Calendar Connected!
                      </h3>
                      <p className="text-sm text-textMuted mb-6">
                        Your {details?.name} calendar has been connected successfully. You can now
                        sync appointments and check availability.
                      </p>
                      <button
                        onClick={handleClose}
                        className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
