# 🚀 Morsel Deployment Masterclass

Deploying Morsel correctly ensures that your AI Coach and Sydney-localized tracking work seamlessly in the cloud. Follow these steps exactly.

---

## 🏛️ Phase 1: The Backend (Render.com)

We deploy the backend first because the frontend needs the "Backend URL" to work.

1.  **Sign in to [Render.com](https://render.com)** using your GitHub account.
2.  Click **New +** and select **Web Service**.
3.  Connect the `morsel` repository.
4.  **Configure Settings**:
    - **Name**: `morsel-api`
    - **Environment**: `Python 3`
    - **Build Command**: `pip install -r requirements.txt` (Make sure the Root Directory is `backend`)
    - **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app`
5.  **Environment Variables**: Click "Advanced" -> "Add Environment Variable":
    - `SUPABASE_URL`: (From your Supabase settings)
    - `SUPABASE_SERVICE_ROLE_KEY`: (From Supabase -> API)
    - `ANTHROPIC_API_KEY`: (Your Claude key)
    - `CORS_ORIGINS`: `https://your-morsel-frontend.vercel.app` (You'll update this once Vercel is ready)
6.  **Deploy**: Click **Create Web Service**.
    > [!IMPORTANT]
    > Note down your **Render URL** (e.g., `https://morsel-api.onrender.com`). You need this for Phase 2.

---

## 🎨 Phase 2: The Frontend (Vercel.com)

1.  **Sign in to [Vercel.com](https://vercel.com)** using your GitHub account.
2.  Click **Add New...** -> **Project**.
3.  Import the same `morsel` repository.
4.  **Configure Settings**:
    - **Framework Preset**: `Next.js`
    - **Root Directory**: `frontend` (Click "Edit" and select the `frontend` folder)
5.  **Environment Variables**:
    - `NEXT_PUBLIC_SUPABASE_URL`: (Same as backend)
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (From Supabase -> API)
    - `NEXT_PUBLIC_API_URL`: `https://your-morsel-api.onrender.com` (Your Render URL)
6.  **Deploy**: Click **Deploy**.

---

## 🔐 Phase 3: The Security Handshake (Supabase & CORS)

Now that both sites are live, they need permission to talk to each other.

### 1. Update Supabase
1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Authentication** -> **URL Configuration**.
3.  Add your Vercel URL (e.g., `https://morsel-app.vercel.app`) to the **Redirect URLs**.

### 2. Update Render CORS
1.  Go back to **Render.com**.
2.  Select your `morsel-api` service.
3.  Go to **Environment**.
4.  Change `CORS_ORIGINS` to your final Vercel URL.
5.  Render will auto-redeploy.

---

## ✅ Phase 4: Verification

1.  Open your Vercel URL.
2.  If you see the **Login Page**, success!
3.  Try logging a meal. If it analyzes correctly, your **Render + Anthropic** connection is perfect.
4.  Check the **Performance Tab** to ensure charts are rendering.

---

Generated with ✨ by Antigravity
