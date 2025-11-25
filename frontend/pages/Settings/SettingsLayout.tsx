import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Settings, CreditCard, Users, Key, Gift } from 'lucide-react';

const SettingsLayout: React.FC = () => {
    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isActive
            ? 'bg-surfaceHover text-textMain'
            : 'text-textMuted hover:text-textMain hover:bg-surfaceHover'
        }`;

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Settings Sidebar */}
            <aside className="w-64 border-r border-border bg-background p-4 flex flex-col flex-shrink-0">
                <div className="mb-6 px-3">
                    <h2 className="text-xl font-semibold text-textMain flex items-center gap-2">
                        <Settings size={20} />
                        Settings
                    </h2>
                </div>

                <div className="flex-1 mb-6 px-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ORG SETTINGS</h3>
                    <nav className="space-y-1">
                        <NavLink to="/settings/org" className={navClass}>
                            <Settings size={18} />
                            Org Settings
                        </NavLink>
                        <NavLink to="/settings/billing" className={navClass}>
                            <CreditCard size={18} />
                            Billing & Add-Ons
                        </NavLink>
                        <NavLink to="/settings/members" className={navClass}>
                            <Users size={18} />
                            Members
                        </NavLink>
                        <NavLink to="/settings/integrations" className={navClass}>
                            <Key size={18} />
                            Integrations
                        </NavLink>
                        <NavLink to="/settings/referral" className={navClass}>
                            <Gift size={18} />
                            Referral Program
                        </NavLink>
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-background p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default SettingsLayout;
