'use client'

interface VoicoryLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function VoicoryLogo({ 
  className = '', 
  size = 'md',
}: VoicoryLogoProps) {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <span 
      className={`${sizes[size]} ${className}`}
      style={{ 
        fontFamily: 'Ahsing, sans-serif',
        letterSpacing: '0.02em',
        background: 'linear-gradient(90deg, #2EC7B7 0%, #4DCAFA 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
      }}
    >
      VOICORY
    </span>
  );
}
