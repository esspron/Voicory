import React, { useState, useEffect } from 'react';
import {
    Lightning,
    Phone,
    Clock,
    ShieldCheck,
    CurrencyDollar,
    Plus,
    Minus,
    Spinner,
    Info,
    CheckCircle
} from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Toggle } from '../../components/ui/Toggle';
import type { UserDialerSettings } from '../../types';
import * as campaignService from '../../services/campaignService';
import { logger } from '../../lib/logger';

const COST_PER_SLOT = 10; // $10 per concurrent call slot

export default function DialerSettings() {
    const [settings, setSettings] = useState<UserDialerSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // For slot purchase
    const [slotsToAdd, setSlotsToAdd] = useState(0);
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const data = await campaignService.getDialerSettings();
            setSettings(data);
        } catch (err) {
            logger.error('Failed to load dialer settings', { error: err });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        
        setIsSaving(true);
        try {
            await campaignService.updateDialerSettings(settings);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            logger.info('Dialer settings saved');
        } catch (err) {
            logger.error('Failed to save dialer settings', { error: err });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePurchaseSlots = async () => {
        if (slotsToAdd <= 0) return;
        
        setIsPurchasing(true);
        try {
            // TODO: Integrate with Paddle billing
            // For now, just update the settings
            const newLimit = (settings?.maxConcurrentCalls || 1) + slotsToAdd;
            await campaignService.updateDialerSettings({
                ...settings!,
                maxConcurrentCalls: newLimit,
            });
            await loadSettings();
            setSlotsToAdd(0);
            logger.info('Concurrent call slots purchased', { added: slotsToAdd, newTotal: newLimit });
        } catch (err) {
            logger.error('Failed to purchase slots', { error: err });
        } finally {
            setIsPurchasing(false);
        }
    };

    const updateSettings = (updates: Partial<UserDialerSettings>) => {
        if (settings) {
            setSettings({ ...settings, ...updates });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner size={40} className="text-primary animate-spin" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-20 text-textMuted">
                Failed to load settings. Please refresh the page.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-textMain flex items-center gap-2">
                    <Lightning size={24} className="text-primary" />
                    Dialer Settings
                </h2>
                <p className="text-textMuted text-sm mt-1">
                    Configure your outbound dialer defaults and purchase concurrent call capacity
                </p>
            </div>

            {/* Success Message */}
            {showSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
                    <CheckCircle size={20} weight="fill" />
                    Settings saved successfully
                </div>
            )}

            {/* Concurrent Calls Section */}
            <section className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
                    <Phone size={20} className="text-primary" />
                    Concurrent Call Capacity
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Capacity */}
                    <div className="bg-white/5 rounded-xl p-6 text-center">
                        <p className="text-textMuted text-sm mb-2">Current Capacity</p>
                        <p className="text-4xl font-bold text-primary">{settings.maxConcurrentCalls}</p>
                        <p className="text-textMuted text-sm mt-1">simultaneous calls</p>
                    </div>
                    
                    {/* Purchase More */}
                    <div className="bg-white/5 rounded-xl p-6">
                        <p className="text-textMuted text-sm mb-4">Add More Capacity</p>
                        
                        <div className="flex items-center gap-4 mb-4">
                            <button
                                onClick={() => setSlotsToAdd(Math.max(0, slotsToAdd - 1))}
                                className="p-2 bg-surface border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Minus size={16} />
                            </button>
                            
                            <div className="flex-1 text-center">
                                <p className="text-3xl font-bold text-textMain">{slotsToAdd}</p>
                                <p className="text-xs text-textMuted">slots</p>
                            </div>
                            
                            <button
                                onClick={() => setSlotsToAdd(slotsToAdd + 1)}
                                className="p-2 bg-surface border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 p-3 bg-surface/50 rounded-lg">
                            <span className="text-textMuted">Cost:</span>
                            <span className="text-xl font-semibold text-textMain">
                                ${(slotsToAdd * COST_PER_SLOT).toFixed(2)}/mo
                            </span>
                        </div>
                        
                        <Button
                            onClick={handlePurchaseSlots}
                            disabled={slotsToAdd <= 0 || isPurchasing}
                            className="w-full gap-2"
                        >
                            {isPurchasing && <Spinner size={16} className="animate-spin" />}
                            <CurrencyDollar size={16} />
                            Add {slotsToAdd} Slot{slotsToAdd !== 1 ? 's' : ''}
                        </Button>
                    </div>
                </div>
                
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3">
                    <Info size={20} className="text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-primary">
                        <strong>How it works:</strong> Each concurrent call slot allows one additional 
                        call to happen at the same time. More slots = faster campaign completion.
                        <br />
                        <span className="opacity-75">Example: 5 slots means up to 5 leads being called simultaneously.</span>
                    </div>
                </div>
            </section>

            {/* Default Call Hours */}
            <section className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-primary" />
                    Default Call Hours
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                            id="startTime"
                            type="time"
                            value={settings.defaultCallStartTime}
                            onChange={(e) => updateSettings({ defaultCallStartTime: e.target.value })}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                            id="endTime"
                            type="time"
                            value={settings.defaultCallEndTime}
                            onChange={(e) => updateSettings({ defaultCallEndTime: e.target.value })}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <select
                            id="timezone"
                            value={settings.defaultTimezone}
                            onChange={(e) => updateSettings({ defaultTimezone: e.target.value })}
                            className="w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="Asia/Kolkata">India Standard Time (IST)</option>
                            <option value="UTC">UTC</option>
                        </select>
                    </div>
                </div>
                
                <p className="text-xs text-textMuted mt-3">
                    These defaults will be used for new campaigns. Individual campaigns can override these settings.
                </p>
            </section>

            {/* TCPA Compliance */}
            <section className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-primary" />
                    TCPA Compliance
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                            <p className="text-sm font-medium text-textMain">Enforce Calling Hours (8am-9pm)</p>
                            <p className="text-xs text-textMuted">
                                Block calls outside recipient's local 8am-9pm window
                            </p>
                        </div>
                        <Toggle
                            checked={settings.tcpaEnabled}
                            onChange={(checked) => updateSettings({ tcpaEnabled: checked })}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                            <p className="text-sm font-medium text-textMain">Check DNC Registry</p>
                            <p className="text-xs text-textMuted">
                                Automatically skip numbers on Do Not Call lists
                            </p>
                        </div>
                        <Toggle
                            checked={settings.dncCheckEnabled}
                            onChange={(checked) => updateSettings({ dncCheckEnabled: checked })}
                        />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div>
                            <p className="text-sm font-medium text-textMain">Call Recording Disclosure</p>
                            <p className="text-xs text-textMuted">
                                Play "This call may be recorded" message at start
                            </p>
                        </div>
                        <Toggle
                            checked={settings.recordingDisclosureEnabled}
                            onChange={(checked) => updateSettings({ recordingDisclosureEnabled: checked })}
                        />
                    </div>
                </div>
                
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
                    <ShieldCheck size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-400">
                        <strong>Important:</strong> TCPA violations can result in significant fines. 
                        We recommend keeping all compliance features enabled. Consult legal counsel 
                        for guidance specific to your use case.
                    </div>
                </div>
            </section>

            {/* Pacing Defaults */}
            <section className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
                    <Lightning size={20} className="text-primary" />
                    Default Pacing
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="callsPerHour">Max Calls/Hour</Label>
                        <Input
                            id="callsPerHour"
                            type="number"
                            min={1}
                            max={200}
                            value={settings.defaultMaxCallsPerHour}
                            onChange={(e) => updateSettings({ defaultMaxCallsPerHour: parseInt(e.target.value) || 50 })}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="callsPerDay">Max Calls/Day</Label>
                        <Input
                            id="callsPerDay"
                            type="number"
                            min={1}
                            max={5000}
                            value={settings.defaultMaxCallsPerDay}
                            onChange={(e) => updateSettings({ defaultMaxCallsPerDay: parseInt(e.target.value) || 500 })}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="maxAttempts">Max Attempts/Lead</Label>
                        <Input
                            id="maxAttempts"
                            type="number"
                            min={1}
                            max={10}
                            value={settings.defaultMaxAttempts}
                            onChange={(e) => updateSettings({ defaultMaxAttempts: parseInt(e.target.value) || 3 })}
                        />
                    </div>
                </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving && <Spinner size={16} className="animate-spin" />}
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
