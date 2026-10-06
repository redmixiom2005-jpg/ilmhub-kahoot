import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  clickable?: boolean;
  variant?: 'full' | 'icon-only';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  clickable = true,
  variant = 'full',
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16 md:w-20 md:h-20',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl md:text-4xl',
  };

  const logoContent = (
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* Official IlmHub Logo Asset */}
      <div className={`relative ${iconSizes[size]} shrink-0 transition-transform duration-200 group-hover:scale-105 rounded-xl overflow-hidden shadow-xs border border-white/10`}>
        <img
          src="/ilmhub-logo.svg"
          alt="IlmHub Logo"
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${textSizes[size]} flex items-center gap-1`}>
            <span className="text-[#071A3D] dark:text-white uppercase transition-colors">
              ILMHUB
            </span>
            <span className="text-[#0757D9] dark:text-[#FFC928] drop-shadow-xs uppercase">
              KAHOOT
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] font-semibold text-[#0757D9] dark:text-[#FFC928]/90 tracking-wide mt-1">
              Ilmlilar yetishib chiqadigan maskan !
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (clickable) {
    return (
      <Link
        to="/"
        className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[#FFC928] rounded-xl"
        aria-label="ILMHUB KAHOOT - Home"
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
