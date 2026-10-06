import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { MissingConfigBanner } from './components/common/MissingConfigBanner';
import { LandingPage } from './features/landing/LandingPage';
import { JoinPage } from './features/join/JoinPage';
import { PlayerGamePage } from './features/player/PlayerGamePage';
import { HostDashboard } from './features/host/HostDashboard';
import { QuizEditor } from './features/host/QuizEditor';
import { ImportQuestionsPage } from './features/host/ImportQuestionsPage';
import { LiveHostGamePage } from './features/host/LiveHostGamePage';
import { GameResultsPage } from './features/host/GameResultsPage';
import { NotFoundPage } from './features/common/NotFoundPage';
import { useGameStore } from './store/gameStore';
import { Sparkles, CheckCircle2 } from 'lucide-react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppLayout() {
  const location = useLocation();
  const { theme, toastMessage } = useGameStore();

  // Fullscreen game screens don't show the standard header/footer
  const isPlayerGame = location.pathname.startsWith('/play/');
  const isLiveHostGame = location.pathname.startsWith('/host/game/');
  const isImmersiveScreen = isPlayerGame || isLiveHostGame;

  // Apply dark mode class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F5F8FF] dark:bg-[#050B18] text-[#101828] dark:text-white transition-colors duration-200">
      <ScrollToTop />
      <MissingConfigBanner />
      {!isImmersiveScreen && <Header />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:pin" element={<JoinPage />} />
          <Route path="/play/:pin" element={<PlayerGamePage />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/host/quiz/:id" element={<QuizEditor />} />
          <Route path="/host/import" element={<ImportQuestionsPage />} />
          <Route path="/host/game/:pin" element={<LiveHostGamePage />} />
          <Route path="/host/results/:id" element={<GameResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!isImmersiveScreen && <Footer />}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl bg-[#071A3D] dark:bg-[#0B1730] text-white font-extrabold text-xs shadow-2xl border border-white/20 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#FFC928] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
