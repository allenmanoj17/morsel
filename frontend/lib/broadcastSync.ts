/**
 * Multi-tab Cache Synchronization using BroadcastChannel API
 * Keeps localStorage cache in sync across all open browser tabs
 */

export class BroadcastSync {
  private channel: BroadcastChannel | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('morsel_cache_sync')
        this.channel.onmessage = (event) => {
          const { type, key, data } = event.data
          if (type === 'cache_update') {
            this.notifyListeners(key, data)
          }
        }
      } catch (e) {
        console.warn('BroadcastChannel not available, falling back to storage events')
        this.setupStorageEventFallback()
      }
    } else {
      this.setupStorageEventFallback()
    }
  }

  private setupStorageEventFallback() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith('morsel_')) {
          const key = event.key
          try {
            const data = event.newValue ? JSON.parse(event.newValue) : null
            this.notifyListeners(key, data)
          } catch (e) {
            console.error('Failed to parse storage event data:', e)
          }
        }
      })
    }
  }

  /**
   * Publish cache update to all tabs
   */
  broadcast(key: string, data: any) {
    if (this.channel) {
      this.channel.postMessage({ type: 'cache_update', key, data })
    }
    // Also update localStorage to trigger storage events in other tabs
    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem(`${key}_ts`, Date.now().toString())
  }

  /**
   * Subscribe to cache updates for a specific key
   */
  subscribe(key: string, callback: (data: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(key)
        }
      }
    }
  }

  private notifyListeners(key: string, data: any) {
    const callbacks = this.listeners.get(key)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (e) {
          console.error('Error in cache sync listener:', e)
        }
      })
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }
}

// Global singleton instance
let broadcastSync: BroadcastSync | null = null

export const getBroadcastSync = () => {
  if (typeof window === 'undefined') return null
  if (!broadcastSync) {
    broadcastSync = new BroadcastSync()
  }
  return broadcastSync
}
