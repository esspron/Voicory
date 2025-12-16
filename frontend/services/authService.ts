import type { User, Session, AuthError, Provider } from '@supabase/supabase-js';

import { authFetch } from '../lib/api';
import { supabase } from './supabase';

export interface AuthResponse {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
}

/**
 * Authentication Service
 * Handles user authentication using Supabase Auth
 */
export class AuthService {
    /**
     * Sign in with OAuth provider (Google, GitHub, Discord)
     */
    static async signInWithOAuth(provider: Provider): Promise<{ error: AuthError | null }> {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            });
            return { error };
        } catch (error) {
            return { error: error as AuthError };
        }
    }

    /**
     * Sign up a new user with email and password
     */
    static async signUp(email: string, password: string): Promise<AuthResponse> {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            return {
                user: data.user,
                session: data.session,
                error: error,
            };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error as AuthError,
            };
        }
    }

    /**
     * Sign in an existing user with email and password
     */
    static async signIn(email: string, password: string): Promise<AuthResponse> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            return {
                user: data.user,
                session: data.session,
                error: error,
            };
        } catch (error) {
            return {
                user: null,
                session: null,
                error: error as AuthError,
            };
        }
    }

    /**
     * Sign out the current user
     */
    static async signOut(): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.signOut();
        return { error };
    }

    /**
     * Get the current authenticated user
     */
    static async getCurrentUser(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    /**
     * Get the current session
     */
    static async getSession(): Promise<Session | null> {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    }

    /**
     * Listen to authentication state changes
     */
    static onAuthStateChange(callback: (user: User | null) => void) {
        return supabase.auth.onAuthStateChange((_event, session) => {
            callback(session?.user ?? null);
        });
    }

    /**
     * Reset password for a user
     */
    static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error };
    }

    /**
     * Update user password
     */
    static async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        return { error };
    }

    /**
     * Check if user is authenticated
     */
    static async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return session !== null;
    }

    /**
     * Redeem a coupon code
     */
    static async redeemCoupon(userId: string, couponCode: string): Promise<{
        success: boolean;
        credit_amount?: number;
        new_balance?: number;
        message?: string;
        error?: string;
    }> {
        try {
            const response = await authFetch('/api/coupons/redeem', {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    couponCode
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Redeem coupon error:', error);
            return {
                success: false,
                error: 'Failed to redeem coupon'
            };
        }
    }
}

export default AuthService;
