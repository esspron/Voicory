import React from 'react';
import { Users, Plus, Sparkle, UserPlus, Crown, EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';

const Members: React.FC = () => {
    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                        <Users size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Members</h1>
                        <p className="text-sm text-textMuted">Manage members of your organization</p>
                    </div>
                </div>
                <Button className="gap-2">
                    <UserPlus size={18} weight="bold" />
                    Invite Member
                </Button>
            </div>

            {/* Owner Card */}
            <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Crown size={16} weight="fill" className="text-yellow-500" />
                    <h3 className="text-sm font-semibold text-textMain">Organization Owner</h3>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10 text-lg font-bold text-primary">
                            Y
                        </div>
                        <div>
                            <p className="text-sm font-medium text-textMain">You</p>
                            <p className="text-xs text-textMuted">Owner</p>
                        </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        Owner
                    </span>
                </div>
            </div>

            {/* Coming Soon Card */}
            <div className="relative overflow-hidden bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-12 text-center">
                {/* Ambient background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/3 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl" />
                </div>
                
                <div className="relative">
                    {/* Floating sparkles */}
                    <Sparkle size={16} weight="fill" className="absolute -top-4 left-1/4 text-primary/40 animate-pulse" />
                    <Sparkle size={12} weight="fill" className="absolute top-8 right-1/4 text-violet-400/40 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <EnvelopeSimple size={32} weight="duotone" className="text-primary" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-textMain mb-2">Team Collaboration Coming Soon</h3>
                    <p className="text-sm text-textMuted max-w-md mx-auto mb-6">
                        Invite team members, assign roles, and collaborate on your AI voice agents. 
                        This feature is currently in development.
                    </p>
                    
                    <div className="flex items-center justify-center gap-3">
                        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-textMuted">
                            Role Management
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-textMuted">
                            Permissions
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-textMuted">
                            Activity Logs
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Members;
