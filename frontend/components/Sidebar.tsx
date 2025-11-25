
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Bot,
    Phone,
    Mic2,
    Key,
    BarChart3,
    Settings,
    BookOpen,
    Book,
    CreditCard,
    Users,
    LogOut,
    PanelLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { getUserProfile } from '../services/callyyService';
import { UserProfile } from '../types';
import CallyyLogo from './CallyyLogo';

const Sidebar: React.FC = () => {
    const { signOut, user } = useAuth();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    
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
        const parts = email.split('@')[0].split(/[._-]/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return email.substring(0, 2).toUpperCase();
    };

    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive
            ? 'bg-primary/10 text-primary'
            : 'text-textMuted hover:text-textMain hover:bg-surfaceHover'
        } ${isCollapsed ? 'justify-center px-2' : ''}`;

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300`}>
            {/* Logo Area */}
            <div className={`h-16 flex items-center border-b border-border ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
                {!isCollapsed && <CallyyLogo size="md" />}
                <button 
                    onClick={toggleSidebar} 
                    className="text-textMuted hover:text-textMain p-1 rounded-md hover:bg-surfaceHover transition-colors"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <PanelLeft size={20} />
                </button>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-6">

                {/* Build Group */}
                <div>
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Build</h3>}
                    <nav className="space-y-1">
                        <NavLink to="/" className={navClass} title={isCollapsed ? "Overview" : ""}>
                            <LayoutDashboard size={18} />
                            {!isCollapsed && "Overview"}
                        </NavLink>
                        <NavLink to="/assistants" className={navClass} title={isCollapsed ? "Assistants" : ""}>
                            <Bot size={18} />
                            {!isCollapsed && "Assistants"}
                        </NavLink>
                        <NavLink to="/knowledge-base" className={navClass} title={isCollapsed ? "Knowledge Base" : ""}>
                            <Book size={18} />
                            {!isCollapsed && "Knowledge Base"}
                        </NavLink>
                        <NavLink to="/phone-numbers" className={navClass} title={isCollapsed ? "Phone Numbers" : ""}>
                            <Phone size={18} />
                            {!isCollapsed && "Phone Numbers"}
                        </NavLink>
                        <NavLink to="/customers" className={navClass} title={isCollapsed ? "Customers" : ""}>
                            <Users size={18} />
                            {!isCollapsed && "Customers"}
                        </NavLink>
                        <NavLink to="/voice-library" className={navClass} title={isCollapsed ? "Voice Library" : ""}>
                            <Mic2 size={18} />
                            {!isCollapsed && "Voice Library"}
                        </NavLink>
                        <NavLink to="/api-keys" className={navClass} title={isCollapsed ? "API Keys" : ""}>
                            <Key size={18} />
                            {!isCollapsed && "API Keys"}
                        </NavLink>
                    </nav>
                </div>

                {/* Observe Group */}
                <div>
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Observe</h3>}
                    <nav className="space-y-1">
                        <NavLink to="/logs" className={navClass} title={isCollapsed ? "Call Logs" : ""}>
                            <BookOpen size={18} />
                            {!isCollapsed && "Call Logs"}
                        </NavLink>
                        <NavLink to="/metrics" className={navClass} title={isCollapsed ? "Metrics" : ""}>
                            <BarChart3 size={18} />
                            {!isCollapsed && "Metrics"}
                        </NavLink>
                    </nav>
                </div>

                {/* Manage Group */}
                <div>
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manage</h3>}
                    <nav className="space-y-1">
                        <NavLink to="/settings/billing" className={navClass} title={isCollapsed ? "Billing & Add-ons" : ""}>
                            <CreditCard size={18} />
                            {!isCollapsed && "Billing & Add-ons"}
                        </NavLink>
                    </nav>
                </div>
            </div>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-border">
                <NavLink to="/settings/org" className={`flex items-center gap-3 w-full p-2 rounded-md hover:bg-surfaceHover transition-colors text-left group ${isCollapsed ? 'justify-center' : ''}`} title={isCollapsed ? "Settings" : ""}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {getUserInitials(user?.email)}
                    </div>
                    {!isCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-textMain truncate">{user?.email || 'User'}</p>
                                <p className="text-xs text-textMuted truncate">{profile?.organizationName || 'Loading...'}</p>
                            </div>
                            <Settings size={16} className="text-textMuted group-hover:text-textMain" />
                        </>
                    )}
                </NavLink>

                <button
                    onClick={() => signOut()}
                    className={`flex items-center gap-3 w-full p-2 rounded-md hover:bg-surfaceHover transition-colors text-left group text-textMuted hover:text-red-400 mt-1 ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Logout" : ""}
                >
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <LogOut size={18} />
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Logout</p>
                        </div>
                    )}
                </button>
            </div>
        </aside >
    );
};

export default Sidebar;
