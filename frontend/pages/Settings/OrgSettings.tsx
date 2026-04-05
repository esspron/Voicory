import { Copy, Info, Check, Globe, CircleNotch, Buildings, Envelope, IdentificationCard, Wallet, Hash, Phone, ShieldCheck, CurrencyDollar, Sparkle, UploadSimple, Image, X, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import Select, { type SelectOption } from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile, uploadOrgLogo } from '../../services/voicoryService';
import { UserProfile } from '../../types';

// Simple formatAmount function (USD only)
const formatAmount = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
};

// ─── Toast ─────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';
interface ToastState { message: string; type: ToastType }

const ToastBanner: React.FC<ToastState & { onClose: () => void }> = ({ message, type, onClose }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all
        ${type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-300' : 'bg-red-900/80 border-red-500/30 text-red-300'}`}>
        {type === 'success' ? <CheckCircle size={18} weight="fill" /> : <WarningCircle size={18} weight="fill" />}
        {message}
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
);

const channelOptions: SelectOption[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
];

const countryOptions: SelectOption[] = [
    { value: 'US', label: '🇺🇸 United States' },
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'GB', label: '🇬🇧 United Kingdom' },
    { value: 'AU', label: '🇦🇺 Australia' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'SG', label: '🇸🇬 Singapore' },
    { value: 'AE', label: '🇦🇪 UAE' },
    { value: 'OTHER', label: '🌍 Other' },
];

const OrgSettings: React.FC = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastState | null>(null);

    // Logo upload state
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [organizationName, setOrganizationName] = useState('');
    const [organizationEmail, setOrganizationEmail] = useState('');
    const [channel, setChannel] = useState<SelectOption>(channelOptions[0]);
    const [callConcurrencyLimit, setCallConcurrencyLimit] = useState(10);
    const [selectedCountry, setSelectedCountry] = useState<SelectOption>(countryOptions[0]);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userProfile = await getUserProfile();
                if (userProfile) {
                    setProfile(userProfile);
                    setOrganizationName(userProfile.organizationName);
                    setOrganizationEmail(userProfile.organizationEmail);
                    setChannel(channelOptions.find(o => o.value === userProfile.channel) || channelOptions[0]);
                    setCallConcurrencyLimit(userProfile.callConcurrencyLimit);
                    setSelectedCountry(countryOptions.find(o => o.value === (userProfile.country || 'IN')) || countryOptions[0]);
                    if (userProfile.logoUrl) setLogoPreview(userProfile.logoUrl);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchProfile();
        }
    }, [user]);

    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(field);
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    // ── Logo file selection ──────────────────────────────────────────────────
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleLogoUpload = async () => {
        if (!logoFile) return;
        setUploadingLogo(true);
        try {
            const url = await uploadOrgLogo(logoFile);
            if (url) {
                setLogoPreview(url);
                setLogoFile(null);
                setProfile(prev => prev ? { ...prev, logoUrl: url } : prev);
                showToast('Logo uploaded successfully', 'success');
            } else {
                showToast('Logo upload failed', 'error');
            }
        } catch (err) {
            showToast('Logo upload failed', 'error');
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) logoInputRef.current.value = '';
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setLogoFile(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    // ── Save org profile fields ──────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            const success = await updateUserProfile({
                organizationName,
                organizationEmail,
                channel: channel.value,
                callConcurrencyLimit,
                country: selectedCountry.value
            });

            if (success) {
                const updatedProfile = await getUserProfile();
                if (updatedProfile) {
                    setProfile(updatedProfile);
                    if (updatedProfile.logoUrl) setLogoPreview(updatedProfile.logoUrl);
                }
                showToast('Organization profile saved', 'success');
            } else {
                showToast('Failed to save profile', 'error');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast('Failed to save profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = profile && (
        organizationName !== profile.organizationName ||
        organizationEmail !== profile.organizationEmail ||
        channel.value !== profile.channel ||
        callConcurrencyLimit !== profile.callConcurrencyLimit ||
        selectedCountry.value !== (profile.country || 'IN')
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <CircleNotch size={32} weight="bold" className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                        <Buildings size={20} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Organization Settings</h1>
                        <p className="text-sm text-textMuted">Your organization's server and security details</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* ── Logo Upload Section ──────────────────────────────────────── */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Image size={14} weight="fill" className="text-primary" />
                        <h3 className="text-sm font-semibold text-textMain">Company Logo</h3>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Preview */}
                        <div className="w-20 h-20 rounded-2xl bg-background/50 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {logoPreview ? (
                                <img src={logoPreview} alt="Company logo" className="w-full h-full object-contain" />
                            ) : (
                                <Buildings size={32} weight="duotone" className="text-textMuted/40" />
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-3">
                            <p className="text-xs text-textMuted">Upload your company logo. JPG, PNG, GIF, WebP or SVG — max 5MB.</p>

                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoSelect}
                                className="hidden"
                                id="logo-upload-input"
                            />

                            <div className="flex items-center gap-2 flex-wrap">
                                <label
                                    htmlFor="logo-upload-input"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-textMain border border-white/10 cursor-pointer transition-all"
                                >
                                    <UploadSimple size={16} />
                                    {logoFile ? 'Change File' : 'Choose File'}
                                </label>

                                {logoFile && (
                                    <>
                                        <span className="text-xs text-textMuted truncate max-w-[140px]">{logoFile.name}</span>
                                        <button
                                            onClick={handleLogoUpload}
                                            disabled={uploadingLogo}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 disabled:opacity-50 transition-all"
                                        >
                                            {uploadingLogo ? (
                                                <><CircleNotch size={16} className="animate-spin" /> Uploading...</>
                                            ) : (
                                                <><Check size={16} weight="bold" /> Upload Logo</>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="p-2 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            title="Cancel"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                )}

                                {!logoFile && logoPreview && (
                                    <button
                                        onClick={handleRemoveLogo}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
                                    >
                                        <X size={14} /> Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Info Section */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkle size={14} weight="fill" className="text-primary" />
                        <h3 className="text-sm font-semibold text-textMain">Organization Information</h3>
                    </div>

                    {/* Organization Name */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            <Buildings size={14} />
                            Organization Name
                        </label>
                        <input
                            type="text"
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Organization Email */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            <Envelope size={14} />
                            Organization Email
                        </label>
                        <input
                            type="email"
                            value={organizationEmail}
                            onChange={(e) => setOrganizationEmail(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>
                </div>

                {/* IDs Section */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <IdentificationCard size={14} weight="fill" className="text-primary" />
                        <h3 className="text-sm font-semibold text-textMain">Identifiers</h3>
                    </div>

                    {/* Organization ID */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            <Hash size={14} />
                            Organization ID
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                readOnly
                                value={user?.id || ''}
                                className="w-full bg-background/30 border border-white/5 rounded-xl px-4 py-3 text-sm text-textMuted outline-none pr-12 cursor-not-allowed font-mono"
                            />
                            <button
                                onClick={() => handleCopy(user?.id || '', 'orgId')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-textMuted hover:text-primary hover:bg-white/5 transition-all"
                            >
                                {copied === 'orgId' ? <Check size={16} weight="bold" className="text-emerald-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Wallet ID */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            <Wallet size={14} />
                            Wallet ID
                        </label>
                        <div className="relative group">
                            <input
                                type="text"
                                readOnly
                                value={profile?.walletId || ''}
                                className="w-full bg-background/30 border border-white/5 rounded-xl px-4 py-3 text-sm text-textMuted outline-none pr-12 cursor-not-allowed font-mono"
                            />
                            <button
                                onClick={() => handleCopy(profile?.walletId || '', 'walletId')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-textMuted hover:text-primary hover:bg-white/5 transition-all"
                            >
                                {copied === 'walletId' ? <Check size={16} weight="bold" className="text-emerald-400" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <p className="text-xs text-textMuted/60 mt-2">Unique wallet identifier for your account</p>
                    </div>
                </div>

                {/* Configuration Section */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkle size={14} weight="fill" className="text-primary" />
                        <h3 className="text-sm font-semibold text-textMain">Configuration</h3>
                    </div>

                    {/* Channel */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            Channel
                            <div className="group relative">
                                <Info size={14} className="text-yellow-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-textMain whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Billing channel frequency
                                </div>
                            </div>
                        </label>
                        <Select
                            value={channel}
                            onChange={setChannel}
                            options={channelOptions}
                        />
                    </div>

                    {/* Call Concurrency Limit */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            <Phone size={14} />
                            Call Concurrency Limit
                            <div className="group relative">
                                <Info size={14} className="text-yellow-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-textMain whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    Maximum concurrent calls
                                </div>
                            </div>
                        </label>
                        <input
                            type="number"
                            value={callConcurrencyLimit}
                            onChange={(e) => setCallConcurrencyLimit(parseInt(e.target.value) || 10)}
                            min={1}
                            max={100}
                            className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                    </div>

                    {/* Country / Currency */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-textMuted mb-2">
                            <Globe size={14} />
                            Country / Currency
                        </label>
                        <Select
                            value={selectedCountry}
                            onChange={setSelectedCountry}
                            options={countryOptions}
                        />
                        <p className="text-xs text-textMuted/60 mt-2">
                            Currency is $ USD for all billing displays
                        </p>
                    </div>
                </div>

                {/* Plan & Credits Card */}
                <div className="bg-gradient-to-br from-primary/10 via-surface/80 to-violet-500/5 border border-primary/20 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                                <CurrencyDollar size={28} weight="duotone" className="text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-textMuted mb-1">Current Plan</h3>
                                <p className="text-2xl font-bold text-primary">{profile?.planType || 'PAYG'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-sm font-medium text-textMuted mb-1">Credits Balance</h3>
                            <p className="text-2xl font-bold text-textMain">{formatAmount(profile?.creditsBalance || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* HIPAA Compliance Card */}
                <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${profile?.hipaaEnabled ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                                <ShieldCheck size={24} weight="duotone" className={profile?.hipaaEnabled ? 'text-emerald-400' : 'text-textMuted'} />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-textMain mb-1">HIPAA Compliance</h3>
                                <p className="text-xs text-textMuted max-w-sm">
                                    {profile?.hipaaEnabled
                                        ? 'HIPAA compliance is enabled for your organization'
                                        : 'Purchase the HIPAA add-on to enable Zero Data Retention'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => showToast(profile?.hipaaEnabled ? 'Contact support to manage HIPAA settings' : 'Contact support to purchase the HIPAA add-on', 'success')}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${profile?.hipaaEnabled
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                                }`}>
                            {profile?.hipaaEnabled ? 'Manage' : 'Purchase Add-on'}
                        </button>
                    </div>
                </div>

                {/* Save Button */}
                {hasChanges && (
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/25 text-black px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 hover:-translate-y-0.5"
                        >
                            {saving ? (
                                <>
                                    <CircleNotch size={18} weight="bold" className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={18} weight="bold" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Toast */}
            {toast && <ToastBanner {...toast} onClose={() => setToast(null)} />}
        </div>
    );
};

export default OrgSettings;
