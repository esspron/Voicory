import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
    House,
    Users,
    Ticket,
    ChartLine,
    ChartLineUp,
    Gauge,
    Robot,
    SpeakerHigh,
    Brain,
    CurrencyDollar,
    UsersThree,
    WhatsappLogo,
    Phone,
    FileText,
    Gear,
    SignOut,
    ShieldCheck,
    Sparkle
} from '@phosphor-icons/react';
import VoicoryLogo from '../components/VoicoryLogo';

interface AdminDashboardProps {
    onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const navSections = [
        {
            title: 'Overview',
            items: [
                { to: '/', icon: House, label: 'Dashboard', end: true },
            ],
        },
        {
            title: 'Users & Revenue',
            items: [
                { to: '/users', icon: Users, label: 'Users' },
                { to: '/coupons', icon: Ticket, label: 'Coupons' },
                { to: '/revenue', icon: ChartLine, label: 'Revenue' },
                { to: '/pnl', icon: ChartLineUp, label: 'P&L Analytics' },
                { to: '/usage', icon: Gauge, label: 'Usage Analytics' },
                { to: '/referrals', icon: UsersThree, label: 'Referrals' },
            ],
        },
        {
            title: 'Platform',
            items: [
                { to: '/assistants', icon: Robot, label: 'Assistants' },
                { to: '/voices', icon: SpeakerHigh, label: 'Voice Library' },
                { to: '/llm-pricing', icon: Brain, label: 'LLM Pricing' },
                { to: '/service-pricing', icon: CurrencyDollar, label: 'Service Pricing' },
            ],
        },
        {
            title: 'Channels',
            items: [
                { to: '/whatsapp', icon: WhatsappLogo, label: 'WhatsApp' },
                { to: '/phone-numbers', icon: Phone, label: 'Phone Numbers' },
            ],
        },
        {
            title: 'System',
            items: [
                { to: '/logs', icon: FileText, label: 'System Logs' },
                { to: '/settings', icon: Gear, label: 'Settings' },
            ],
        },
    ];

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/[0.06] bg-surface/50 backdrop-blur-xl flex flex-col flex-shrink-0 relative overflow-y-auto">
                {/* Ambient glow */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative p-6 border-b border-white/5 sticky top-0 bg-surface/80 backdrop-blur-xl z-10">
                    <div>
                        <VoicoryLogo size="sm" />
                        <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                            <ShieldCheck size={12} weight="fill" />
                            Admin Panel
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-4 space-y-6">
                    {navSections.map((section) => (
                        <div key={section.title}>
                            <div className="flex items-center gap-2 px-3 mb-2">
                                <Sparkle size={10} weight="fill" className="text-primary/60" />
                                <h3 className="text-[10px] font-semibold text-textMuted/60 uppercase tracking-widest">
                                    {section.title}
                                </h3>
                            </div>

                            <nav className="space-y-0.5">
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.end}
                                        className={({ isActive }) =>
                                            `group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${isActive
                                                ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-textMain border border-primary/20 shadow-lg shadow-primary/5'
                                                : 'text-textMuted hover:text-textMain hover:bg-white/[0.03] border border-transparent'
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <item.icon
                                                    size={18}
                                                    weight={isActive ? "fill" : "regular"}
                                                    className={isActive ? 'text-primary' : 'text-textMuted group-hover:text-textMain'}
                                                />
                                                <span className="text-sm font-medium">{item.label}</span>
                                                {isActive && (
                                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                    ))}
                </div>

                {/* Logout */}
                <div className="p-4 border-t border-white/5 sticky bottom-0 bg-surface/80 backdrop-blur-xl">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-textMuted hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                    >
                        <SignOut size={18} weight="bold" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>

                    {/* Security Badge */}
                    <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-[10px] text-amber-400 font-medium">🔒 LOCAL ACCESS ONLY</p>
                        <p className="text-[10px] text-textMuted">Not deployed to production</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
