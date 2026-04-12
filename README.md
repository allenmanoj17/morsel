# Morsel — Pro Nutrition Tracker (Sydney Edition) 🇦🇺💪

Morsel is a high-performance, AI-powered nutrition tracking application designed for precision, speed, and deep insights. Localized natively for the **Australia/Sydney** timezone, Morsel combines the power of Claude 3.5 Sonnet and Haiku to transform how you log and analyze your fuel.

![Morsel Banner](https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=1200)

## ✨ Core Features

- **🇦🇺 Australia/Sydney Native**: All tracking, streaks, and analytics are localized to Sydney time for flawless regional accuracy.
- **🤖 Intelligence Engine**:
    - **Quick Analysis**: Haiku-powered parsing (log "Double shot flat white" or "Grilled chicken salad" instantly).
    - **AI Coach**: Sonnet-powered end-of-day reviews with deep behavioral insights.
- **🧠 Smart Onboarding**: Built-in TDEE/Macro calculator (Mifflin-St Jeor) to auto-generate your ideal targets.
- **📊 Performance Analytics**:
    - **Consistency Heartbeat**: 28-day adherence heatmap.
    - **Macro Strategy Mix**: Pro donut charts and trend visualizations.
- **🚀 One-Click PWA**: Ready for deployment to Render (Backend) and Vercel (Frontend).

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, Lucide Icons, Recharts.
- **Backend**: FastAPI (Python 3.9+), Supabase (Auth, DB, RLS), Anthropic SDK (Claude 3.5).
- **Security**: Environment-aware CORS, JWT-based Supabase Auth.

## 📥 Local Setup

### 1. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Create .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ANTHROPIC_API_KEY
uvicorn app.main:app --reload
```

### 2. Frontend
```bash
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and NEXT_PUBLIC_API_URL
npm run dev
```

## 🚀 Deployment Guide

### Backend (Render)
1. Link your GitHub repo to **Render.com**.
2. Create a **Web Service**.
3. **Build Command**: `pip install -r requirements.txt`
4. **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app`
5. Add your Environment Variables.

### Frontend (Vercel)
1. Link the same repo to **Vercel.com**.
2. Select the `frontend` directory.
3. Vercel automatically detects Next.js.
4. Add your `.env.local` keys to Vercel's **Environment Variables**.

---

Generated with ✨ by [Morsel](https://github.com/allenmanoj17/morsel)
