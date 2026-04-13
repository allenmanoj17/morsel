# Morsel

Morsel is an AI-powered nutrition tracking and behavioral analytics platform. It leverages advanced natural language processing to simplify meal logging and provides personalized insights to help users understand and optimize their dietary habits.

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://morsel-log.vercel.app)
[![Backend Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://morsel-api.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-d4ff00?style=flat-square)](LICENSE)

---

## Overview

Morsel removes the friction from traditional calorie tracking. By utilizing a dual-engine LLM architecture, users can simply type what they ate, and the platform automatically extracts the caloric value, macronutrients, and contextual meal timing. The application is built as a Progressive Web App (PWA) with a minimalist, high-contrast UI designed for rapid daily usage.

## Core Features

- **Natural Language Logging**: Input meals as raw text (e.g., "Two scrambled eggs and a black coffee") and let AI instantly parse the nutritional data.
- **Automated AI Coaching**: Generate comprehensive end-of-day nutritional reviews and behavioral insights.
- **Behavioral Analytics**:
  - **Meal Distribution**: Track eating frequency and meal timing patterns over a 24-hour cycle.
  - **Adherence Heatmaps**: Visualize daily calorie and macro consistency over 28-day periods.
  - **Hydration Tracking**: Integrated fluid intake monitoring natively built into the dashboard.
- **Progressive Web App (PWA)**: Fully optimized for standalone installation on iOS and Android devices.
- **Secure Authentication**: Utilizing Supabase for secure password and Magic Link sign-ins.

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Recharts (Data Visualization)
- Lucide React (Iconography)

### Backend
- FastAPI (Python 3.12)
- Pydantic (Data Validation & Modeling)
- Uvicorn / Gunicorn (ASGI Server)

### Infrastructure & Services
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security)
- **AI Processing**: Anthropic (Claude 3 Haiku for high-speed parsing, Claude 3.5 Sonnet for deep analytics)
- **Hosting**: Vercel (Frontend), Render (Backend)

---

## Local Development

### Prerequisites
- Node.js (v18 or higher)
- Python 3.12+
- Supabase Account & Project
- Anthropic API Key

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv && source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Configure `.env` with your `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY`.
5. Run the dev server: `uvicorn app.main:app --reload --port 8000`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure `.env.local` with your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Start the development server: `npm run dev`
5. Access the application at `http://localhost:3000`.

## Deployment

Refer to the included `DEPLOYMENT_GUIDE.md` for explicit instructions on preparing the Next.js frontend for Vercel and configuring the FastAPI backend for Render.

## Contributing

We welcome technical contributions to the Morsel ecosystem. 

1. Fork the repository at `github.com/allenmanoj17/morsel`.
2. Ensure new UI components adhere to the existing design system (Obsidian backgrounds with Electric Lime `#d4ff00` accents).
3. Submit a Pull Request documenting your changes and rationale.

---
Built by [Morsel Team](https://github.com/allenmanoj17/morsel)
