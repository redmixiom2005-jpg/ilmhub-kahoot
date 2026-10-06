# Ilmhub Kahoot - Live Quiz Platform

A high-performance, real-time live interactive quiz platform built for teachers and students with Vite, React, TypeScript, Tailwind CSS, Firebase Authentication, and Firebase Realtime Database.

---

## 🛠️ Troubleshooting & Firebase Error Code Matrix

| Error Code / Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **`PERMISSION_DENIED`** | The database rules blocked the read/write because the user was not authenticated, or `users/$uid` / `games/$pin` security rules didn't match the path. | 1. Ensure you are signed in (Google for hosts, Anonymous for students).<br>2. Open Firebase Console > **Realtime Database** > **Rules** and paste the exact rules from `database.rules.json`, then click **Publish**. |
| **`auth/unauthorized-domain`** | The production domain (`ilmhub-kahoot1.vercel.app`) is not whitelisted in Firebase Auth. | Go to Firebase Console > **Authentication** > **Settings** > **Authorized domains** > Click **Add domain** > Enter `ilmhub-kahoot1.vercel.app`. |
| **`auth/operation-not-allowed`** | Google Sign-in or Anonymous Authentication is disabled in Firebase. | Go to Firebase Console > **Authentication** > **Sign-in method** > Enable both **Google** and **Anonymous**. |
| **Wrong Database URL (Infinite "Connecting..." or timeout)** | The database is hosted in `asia-southeast1`, but the app tried connecting to default `firebaseio.com`. | Set `VITE_FIREBASE_DATABASE_URL` to your full regional URL:<br>`https://ilmhub-kahoot-default-rtdb.asia-southeast1.firebasedatabase.app` |
| **Missing Config Banner on screen** | One or more `VITE_FIREBASE_*` environment variables were not added to Vercel. | In Vercel Project Settings > **Environment Variables**, verify all 7 variables are added (see list below), then trigger a **Redeploy**. |
| **Operation timed out after 10s** | Device cannot reach Firebase RTDB due to ad-blockers, WebSocket blocking, or wrong URL. | Check browser console, ensure database URL is reachable and database rules are published. |

---

## 📋 Numbered Manual Action Checklist

Follow these exact steps to make `https://ilmhub-kahoot1.vercel.app` fully operational:

1. **Publish Realtime Database Security Rules**:
   - Go to [Firebase Console](https://console.firebase.google.com) > your project `ilmhub-kahoot`.
   - In the left sidebar, click **Build** > **Realtime Database** > **Rules** tab.
   - Replace the entire editor contents with the rules from `database.rules.json`:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid == $uid",
           ".write": "auth != null && auth.uid == $uid",
           "quizzes": {
             "$quizId": {
               ".validate": "newData.hasChildren(['id', 'title'])"
             }
           }
         }
       },
       "games": {
         "$pin": {
           "meta": {
             ".read": true,
             ".write": "auth != null && (!data.exists() || data.child('hostUid').val() == auth.uid)",
             ".validate": "newData.hasChildren(['hostUid', 'status'])"
           },
           "questions": {
             ".read": true,
             ".write": "auth != null && (root.child('games').child($pin).child('meta/hostUid').val() == auth.uid || newData.parent().child('meta/hostUid').val() == auth.uid)"
           },
           "secret": {
             ".read": "auth != null && root.child('games').child($pin).child('meta/hostUid').val() == auth.uid",
             ".write": "auth != null && (root.child('games').child($pin).child('meta/hostUid').val() == auth.uid || newData.parent().child('meta/hostUid').val() == auth.uid)"
           },
           "players": {
             ".read": true,
             "$uid": {
               ".write": "auth != null && (auth.uid == $uid || root.child('games').child($pin).child('meta/hostUid').val() == auth.uid)",
               ".validate": "newData.hasChildren(['firstName', 'lastName'])"
             }
           },
           "answers": {
             "$q": {
               ".read": "auth != null && root.child('games').child($pin).child('meta/hostUid').val() == auth.uid",
               "$uid": {
                 ".write": "auth != null && auth.uid == $uid && !data.exists()",
                 ".validate": "newData.hasChildren(['choice', 'timeMs'])"
               }
             }
           },
           "results": {
             ".read": true,
             ".write": "auth != null && root.child('games').child($pin).child('meta/hostUid').val() == auth.uid"
           }
         }
       }
     }
   }
   ```
   - Click **Publish**.

2. **Add Environment Variables in Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com) > `ilmhub-kahoot1` > **Settings** > **Environment Variables**.
   - Ensure the following 7 variables are added for Production, Preview, and Development:
     - `VITE_FIREBASE_API_KEY`: *(Your web API key)*
     - `VITE_FIREBASE_AUTH_DOMAIN`: `ilmhub-kahoot.firebaseapp.com`
     - `VITE_FIREBASE_DATABASE_URL`: `https://ilmhub-kahoot-default-rtdb.asia-southeast1.firebasedatabase.app`
     - `VITE_FIREBASE_PROJECT_ID`: `ilmhub-kahoot`
     - `VITE_FIREBASE_STORAGE_BUCKET`: `ilmhub-kahoot.firebasestorage.app`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`: *(Your sender ID)*
     - `VITE_FIREBASE_APP_ID`: *(Your app ID)*

3. **Verify Authorized Domains in Firebase Auth**:
   - In Firebase Console > **Authentication** > **Settings** > **Authorized domains**:
   - Verify `ilmhub-kahoot1.vercel.app` is present. If not, click **Add domain** and enter it.

4. **Redeploy on Vercel**:
   - In Vercel > **Deployments** > click the three dots on the latest deployment > **Redeploy** (make sure "Use existing Build Cache" is unchecked so new environment variables take effect).

---

## 🧪 6-Step End-to-End Test Script

Run this verification once the deployment completes:

1. **Host Login**:
   - Open `https://ilmhub-kahoot1.vercel.app` in your computer browser.
   - Look at the header badge: it should show **Connected** with a green dot.
   - Click **Host Login** and sign in with your Google account. Verify your name appears in the top navigation.
2. **Create Quiz**:
   - In the Host Dashboard, click **Create New Quiz** (or copy one of the sample presets like *O'zbekiston tarixi*).
   - Enter title: `Demo Test Quiz`, add a question with 4 options and mark option A as correct.
3. **Save Quiz**:
   - Notice the status updates to **Saved ✓** (with no infinite spinning or error).
   - Click **Host Dashboard**; `Demo Test Quiz` appears in your "My Quizzes" library with its question count.
4. **Start Live Game**:
   - Click the green **Play Live** button on `Demo Test Quiz`.
   - The screen switches to `/host/game/[PIN]`. You will see a large 6-digit PIN and a scannable QR code.
5. **Student Joins on Phone**:
   - On a phone or in a private/incognito tab, open `https://ilmhub-kahoot1.vercel.app/join`.
   - Enter the 6-digit PIN from the host screen.
   - Type First Name (`Jasur`) and Last Name (`Alimov`). Click **Enter Game**.
   - The student screen immediately shows *"You're in! Waiting for host..."*.
6. **Host Sees Student Live & Starts Game**:
   - Look at the host projector screen: `Jasur Alimov` pops up in the lobby with a green active indicator and player counter shows `1`.
   - Click **Start Game** (or press Space). Synced 3-2-1 countdown begins on both devices, followed by the question and podium celebration!
