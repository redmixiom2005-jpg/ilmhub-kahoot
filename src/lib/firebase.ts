import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  serverTimestamp,
  Database,
  Unsubscribe,
} from 'firebase/database';
import {
  GameMeta,
  PublicQuestion,
  SecretQuestionData,
  Player,
  AnswerSubmission,
  QuestionResult,
  Quiz,
} from '../types/quiz';

// Environment variables check
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.databaseURL &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getDatabase(app);
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
}

export { auth, db };

// Mock storage for local demo fallback
const LOCAL_STORAGE_KEY_PREFIX = 'ilmhub_kahoot_rtdb:';

function getLocalNode<T>(path: string): T | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${path}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalNode<T>(path: string, val: T): void {
  try {
    if (val === null || val === undefined) {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${path}`);
    } else {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${path}`, JSON.stringify(val));
    }
    // Dispatch local storage event for cross-tab or in-page reactive updates
    window.dispatchEvent(new CustomEvent('ilmhub_local_db_change', { detail: { path, val } }));
  } catch {}
}

// ================= AUTH METHODS =================

export async function loginWithGoogle(): Promise<User | { uid: string; displayName: string; email: string }> {
  if (auth) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  // Demo fallback
  const mockUser = {
    uid: 'host-demo-' + Math.random().toString(36).substring(2, 9),
    displayName: 'Teacher (Demo Host)',
    email: 'teacher@ilmhub.uz',
  };
  localStorage.setItem('ilmhub_demo_user', JSON.stringify(mockUser));
  return mockUser;
}

export async function loginAnonymously(): Promise<{ uid: string }> {
  if (auth) {
    const result = await signInAnonymously(auth);
    return { uid: result.user.uid };
  }

  // Demo fallback
  let demoPlayerUid = localStorage.getItem('ilmhub_demo_player_uid');
  if (!demoPlayerUid) {
    demoPlayerUid = 'player-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('ilmhub_demo_player_uid', demoPlayerUid);
  }
  return { uid: demoPlayerUid };
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    await fbSignOut(auth);
  }
  localStorage.removeItem('ilmhub_demo_user');
}

export function subscribeAuth(callback: (user: { uid: string; displayName?: string | null; email?: string | null } | null) => void): () => void {
  if (auth) {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        callback({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
        });
      } else {
        callback(null);
      }
    });
  }

  // Demo fallback
  const savedDemo = localStorage.getItem('ilmhub_demo_user');
  if (savedDemo) {
    try {
      callback(JSON.parse(savedDemo));
    } catch {
      callback(null);
    }
  } else {
    callback(null);
  }

  const listener = () => {
    const s = localStorage.getItem('ilmhub_demo_user');
    callback(s ? JSON.parse(s) : null);
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

// ================= REALTIME DATABASE METHODS =================

export async function createGameSession(
  pin: string,
  meta: GameMeta,
  questions: PublicQuestion[],
  secrets: SecretQuestionData[]
): Promise<void> {
  if (db) {
    await set(ref(db, `games/${pin}/meta`), meta);
    await set(ref(db, `games/${pin}/questions`), questions);
    await set(ref(db, `games/${pin}/secret`), secrets);
    return;
  }

  // Local demo fallback
  setLocalNode(`games/${pin}/meta`, meta);
  setLocalNode(`games/${pin}/questions`, questions);
  setLocalNode(`games/${pin}/secret`, secrets);
}

export function subscribeGameMeta(pin: string, callback: (meta: GameMeta | null) => void): Unsubscribe {
  if (db) {
    const metaRef = ref(db, `games/${pin}/meta`);
    return onValue(metaRef, (snapshot) => {
      callback(snapshot.val() || null);
    });
  }

  // Local fallback
  callback(getLocalNode<GameMeta>(`games/${pin}/meta`));
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ path: string; val: unknown }>;
    if (custom.detail?.path === `games/${pin}/meta`) {
      callback(custom.detail.val as GameMeta);
    }
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === `${LOCAL_STORAGE_KEY_PREFIX}games/${pin}/meta`) {
      callback(e.newValue ? JSON.parse(e.newValue) : null);
    }
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('ilmhub_local_db_change', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function subscribePublicQuestions(
  pin: string,
  callback: (questions: PublicQuestion[] | null) => void
): Unsubscribe {
  if (db) {
    const qRef = ref(db, `games/${pin}/questions`);
    return onValue(qRef, (snapshot) => {
      callback(snapshot.val() || null);
    });
  }

  callback(getLocalNode<PublicQuestion[]>(`games/${pin}/questions`));
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ path: string; val: unknown }>;
    if (custom.detail?.path === `games/${pin}/questions`) {
      callback(custom.detail.val as PublicQuestion[]);
    }
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  return () => window.removeEventListener('ilmhub_local_db_change', handler);
}

export async function getGameSecret(pin: string, questionIndex: number): Promise<SecretQuestionData | null> {
  if (db) {
    const sRef = ref(db, `games/${pin}/secret/${questionIndex}`);
    const snap = await get(sRef);
    return snap.val() || null;
  }
  const secrets = getLocalNode<SecretQuestionData[]>(`games/${pin}/secret`);
  return secrets ? secrets[questionIndex] || null : null;
}

export async function updateGameStatus(
  pin: string,
  status: GameMeta['status'],
  extras?: Partial<GameMeta>
): Promise<void> {
  const updates: Partial<GameMeta> = { status, ...extras };
  if (db) {
    await update(ref(db, `games/${pin}/meta`), updates);
    return;
  }

  const current = getLocalNode<GameMeta>(`games/${pin}/meta`);
  if (current) {
    setLocalNode(`games/${pin}/meta`, { ...current, ...updates });
  }
}

export async function registerPlayer(pin: string, player: Player): Promise<void> {
  if (db) {
    await set(ref(db, `games/${pin}/players/${player.uid}`), player);
    return;
  }

  const players = getLocalNode<Record<string, Player>>(`games/${pin}/players`) || {};
  players[player.uid] = player;
  setLocalNode(`games/${pin}/players`, players);
}

export function subscribePlayers(
  pin: string,
  callback: (players: Record<string, Player>) => void
): Unsubscribe {
  if (db) {
    const pRef = ref(db, `games/${pin}/players`);
    return onValue(pRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
  }

  callback(getLocalNode<Record<string, Player>>(`games/${pin}/players`) || {});
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ path: string; val: unknown }>;
    if (custom.detail?.path === `games/${pin}/players`) {
      callback((custom.detail.val as Record<string, Player>) || {});
    }
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === `${LOCAL_STORAGE_KEY_PREFIX}games/${pin}/players`) {
      callback(e.newValue ? JSON.parse(e.newValue) : {});
    }
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('ilmhub_local_db_change', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export async function kickPlayerFromGame(pin: string, playerUid: string): Promise<void> {
  if (db) {
    await remove(ref(db, `games/${pin}/players/${playerUid}`));
    return;
  }

  const players = getLocalNode<Record<string, Player>>(`games/${pin}/players`) || {};
  delete players[playerUid];
  setLocalNode(`games/${pin}/players`, players);
}

export async function submitPlayerAnswer(
  pin: string,
  questionIndex: number,
  playerUid: string,
  answer: AnswerSubmission
): Promise<void> {
  if (db) {
    await set(ref(db, `games/${pin}/answers/${questionIndex}/${playerUid}`), answer);
    return;
  }

  const allAnswers = getLocalNode<Record<string, Record<string, AnswerSubmission>>>(`games/${pin}/answers`) || {};
  if (!allAnswers[questionIndex]) {
    allAnswers[questionIndex] = {};
  }
  allAnswers[questionIndex][playerUid] = answer;
  setLocalNode(`games/${pin}/answers`, allAnswers);
}

export function subscribeAnswersForQuestion(
  pin: string,
  questionIndex: number,
  callback: (answers: Record<string, AnswerSubmission>) => void
): Unsubscribe {
  if (db) {
    const aRef = ref(db, `games/${pin}/answers/${questionIndex}`);
    return onValue(aRef, (snapshot) => {
      callback(snapshot.val() || {});
    });
  }

  const allAnswers = getLocalNode<Record<string, Record<string, AnswerSubmission>>>(`games/${pin}/answers`) || {};
  callback(allAnswers[questionIndex] || {});
  const handler = () => {
    const updated = getLocalNode<Record<string, Record<string, AnswerSubmission>>>(`games/${pin}/answers`) || {};
    callback(updated[questionIndex] || {});
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('ilmhub_local_db_change', handler);
    window.removeEventListener('storage', handler);
  };
}

export async function publishQuestionResult(
  pin: string,
  questionIndex: number,
  result: QuestionResult,
  updatedPlayers: Record<string, Player>
): Promise<void> {
  if (db) {
    await set(ref(db, `games/${pin}/results/${questionIndex}`), result);
    await set(ref(db, `games/${pin}/players`), updatedPlayers);
    return;
  }

  const allResults = getLocalNode<Record<string, QuestionResult>>(`games/${pin}/results`) || {};
  allResults[questionIndex] = result;
  setLocalNode(`games/${pin}/results`, allResults);
  setLocalNode(`games/${pin}/players`, updatedPlayers);
}

export function subscribeQuestionResult(
  pin: string,
  questionIndex: number,
  callback: (result: QuestionResult | null) => void
): Unsubscribe {
  if (db) {
    const rRef = ref(db, `games/${pin}/results/${questionIndex}`);
    return onValue(rRef, (snapshot) => {
      callback(snapshot.val() || null);
    });
  }

  const allResults = getLocalNode<Record<string, QuestionResult>>(`games/${pin}/results`) || {};
  callback(allResults[questionIndex] || null);
  const handler = () => {
    const updated = getLocalNode<Record<string, QuestionResult>>(`games/${pin}/results`) || {};
    callback(updated[questionIndex] || null);
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('ilmhub_local_db_change', handler);
    window.removeEventListener('storage', handler);
  };
}

// User Quizzes Persistence
export async function saveUserQuiz(userUid: string, quiz: Quiz): Promise<void> {
  if (db) {
    await set(ref(db, `users/${userUid}/quizzes/${quiz.id}`), quiz);
    return;
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  quizzes[quiz.id] = quiz;
  setLocalNode(`users/${userUid}/quizzes`, quizzes);
}

export async function getUserQuizzes(userUid: string): Promise<Quiz[]> {
  if (db) {
    const snap = await get(ref(db, `users/${userUid}/quizzes`));
    const val = snap.val();
    return val ? Object.values(val) : [];
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  return Object.values(quizzes);
}

export async function deleteUserQuiz(userUid: string, quizId: string): Promise<void> {
  if (db) {
    await remove(ref(db, `users/${userUid}/quizzes/${quizId}`));
    return;
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  delete quizzes[quizId];
  setLocalNode(`users/${userUid}/quizzes`, quizzes);
}

export async function getQuizById(userUid: string, quizId: string): Promise<Quiz | null> {
  if (db) {
    const snap = await get(ref(db, `users/${userUid}/quizzes/${quizId}`));
    return snap.val() || null;
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  return quizzes[quizId] || null;
}
