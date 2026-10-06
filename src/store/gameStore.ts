import { create } from 'zustand';
import { Player } from '../types/quiz';

export type ThemeMode = 'dark' | 'light';

interface GameStoreState {
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;

  // Host state
  hostUser: { uid: string; displayName?: string | null; email?: string | null } | null;
  setHostUser: (user: { uid: string; displayName?: string | null; email?: string | null } | null) => void;

  // Player state
  playerSession: {
    pin: string;
    uid: string;
    firstName: string;
    lastName: string;
    score: number;
    streak: number;
  } | null;
  setPlayerSession: (session: { pin: string; uid: string; firstName: string; lastName: string; score: number; streak: number } | null) => void;
  updatePlayerScore: (pointsEarned: number, streak: number) => void;

  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('ilmhub_theme') as ThemeMode;
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const getSavedPlayerSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('ilmhub_player_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useGameStore = create<GameStoreState>((set) => ({
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const next: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('ilmhub_theme', next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch {}
      return { theme: next };
    }),
  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem('ilmhub_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
    set({ theme });
  },

  hostUser: null,
  setHostUser: (hostUser) => set({ hostUser }),

  playerSession: getSavedPlayerSession(),
  setPlayerSession: (session) => {
    try {
      if (session) {
        localStorage.setItem('ilmhub_player_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('ilmhub_player_session');
      }
    } catch {}
    set({ playerSession: session });
  },
  updatePlayerScore: (pointsEarned, streak) =>
    set((state) => {
      if (!state.playerSession) return {};
      const updated = {
        ...state.playerSession,
        score: state.playerSession.score + pointsEarned,
        streak,
      };
      try {
        localStorage.setItem('ilmhub_player_session', JSON.stringify(updated));
      } catch {}
      return { playerSession: updated };
    }),

  toastMessage: null,
  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      set((s) => (s.toastMessage === msg ? { toastMessage: null } : {}));
    }, 3500);
  },
  clearToast: () => set({ toastMessage: null }),
}));
