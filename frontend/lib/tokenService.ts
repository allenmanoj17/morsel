/**
 * Token Service: Manages Supabase JWT token caching and refresh
 * Prevents race conditions from concurrent token fetches
 */

import { createClient } from './supabase/client'

class TokenService {
  private tokenPromise: Promise<string | null> | null = null
  private token: string | null = null
  private tokenExpiry: number = 0

  async getToken(): Promise<string | null> {
    try {
      // If token exists and hasn't expired, return it
      if (this.token && Date.now() < this.tokenExpiry) {
        return this.token
      }

      // If a fetch is already in progress, await it
      if (this.tokenPromise) {
        this.token = await this.tokenPromise
        return this.token
      }

      // Fetch new token
      this.tokenPromise = this.fetchNewToken()
      this.token = await this.tokenPromise
      this.tokenPromise = null
      return this.token
    } catch (error) {
      this.tokenPromise = null
      return null
    }
  }

  private async fetchNewToken(): Promise<string | null> {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (session?.access_token) {
        // Set expiry to 1 minute before actual expiry (safety margin)
        this.tokenExpiry = Date.now() + (session.expires_in * 1000) - 60000
        return session.access_token
      }
      
      return null
    } catch (error) {
      console.error('Token fetch error:', error)
      return null
    }
  }

  clearToken(): void {
    this.token = null
    this.tokenExpiry = 0
    this.tokenPromise = null
  }

  setToken(token: string, expiresInSeconds: number = 3600): void {
    this.token = token
    this.tokenExpiry = Date.now() + Math.max((expiresInSeconds * 1000) - 60000, 0)
    this.tokenPromise = null
  }
}

export const tokenService = new TokenService()
