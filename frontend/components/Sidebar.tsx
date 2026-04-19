
import {
    SquaresFour,
    Robot,
    Phone,
    Microphone,
    Key,
    Gear,
    Notebook,
    Books,
    CreditCard,
    Users,
    SignOut,
    SidebarSimple,
    WhatsappLogo,
    CaretRight,
    Sparkle,
    Megaphone
} from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { getUserProfile } from '../services/voicoryService';
import { UserProfile } from '../types';

import VoicoryLogo from './VoicoryLogo';

const Sidebar: React.FC = () => {
    const { signOut, user } = useAuth();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const location = useLocation();

    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                const userProfile = await getUserProfile();
                setProfile(userProfile);
            }
        };
        fetchProfile();
    }, [user]);

    // Get user initials from email
    const getUserInitials = (email: string | undefined) => {
        if (!email) return 'U';
        const parts = email.split('@')[0]?.split(/[._-]/) ?? [];
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium active:scale-95 ${isActive
            ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm'
            : 'text-textMuted hover:text-textMain hover:bg-white/5'
        } ${isCollapsed ? 'justify-center px-2' : ''}`;

    // Nav item with icon glow on active
    const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
        const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
        return (
            <NavLink to={to} className={navClass} title={isCollapsed ? label : ""}>
                <div className={`relative ${isActive ? 'text-primary' : ''}`}>
                    <Icon size={20} weight={isActive ? "fill" : "bold"} />
                    {isActive && (
                        <div className="absolute inset-0 blur-md bg-primary/40 -z-10" />
                    )}
                </div>
                {!isCollapsed && <span>{label}</span>}
                {!isCollapsed && isActive && (
                    <CaretRight size={14} weight="bold" className="ml-auto opacity-50" />
                )}
            </NavLink>
        );
    };

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} h-screen bg-gradient-to-b from-background via-background to-surface/30 border-r border-white/5 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300`}>
            {/* Subtle ambient glow at top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

            {/* Logo Area */}
            <div className={`h-16 flex items-center border-b border-white/5 relative ${isCollapsed ? 'justify-center' : 'justify-between px-5'}`}>
                {!isCollapsed && <VoicoryLogo size="md" />}
                <button
                    onClick={toggleSidebar}
                    className="text-textMuted hover:text-textMain p-2 rounded-lg hover:bg-white/5 transition-all duration-200 hover:scale-105"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <SidebarSimple size={20} weight="bold" className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto scrollbar-none py-4 px-3 space-y-6">

                {/* Build Group */}
                <div>
                    {!isCollapsed && (
                        <h3 className="px-3 text-[10px] font-semibold text-textMuted/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <Sparkle size={10} weight="fill" className="text-primary/50" />
                            Build
                        </h3>
                    )}
                    <nav className="space-y-1">
                        <NavItem to="/" icon={SquaresFour} label="Overview" />
                        <NavItem to="/assistants" icon={Robot} label="Assistants" />
                        <NavItem to="/knowledge-base" icon={Books} label="Knowledge Base" />
                        <NavItem to="/phone-numbers" icon={Phone} label="Phone Numbers" />
                        <NavItem to="/customers" icon={Users} label="Customers" />
                        <NavItem to="/voice-library" icon={Microphone} label="Voice Library" />
                        <NavItem to="/api-keys" icon={Key} label="API Keys" />
                    </nav>
                </div>

                {/* Messenger Group */}
                <div>
                    {!isCollapsed && (
                        <h3 className="px-3 text-[10px] font-semibold text-textMuted/50 uppercase tracking-[0.2em] mb-3">
                            Messenger
                        </h3>
                    )}
                    <nav className="space-y-1">
                        <NavItem to="/messenger/whatsapp" icon={WhatsappLogo} label="WhatsApp" />
                    </nav>
                </div>

                {/* Outbound Group */}
                <div>
                    {!isCollapsed && (
                        <h3 className="px-3 text-[10px] font-semibold text-textMuted/50 uppercase tracking-[0.2em] mb-3">
                            Outbound
                        </h3>
                    )}
                    <nav className="space-y-1">
                        <NavItem to="/campaigns" icon={Megaphone} label="Campaigns" />
                    </nav>
                </div>

                {/* Observe Group */}
                <div>
                    {!isCollapsed && (
                        <h3 className="px-3 text-[10px] font-semibold text-textMuted/50 uppercase tracking-[0.2em] mb-3">
                            Observe
                        </h3>
                    )}
                    <nav className="space-y-1">
                        <NavItem to="/logs" icon={Notebook} label="Call Logs" />
                    </nav>
                </div>

                {/* Manage Group */}
                <div>
                    {!isCollapsed && (
                        <h3 className="px-3 text-[10px] font-semibold text-textMuted/50 uppercase tracking-[0.2em] mb-3">
                            Manage
                        </h3>
                    )}
                    <nav className="space-y-1">
                        <NavItem to="/settings/billing" icon={CreditCard} label="Billing & Add-ons" />
                    </nav>
                </div>
            </div>

            {/* Footer / User Profile */}
            <div className="p-3 border-t border-white/5">
                {/* User Profile Card */}
                <NavLink
                    to="/settings/org"
                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-white/5 transition-all duration-200 text-left group active:scale-95 ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Settings" : ""}
                >
                    <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-lg shadow-purple-500/20">
                            {getUserInitials(user?.email)}
                        </div>
                        {/* Online indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-textMain truncate">{user?.email?.split('@')[0] || 'User'}</p>
                                <p className="text-[11px] text-textMuted/70 truncate">{profile?.organizationName || 'Personal'}</p>
                            </div>
                            <Gear size={16} weight="bold" className="text-textMuted/50 group-hover:text-textMain group-hover:rotate-45 transition-all duration-300" />
                        </>
                    )}
                </NavLink>

                {/* Logout Button */}
                <button
                    onClick={() => signOut()}
                    className={`flex items-center gap-3 w-full p-2.5 mt-1 rounded-xl hover:bg-red-500/10 transition-all duration-200 text-left group text-textMuted hover:text-red-400 active:scale-95 ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl group-hover:bg-red-500/10 transition-colors">
                        <SignOut size={18} weight="bold" className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-sm font-medium">Logout</span>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
