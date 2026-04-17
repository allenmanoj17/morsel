/**
 * Concurrent Edit Conflict Detection
 * Uses version tracking (timestamp-based optimistic locking) to prevent data corruption
 */

export interface VersionedEntity {
  id: string
  updated_at?: string
  version?: number
  _clientVersion?: number
  _clientTimestamp?: number
}

export class ConflictDetector {
  /**
   * Check for conflicts between local and server versions
   * Returns { hasConflict, serverWins, details }
   */
  static detectConflict(local: VersionedEntity, server: VersionedEntity): {
    hasConflict: boolean
    serverWins: boolean
    details: string
  } {
    // If no timestamps, assume no conflict
    if (!local._clientTimestamp || !server.updated_at) {
      return { hasConflict: false, serverWins: false, details: 'No version info' }
    }

    const serverTimestamp = new Date(server.updated_at).getTime()
    const clientTimestamp = local._clientTimestamp

    // If client version is older than server, there's a conflict
    if (clientTimestamp < serverTimestamp) {
      return {
        hasConflict: true,
        serverWins: true,
        details: `Server was updated at ${new Date(serverTimestamp).toLocaleTimeString()}. Your changes are based on an older version.`
      }
    }

    return { hasConflict: false, serverWins: false, details: 'No conflict' }
  }

  /**
   * Merge conflicting versions using 3-way merge strategy
   * Prefers server version but preserves non-conflicting client changes
   */
  static merge3Way(original: VersionedEntity, local: VersionedEntity, server: VersionedEntity): VersionedEntity {
    const merged = { ...server }
    
    // For each field in local, check if it changed from original
    for (const key in local) {
      if (key.startsWith('_')) continue // Skip internal fields
      
      const originalVal = (original as any)[key]
      const localVal = (local as any)[key]
      const serverVal = (server as any)[key]
      
      // If field changed locally but not on server, keep local change
      if (localVal !== originalVal && serverVal === originalVal) {
        (merged as any)[key] = localVal
      }
      // If both changed, server wins (last-write-wins with notification)
      else if (localVal !== originalVal && serverVal !== originalVal) {
        console.warn(`Conflict in field ${key}: local=${localVal}, server=${serverVal}. Using server value.`)
      }
    }
    
    return merged
  }
}

/**
 * Hook for adding version tracking to API calls
 */
export const useVersionedMutation = () => {
  return {
    /**
     * Wrap an API call with conflict detection
     */
    withConflictDetection: async <T extends VersionedEntity>(
      apiCall: () => Promise<T>,
      localData: T,
      onConflict?: (conflict: { hasConflict: boolean; serverVersion: T }) => void
    ): Promise<T> => {
      try {
        const result = await apiCall()
        
        // Check for conflicts
        const conflict = ConflictDetector.detectConflict(localData, result)
        if (conflict.hasConflict) {
          console.warn('Conflict detected:', conflict.details)
          onConflict?.({ hasConflict: true, serverVersion: result })
        }
        
        return result
      } catch (error) {
        console.error('API call failed:', error)
        throw error
      }
    },

    /**
     * Create versioned payload for mutations
     */
    createVersionedPayload: (data: any): VersionedEntity & typeof data => ({
      ...data,
      _clientTimestamp: Date.now(),
      _clientVersion: 1
    })
  }
}
