const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 30000) // 30s timeout for LLM processing

    const res = await fetch(`${API_URL}${path}`, { 
      ...options, 
      headers,
      signal: controller.signal 
    })
    
    clearTimeout(id)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `API error: ${res.status}`)
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

  getAnalyticsTrends: (days: number, token: string) =>
    apiFetch(`/api/analytics/trends?days=${days}`, {}, token),

  getMealStats: (days: number, token: string) =>
    apiFetch(`/api/analytics/meal-stats?days=${days}`, {}, token),

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
