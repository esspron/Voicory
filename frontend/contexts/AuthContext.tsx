import type { User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';

import AuthService from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    isAuthenticated: boolean;
    redeemCoupon: (couponCode: string) => Promise<{ success: boolean; message?: string; error?: string; credit_amount?: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        checkUser();

        // Listen for auth changes
        const { data: authListener } = AuthService.onAuthStateChange((user) => {
            setUser(user);
            setLoading(false);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const checkUser = async () => {
        try {
            const currentUser = await AuthService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Error checking user:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { user, error } = await AuthService.signIn(email, password);
        if (!error && user) {
            setUser(user);
        }
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        const { user, error } = await AuthService.signUp(email, password);
        if (!error && user) {
            setUser(user);
            // Note: $20 signup credits are automatically added via database trigger
        }
        return { error };
    };

    const signOut = async () => {
        await AuthService.signOut();
        setUser(null);
    };

    const redeemCoupon = async (couponCode: string) => {
        if (!user) return { success: false, error: 'Not authenticated' };
        return AuthService.redeemCoupon(user.id, couponCode);
    };

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!user,
        redeemCoupon,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
