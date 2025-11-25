import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Mail } from 'lucide-react';

const CheckEmail: React.FC = () => {
  const testimonial = (
    <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-bold">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12C21 16.9706 16.9706 21 12 21H3V3H12C16.9706 3 21 7.02944 21 12Z" fill="black" />
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="white" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-textMain">Deepgram</div>
          <div className="text-sm text-textMuted">@DeepgramAI</div>
        </div>
      </div>
      <p className="text-textMain text-sm leading-relaxed mb-4">
        <span className="text-primary">@Cally_AI</span> thank you for making my end to end journey easier by:
      </p>
      <ul className="text-textMain text-sm leading-relaxed space-y-2 mb-4">
        <li>1. Optimizing streaming and colocating servers that shave off every possible millisecond of latency</li>
        <li>2. Customizing by allowing to connect to WebRTC stream through Web, iOS and Python clients</li>
        <li>3. Easy Scaling</li>
      </ul>
    </div>
  );

  return (
    <AuthLayout testimonial={testimonial}>
      <div className="bg-surface/50 border border-border rounded-2xl p-8 backdrop-blur-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-textMain mb-4">Check your email</h2>
        <p className="text-textMuted text-sm mb-8 leading-relaxed">
          We've sent a verification link to your email address.<br />
          Please click the link to verify your account and access the dashboard.
        </p>

        <div className="space-y-4">
          <Link 
            to="/login" 
            className="block w-full bg-primary hover:bg-primaryHover text-black font-semibold py-2.5 rounded-lg transition-colors"
          >
            Back to Sign In
          </Link>
          
          <div className="text-sm text-textMuted">
            Didn't receive the email? <button className="text-textMain hover:underline">Resend</button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CheckEmail;
