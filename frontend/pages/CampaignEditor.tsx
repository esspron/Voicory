import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    FloppyDisk,
    Trash,
    Warning,
    CaretDown,
    CheckCircle,
} from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import { DateRangePicker, DaySelector, TimeRangePicker } from '../components/campaigns';
import type { CampaignInput } from '../types';
import * as campaignService from '../services/campaignService';

const DEFAULT_FORM: CampaignInput = {
    name: '',
    description: '',
    campaignType: 'outbound_sales',
    assistantId: undefined,
    phoneNumberId: undefined,
    startDate: undefined,
    endDate: undefined,
    callDays: [1, 2, 3, 4, 5], // Mon-Fri
    callStartTime: '09:00',
    callEndTime: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    maxCallsPerHour: 30,
    maxCallsPerDay: 200,
    maxConcurrentCalls: 1,
    maxAttempts: 3,
    maxAttemptsPerLead: 3,
    retryDelayHours: 24,
    retryDelayMinutes: 60,
    ringTimeoutSeconds: 30
};

export default function CampaignEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    
    const [formData, setFormData] = useState<CampaignInput>(DEFAULT_FORM);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [assistants] = useState<{ id: string; name: string }[]>([]);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [phoneNumbers] = useState<{ id: string; number: string; label?: string }[]>([]);

    useEffect(() => {
        // Load assistants and phone numbers
        loadOptions();
        
        // Load campaign if editing
        if (id) {
            loadCampaign();
        }
    }, [id]);

    const loadOptions = async () => {
        // These would come from your existing services
        try {
            // Placeholder - you'd call your actual assistant/phone services here
            // const [assistantData, phoneData] = await Promise.all([
            //     assistantService.getAssistants(),
            //     phoneService.getPhoneNumbers()
            // ]);
            // setAssistants(assistantData);
            // setPhoneNumbers(phoneData);
        } catch (err) {
            console.error('Failed to load options:', err);
        }
    };

    const loadCampaign = async () => {
        if (!id) return;
        
        try {
            setIsLoading(true);
            const campaign = await campaignService.getCampaign(id);
            
            setFormData({
                name: campaign.name,
                description: campaign.description,
                campaignType: campaign.campaignType,
                assistantId: campaign.assistantId,
                phoneNumberId: campaign.phoneNumberId,
                startDate: campaign.startDate,
                endDate: campaign.endDate,
                callDays: campaign.callDays,
                callStartTime: campaign.callStartTime,
                callEndTime: campaign.callEndTime,
                timezone: campaign.timezone,
                maxCallsPerHour: campaign.maxCallsPerHour,
                maxCallsPerDay: campaign.maxCallsPerDay,
                maxConcurrentCalls: campaign.maxConcurrentCalls,
                maxAttempts: campaign.maxAttempts,
                maxAttemptsPerLead: campaign.maxAttemptsPerLead || campaign.maxAttempts,
                retryDelayHours: campaign.retryDelayHours,
                retryDelayMinutes: campaign.retryDelayMinutes || campaign.retryDelayHours * 60,
                ringTimeoutSeconds: campaign.ringTimeoutSeconds
            });
        } catch (err) {
            console.error('Failed to load campaign:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateFormData = (updates: Partial<CampaignInput>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            setFormError('Campaign name is required');
            return;
        }
        setFormError(null);

        try {
            setIsSaving(true);
            
            if (isEditing && id) {
                await campaignService.updateCampaign(id, formData);
            } else {
                await campaignService.createCampaign(formData);
            }
            
            navigate('/campaigns');
        } catch (err) {
            console.error('Failed to save campaign:', err);
            setFormError('Failed to save campaign. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        
        if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            setIsSaving(true);
            await campaignService.deleteCampaign(id);
            navigate('/campaigns');
        } catch (err) {
            console.error('Failed to delete campaign:', err);
            setFormError('Failed to delete campaign. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 animate-pulse space-y-6">
                <div className="h-8 w-64 bg-white/10 rounded" />
                <div className="h-64 bg-white/5 rounded-xl" />
            </div>
        );
    }

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!(e.target as Element).closest('.relative')) setOpenDropdown(null);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/campaigns')}
                            className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-semibold text-textMain">
                            {isEditing ? 'Edit Campaign' : 'Create Campaign'}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <Button type="button" variant="ghost-destructive" onClick={handleDelete}>
                                <Trash size={18} className="mr-2" />
                                Delete
                            </Button>
                        )}
                        <Button type="submit" loading={isSaving}>
                            <FloppyDisk size={18} className="mr-2" />
                            {isEditing ? 'Save Changes' : 'Create Campaign'}
                        </Button>
                    </div>
                </div>

                {/* Error Banner */}
                {formError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                        <Warning size={18} className="text-red-400 shrink-0" />
                        <p className="text-red-400 text-sm">{formError}</p>
                    </div>
                )}

                {/* Basic Info */}
                <section className="bg-white/5 rounded-xl p-6 border border-white/5 space-y-4">
                    <h2 className="text-lg font-medium text-textMain">Basic Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Campaign Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateFormData({ name: e.target.value })}
                                placeholder="e.g., Q1 Outreach Campaign"
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                required
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => updateFormData({ description: e.target.value })}
                                placeholder="Brief description of this campaign..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain placeholder:text-textMuted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Campaign Type
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpenDropdown(openDropdown === 'campaignType' ? null : 'campaignType')}
                                    className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain flex items-center justify-between hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <span>{{ outbound_sales: 'Outbound Sales', lead_qualification: 'Lead Qualification', appointment_setting: 'Appointment Setting', follow_up: 'Follow Up', survey: 'Survey' }[formData.campaignType || 'outbound_sales']}</span>
                                    <CaretDown size={14} className={`text-textMuted transition-transform ${openDropdown === 'campaignType' ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === 'campaignType' && (
                                    <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden">
                                        {[
                                            { value: 'outbound_sales', label: 'Outbound Sales' },
                                            { value: 'lead_qualification', label: 'Lead Qualification' },
                                            { value: 'appointment_setting', label: 'Appointment Setting' },
                                            { value: 'follow_up', label: 'Follow Up' },
                                            { value: 'survey', label: 'Survey' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => { updateFormData({ campaignType: opt.value as CampaignInput['campaignType'] }); setOpenDropdown(null); }}
                                                className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/5 transition-colors ${formData.campaignType === opt.value ? 'text-primary' : 'text-textMain'}`}
                                            >
                                                {opt.label}
                                                {formData.campaignType === opt.value && <CheckCircle size={14} weight="fill" className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Timezone
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpenDropdown(openDropdown === 'timezone' ? null : 'timezone')}
                                    className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain flex items-center justify-between hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <span>{{ 'America/New_York': 'Eastern Time (ET)', 'America/Chicago': 'Central Time (CT)', 'America/Denver': 'Mountain Time (MT)', 'America/Los_Angeles': 'Pacific Time (PT)', 'Asia/Kolkata': 'India (IST)', 'Asia/Dubai': 'Dubai (GST)', 'Europe/London': 'London (GMT)', 'Europe/Paris': 'Paris (CET)', 'Australia/Sydney': 'Sydney (AEST)' }[formData.timezone || 'America/New_York'] || formData.timezone}</span>
                                    <CaretDown size={14} className={`text-textMuted transition-transform ${openDropdown === 'timezone' ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === 'timezone' && (
                                    <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                        {[
                                            { value: 'America/New_York', label: 'Eastern Time (ET)' },
                                            { value: 'America/Chicago', label: 'Central Time (CT)' },
                                            { value: 'America/Denver', label: 'Mountain Time (MT)' },
                                            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                                            { value: 'Asia/Kolkata', label: 'India (IST)' },
                                            { value: 'Asia/Dubai', label: 'Dubai (GST)' },
                                            { value: 'Europe/London', label: 'London (GMT)' },
                                            { value: 'Europe/Paris', label: 'Paris (CET)' },
                                            { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => { updateFormData({ timezone: opt.value }); setOpenDropdown(null); }}
                                                className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/5 transition-colors ${formData.timezone === opt.value ? 'text-primary' : 'text-textMain'}`}
                                            >
                                                {opt.label}
                                                {formData.timezone === opt.value && <CheckCircle size={14} weight="fill" className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Voice Configuration */}
                <section className="bg-white/5 rounded-xl p-6 border border-white/5 space-y-4">
                    <h2 className="text-lg font-medium text-textMain">Voice Configuration</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Voice Assistant
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpenDropdown(openDropdown === 'assistant' ? null : 'assistant')}
                                    className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm flex items-center justify-between hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <span className={formData.assistantId ? 'text-textMain' : 'text-textMuted'}>
                                        {formData.assistantId ? assistants.find(a => a.id === formData.assistantId)?.name || 'Select an assistant...' : 'Select an assistant...'}
                                    </span>
                                    <CaretDown size={14} className={`text-textMuted transition-transform ${openDropdown === 'assistant' ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === 'assistant' && (
                                    <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                        {assistants.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-textMuted">No assistants found</div>
                                        ) : assistants.map(a => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => { updateFormData({ assistantId: a.id }); setOpenDropdown(null); }}
                                                className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/5 transition-colors ${formData.assistantId === a.id ? 'text-primary' : 'text-textMain'}`}
                                            >
                                                {a.name}
                                                {formData.assistantId === a.id && <CheckCircle size={14} weight="fill" className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Phone Number
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpenDropdown(openDropdown === 'phone' ? null : 'phone')}
                                    className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm flex items-center justify-between hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                >
                                    <span className={formData.phoneNumberId ? 'text-textMain' : 'text-textMuted'}>
                                        {formData.phoneNumberId ? (() => { const p = phoneNumbers.find(p => p.id === formData.phoneNumberId); return p ? `${p.number}${p.label ? ` (${p.label})` : ''}` : 'Select a phone number...'; })() : 'Select a phone number...'}
                                    </span>
                                    <CaretDown size={14} className={`text-textMuted transition-transform ${openDropdown === 'phone' ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === 'phone' && (
                                    <div className="absolute z-50 w-full mt-1 bg-surface border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                        {phoneNumbers.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-textMuted">No phone numbers found</div>
                                        ) : phoneNumbers.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => { updateFormData({ phoneNumberId: p.id }); setOpenDropdown(null); }}
                                                className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between hover:bg-white/5 transition-colors ${formData.phoneNumberId === p.id ? 'text-primary' : 'text-textMain'}`}
                                            >
                                                {p.number}{p.label && ` (${p.label})`}
                                                {formData.phoneNumberId === p.id && <CheckCircle size={14} weight="fill" className="text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Schedule */}
                <section className="bg-white/5 rounded-xl p-6 border border-white/5 space-y-4">
                    <h2 className="text-lg font-medium text-textMain">Schedule</h2>
                    
                    <div className="space-y-4">
                        <DateRangePicker
                            startDate={formData.startDate ? new Date(formData.startDate) : null}
                            endDate={formData.endDate ? new Date(formData.endDate) : null}
                            onStartChange={(date: Date | null) => updateFormData({ 
                                startDate: date?.toISOString().split('T')[0]
                            })}
                            onEndChange={(date: Date | null) => updateFormData({ 
                                endDate: date?.toISOString().split('T')[0] 
                            })}
                        />

                        <DaySelector
                            value={formData.callDays || [1,2,3,4,5]}
                            onChange={(days: number[]) => updateFormData({ callDays: days })}
                        />

                        <TimeRangePicker
                            startTime={formData.callStartTime || '09:00'}
                            endTime={formData.callEndTime || '17:00'}
                            onStartChange={(time: string) => updateFormData({ callStartTime: time })}
                            onEndChange={(time: string) => updateFormData({ callEndTime: time })}
                        />
                    </div>
                </section>

                {/* Pacing & Retry Settings */}
                <section className="bg-white/5 rounded-xl p-6 border border-white/5 space-y-4">
                    <h2 className="text-lg font-medium text-textMain">Pacing & Retry Settings</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Max Calls Per Hour
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={formData.maxCallsPerHour || 30}
                                onChange={(e) => updateFormData({ maxCallsPerHour: parseInt(e.target.value) || 30 })}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Max Calls Per Day
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={1000}
                                value={formData.maxCallsPerDay || 200}
                                onChange={(e) => updateFormData({ maxCallsPerDay: parseInt(e.target.value) || 200 })}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Concurrent Calls
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={formData.maxConcurrentCalls || 1}
                                onChange={(e) => updateFormData({ maxConcurrentCalls: parseInt(e.target.value) || 1 })}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Max Attempts Per Lead
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={formData.maxAttemptsPerLead || 3}
                                onChange={(e) => updateFormData({ maxAttemptsPerLead: parseInt(e.target.value) || 3 })}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Retry Delay (minutes)
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={1440}
                                value={formData.retryDelayMinutes || 60}
                                onChange={(e) => updateFormData({ retryDelayMinutes: parseInt(e.target.value) || 60 })}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-textMuted mb-1.5">
                                Ring Timeout (seconds)
                            </label>
                            <input
                                type="number"
                                min={10}
                                max={60}
                                value={formData.ringTimeoutSeconds || 30}
                                onChange={(e) => updateFormData({ ringTimeoutSeconds: parseInt(e.target.value) || 30 })}
                                className="w-full px-4 py-2.5 bg-surface/50 border border-white/10 rounded-xl text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                </section>
            </form>
        </div>
    );
}
