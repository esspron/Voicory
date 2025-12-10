
import { MagnifyingGlass, Bell, Question, CircleNotch, Command, Lightning, Wallet } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/voicoryService';


import { Button } from './ui/Button';

// Format USD amount
const formatUSD = (amount: number): string => `$${amount.toFixed(2)}`;

const Topbar: React.FC = () => {
    const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
    const [planType, setPlanType] = useState<string>('PAYG');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Fetch user profile for credits balance
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const profile = await getUserProfile();
                if (profile) {
                    setCreditsBalance(profile.creditsBalance);
                    setPlanType(profile.planType);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Refresh balance periodically (every 30 seconds)
    useEffect(() => {
        if (!user) return;
        
        const interval = setInterval(async () => {
            try {
                const profile = await getUserProfile();
                if (profile) {
                    setCreditsBalance(profile.creditsBalance);
                }
            } catch (error) {
                console.error('Error refreshing balance:', error);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    return (
        <header className="h-16 bg-background/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 flex items-center justify-between px-6">
            {/* Search Bar - Premium Style */}
            <div className="group relative flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 w-96 focus-within:border-primary/50 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
                <MagnifyingGlass size={18} weight="bold" className="text-textMuted/50 group-focus-within:text-primary transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search assistants, logs, or docs..." 
                    className="bg-transparent border-none outline-none text-sm text-textMain ml-3 w-full placeholder:text-textMuted/40"
                />
                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                    <Command size={12} weight="bold" className="text-textMuted/50" />
                    <span className="text-xs text-textMuted/50 font-medium">K</span>
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
                {/* Help Button */}
                <Button variant="ghost" size="icon">
                    <Question size={20} weight="bold" />
                </Button>
                
                {/* Notifications */}
                <div className="relative">
                    <Button variant="ghost" size="icon">
                        <Bell size={20} weight="bold" />
                    </Button>
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-background animate-pulse" />
                </div>

                <div className="h-8 w-px bg-white/10 mx-1" />

                {/* Credits & Plan - Premium Widget */}
                <Link 
                    to="/billing"
                    className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/10 hover:border-primary/30 hover:from-primary/5 transition-all duration-200"
                >
                    <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Wallet size={16} weight="fill" className="text-primary" />
                        </div>
                        {planType !== 'PAYG' && (
                            <Lightning size={10} weight="fill" className="absolute -top-1 -right-1 text-yellow-400" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        {loading ? (
                            <span className="text-xs text-textMuted flex items-center gap-1">
                                <CircleNotch size={12} className="animate-spin" />
                            </span>
                        ) : (
                            <>
                                <span className="text-sm font-semibold text-textMain group-hover:text-white transition-colors">
                                    {formatUSD(creditsBalance ?? 0)}
                                </span>
                                <span className="text-[10px] text-textMuted/60 uppercase tracking-wider">
                                    {planType} Credits
                                </span>
                            </>
                        )}
                    </div>
                </Link>
            </div>
        </header>
    );
};

export default Topbar;
