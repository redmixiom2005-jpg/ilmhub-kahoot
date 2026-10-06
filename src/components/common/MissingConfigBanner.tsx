import React from 'react';
import { missingEnvVars } from '../../lib/firebase';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const MissingConfigBanner: React.FC = () => {
  const { showToast } = useGameStore();

  if (missingEnvVars.length === 0) return null;

  const copyConfigSnippet = () => {
    const snippet = missingEnvVars.map((v) => `${v}=your_value_here`).join('\n');
    navigator.clipboard.writeText(snippet);
    showToast('Copied missing variables template!');
  };

  return (
    <div className="bg-rose-600 text-white px-4 py-3 shadow-lg border-b border-rose-700 animate-in fade-in">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-300 mt-0.5" />
          <div>
            <span className="font-extrabold uppercase tracking-wide mr-2">
              Missing Firebase Configuration:
            </span>
            <span>
              The following required environment variables are not set in Vercel / .env:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {missingEnvVars.map((v) => (
                <code
                  key={v}
                  className="px-2 py-0.5 rounded-md bg-black/30 font-mono text-[11px] font-bold text-yellow-200"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            onClick={copyConfigSnippet}
            className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Template</span>
          </button>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>Vercel Settings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
