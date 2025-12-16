import { GithubLogo, Gift, Check, X, CircleNotch } from '@phosphor-icons/react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import AuthLayout from '../components/AuthLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import {
  storeReferralCode,
  getStoredReferralCode,
  processReferralSignup,
  validateReferralCode,
  MINIMUM_REFERRAL_PURCHASE
} from '../services/referralService';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const DiscordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" fill="#5865F2" />
  </svg>
);

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Referral state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Handle referral code from URL or localStorage
  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    const storedRef = getStoredReferralCode();

    const codeToUse = refFromUrl || storedRef;

    if (codeToUse) {
      setReferralCode(codeToUse.toUpperCase());
      // Store it if it came from URL
      if (refFromUrl) {
        storeReferralCode(refFromUrl);
      }
      // Validate the code
      validateCode(codeToUse);
    }
  }, [searchParams]);

  const validateCode = async (code: string) => {
    setReferralChecking(true);
    const result = await validateReferralCode(code);
    setReferralValid(result.valid);
    setReferralChecking(false);
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'discord') => {
    setError('');
    setOauthLoading(provider);
    try {
      const { error } = await AuthService.signInWithOAuth(provider);
      if (error) {
        setError(error.message || `Failed to sign up with ${provider}`);
      }
      // Note: On success, Supabase redirects to the OAuth provider
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message || 'Failed to create account. Please try again.');
      } else {
        setSuccess(true);

        // Process referral if we have a valid code
        if (referralCode && referralValid) {
          // Small delay to ensure the user is created in auth
          setTimeout(async () => {
            await processReferralSignup(referralCode);
          }, 1000);
        }

        // Supabase may require email confirmation, so we show a success message
        setTimeout(() => navigate('/check-email'), 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-surface/50 border border-border rounded-2xl p-8 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-textMain mb-2">Create your account</h2>
        <p className="text-textMuted text-sm mb-6">
          Enter and email and create a password, getting started is easy!
        </p>

        {/* Referral Banner */}
        {referralCode && (
          <div className={`mb-6 p-4 rounded-xl border ${referralChecking
              ? 'bg-surface border-border'
              : referralValid
                ? 'bg-primary/10 border-primary/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${referralChecking
                  ? 'bg-surface'
                  : referralValid
                    ? 'bg-primary/20'
                    : 'bg-red-500/20'
                }`}>
                {referralChecking ? (
                  <CircleNotch size={20} weight="bold" className="animate-spin text-textMuted" />
                ) : referralValid ? (
                  <Gift size={20} className="text-primary" />
                ) : (
                  <X size={20} className="text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${referralChecking
                    ? 'text-textMuted'
                    : referralValid
                      ? 'text-primary'
                      : 'text-red-400'
                  }`}>
                  {referralChecking
                    ? 'Validating referral code...'
                    : referralValid
                      ? '🎉 Referral code applied!'
                      : 'Invalid referral code'}
                </p>
                {referralValid && !referralChecking && (
                  <p className="text-xs text-textMuted mt-0.5">
                    Top up ${MINIMUM_REFERRAL_PURCHASE}+ and you'll both get $1 credits!
                  </p>
                )}
              </div>
              {referralValid && !referralChecking && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-md">
                  <Check size={14} className="text-primary" />
                  <span className="text-xs font-mono text-primary">{referralCode}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Button 
            type="button"
            variant="glass" 
            className="gap-2"
            onClick={() => handleOAuthSignIn('google')}
            disabled={oauthLoading !== null}
          >
            {oauthLoading === 'google' ? (
              <CircleNotch size={20} className="animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span className="text-sm font-medium">Google</span>
          </Button>
          <Button 
            type="button"
            variant="glass" 
            className="gap-2"
            onClick={() => handleOAuthSignIn('github')}
            disabled={oauthLoading !== null}
          >
            {oauthLoading === 'github' ? (
              <CircleNotch size={20} className="animate-spin" />
            ) : (
              <GithubLogo size={20} weight="fill" />
            )}
            <span className="text-sm font-medium">GitHub</span>
          </Button>
          <Button 
            type="button"
            variant="glass" 
            className="gap-2"
            onClick={() => handleOAuthSignIn('discord')}
            disabled={oauthLoading !== null}
          >
            {oauthLoading === 'discord' ? (
              <CircleNotch size={20} className="animate-spin" />
            ) : (
              <DiscordIcon />
            )}
            <span className="text-sm font-medium">Discord</span>
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-textMuted">OR SIGN UP WITH</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            Account created successfully! Redirecting to dashboard...
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Your password (min. 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <Button variant="ghost" size="sm">
            Sign in with SSO
          </Button>

          <div className="text-sm text-textMuted">
            Already have an account? <Link to="/login" className="text-textMain hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Signup;
