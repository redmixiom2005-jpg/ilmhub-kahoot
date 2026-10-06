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
  onDisconnect,
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

// 1. ALL CONFIG READ FROM import.meta.env
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const REQUIRED_FIREBASE_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function getMissingFirebaseEnvVars(): string[] {
  const missing: string[] = [];
  if (!import.meta.env.VITE_FIREBASE_API_KEY) missing.push('VITE_FIREBASE_API_KEY');
  if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!import.meta.env.VITE_FIREBASE_DATABASE_URL) missing.push('VITE_FIREBASE_DATABASE_URL');
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) missing.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) missing.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!import.meta.env.VITE_FIREBASE_APP_ID) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
}

export const missingEnvVars = getMissingFirebaseEnvVars();
export const isFirebaseConfigured = missingEnvVars.length === 0;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Explicitly pass databaseURL to getDatabase for non-US regions like asia-southeast1
    db = getDatabase(app, firebaseConfig.databaseURL);
  } catch (err) {
    console.error('[Firebase] Failed to initialize Firebase SDK:', err);
  }
} else {
  console.warn(
    '[Firebase] Missing configuration variables:',
    missingEnvVars.join(', ')
  );
}

export { auth, db };

// Helper: 10-Second Timeout wrapper
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 10000,
  operationName = 'Operation'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `${operationName} timed out after ${Math.round(ms / 1000)}s. Please check your network and Firebase Realtime Database status.`
        )
      );
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Helper: Strip undefined values recursively (Firebase RTDB throws on undefined)
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as unknown as T;
  }
  return obj;
}

// Helper: Normalize quiz data on read (guards against RTDB removing empty arrays/keys)
export function normalizeQuiz(raw: unknown): Quiz {
  const q = (raw || {}) as Record<string, unknown>;
  const rawQuestions = Array.isArray(q.questions) ? q.questions : [];

  return {
    id: String(q.id || `quiz-${Date.now()}`),
    title: String(q.title || 'Untitled Quiz'),
    description: String(q.description || ''),
    coverImageUrl: typeof q.coverImageUrl === 'string' ? q.coverImageUrl : '',
    defaultTimeLimit: typeof q.defaultTimeLimit === 'number' ? q.defaultTimeLimit : 20,
    questions: rawQuestions.map((item: Record<string, unknown>, idx: number) => ({
      id: String(item.id || `q-${idx}`),
      type: item.type === 'truefalse' ? 'truefalse' : 'quiz',
      text: String(item.text || ''),
      options: Array.isArray(item.options)
        ? item.options.map(String)
        : item.type === 'truefalse'
        ? ['True', 'False']
        : ['', ''],
      correctAnswers: Array.isArray(item.correctAnswers)
        ? item.correctAnswers.map(Number)
        : [0],
      timeLimit: typeof item.timeLimit === 'number' ? item.timeLimit : 20,
      pointsMode:
        item.pointsMode === 'double'
          ? 'double'
          : item.pointsMode === 'none'
          ? 'none'
          : 'standard',
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : '',
      explanation: typeof item.explanation === 'string' ? item.explanation : '',
    })),
    createdBy: String(q.createdBy || ''),
    createdAt: typeof q.createdAt === 'number' ? q.createdAt : Date.now(),
    updatedAt: typeof q.updatedAt === 'number' ? q.updatedAt : Date.now(),
    isPublic: Boolean(q.isPublic),
  };
}

// Helper: Extract clean Firebase error code and message
export function extractFirebaseError(err: unknown): { code: string; message: string } {
  if (typeof err === 'object' && err !== null) {
    const fb = err as { code?: string; message?: string };
    const code = fb.code || 'UNKNOWN_ERROR';
    const message = fb.message || String(err);
    return { code, message };
  }
  return { code: 'UNKNOWN_ERROR', message: String(err) };
}

// ================= CONNECTION MONITORING =================
export type ConnectionBadgeStatus = 'connected' | 'connecting' | 'offline' | 'demo' | 'missing-config';

export function subscribeConnectionStatus(
  callback: (status: ConnectionBadgeStatus) => void
): Unsubscribe {
  if (!isFirebaseConfigured || !db) {
    callback(missingEnvVars.length > 0 ? 'missing-config' : 'demo');
    return () => {};
  }

  callback('connecting');
  const connectedRef = ref(db, '.info/connected');
  return onValue(
    connectedRef,
    (snap) => {
      const isConnected = snap.val() === true;
      callback(isConnected ? 'connected' : 'connecting');
    },
    (error) => {
      console.error('[Firebase] Connection status error:', error);
      callback('offline');
    }
  );
}

// ================= LOCAL DEMO FALLBACK =================
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
    window.dispatchEvent(new CustomEvent('ilmhub_local_db_change', { detail: { path, val } }));
  } catch {}
}

// ================= AUTH METHODS =================

export async function getCurrentAuthUser(): Promise<User | { uid: string; displayName?: string | null; email?: string | null } | null> {
  if (!auth) {
    const saved = localStorage.getItem('ilmhub_demo_user');
    return saved ? JSON.parse(saved) : null;
  }

  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth!, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export async function loginWithGoogle(): Promise<User | { uid: string; displayName: string; email: string }> {
  if (auth) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await withTimeout(
        signInWithPopup(auth, provider),
        30000,
        'Google authentication'
      );
      return result.user;
    } catch (err) {
      console.error('[Firebase Auth] Google login failed:', err);
      throw err;
    }
  }

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
    try {
      const result = await withTimeout(
        signInAnonymously(auth),
        10000,
        'Anonymous authentication'
      );
      return { uid: result.user.uid };
    } catch (err) {
      console.error('[Firebase Auth] Anonymous login failed:', err);
      throw err;
    }
  }

  let demoPlayerUid = localStorage.getItem('ilmhub_demo_player_uid');
  if (!demoPlayerUid) {
    demoPlayerUid = 'player-' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('ilmhub_demo_player_uid', demoPlayerUid);
  }
  return { uid: demoPlayerUid };
}

export async function logoutUser(): Promise<void> {
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('[Firebase Auth] Sign out failed:', err);
    }
  }
  localStorage.removeItem('ilmhub_demo_user');
}

export function subscribeAuth(
  callback: (user: { uid: string; displayName?: string | null; email?: string | null } | null) => void
): () => void {
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

  const savedDemo = localStorage.getItem('ilmhub_demo_user');
  callback(savedDemo ? JSON.parse(savedDemo) : null);
  const listener = () => {
    const s = localStorage.getItem('ilmhub_demo_user');
    callback(s ? JSON.parse(s) : null);
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

// ================= QUIZ MANAGEMENT =================

export async function getUserQuizzes(userUid: string): Promise<Quiz[]> {
  if (!userUid) return [];

  if (db) {
    try {
      const snap = await withTimeout(
        get(ref(db, `users/${userUid}/quizzes`)),
        10000,
        'Load user quizzes'
      );
      const val = snap.val();
      if (!val) return [];
      return Object.values(val).map(normalizeQuiz);
    } catch (err) {
      console.error(`[Firebase RTDB] Failed to load quizzes for ${userUid}:`, err);
      throw err;
    }
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  return Object.values(quizzes).map(normalizeQuiz);
}

export async function getQuizById(userUid: string, quizId: string): Promise<Quiz | null> {
  if (!userUid || !quizId) return null;

  if (db) {
    try {
      const snap = await withTimeout(
        get(ref(db, `users/${userUid}/quizzes/${quizId}`)),
        10000,
        'Load quiz by ID'
      );
      const val = snap.val();
      return val ? normalizeQuiz(val) : null;
    } catch (err) {
      console.error(`[Firebase RTDB] Failed to get quiz ${quizId}:`, err);
      throw err;
    }
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  return quizzes[quizId] ? normalizeQuiz(quizzes[quizId]) : null;
}

export async function saveUserQuiz(userUid: string, quiz: Quiz): Promise<void> {
  if (!userUid) throw new Error('User UID is required to save quiz');

  const cleanQuiz = stripUndefined({
    ...quiz,
    updatedAt: Date.now(),
    createdBy: userUid,
  });

  if (db) {
    try {
      await withTimeout(
        set(ref(db, `users/${userUid}/quizzes/${quiz.id}`), cleanQuiz),
        10000,
        'Save quiz'
      );
      return;
    } catch (err) {
      console.error(`[Firebase RTDB] Failed to save quiz ${quiz.id}:`, err);
      throw err;
    }
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  quizzes[quiz.id] = cleanQuiz;
  setLocalNode(`users/${userUid}/quizzes`, quizzes);
}

export async function deleteUserQuiz(userUid: string, quizId: string): Promise<void> {
  if (!userUid || !quizId) return;

  if (db) {
    try {
      await withTimeout(
        remove(ref(db, `users/${userUid}/quizzes/${quizId}`)),
        10000,
        'Delete quiz'
      );
      return;
    } catch (err) {
      console.error(`[Firebase RTDB] Failed to delete quiz ${quizId}:`, err);
      throw err;
    }
  }

  const quizzes = getLocalNode<Record<string, Quiz>>(`users/${userUid}/quizzes`) || {};
  delete quizzes[quizId];
  setLocalNode(`users/${userUid}/quizzes`, quizzes);
}

// ================= LIVE GAME SESSIONS =================

// ATOMIC CREATION OF GAME WITH PIN COLLISION CHECK
export async function createGameSession(
  quiz: Quiz,
  hostUid: string
): Promise<string> {
  if (!hostUid) throw new Error('Host must be authenticated to create a live game');
  if (!quiz.questions || quiz.questions.length === 0) {
    throw new Error('Quiz must contain at least one question');
  }

  if (db) {
    try {
      // 1. PIN collision check
      let pin = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = Math.floor(100000 + Math.random() * 900000).toString();
        const checkSnap = await withTimeout(
          get(ref(db, `games/${candidate}/meta`)),
          5000,
          'PIN collision check'
        );
        if (!checkSnap.exists()) {
          pin = candidate;
          break;
        }
      }

      if (!pin) {
        throw new Error('Unable to generate unique PIN. Please retry.');
      }

      // Public questions (without correct answers)
      const publicQuestions: PublicQuestion[] = quiz.questions.map((q, idx) => ({
        id: q.id || `q-${idx}`,
        type: q.type,
        text: q.text,
        options: Array.isArray(q.options)
          ? q.options
          : q.type === 'truefalse'
          ? ['True', 'False']
          : [],
        timeLimit: q.timeLimit || 20,
        pointsMode: q.pointsMode || 'standard',
        imageUrl: q.imageUrl || '',
        questionNumber: idx + 1,
        totalQuestions: quiz.questions.length,
      }));

      // Secret questions (Host only)
      const secretQuestions: SecretQuestionData[] = quiz.questions.map((q) => ({
        correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [0],
        explanation: q.explanation || '',
      }));

      const meta: GameMeta = {
        pin,
        quizId: quiz.id,
        quizTitle: quiz.title,
        hostUid,
        status: 'lobby',
        currentIndex: 0,
        totalQuestions: quiz.questions.length,
        createdAt: Date.now(),
        showLeaderboardAfterQuestion: true,
        showQuestionOnPlayers: true,
        randomizeQuestions: false,
        randomizeAnswers: false,
      };

      // Atomic multi-path update
      const updates: Record<string, unknown> = {};
      updates[`games/${pin}/meta`] = stripUndefined(meta);
      updates[`games/${pin}/questions`] = stripUndefined(publicQuestions);
      updates[`games/${pin}/secret`] = stripUndefined(secretQuestions);
      updates[`games/${pin}/players`] = null; // empty node initially

      await withTimeout(
        update(ref(db), updates),
        10000,
        'Create game session'
      );

      return pin;
    } catch (err) {
      console.error('[Firebase RTDB] Failed to create game session:', err);
      throw err;
    }
  }

  // Demo Fallback
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const publicQuestions: PublicQuestion[] = quiz.questions.map((q, idx) => ({
    id: q.id || `q-${idx}`,
    type: q.type,
    text: q.text,
    options: q.options || [],
    timeLimit: q.timeLimit || 20,
    pointsMode: q.pointsMode || 'standard',
    imageUrl: q.imageUrl || '',
    questionNumber: idx + 1,
    totalQuestions: quiz.questions.length,
  }));
  const secretQuestions: SecretQuestionData[] = quiz.questions.map((q) => ({
    correctAnswers: q.correctAnswers || [0],
    explanation: q.explanation || '',
  }));
  const meta: GameMeta = {
    pin,
    quizId: quiz.id,
    quizTitle: quiz.title,
    hostUid,
    status: 'lobby',
    currentIndex: 0,
    totalQuestions: quiz.questions.length,
    createdAt: Date.now(),
    showQuestionOnPlayers: true,
  };

  setLocalNode(`games/${pin}/meta`, meta);
  setLocalNode(`games/${pin}/questions`, publicQuestions);
  setLocalNode(`games/${pin}/secret`, secretQuestions);
  setLocalNode(`games/${pin}/players`, {});
  return pin;
}

// STUDENT JOIN FLOW: Anonymous auth -> Check lobby status -> Write player node -> onDisconnect
export async function joinGameAsStudent(
  pin: string,
  firstName: string,
  lastName: string
): Promise<Player> {
  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();

  if (db) {
    try {
      // 1. Sign in anonymously first
      let authUser = auth?.currentUser;
      if (!authUser) {
        const cred = await withTimeout(
          signInAnonymously(auth!),
          10000,
          'Student authentication'
        );
        authUser = cred.user;
      }
      const uid = authUser.uid;

      // 2. Verify game status
      const metaSnap = await withTimeout(
        get(ref(db, `games/${pin}/meta`)),
        10000,
        'Find game lobby'
      );

      if (!metaSnap.exists()) {
        throw new Error('GAME_NOT_FOUND');
      }

      const meta = metaSnap.val() as GameMeta;
      if (meta.status !== 'lobby' && meta.status !== 'countdown') {
        throw new Error('GAME_ALREADY_STARTED');
      }

      // 3. Write player node
      const player: Player = {
        uid,
        firstName: cleanFirst,
        lastName: cleanLast,
        nickname: `${cleanFirst} ${cleanLast}`,
        score: 0,
        streak: 0,
        joinedAt: Date.now(),
        connected: true,
        avatarSeed: uid.slice(-4),
      };

      await withTimeout(
        set(ref(db, `games/${pin}/players/${uid}`), stripUndefined(player)),
        10000,
        'Join game'
      );

      // 4. Register onDisconnect
      try {
        const connRef = ref(db, `games/${pin}/players/${uid}/connected`);
        await onDisconnect(connRef).set(false);
      } catch (discErr) {
        console.warn('[Firebase] onDisconnect handler notice:', discErr);
      }

      return player;
    } catch (err) {
      console.error(`[Firebase] Student join failed for pin ${pin}:`, err);
      throw err;
    }
  }

  // Local Demo Fallback
  const authUser = await loginAnonymously();
  const player: Player = {
    uid: authUser.uid,
    firstName: cleanFirst,
    lastName: cleanLast,
    nickname: `${cleanFirst} ${cleanLast}`,
    score: 0,
    streak: 0,
    joinedAt: Date.now(),
    connected: true,
    avatarSeed: authUser.uid.slice(-4),
  };

  const players = getLocalNode<Record<string, Player>>(`games/${pin}/players`) || {};
  players[player.uid] = player;
  setLocalNode(`games/${pin}/players`, players);
  return player;
}

// REALTIME SUBSCRIPTIONS
export function subscribeGameMeta(
  pin: string,
  callback: (meta: GameMeta | null) => void
): Unsubscribe {
  if (db) {
    const metaRef = ref(db, `games/${pin}/meta`);
    return onValue(
      metaRef,
      (snapshot) => callback(snapshot.val() || null),
      (err) => console.error(`[Firebase RTDB] Meta error for ${pin}:`, err)
    );
  }

  callback(getLocalNode<GameMeta>(`games/${pin}/meta`));
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ path: string; val: unknown }>;
    if (custom.detail?.path === `games/${pin}/meta`) {
      callback(custom.detail.val as GameMeta);
    }
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  return () => window.removeEventListener('ilmhub_local_db_change', handler);
}

export function subscribePublicQuestions(
  pin: string,
  callback: (questions: PublicQuestion[] | null) => void
): Unsubscribe {
  if (db) {
    const qRef = ref(db, `games/${pin}/questions`);
    return onValue(
      qRef,
      (snapshot) => callback(snapshot.val() || null),
      (err) => console.error(`[Firebase RTDB] Questions error for ${pin}:`, err)
    );
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

export async function getGameSecret(
  pin: string,
  questionIndex: number
): Promise<SecretQuestionData | null> {
  if (db) {
    try {
      const snap = await withTimeout(
        get(ref(db, `games/${pin}/secret/${questionIndex}`)),
        10000,
        'Fetch question secret'
      );
      return snap.val() || null;
    } catch (err) {
      console.error(`[Firebase RTDB] Error fetching secret for ${pin} Q${questionIndex}:`, err);
      return null;
    }
  }

  const secrets = getLocalNode<SecretQuestionData[]>(`games/${pin}/secret`);
  return secrets ? secrets[questionIndex] || null : null;
}

export async function updateGameStatus(
  pin: string,
  status: GameMeta['status'],
  extras?: Partial<GameMeta>
): Promise<void> {
  const updates: Partial<GameMeta> = stripUndefined({ status, ...extras });

  if (db) {
    try {
      await withTimeout(
        update(ref(db, `games/${pin}/meta`), updates),
        10000,
        `Update game status to ${status}`
      );
      return;
    } catch (err) {
      console.error(`[Firebase RTDB] Error updating status for ${pin}:`, err);
      throw err;
    }
  }

  const current = getLocalNode<GameMeta>(`games/${pin}/meta`);
  if (current) {
    setLocalNode(`games/${pin}/meta`, { ...current, ...updates });
  }
}

export function subscribePlayers(
  pin: string,
  callback: (players: Record<string, Player>) => void
): Unsubscribe {
  if (db) {
    const pRef = ref(db, `games/${pin}/players`);
    return onValue(
      pRef,
      (snapshot) => callback(snapshot.val() || {}),
      (err) => console.error(`[Firebase RTDB] Error subscribing players for ${pin}:`, err)
    );
  }

  callback(getLocalNode<Record<string, Player>>(`games/${pin}/players`) || {});
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ path: string; val: unknown }>;
    if (custom.detail?.path === `games/${pin}/players`) {
      callback((custom.detail.val as Record<string, Player>) || {});
    }
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  return () => window.removeEventListener('ilmhub_local_db_change', handler);
}

export async function kickPlayerFromGame(pin: string, playerUid: string): Promise<void> {
  if (db) {
    try {
      await withTimeout(
        remove(ref(db, `games/${pin}/players/${playerUid}`)),
        10000,
        'Kick player'
      );
      return;
    } catch (err) {
      console.error(`[Firebase RTDB] Error kicking player ${playerUid}:`, err);
      throw err;
    }
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
  const cleanAnswer = stripUndefined(answer);

  if (db) {
    try {
      await withTimeout(
        set(ref(db, `games/${pin}/answers/${questionIndex}/${playerUid}`), cleanAnswer),
        10000,
        'Submit player answer'
      );
      return;
    } catch (err) {
      console.error(`[Firebase RTDB] Error submitting answer for player ${playerUid}:`, err);
      throw err;
    }
  }

  const allAnswers = getLocalNode<Record<string, Record<string, AnswerSubmission>>>(`games/${pin}/answers`) || {};
  if (!allAnswers[questionIndex]) allAnswers[questionIndex] = {};
  allAnswers[questionIndex][playerUid] = cleanAnswer;
  setLocalNode(`games/${pin}/answers`, allAnswers);
}

export function subscribeAnswersForQuestion(
  pin: string,
  questionIndex: number,
  callback: (answers: Record<string, AnswerSubmission>) => void
): Unsubscribe {
  if (db) {
    const aRef = ref(db, `games/${pin}/answers/${questionIndex}`);
    return onValue(
      aRef,
      (snapshot) => callback(snapshot.val() || {}),
      (err) => console.error(`[Firebase RTDB] Error subscribing answers:`, err)
    );
  }

  const allAnswers = getLocalNode<Record<string, Record<string, AnswerSubmission>>>(`games/${pin}/answers`) || {};
  callback(allAnswers[questionIndex] || {});
  const handler = () => {
    const updated = getLocalNode<Record<string, Record<string, AnswerSubmission>>>(`games/${pin}/answers`) || {};
    callback(updated[questionIndex] || {});
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  return () => window.removeEventListener('ilmhub_local_db_change', handler);
}

export async function publishQuestionResult(
  pin: string,
  questionIndex: number,
  result: QuestionResult,
  updatedPlayers: Record<string, Player>
): Promise<void> {
  const cleanResult = stripUndefined(result);
  const cleanPlayers = stripUndefined(updatedPlayers);

  if (db) {
    try {
      const updates: Record<string, unknown> = {};
      updates[`games/${pin}/results/${questionIndex}`] = cleanResult;
      updates[`games/${pin}/players`] = cleanPlayers;

      await withTimeout(
        update(ref(db), updates),
        10000,
        'Publish question results'
      );
      return;
    } catch (err) {
      console.error(`[Firebase RTDB] Error publishing results:`, err);
      throw err;
    }
  }

  const allResults = getLocalNode<Record<string, QuestionResult>>(`games/${pin}/results`) || {};
  allResults[questionIndex] = cleanResult;
  setLocalNode(`games/${pin}/results`, allResults);
  setLocalNode(`games/${pin}/players`, cleanPlayers);
}

export function subscribeQuestionResult(
  pin: string,
  questionIndex: number,
  callback: (result: QuestionResult | null) => void
): Unsubscribe {
  if (db) {
    const rRef = ref(db, `games/${pin}/results/${questionIndex}`);
    return onValue(
      rRef,
      (snapshot) => callback(snapshot.val() || null),
      (err) => console.error(`[Firebase RTDB] Results error:`, err)
    );
  }

  const allResults = getLocalNode<Record<string, QuestionResult>>(`games/${pin}/results`) || {};
  callback(allResults[questionIndex] || null);
  const handler = () => {
    const updated = getLocalNode<Record<string, QuestionResult>>(`games/${pin}/results`) || {};
    callback(updated[questionIndex] || null);
  };
  window.addEventListener('ilmhub_local_db_change', handler);
  return () => window.removeEventListener('ilmhub_local_db_change', handler);
}
