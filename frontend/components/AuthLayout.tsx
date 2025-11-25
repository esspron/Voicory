import React from 'react';
import { Book, X } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  testimonial: React.ReactNode;
}

const DiscordIconSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" fill="currentColor"/>
  </svg>
);

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, testimonial }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative font-sans text-textMain">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{
             backgroundImage: 'radial-gradient(#2D3139 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-8 z-20">
        <img src="/logo.png" alt="Cally.ai" className="h-12 w-auto" />
      </div>

      {/* Main Content */}
      <div className="flex w-full max-w-6xl gap-20 items-center justify-center z-10 relative">
        {/* Left Side - Form */}
        <div className="w-full max-w-[440px]">
            {children}
        </div>

        {/* Right Side - Testimonial */}
        <div className="hidden lg:block w-full max-w-md">
          {testimonial}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-8 right-8 z-20 flex justify-between items-end pointer-events-none">
        <div className="text-xs text-textMuted max-w-md pointer-events-auto">
             By using Cally.ai you agree to our <a href="#" className="hover:text-textMain">Terms of Service</a>, <a href="#" className="hover:text-textMain">Privacy</a>, and <a href="#" className="hover:text-textMain">Security</a> policies and practices.
        </div>
        <div className="flex gap-2 pointer-events-auto">
             <button className="p-2 bg-surface rounded-md hover:bg-surfaceHover text-textMuted hover:text-textMain transition-colors">
                <Book size={16} />
             </button>
             <button className="p-2 bg-surface rounded-md hover:bg-surfaceHover text-textMuted hover:text-textMain transition-colors">
                <X size={16} />
             </button>
             <button className="p-2 bg-surface rounded-md hover:bg-surfaceHover text-textMuted hover:text-textMain transition-colors">
                <DiscordIconSmall />
             </button>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
