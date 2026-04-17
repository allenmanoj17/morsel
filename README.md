# 🥗 Morsel

**AI-powered nutrition tracking, workout logging, and behavioral analytics platform**

A progressive web app (PWA) built for speed, simplicity, and scientific rigor. Type what you ate, log your workouts, and get personalized insights—all with one tap.

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://morsel-log.vercel.app)
[![Backend Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://morsel-api.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-d4ff00?style=flat-square)](LICENSE)

---

## 🎯 Core Features

### Nutrition Tracking
- **AI-Powered Meal Logging**: Natural language input (e.g., "eggs, toast, coffee") → instant macro breakdown
- **Meal Templates**: Save recurring meals and reuse them in seconds
- **Daily Dashboard**: Real-time calorie/macro progress with visual feedback
- **Smart Validation**: Client-side + server-side checks prevent invalid data entry

### Fitness & Recovery
- **Workout Logging**: Track sessions with exercise-specific sets, reps, and weight
- **Rest Timer**: Integrated workout rest timer with presets (60/90/120/180s) and fine-grained adjustment
- **Exercise Library**: 50+ built-in exercises + ability to create custom ones
- **Progressive Overload**: View historical performance, 1RM calculations, and trends
- **Recovery Status**: AI-computed recovery % per muscle group based on recent volume

### Supplement Management
- **Daily Stack**: Define your supplement routine (vitamins, minerals, etc.)
- **Adherence Tracking**: Simple checkbox UI to log which supplements you took each day
- **Quick Logging**: Toggle supplements on/off from the home screen

### Behavioral Insights
- **Meal Distribution Heatmaps**: Visualize eating frequency and meal timing patterns
- **Volume Trends**: Weekly/monthly/all-time workout volume analysis
- **Macro Adherence**: Daily calorie and macro consistency tracking over 28-day periods
- **End-of-Day Reviews**: AI-generated nutritional summaries and coaching
- **Hydration Insights**: Fluid intake monitoring + dehydration alerts

### User Experience
- **Progressive Web App (PWA)**: Install on iOS/Android, works offline
- **Mobile-First Design**: Fully responsive, optimized for on-the-go usage
- **Dark Mode Default**: High-contrast UI with #030409 background + #d4ff00 accent
- **Error Recovery**: Graceful degradation with cached data when endpoints fail
- **Multi-Tab Sync**: Changes in one tab sync instantly to others

## 🏗️ Tech Stack

### Frontend (Next.js + React)
- **Framework**: Next.js 16 (App Router, Server Components)
- **UI**: React 18, TypeScript
- **Styling**: Tailwind CSS v4, CSS Variables
- **Visualization**: Recharts (bar charts, area charts, sparklines)
- **Icons**: Lucide React
- **Auth**: Supabase client SDK
- **State**: React Hooks + custom services (TokenService, CacheUtils)

### Backend (FastAPI + Python)
- **Framework**: FastAPI 0.104+
- **Runtime**: Python 3.12, Uvicorn/Gunicorn
- **Validation**: Pydantic v2
- **Database ORM**: Supabase Python client
- **AI/LLM**: Anthropic Claude 3 (Haiku for parsing, Sonnet for analysis)

### Infrastructure & Services
- **Database & Auth**: Supabase (PostgreSQL 15+, Row-Level Security)
- **Hosting**: 
  - Frontend: Vercel (Next.js optimized)
  - Backend: Render.com (free tier or paid)
- **AI Processing**: Anthropic Claude
- **Analytics**: Recharts-based dashboards

### Database Schema (13 tables)
- Core: `profiles`, `daily_targets`, `meal_entries`, `meal_items`, `meal_templates`
- Tracking: `weight_logs`, `water_logs`, `daily_rollups`, `parse_audit`
- Fitness: `exercises`, `workout_sessions`, `workout_sets`
- Supplements: `supplement_stack`, `supplement_logs`
- All tables include RLS policies, automatic `updated_at` triggers, and unique constraints

---

## 🚀 Local Development

### Prerequisites
- **Node.js** 18+ 
- **Python** 3.12+
- **Git**
- Supabase account (free tier OK) — [Sign up](https://supabase.com)
- Anthropic API key — [Get yours](https://console.anthropic.com)

### Backend Setup (FastAPI)

1. **Clone and navigate**:
   ```bash
   git clone https://github.com/allenmanoj17/morsel.git
   cd morsel/backend
   ```

2. **Virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure `.env`**:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   ANTHROPIC_API_KEY=sk-ant-xxx
   SECRET_KEY=your-secret-key-here
   CORS_ORIGINS=http://localhost:3000
   APP_ENV=development
   ```

5. **Run development server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   
   Backend runs at: **http://localhost:8000**
   API docs (Swagger UI): **http://localhost:8000/docs**

### Frontend Setup (Next.js)

1. **Navigate to frontend**:
   ```bash
   cd morsel/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Start dev server**:
   ```bash
   npm run dev
   ```
   
   Frontend runs at: **http://localhost:3000**

---

## 📦 Deployment

### Phase 1: Database Setup

1. **Create Supabase project** — [Console](https://app.supabase.com)
2. **Run schema migration**:
   ```bash
   # Copy the entire contents of supabase_schema.sql
   # Paste into Supabase SQL Editor → Run
   ```
3. **Configure Auth** (Supabase > Authentication):
   - Redirect URLs: Add your frontend URLs (localhost + production)
   - Email provider: Enable if not already

### Phase 2: Backend Deployment (Render.com)

1. **Create Render account** and connect GitHub
2. **Create new Web Service**:
   - Connect `morsel` repository
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn -k uvicorn.workers.UvicornWorker app.main:app`
   - **Root Directory**: Set to `backend`

3. **Environment Variables** (click "Advanced"):
   ```
   SUPABASE_URL=<from Supabase settings>
   SUPABASE_SERVICE_ROLE_KEY=<from Supabase API>
   SUPABASE_ANON_KEY=<from Supabase API>
   SUPABASE_JWT_SECRET=<from Supabase JWT settings>
   ANTHROPIC_API_KEY=<your Claude API key>
   SECRET_KEY=<generate: python -c 'import secrets; print(secrets.token_urlsafe(32))'>
   CORS_ORIGINS=https://your-frontend.vercel.app
   APP_ENV=production
   ```

4. **Deploy** — Render builds and deploys automatically. Note your backend URL (e.g., `https://morsel-api.onrender.com`)

### Phase 3: Frontend Deployment (Vercel)

1. **Create Vercel account** and connect GitHub
2. **Import project**:
   - Import `morsel` repository
   - Framework: Next.js
   - **Root Directory**: `frontend`

3. **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<same as backend>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<same as backend>
   NEXT_PUBLIC_API_URL=https://morsel-api.onrender.com
   ```

4. **Deploy** — Vercel builds and deploys automatically

### Phase 4: Security Finalization

1. **Supabase URL Config** (Authentication > URL Configuration):
   - Add your Vercel frontend URL to redirect URLs

2. **Render CORS** (go back and update):
   - Update `CORS_ORIGINS` to your final Vercel URL for security

---

## ✨ Recent Improvements (v2.0)

### New Features
- ✅ **Workout Logging System**: Track exercises, sets, reps, weights, and volume
- ✅ **Rest Timer**: Integrated with presets and fine-tuned adjustments
- ✅ **Exercise Library**: 50+ built-in exercises + custom exercise creation
- ✅ **Supplement Stack**: Daily supplement tracking with adherence logging
- ✅ **Recovery Status**: AI-computed recovery % per muscle group
- ✅ **Meal Templates**: Save and reuse recurring meals instantly

### Quality & Stability
- ✅ **Input Validation**: Client + server-side checks (calories 0-10000, height 100-250cm, etc.)
- ✅ **Error Handling**: User-friendly error messages, no technical jargon
- ✅ **Token Service**: Prevents race conditions in concurrent API calls
- ✅ **Cache Management**: TTL-based caching with multi-tab sync
- ✅ **Error Boundaries**: App-wide crash protection with graceful recovery
- ✅ **Retry Logic**: Automatic retries for transient failures
- ✅ **RLS Policies**: Row-level security prevents cross-user data leakage

### Performance
- ✅ **Optimistic UI**: Instant feedback without waiting for server
- ✅ **Partial Degradation**: Shows cached data when some endpoints fail
- ✅ **Lazy Loading**: Progressive load of heavy components
- ✅ **Database Indexes**: Optimized queries for analytics and trends

---

## 📁 Project Structure

```
morsel/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + routes
│   │   ├── config.py            # Configuration & secrets
│   │   ├── dependencies.py       # Auth & DB dependencies
│   │   ├── schemas.py           # Pydantic models
│   │   ├── supabase_client.py   # Supabase wrapper
│   │   ├── routers/             # Endpoint grouping
│   │   │   ├── meals.py
│   │   │   ├── workouts.py      # NEW
│   │   │   ├── supplements.py   # NEW
│   │   │   ├── analytics.py
│   │   │   └── ...
│   │   ├── services/            # Business logic
│   │   │   ├── ai_parser.py     # LLM meal parsing
│   │   │   ├── ai_review.py     # AI coaching
│   │   │   └── validation.py
│   │   └── utils/               # Helpers
│   ├── requirements.txt
│   ├── Procfile
│   └── start.sh
├── frontend/
│   ├── app/
│   │   ├── (app)/               # Protected routes
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── log/page.tsx     # Meal logging
│   │   │   ├── analytics/       # Analytics dashboard
│   │   │   ├── workouts/        # NEW - Workout hub
│   │   │   │   ├── page.tsx     # Main dashboard
│   │   │   │   ├── log/page.tsx # Session logger
│   │   │   │   └── hub/page.tsx # Exercise library
│   │   │   ├── supplements/     # NEW - Supplement stack
│   │   │   └── settings/        # User profile
│   │   ├── layout.tsx           # Root layout + ErrorBoundary
│   │   └── auth/                # Auth callbacks
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   ├── QuickAddModal.tsx    # Meal & workout entry
│   │   ├── QuickAddExerciseModal.tsx # NEW
│   │   ├── ErrorBoundary.tsx    # NEW - Crash protection
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts               # HTTP client + endpoints
│   │   ├── tokenService.ts      # NEW - JWT caching
│   │   ├── cacheUtils.ts        # NEW - Cache invalidation
│   │   ├── broadcastSync.ts     # NEW - Multi-tab sync
│   │   ├── conflictDetector.ts  # NEW - Concurrent edit handling
│   │   ├── historyManager.ts    # NEW - Undo/redo
│   │   └── supabase/
│   ├── public/                  # PWA manifest + icons
│   └── package.json
├── supabase_schema.sql          # Database initialization
├── render.yaml                  # Render deployment config
└── README.md                    # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Style**: Match existing patterns (TypeScript for frontend, Python type hints for backend)
2. **UI/UX**: Maintain the dark theme (#030409 bg, #d4ff00 accent)
3. **Testing**: Test locally in development mode before submitting PR
4. **Documentation**: Update README for new features
5. **Git**: Use descriptive commit messages

**To contribute**:
```bash
git clone https://github.com/allenmanoj17/morsel.git
git checkout -b feature/your-feature-name
# Make changes...
git push origin feature/your-feature-name
# Open a Pull Request
```

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🙋 Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/allenmanoj17/morsel/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/allenmanoj17/morsel/discussions)
- **Email**: support@morsel.app (coming soon)

---

Built with ❤️ by [Morsel Team](https://github.com/allenmanoj17/morsel)
