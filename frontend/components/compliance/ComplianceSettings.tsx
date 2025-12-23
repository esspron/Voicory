/**
 * Compliance Settings Component
 *
 * User settings for TCPA compliance configuration
 */

import { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Microphone,
  Phone,
  CheckCircle,
  Warning,
  Info,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTCPASettings, updateTCPASettings, type TCPASettings } from '@/services/tcpaService';

interface ComplianceSettingsProps {
  className?: string;
}

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

export function ComplianceSettings({ className = '' }: ComplianceSettingsProps) {
  const [settings, setSettings] = useState<TCPASettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getTCPASettings();
      setSettings(data);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = <K extends keyof TCPASettings>(key: K, value: TCPASettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateTCPASettings(settings);
      setSuccess(true);
      setHasChanges(false);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-400">
          <Warning size={20} weight="fill" />
          <span>Failed to load compliance settings</span>
        </div>
        <Button onClick={loadSettings} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Compliance Enforcement */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <ShieldCheck size={20} weight="bold" className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textMain">Compliance Enforcement</h3>
            <p className="text-sm text-textMuted">Control which TCPA rules are enforced</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
            <div>
              <p className="font-medium text-textMain">Time Restrictions</p>
              <p className="text-sm text-textMuted">Block calls outside 8am-9pm recipient local time</p>
            </div>
            <Toggle
              checked={settings.enforce_time_restrictions}
              onChange={(checked) => handleChange('enforce_time_restrictions', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
            <div>
              <p className="font-medium text-textMain">DNC List Checking</p>
              <p className="text-sm text-textMuted">Block calls to numbers on your DNC list</p>
            </div>
            <Toggle
              checked={settings.enforce_dnc_check}
              onChange={(checked) => handleChange('enforce_dnc_check', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
            <div>
              <p className="font-medium text-textMain">Require Consent</p>
              <p className="text-sm text-textMuted">Require consent record before calling</p>
            </div>
            <Toggle
              checked={settings.require_consent}
              onChange={(checked) => handleChange('require_consent', checked)}
            />
          </div>
        </div>
      </div>

      {/* Call Time Windows */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
            <Clock size={20} weight="bold" className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textMain">Default Call Windows</h3>
            <p className="text-sm text-textMuted">Set your default calling hours (state rules may override)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Start Time</Label>
            <Input
              type="time"
              value={settings.default_call_start_time}
              onChange={(e) => handleChange('default_call_start_time', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>End Time</Label>
            <Input
              type="time"
              value={settings.default_call_end_time}
              onChange={(e) => handleChange('default_call_end_time', e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Default Timezone</Label>
            <select
              value={settings.default_timezone}
              onChange={(e) => handleChange('default_timezone', e.target.value)}
              className="mt-2 w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {US_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-300">
            Federal TCPA allows calls between 8:00 AM and 9:00 PM in the recipient's local time.
            Some states have stricter rules that will automatically be applied.
          </p>
        </div>
      </div>

      {/* Recording Disclosure */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center">
            <Microphone size={20} weight="bold" className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textMain">Recording Disclosure</h3>
            <p className="text-sm text-textMuted">Configure call recording disclosure for compliance</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
            <div>
              <p className="font-medium text-textMain">Play Recording Disclosure</p>
              <p className="text-sm text-textMuted">Announce that calls may be recorded</p>
            </div>
            <Toggle
              checked={settings.play_recording_disclosure}
              onChange={(checked) => handleChange('play_recording_disclosure', checked)}
            />
          </div>

          {settings.play_recording_disclosure && (
            <div>
              <Label>Disclosure Text</Label>
              <Textarea
                value={settings.recording_disclosure_text}
                onChange={(e) => handleChange('recording_disclosure_text', e.target.value)}
                rows={2}
                className="mt-2"
                placeholder="This call may be recorded for quality and training purposes."
              />
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-start gap-2">
          <Info size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-purple-300">
            12 states require two-party consent for recording: CA, CT, FL, IL, MD, MA, MI, MT, NV, NH, PA, WA.
            The disclosure will automatically be enabled for calls to these states.
          </p>
        </div>
      </div>

      {/* Opt-Out Settings */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/10 flex items-center justify-center">
            <Phone size={20} weight="bold" className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-textMain">Opt-Out Mechanism</h3>
            <p className="text-sm text-textMuted">Allow recipients to opt out of future calls</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
            <div>
              <p className="font-medium text-textMain">Enable Opt-Out Prompt</p>
              <p className="text-sm text-textMuted">Offer option to be removed from call list</p>
            </div>
            <Toggle
              checked={settings.enable_opt_out_prompt}
              onChange={(checked) => handleChange('enable_opt_out_prompt', checked)}
            />
          </div>

          {settings.enable_opt_out_prompt && (
            <>
              <div>
                <Label>Opt-Out Phrase</Label>
                <Textarea
                  value={settings.opt_out_phrase}
                  onChange={(e) => handleChange('opt_out_phrase', e.target.value)}
                  rows={2}
                  className="mt-2"
                  placeholder="Press 9 to be removed from our call list."
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-white/5">
                <div>
                  <p className="font-medium text-textMain">Auto-Add to DNC on Opt-Out</p>
                  <p className="text-sm text-textMuted">Automatically add to DNC list when they opt out</p>
                </div>
                <Toggle
                  checked={settings.auto_dnc_on_opt_out}
                  onChange={(checked) => handleChange('auto_dnc_on_opt_out', checked)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Warning size={16} weight="fill" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle size={16} weight="fill" />
          Settings saved successfully
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="warning" size="sm">Unsaved changes</Badge>
          )}
        </div>
        <Button
          onClick={handleSave}
          loading={isSaving}
          disabled={!hasChanges}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}

export default ComplianceSettings;
