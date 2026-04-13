const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API error')
  }
  if (res.status === 204) return null
  return res.json()
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
