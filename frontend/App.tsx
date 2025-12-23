import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import { AuthProvider } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import ApiKeys from './pages/ApiKeys';
import Assistants from './pages/Assistants';
import CallLogs from './pages/CallLogs';
import Customers from './pages/Customers';
import KnowledgeBase from './pages/KnowledgeBase';
import Overview from './pages/Overview';
import VoiceLibrary from './pages/VoiceLibrary';
import PhoneNumbers from './pages/PhoneNumbers';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CheckEmail from './pages/CheckEmail';
import SettingsLayout from './pages/Settings/SettingsLayout';
import OrgSettings from './pages/Settings/OrgSettings';
import BillingAndAddons from './pages/Settings/BillingAndAddons';
import Members from './pages/Settings/Members';
import Integrations from './pages/Settings/Integrations';
import ReferralProgram from './pages/Settings/ReferralProgram';
import Compliance from './pages/Settings/Compliance';
import DialerSettings from './pages/Settings/DialerSettings';
import WhatsAppMessenger from './pages/messenger/WhatsAppMessenger';
import WidgetConfig from './pages/WidgetConfig';

// Placeholder components for unimplemented routes
const Metrics = () => <div className="p-8 text-textMain">Detailed Metrics Content</div>;

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isCollapsed } = useSidebar();
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
                <main className="flex-1 overflow-y-auto bg-background h-screen">
                    {children}
                </main>
            </div>
        </div>
    );
};

// Special layout for Editor which might need full screen height or different topbar
const EditorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isCollapsed } = useSidebar();
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className={`flex-1 flex flex-col h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
                {/* Editor has its own internal topbar, so we don't render the global Topbar here if we want full control, 
                OR we wrap content nicely. The AssistantEditor component includes its own header. */}
                {children}
            </div>
        </div>
    );
};

import ProtectedRoute from './components/ProtectedRoute';
import { CommandPalette } from './components/CommandPalette';
import Campaigns from './pages/Campaigns';
import CampaignEditor from './pages/CampaignEditor';
import CampaignDashboard from './pages/CampaignDashboard';

const AppRoutes: React.FC = () => {
    return (
        <>
            <CommandPalette />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/check-email" element={<CheckEmail />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Layout><Overview /></Layout>} />
                    <Route path="/voice-library" element={<Layout><VoiceLibrary /></Layout>} />
                    <Route path="/assistants" element={<EditorLayout><Assistants /></EditorLayout>} />
                    <Route path="/assistants/:id" element={<EditorLayout><Assistants /></EditorLayout>} />
                    <Route path="/assistants/:assistantId/widget" element={<Layout><WidgetConfig /></Layout>} />
                    <Route path="/knowledge-base" element={<Layout><KnowledgeBase /></Layout>} />
                    <Route path="/phone-numbers" element={<Layout><PhoneNumbers /></Layout>} />
                    <Route path="/customers" element={<Layout><Customers /></Layout>} />
                    <Route path="/api-keys" element={<Layout><ApiKeys /></Layout>} />
                    <Route path="/logs" element={<Layout><CallLogs /></Layout>} />
                    <Route path="/metrics" element={<Layout><Metrics /></Layout>} />

                    {/* Campaign Routes */}
                    <Route path="/campaigns" element={<Layout><Campaigns /></Layout>} />
                    <Route path="/campaigns/new" element={<Layout><CampaignEditor /></Layout>} />
                    <Route path="/campaigns/:id" element={<Layout><CampaignDashboard /></Layout>} />
                    <Route path="/campaigns/:id/edit" element={<Layout><CampaignEditor /></Layout>} />

                    {/* Messenger Routes */}
                    <Route path="/messenger/whatsapp" element={<Layout><WhatsAppMessenger /></Layout>} />

                    <Route path="/settings" element={<Layout><SettingsLayout /></Layout>}>
                        <Route index element={<Navigate to="org" replace />} />
                        <Route path="org" element={<OrgSettings />} />
                        <Route path="billing" element={<BillingAndAddons />} />
                        <Route path="dialer" element={<DialerSettings />} />
                        <Route path="members" element={<Members />} />
                        <Route path="integrations" element={<Integrations />} />
                        <Route path="referral" element={<ReferralProgram />} />
                        <Route path="compliance" element={<Compliance />} />
                    </Route>
                    <Route path="/billing" element={<Navigate to="/settings/billing" replace />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

const App: React.FC = () => {
    return (
        <AuthProvider>
            <CurrencyProvider>
                <SidebarProvider>
                    <Router>
                        <AppRoutes />
                    </Router>
                </SidebarProvider>
            </CurrencyProvider>
        </AuthProvider>
    );
};

export default App;
