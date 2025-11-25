import React, { useEffect, useState } from 'react';
import { Copy, Info, Moon, Sun, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/callyyService';
import { UserProfile } from '../../types';

const OrgSettings: React.FC = () => {
    const { user } = useAuth();
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    
    // Form state
    const [organizationName, setOrganizationName] = useState('');
    const [organizationEmail, setOrganizationEmail] = useState('');
    const [channel, setChannel] = useState('daily');
    const [callConcurrencyLimit, setCallConcurrencyLimit] = useState(10);

    useEffect(() => {
        if (document.documentElement.classList.contains('dark')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }, []);
    
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userProfile = await getUserProfile();
                if (userProfile) {
                    setProfile(userProfile);
                    setOrganizationName(userProfile.organizationName);
                    setOrganizationEmail(userProfile.organizationEmail);
                    setChannel(userProfile.channel);
                    setCallConcurrencyLimit(userProfile.callConcurrencyLimit);
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

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };
    
    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(field);
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };
    
    const handleSave = async () => {
        setSaving(true);
        try {
            const success = await updateUserProfile({
                organizationName,
                organizationEmail,
                channel,
                callConcurrencyLimit
            });
            
            if (success) {
                // Refresh profile
                const updatedProfile = await getUserProfile();
                if (updatedProfile) {
                    setProfile(updatedProfile);
                }
            }
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setSaving(false);
        }
    };
    
    const hasChanges = profile && (
        organizationName !== profile.organizationName ||
        organizationEmail !== profile.organizationEmail ||
        channel !== profile.channel ||
        callConcurrencyLimit !== profile.callConcurrencyLimit
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-textMain mb-2">Organization Settings</h1>
                <p className="text-textMuted">Your organization's server and security details.</p>
            </div>

            <div className="space-y-6">
                {/* Theme Toggle */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">Theme</label>
                    <button 
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-textMain hover:bg-surfaceHover transition-colors"
                    >
                        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="capitalize">{theme} Mode</span>
                    </button>
                </div>

                {/* Organization Name */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">Organization Name</label>
                    <input 
                        type="text" 
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary"
                    />
                </div>

                {/* Organization Email */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">Organization Email</label>
                    <input 
                        type="email" 
                        value={organizationEmail}
                        onChange={(e) => setOrganizationEmail(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary"
                    />
                </div>

                {/* Organization ID (User ID - Read Only) */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">Organization ID</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            readOnly
                            value={user?.id || ''}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-textMuted outline-none pr-10 cursor-not-allowed"
                        />
                        <button 
                            onClick={() => handleCopy(user?.id || '', 'orgId')}
                            className="absolute right-3 top-2.5 text-textMuted hover:text-textMain"
                        >
                            {copied === 'orgId' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Wallet ID (Unique per user - Read Only) */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2">Wallet ID</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            readOnly
                            value={profile?.walletId || ''}
                            className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-textMuted outline-none pr-10 cursor-not-allowed"
                        />
                        <button 
                            onClick={() => handleCopy(profile?.walletId || '', 'walletId')}
                            className="absolute right-3 top-2.5 text-textMuted hover:text-textMain"
                        >
                            {copied === 'walletId' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                    </div>
                    <p className="text-xs text-textMuted mt-1">Unique wallet identifier for your account</p>
                </div>

                {/* Channel */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2 flex items-center gap-2">
                        Channel
                        <Info size={14} className="text-yellow-500" />
                    </label>
                    <select 
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary appearance-none"
                    >
                        <option value="daily">daily</option>
                        <option value="weekly">weekly</option>
                        <option value="monthly">monthly</option>
                    </select>
                </div>

                {/* Call Concurrency Limit */}
                <div>
                    <label className="block text-sm font-medium text-textMuted mb-2 flex items-center gap-2">
                        Call Concurrency Limit
                        <Info size={14} className="text-yellow-500" />
                    </label>
                    <input 
                        type="number" 
                        value={callConcurrencyLimit}
                        onChange={(e) => setCallConcurrencyLimit(parseInt(e.target.value) || 10)}
                        min={1}
                        max={100}
                        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary"
                    />
                </div>
                
                {/* Plan & Credits Info */}
                <div className="bg-surface border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-textMain mb-1">Current Plan</h3>
                            <p className="text-lg font-semibold text-primary">{profile?.planType || 'PAYG'}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-sm font-medium text-textMain mb-1">Credits Balance</h3>
                            <p className="text-lg font-semibold text-textMain">₹ {profile?.creditsBalance?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>
                </div>

                {/* HIPAA Enabled */}
                <div className="bg-surface border border-border rounded-lg p-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-textMain mb-1">HIPAA Enabled</h3>
                        <p className="text-sm text-textMuted italic">
                            {profile?.hipaaEnabled 
                                ? 'HIPAA compliance is enabled for your organization'
                                : 'Purchase the HIPAA add-on for your organization to enable Zero Data Retention'
                            }
                        </p>
                    </div>
                    <button className="bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        {profile?.hipaaEnabled ? 'Manage' : 'Purchase Add-on'}
                    </button>
                </div>
                
                {/* Save Button */}
                {hasChanges && (
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrgSettings;
