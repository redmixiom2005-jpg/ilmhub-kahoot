# Ilmhub Kahoot - Live Quiz Platform

A modern, high-performance, real-time interactive live quiz platform built for teachers and students. Inspired by Kahoot, customized with the Ilmhub identity, native multi-language support (English, Russian, Uzbek Latin), sound effects via Web Audio API, accessible shape+color answer buttons, AI question import with Gemini Thinking Mode, and live projector podium celebrations.

---

## 🇺🇸 Setup & Deployment Guide (English)

### 1. Prerequisites
- Node.js 18+ installed
- A free Firebase account ([console.firebase.google.com](https://console.firebase.google.com))
- A free Vercel or GitHub account for production deployment

### 2. Local Installation & Development
```bash
# Clone the repository
git clone https://github.com/your-username/ilmhub-kahoot.git
cd ilmhub-kahoot

# Install dependencies
npm install

# Start local full-stack development server (runs on port 3000)
npm run dev
```

### 3. Firebase Setup (100% Free Tier)
1. **Create Firebase Project**:
   - Visit [Firebase Console](https://console.firebase.google.com) and click **Add project** (e.g. `ilmhub-kahoot`).
2. **Enable Authentication**:
   - Go to **Build** > **Authentication** > **Get started**.
   - Under **Sign-in method**, enable:
     - **Google** (for quiz hosts and teachers).
     - **Anonymous** (for students to join instantly without registration).
3. **Enable Realtime Database**:
   - Go to **Build** > **Realtime Database** > **Create database**.
   - Choose a region close to your users (e.g., `us-central1` or `europe-west1`).
   - Start in **Locked mode**.
4. **Deploy Security Rules**:
   - Go to **Realtime Database** > **Rules** tab.
   - Copy and paste the contents of `database.rules.json` into the editor and click **Publish**.
5. **Get Web Configuration**:
   - In **Project Overview** > click the Web `</>` icon to register a web app.
   - Copy the configuration values into your `.env` file:
     ```env
     VITE_FIREBASE_API_KEY="AIzaSy..."
     VITE_FIREBASE_AUTH_DOMAIN="ilmhub-kahoot.firebaseapp.com"
     VITE_FIREBASE_DATABASE_URL="https://ilmhub-kahoot-default-rtdb.firebaseio.com"
     VITE_FIREBASE_PROJECT_ID="ilmhub-kahoot"
     VITE_FIREBASE_STORAGE_BUCKET="ilmhub-kahoot.firebasestorage.app"
     VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
     VITE_FIREBASE_APP_ID="1:1234567890:web:abcdef"
     ```

### 4. Deploying on Vercel
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New** > **Project** and select your GitHub repo.
3. In **Environment Variables**, add each of the `VITE_FIREBASE_*` variables above.
4. Click **Deploy**.
5. **Important**: Copy your production domain (e.g., `ilmhub-kahoot.vercel.app`) and add it to Firebase:
   - Firebase Console > **Authentication** > **Settings** > **Authorized domains** > **Add domain**.

---

## 🇺🇿 O'rnatish va Ishga Tushirish Yo'riqnomasi (O'zbek tili)

### 1. Dasturni ishga tushirish
```bash
# Repozitoriyni yuklab olish
git clone https://github.com/your-username/ilmhub-kahoot.git
cd ilmhub-kahoot

# Kutubxonalarni o'rnatish
npm install

# Dasturchi rejimida ishga tushirish (port 3000)
npm run dev
```

### 2. Firebase loyihasini ulash (Mutlaqo bepul)
1. **console.firebase.google.com** sahifasiga kiring va yangi loyiha oching.
2. **Authentication** bo'limida **Google** va **Anonymous** kirish usullarini yoqing.
3. **Realtime Database** bo'limida yangi ma'lumotlar bazasi yarating.
4. `database.rules.json` fayli tarkibini Firebase qoidalar (Rules) bo'limiga nusxalang va **Publish** tugmasini bosing.
5. Loyiha sozlamalaridan olingan API kalitlarni `.env` fayliga joylashtiring.

### 3. Vercel platformasiga yuklash
1. Loyihani GitHub'ga yuklang (`git push`).
2. Vercel boshqaruv panelida yangi loyiha yarating va GitHub repozitoriyangizni tanlang.
3. **Environment Variables** bo'limiga barcha `VITE_FIREBASE_*` o'zgaruvchilarini kiriting.
4. **Deploy** tugmasini bosing.
5. Sayt domenini Firebase **Authentication > Settings > Authorized domains** ro'yxatiga qo'shishni unutmang.

---

## 🛠️ Troubleshooting & FAQ

- **Q: Game session shows "Reconnecting..." or doesn't sync across devices:**
  - Check that `VITE_FIREBASE_DATABASE_URL` matches your exact Realtime Database URL (including region).
  - Verify that `database.rules.json` allows reads on `/games`.
- **Q: Google Sign-In gives `auth/unauthorized-domain` error:**
  - Add `localhost` and your Vercel domain (`*.vercel.app`) to Firebase Console > Authentication > Settings > Authorized Domains.
- **Q: AI Quiz generation returns an error:**
  - Check that `GEMINI_API_KEY` is set in your server environment variables.
