import { createClient } from './supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  let activeToken = token

  // If no token provided or we suspect it's stale, try to resolve a fresh one
  if (!activeToken) {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      activeToken = session?.access_token
    } catch (e) {
      console.warn('API_TOKEN_RESOLUTION_FAILED:', e)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`
  }

  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 60000)

    const res = await fetch(`${API_URL}${path}`, { 
      ...options, 
      headers,
      signal: controller.signal 
    })
    
    clearTimeout(id)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      const msg = err.detail || `API error: ${res.status}`
      
      // If we get an explicit expired JWT error, we should probably force a session reset
      if (res.status === 401 || msg.toLowerCase().includes('expired')) {
        console.error('SESSION_EXPIRED_OR_INVALID_JWT:', msg)
        // Clean up session if it's dead
        if (typeof window !== 'undefined') {
          const supabase = createClient()
          await supabase.auth.signOut()
          window.location.href = '/login?error=session_expired'
        }
      }
      
      throw new Error(msg)
    }
    if (res.status === 204) return null
    return res.json()
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Analysis timed out. The AI is processing a complex request, please try again.')
    if (e.message?.toLowerCase().includes('fetch')) {
      throw new Error('Connection failed. Please ensure the backend server is running and accessible.')
    }
    throw e
  }
}

export const api = {
  // Meals
  parseMeal: (body: { meal_text: string; logged_at?: string }, token: string) =>
    apiFetch('/api/meals/parse', { method: 'POST', body: JSON.stringify(body) }, token),

  getMeals: (date: string, token: string) =>
    apiFetch(`/api/meals?date=${date}`, {}, token),

  createMeal: (body: object, token: string) =>
    apiFetch('/api/meals', { method: 'POST', body: JSON.stringify(body) }, token),

  updateMeal: (id: string, body: object, token: string) =>
    apiFetch(`/api/meals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteMeal: (id: string, token: string) =>
    apiFetch(`/api/meals/${id}`, { method: 'DELETE' }, token),

  // Dashboard
  getDailyDashboard: (date: string, token: string) =>
    apiFetch(`/api/dashboard/daily?date=${date}`, {}, token),

  // Targets
  getTargets: (token: string) =>
    apiFetch('/api/targets', {}, token),

  createTarget: (body: object, token: string) =>
    apiFetch('/api/targets', { method: 'POST', body: JSON.stringify(body) }, token),

  updateTarget: (id: string, body: object, token: string) =>
    apiFetch(`/api/targets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  // Onboarding
  getOnboarding: (token: string) =>
    apiFetch('/api/onboarding', {}, token),

  completeOnboarding: (body: object, token: string) =>
    apiFetch('/api/onboarding', { method: 'POST', body: JSON.stringify(body) }, token),

  updateOnboarding: (body: object, token: string) =>
    apiFetch('/api/onboarding', { method: 'PATCH', body: JSON.stringify(body) }, token),

  // Templates
  getTemplates: (token: string) =>
    apiFetch('/api/templates', {}, token),

  createTemplate: (body: object, token: string) =>
    apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(body) }, token),

  updateTemplate: (id: string, body: object, token: string) =>
    apiFetch(`/api/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteTemplate: (id: string, token: string) =>
    apiFetch(`/api/templates/${id}`, { method: 'DELETE' }, token),

  logTemplate: (id: string, token: string) =>
    apiFetch(`/api/templates/${id}/log`, { method: 'POST' }, token),

  // Foods
  searchFoods: (q: string, token: string) =>
    apiFetch(`/api/foods/search?q=${encodeURIComponent(q)}`, {}, token),

  updateFood: (id: string, body: object, token: string) =>
    apiFetch(`/api/foods/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  // Analytics
  getWeeklyAnalytics: (token: string) =>
    apiFetch('/api/analytics/weekly', {}, token),

  getAnalyticsTrends: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/trends?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, {}, token)
  },
  getMealStats: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/meal-stats?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, {}, token)
  },

  getSocialSummary: (date: string, token: string) =>
    apiFetch(`/api/analytics/social-summary/${date}`, {}, token),

  // Review
  generateEODReview: (date: string, token: string) =>
    apiFetch(`/api/review/end-of-day?date=${date}`, { method: 'POST' }, token),

  // Weights
  getWeights: (token: string) =>
    apiFetch('/api/weights', {}, token),

  createWeight: (body: object, token: string) =>
    apiFetch('/api/weights', { method: 'POST', body: JSON.stringify(body) }, token),

  updateWeight: (id: string, body: object, token: string) =>
    apiFetch(`/api/weights/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteWeight: (id: string, token: string) =>
    apiFetch(`/api/weights/${id}`, { method: 'DELETE' }, token),

  // Water
  getWaterLogs: (date: string, token: string) =>
    apiFetch(`/api/water?date=${date}`, {}, token),

  logWater: (body: { date: string; amount_ml: number }, token: string) =>
    apiFetch('/api/water', { method: 'POST', body: JSON.stringify(body) }, token),
}
