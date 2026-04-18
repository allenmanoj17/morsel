import { createClient } from './supabase/client'
import { tokenService } from './tokenService'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function tryRecoverSession(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()
    const currentSession = sessionData.session

    if (currentSession?.access_token) {
      tokenService.setToken(currentSession.access_token, currentSession.expires_in ?? 3600)
      return currentSession.access_token
    }

    const { data: refreshData, error } = await supabase.auth.refreshSession()
    if (error) {
      if (isExpiredRefreshTokenError(error)) {
        tokenService.clearToken()
        return null
      }
      throw error
    }

    const refreshedSession = refreshData.session
    if (refreshedSession?.access_token) {
      tokenService.setToken(refreshedSession.access_token, refreshedSession.expires_in ?? 3600)
      return refreshedSession.access_token
    }
  } catch (error) {
    if (!isExpiredRefreshTokenError(error)) {
      console.error('Session recovery failed:', error)
    }
  }

  return null
}

function isExpiredRefreshTokenError(error: any): boolean {
  const code = error?.code
  const message = String(error?.message || '').toLowerCase()
  return code === 'refresh_token_not_found' || message.includes('invalid refresh token')
}

async function apiFetch(path: string, options: any = {}, token?: string): Promise<any> {
  const { timeout = 60000, retries = 0, ...fetchOptions } = options
  let activeToken = token

  if (!activeToken) {
    try {
      activeToken = (await tokenService.getToken()) || undefined
    } catch (e) {
      console.error('Token fetch failed:', e)
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`
  }

  const executeRequest = async (attempt: number, didRetryAuth = false): Promise<any> => {
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), timeout)

      const requestHeaders: Record<string, string> = { ...headers }
      if (activeToken) {
        requestHeaders['Authorization'] = `Bearer ${activeToken}`
      } else {
        delete requestHeaders['Authorization']
      }

      const res = await fetch(`${API_URL}${path}`, { 
        ...fetchOptions, 
        headers: requestHeaders,
        signal: controller.signal 
      })
      
      clearTimeout(id)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        const msg = err.detail || `API error: ${res.status}`
        
        if (res.status === 401 || msg.toLowerCase().includes('expired')) {
          if (typeof window !== 'undefined') {
            tokenService.clearToken()

            if (!didRetryAuth) {
              const recoveredToken = await tryRecoverSession()
              if (recoveredToken) {
                activeToken = recoveredToken
                return executeRequest(attempt, true)
              }
            }

            const supabase = createClient()
            await supabase.auth.signOut().catch(() => null)
            localStorage.removeItem('morsel_auth_error')
            window.location.href = '/login?error=session_expired'
          }
          throw new Error('Session expired. Please log in again.')
        }

        // Retry on transient errors (server errors and timeouts)
        if (attempt < retries && (res.status >= 500 || res.status === 408 || res.status === 429)) {
           const backoff = Math.pow(2, attempt) * 1000
           await new Promise(r => setTimeout(r, backoff))
           return executeRequest(attempt + 1)
        }
        
        throw new Error(msg)
      }
      if (res.status === 204) return null
      return res.json()
    } catch (e: any) {
      if (isExpiredRefreshTokenError(e)) {
        tokenService.clearToken()
        if (typeof window !== 'undefined') {
          const supabase = createClient()
          await supabase.auth.signOut().catch(() => null)
          window.location.href = '/login?error=session_expired'
        }
        throw new Error('Session expired. Please log in again.')
      }

      if (e.name === 'AbortError') {
         throw new Error(`Request timed out. Please check your connection and try again.`)
      }
      
      if (attempt < retries && (e.message?.toLowerCase().includes('fetch') || e.message?.toLowerCase().includes('network'))) {
         const backoff = Math.pow(2, attempt) * 1000
         await new Promise(r => setTimeout(r, backoff))
         return executeRequest(attempt + 1)
      }

      if (e.message?.toLowerCase().includes('fetch')) {
        throw new Error('Network error. Unable to reach the server.')
      }
      throw e
    }
  }

  return executeRequest(0)
}

export const api = {
  // Meals
  parseMeal: (body: { meal_text: string; logged_at?: string }, token: string) =>
    apiFetch('/api/meals/parse', { method: 'POST', body: JSON.stringify(body) }, token),

  getMeals: (date: string, token: string) =>
    apiFetch(`/api/meals?date=${date}`, { retries: 3 }, token),

  createMeal: (body: object, token: string) =>
    apiFetch('/api/meals', { method: 'POST', body: JSON.stringify(body) }, token),

  updateMeal: (id: string, body: object, token: string) =>
    apiFetch(`/api/meals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteMeal: (id: string, token: string) =>
    apiFetch(`/api/meals/${id}`, { method: 'DELETE' }, token),

  // Dashboard
  getDailyDashboard: (date: string, token: string) =>
    apiFetch(`/api/dashboard/daily?date=${date}`, { timeout: 120000, retries: 3 }, token),

  getHomeComposite: (date: string, token: string) =>
    apiFetch(`/api/dashboard/home-composite?date=${date}`, { timeout: 120000, retries: 3 }, token),

  // Targets
  getTargets: (token: string) =>
    apiFetch('/api/targets', { retries: 3 }, token),

  createTarget: (body: object, token: string) =>
    apiFetch('/api/targets', { method: 'POST', body: JSON.stringify(body) }, token),

  updateTarget: (id: string, body: object, token: string) =>
    apiFetch(`/api/targets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  // Onboarding
  getOnboarding: (token: string) =>
    apiFetch('/api/onboarding', { retries: 3 }, token),

  completeOnboarding: (body: object, token: string) =>
    apiFetch('/api/onboarding', { method: 'POST', body: JSON.stringify(body) }, token),

  updateOnboarding: (body: object, token: string) =>
    apiFetch('/api/onboarding', { method: 'PATCH', body: JSON.stringify(body) }, token),

  getProfileComposite: (token: string) =>
    apiFetch('/api/onboarding/profile-composite', { timeout: 120000, retries: 3 }, token),

  // Templates
  getTemplates: (token: string) =>
    apiFetch('/api/templates', { retries: 3 }, token),

  getTemplatesQuick: (token: string, limit = 4) =>
    apiFetch(`/api/templates/quick?limit=${limit}`, { retries: 3 }, token),

  createTemplate: (body: object, token: string) =>
    apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(body) }, token),

  updateTemplate: (id: string, body: object, token: string) =>
    apiFetch(`/api/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteTemplate: (id: string, token: string) =>
    apiFetch(`/api/templates/${id}`, { method: 'DELETE' }, token),

  logTemplate: (id: string, token: string, mealDate?: string) =>
    apiFetch(`/api/templates/${id}/log${mealDate ? `?date=${mealDate}` : ''}`, { method: 'POST' }, token),

  // Foods
  searchFoods: (q: string, token: string) =>
    apiFetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { retries: 3 }, token),

  updateFood: (id: string, body: object, token: string) =>
    apiFetch(`/api/foods/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  // Analytics
  getWeeklyAnalytics: (token: string) =>
    apiFetch('/api/analytics/weekly', { timeout: 120000, retries: 3 }, token),

  getAnalyticsTrends: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/trends?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, { timeout: 120000, retries: 3 }, token)
  },
  getMealStats: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/meal-stats?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, { retries: 3 }, token)
  },

  getCompositeAnalytics: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/composite?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, { timeout: 120000, retries: 3 }, token)
  },

  getAnalyticsOverview: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/overview?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, { timeout: 120000, retries: 3 }, token)
  },

  getAnalyticsDetail: (days: number, token: string, start?: string, end?: string) => {
    let url = `/api/analytics/detail?days=${days}`
    if (start) url += `&start_date=${start}`
    if (end) url += `&end_date=${end}`
    return apiFetch(url, { timeout: 120000, retries: 3 }, token)
  },

  getSocialSummary: (date: string, token: string) =>
    apiFetch(`/api/analytics/social-summary/${date}`, { retries: 3 }, token),

  // Review
  generateEODReview: (date: string, token: string) =>
    apiFetch(`/api/review/end-of-day?date=${date}`, { method: 'POST' }, token),

  // Weights
  getWeights: (token: string) =>
    apiFetch('/api/weights', { retries: 3 }, token),

  getLatestWeight: (token: string, date?: string) =>
    apiFetch(`/api/weights/latest${date ? `?date=${date}` : ''}`, { retries: 3 }, token),

  createWeight: (body: object, token: string) =>
    apiFetch('/api/weights', { method: 'POST', body: JSON.stringify(body) }, token),

  updateWeight: (id: string, body: object, token: string) =>
    apiFetch(`/api/weights/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),

  deleteWeight: (id: string, token: string) =>
    apiFetch(`/api/weights/${id}`, { method: 'DELETE' }, token),

  // Water
  getWaterLogs: (date: string, token: string) =>
    apiFetch(`/api/water?date=${date}`, { retries: 3 }, token),

  logWater: (body: { date: string; amount_ml: number }, token: string) =>
    apiFetch('/api/water', { method: 'POST', body: JSON.stringify(body) }, token),

  // Supplements (Rituals)
  getSupplementStack: (token: string) =>
    apiFetch('/api/supplements/stack', { timeout: 60000, retries: 3 }, token),

  createSupplement: (body: object, token: string) =>
    apiFetch('/api/supplements/stack', { method: 'POST', body: JSON.stringify(body) }, token),

  deleteSupplement: (id: string, token: string) =>
    apiFetch(`/api/supplements/stack/${id}`, { method: 'DELETE' }, token),

  getSupplementLogs: (date: string, token: string) =>
    apiFetch(`/api/supplements/logs?date=${date}`, { retries: 3 }, token),

  logSupplement: (body: { supplement_id: string; date: string; taken: boolean }, token: string) =>
    apiFetch('/api/supplements/logs', { method: 'POST', body: JSON.stringify(body) }, token),

  // Workouts (Kinetic)
  getWorkoutSessions: (token: string) =>
    apiFetch('/api/workouts/sessions', { retries: 3 }, token),

  getWorkoutSummary: (token: string, limit = 30) =>
    apiFetch(`/api/workouts/summary?limit=${limit}`, { retries: 3 }, token),

  createWorkoutSession: (body: object, token: string) =>
    apiFetch('/api/workouts/sessions', { method: 'POST', body: JSON.stringify(body) }, token),

  getExercises: (token: string) =>
    apiFetch('/api/workouts/exercises', { retries: 3 }, token),

  createExercise: (body: object, token: string) =>
    apiFetch('/api/workouts/exercises', { method: 'POST', body: JSON.stringify(body) }, token),

  getExerciseHistory: (name: string, token: string) =>
    apiFetch(`/api/workouts/history/${encodeURIComponent(name)}`, { retries: 3 }, token),
}
