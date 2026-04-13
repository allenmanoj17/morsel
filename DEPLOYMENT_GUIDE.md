# 🚀 Morsel Deployment Masterclass

Deploying Morsel correctly ensures that your AI Coach, Behavioral Analytics, and Sydney-localized tracking work seamlessly in the cloud. Follow these steps exactly.

---

## 🏗️ Phase 1: The Backend (Render.com)

We deploy the backend first because the frontend needs the "Backend URL" to work.

1.  **Sign in to [Render.com](https://render.com)** using your GitHub account.
2.  Click **New +** and select **Web Service**.
3.  Connect the `morsel` repository.
4.  **Configure Settings**:
    - **Name**: `morsel-api`
    - **Environment**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt` (Set Root Directory to `backend`)
    - **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app`
5.  **Environment Variables**: Click "Advanced" -> "Add Environment Variable":
    - `SUPABASE_URL`: (From your Supabase settings)
    - `SUPABASE_SERVICE_ROLE_KEY`: (From Supabase -> API)
    - `SUPABASE_ANON_KEY`: (From Supabase -> API)
    - `SUPABASE_JWT_SECRET`: (From Supabase -> API Settings)
    - `ANTHROPIC_API_KEY`: (Your Claude key)
    - `CORS_ORIGINS`: `https://your-morsel-frontend.vercel.app` (Update once Vercel is ready)
    - `APP_ENV`: `production`

---

## 🎨 Phase 2: The Frontend (Vercel.com)

1.  **Sign in to [Vercel.com](https://vercel.com)** using your GitHub account.
2.  Click **Add New...** -> **Project**.
3.  Import the same `morsel` repository.
4.  **Configure Settings**:
    - **Framework Preset**: `Next.js`
    - **Root Directory**: `frontend` (Click "Edit" and select the folder)
5.  **Environment Variables**:
    - `NEXT_PUBLIC_SUPABASE_URL`: (Same as backend)
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Same as backend)
    - `NEXT_PUBLIC_API_URL`: `https://morsel-api.onrender.com` (Your Render URL)
6.  **Deploy**: Click **Deploy**.

---

## 🔐 Phase 3: The Security Handshake

1.  **Supabase Redirects**: Navigate to **Authentication** -> **URL Configuration**. Add your Vercel URL (e.g., `https://morsel-app.vercel.app`) to the **Redirect URLs**.
2.  **CORS Lock**: Go back to **Render.com** and update `CORS_ORIGINS` to your final Vercel domain. This restricts API access to only your authorized frontend.

---

## 📱 Phase 4: PWA Installation

Once live, open your Vercel URL in Safari (iOS) or Chrome (Android):
1.  **iOS**: Tap the **Share** button and select **"Add to Home Screen"**.
2.  **Android**: Tap the **MenuDots** (bottom right) and select **"Install App"**.
3.  Morsel will now launch as a **Standalone Standalone App** with the optimized Obsidian Focus aesthetic.

---

## ✅ Phase 5: final Verification

1.  **Auth**: Ensure you can sign in and complete the high-fidelity onboarding journey.
2.  **Logging**: Verify that the AI analyzes your meals and applies the correct **Meal Type**.
3.  **Analytics**: Check the **Performance** tab after a few meals to see the **Fueling Schedule** and **Composition** charts populating.

---

Generated with ✨ by Antigravity
