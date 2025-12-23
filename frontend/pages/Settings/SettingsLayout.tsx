import { Gear, CreditCard, Sparkle, ShieldCheck, Megaphone } from '@phosphor-icons/react';
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { FadeIn } from '../../components/ui/FadeIn';

const SettingsLayout: React.FC = () => {
    const location = useLocation();
    const navItems = [
        { to: '/settings/org', icon: Gear, label: 'Org Settings' },
        { to: '/settings/billing', icon: CreditCard, label: 'Billing & Add-Ons' },
        { to: '/settings/dialer', icon: Megaphone, label: 'Dialer Settings' },
        { to: '/settings/compliance', icon: ShieldCheck, label: 'TCPA Compliance' },
    ];

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Settings Sidebar */}
            <aside className="w-72 border-r border-white/[0.06] bg-surface/50 backdrop-blur-xl flex flex-col flex-shrink-0 relative">
                {/* Ambient glow */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                <div className="relative p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10">
                            <Gear size={22} weight="duotone" className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-textMain">Settings</h2>
                            <p className="text-xs text-textMuted">Manage your organization</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 pb-4 relative">
                    {/* Section Label */}
                    <div className="flex items-center gap-2 px-3 mb-3">
                        <Sparkle size={10} weight="fill" className="text-primary/60" />
                        <h3 className="text-[10px] font-semibold text-textMuted/60 uppercase tracking-widest">Organization</h3>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
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

                {/* Bottom decoration */}
                <div className="absolute bottom-4 left-4 right-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-background relative">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 right-20 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 left-20 w-80 h-80 bg-violet-500/3 rounded-full blur-3xl" />
                </div>

                <div className="relative p-8">
                    <FadeIn key={location.pathname}>
                        <Outlet />
                    </FadeIn>
                </div>
            </main>
        </div>
    );
};

export default SettingsLayout;
