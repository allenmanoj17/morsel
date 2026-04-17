/**
 * Cache Utilities: Manage localStorage cache invalidation on mutations
 */

import { getBroadcastSync } from './broadcastSync'

export const cacheUtils = {
  // Clear dashboard cache for a specific date
  clearDashboardCache: (date: string) => {
    localStorage.removeItem(`morsel_dash_cache_${date}`)
    localStorage.removeItem(`morsel_dash_cache_${date}_ts`)
    // Broadcast to other tabs
    const sync = getBroadcastSync()
    if (sync) {
      sync.broadcast(`morsel_dash_cache_${date}`, null)
    }
  },

  // Clear all analytics caches
  clearAnalyticsCache: () => {
    localStorage.removeItem('morsel_analytics_cache')
    localStorage.removeItem('morsel_analytics_cache_ts')
    const sync = getBroadcastSync()
    if (sync) {
      sync.broadcast('morsel_analytics_cache', null)
    }
  },

  // Clear all app caches
  clearAllCaches: () => {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('morsel_')) {
        localStorage.removeItem(key)
      }
    })
    const sync = getBroadcastSync()
    if (sync) {
      sync.broadcast('clear_all', null)
    }
  },

  // Get cached data with TTL check (default 5 minutes)
  getCachedData: (key: string, ttlMinutes = 5) => {
    try {
      const data = localStorage.getItem(key)
      const timestamp = localStorage.getItem(`${key}_ts`)
      
      if (!data || !timestamp) return null
      
      const age = Date.now() - parseInt(timestamp)
      const ttlMs = ttlMinutes * 60 * 1000
      
      if (age > ttlMs) {
        localStorage.removeItem(key)
        localStorage.removeItem(`${key}_ts`)
        return null
      }
      
      return JSON.parse(data)
    } catch {
      return null
    }
  },

  // Set cached data with timestamp and broadcast to other tabs
  setCachedData: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      localStorage.setItem(`${key}_ts`, Date.now().toString())
      
      // Broadcast to other tabs for multi-tab sync
      const sync = getBroadcastSync()
      if (sync) {
        sync.broadcast(key, data)
      }
    } catch (e) {
      console.warn('Failed to cache data:', e)
    }
  },

  // Search meals by name, date, or macros
  searchMeals: (meals: any[], query: string, filters?: { minCals?: number; maxCals?: number; startDate?: string; endDate?: string }) => {
    let results = meals

    // Filter by search query (meal name or raw text)
    if (query.trim()) {
      const q = query.toLowerCase()
      results = results.filter(m => 
        m.meal_name?.toLowerCase().includes(q) || 
        m.entry_text_raw?.toLowerCase().includes(q)
      )
    }

    // Filter by date range
    if (filters?.startDate) {
      results = results.filter(m => new Date(m.logged_at) >= new Date(filters.startDate!))
    }
    if (filters?.endDate) {
      results = results.filter(m => new Date(m.logged_at) <= new Date(filters.endDate!))
    }

    // Filter by calorie range
    if (filters?.minCals !== undefined) {
      results = results.filter(m => m.calories >= filters.minCals!)
    }
    if (filters?.maxCals !== undefined) {
      results = results.filter(m => m.calories <= filters.maxCals!)
    }

    return results
  }
}
