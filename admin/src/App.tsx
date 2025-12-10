import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PasskeyGate from './components/PasskeyGate';
import AdminDashboard from './pages/AdminDashboard';

// Pages
import DashboardHome from './pages/DashboardHome';
import UserManagerEnhanced from './pages/UserManagerEnhanced';
import CouponManager from './pages/CouponManager';
import RevenueAnalytics from './pages/RevenueAnalytics';
import UsageAnalytics from './pages/UsageAnalytics';
import AssistantManager from './pages/AssistantManager';
import VoiceLibraryAdmin from './pages/VoiceLibraryAdmin';
import LLMPricingManager from './pages/LLMPricingManager';
import ServicePricingManager from './pages/ServicePricingManager';
import ReferralManager from './pages/ReferralManager';
import WhatsAppManager from './pages/WhatsAppManager';
import PhoneNumberManager from './pages/PhoneNumberManager';
import SystemLogs from './pages/SystemLogs';
import SettingsPage from './pages/SettingsPage';
import PnLAnalytics from './pages/PnLAnalytics';

// ============== SECURITY CONFIGURATION ==============
// Admin passkey from environment variable (REQUIRED)
const ADMIN_PASSKEY = import.meta.env.VITE_ADMIN_PASSKEY;

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Maximum login attempts before lockout
const MAX_LOGIN_ATTEMPTS = 5;

// Lockout duration in milliseconds (15 minutes)
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// Timing-safe string comparison to prevent timing attacks
const timingSafeEqual = (a: string, b: string): boolean => {
    if (a.length !== b.length) {
        // Still do comparison to maintain constant time
        let result = 1;
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
            result |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
        }
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
};

// Generate secure session token
const generateSessionToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [securityError, setSecurityError] = useState<string | null>(null);

    // Check for valid session on mount and set up activity tracking
    useEffect(() => {
        // Security check: Ensure passkey is configured
        if (!ADMIN_PASSKEY) {
            setSecurityError('Admin passkey not configured. Set VITE_ADMIN_PASSKEY in .env.local');
            setIsLoading(false);
            return;
        }

        // Check for existing valid session
        const sessionToken = sessionStorage.getItem('admin_session_token');
        const sessionExpiry = sessionStorage.getItem('admin_session_expiry');
        const storedAttempts = localStorage.getItem('admin_login_attempts');
        const storedLockout = localStorage.getItem('admin_lockout_until');

        // Restore login attempt state
        if (storedAttempts) setLoginAttempts(parseInt(storedAttempts, 10));
        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout, 10);
            if (Date.now() < lockoutTime) {
                setLockoutUntil(lockoutTime);
            } else {
                // Lockout expired, clear it
                localStorage.removeItem('admin_login_attempts');
                localStorage.removeItem('admin_lockout_until');
            }
        }

        // Validate session
        if (sessionToken && sessionExpiry) {
            const expiryTime = parseInt(sessionExpiry, 10);
            if (Date.now() < expiryTime) {
                setIsAuthenticated(true);
                // Extend session on activity
                sessionStorage.setItem('admin_session_expiry', String(Date.now() + SESSION_TIMEOUT_MS));
            } else {
                // Session expired, clean up
                handleLogout();
            }
        }
        setIsLoading(false);
    }, []);

    // Session timeout checker - runs every minute
    useEffect(() => {
        if (!isAuthenticated) return;

        const checkSession = () => {
            const sessionExpiry = sessionStorage.getItem('admin_session_expiry');
            if (!sessionExpiry || Date.now() >= parseInt(sessionExpiry, 10)) {
                handleLogout();
                alert('Session expired. Please log in again.');
            }
        };

        const interval = setInterval(checkSession, 60000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Extend session on user activity
    useEffect(() => {
        if (!isAuthenticated) return;

        const extendSession = () => {
            sessionStorage.setItem('admin_session_expiry', String(Date.now() + SESSION_TIMEOUT_MS));
        };

        // Extend session on any user interaction
        window.addEventListener('click', extendSession);
        window.addEventListener('keydown', extendSession);
        window.addEventListener('scroll', extendSession);

        return () => {
            window.removeEventListener('click', extendSession);
            window.removeEventListener('keydown', extendSession);
            window.removeEventListener('scroll', extendSession);
        };
    }, [isAuthenticated]);

    const handleAuthenticate = useCallback((passkey: string): { success: boolean; error?: string } => {
        // Check if locked out
        if (lockoutUntil && Date.now() < lockoutUntil) {
            const remainingMins = Math.ceil((lockoutUntil - Date.now()) / 60000);
            return { success: false, error: `Too many failed attempts. Try again in ${remainingMins} minute(s).` };
        }

        // Use timing-safe comparison
        if (timingSafeEqual(passkey, ADMIN_PASSKEY || '')) {
            // Success - create secure session
            const token = generateSessionToken();
            sessionStorage.setItem('admin_session_token', token);
            sessionStorage.setItem('admin_session_expiry', String(Date.now() + SESSION_TIMEOUT_MS));
            
            // Clear login attempts on success
            localStorage.removeItem('admin_login_attempts');
            localStorage.removeItem('admin_lockout_until');
            setLoginAttempts(0);
            setLockoutUntil(null);
            
            setIsAuthenticated(true);
            
            // Log successful login (for audit)
            console.log('[ADMIN AUDIT] Successful login at', new Date().toISOString());
            
            return { success: true };
        }

        // Failed attempt - increment counter
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('admin_login_attempts', String(newAttempts));

        // Log failed attempt (for audit)
        console.warn('[ADMIN AUDIT] Failed login attempt', newAttempts, 'at', new Date().toISOString());

        // Check if should lockout
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockoutTime = Date.now() + LOCKOUT_DURATION_MS;
            setLockoutUntil(lockoutTime);
            localStorage.setItem('admin_lockout_until', String(lockoutTime));
            return { success: false, error: `Too many failed attempts. Locked out for 15 minutes.` };
        }

        return { success: false, error: `Invalid passkey. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.` };
    }, [loginAttempts, lockoutUntil]);

    const handleLogout = useCallback(() => {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_session_token');
        sessionStorage.removeItem('admin_session_expiry');
        console.log('[ADMIN AUDIT] Logout at', new Date().toISOString());
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Security error - passkey not configured
    if (securityError) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Security Configuration Error</h2>
                    <p className="text-textMuted text-sm">{securityError}</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <PasskeyGate 
                onAuthenticate={handleAuthenticate} 
                lockoutUntil={lockoutUntil}
                attemptsRemaining={MAX_LOGIN_ATTEMPTS - loginAttempts}
            />
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<AdminDashboard onLogout={handleLogout} />}>
                    <Route index element={<DashboardHome />} />
                    <Route path="users" element={<UserManagerEnhanced />} />
                    <Route path="coupons" element={<CouponManager />} />
                    <Route path="revenue" element={<RevenueAnalytics />} />
                    <Route path="pnl" element={<PnLAnalytics />} />
                    <Route path="usage" element={<UsageAnalytics />} />
                    <Route path="assistants" element={<AssistantManager />} />
                    <Route path="voices" element={<VoiceLibraryAdmin />} />
                    <Route path="llm-pricing" element={<LLMPricingManager />} />
                    <Route path="service-pricing" element={<ServicePricingManager />} />
                    <Route path="referrals" element={<ReferralManager />} />
                    <Route path="whatsapp" element={<WhatsAppManager />} />
                    <Route path="phone-numbers" element={<PhoneNumberManager />} />
                    <Route path="logs" element={<SystemLogs />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
