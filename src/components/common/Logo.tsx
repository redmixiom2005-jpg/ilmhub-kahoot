import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  clickable?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  clickable = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl md:text-5xl',
  };

  const logoContent = (
    <div className="flex items-center gap-3 select-none group">
      {/* Ilmhub Icon: Blue archway / open book with golden star in the center */}
      <div
        className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 shadow-md flex items-center justify-center p-1.5 transition-transform duration-300 group-hover:scale-105 border border-blue-400/30`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full fill-none">
          {/* Outer Arch & Open Book Base */}
          <path
            d="M 20 66 C 20 35 80 35 80 66 C 70 66 60 72 50 78 C 40 72 30 66 20 66 Z"
            stroke="#FFFFFF"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Book lower pages curve */}
          <path
            d="M 22 72 Q 36 67 50 78 Q 64 67 78 72"
            stroke="#FFFFFF"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Centered Ilm Golden 4-point Diamond Star */}
          <path
            d="M 50 36 Q 50 48 58 48 Q 50 48 50 60 Q 50 48 42 48 Q 50 48 50 36 Z"
            fill="#FFC107"
          />
        </svg>

        {/* Small lightning bolt sparkle */}
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full flex items-center justify-center shadow-xs border border-white">
          <svg className="w-2.5 h-2.5 text-blue-950 fill-current" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <div className={`font-black tracking-tight leading-none ${textSizes[size]}`}>
          <span className="text-slate-900 dark:text-white transition-colors">Ilmhub </span>
          <span className="text-amber-500 dark:text-yellow-400 drop-shadow-xs">Kahoot</span>
        </div>
        {showTagline && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Live Interactive Quiz
          </span>
        )}
      </div>
    </div>
  );

  if (clickable) {
    return (
      <Link to="/" className="inline-block outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded-xl">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};
