/**
 * Undo/Redo History Management System
 * Tracks mutations and allows reverting to previous states
 */

export interface HistoryState {
  meals?: Record<string, any>
  templates?: Record<string, any>
  timestamp: number
  action: string
}

export class HistoryManager {
  private past: HistoryState[] = []
  private future: HistoryState[] = []
  private currentState: HistoryState | null = null
  private maxSize = 50 // Max undo/redo steps

  /**
   * Push a new state to history (clears future on new action)
   */
  push(state: Partial<HistoryState>, action: string) {
    if (this.currentState) {
      this.past.push(this.currentState)
    }
    this.currentState = {
      ...state,
      timestamp: Date.now(),
      action
    }
    this.future = [] // Clear redo stack on new action
    
    // Enforce max history size
    if (this.past.length > this.maxSize) {
      this.past.shift()
    }
  }

  /**
   * Undo to previous state
   */
  undo(): HistoryState | null {
    if (this.past.length === 0) return null
    
    if (this.currentState) {
      this.future.push(this.currentState)
    }
    this.currentState = this.past.pop() || null
    return this.currentState
  }

  /**
   * Redo to next state
   */
  redo(): HistoryState | null {
    if (this.future.length === 0) return null
    
    if (this.currentState) {
      this.past.push(this.currentState)
    }
    this.currentState = this.future.pop() || null
    return this.currentState
  }

  /**
   * Get current state
   */
  getCurrentState(): HistoryState | null {
    return this.currentState
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.past.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.future.length > 0
  }

  /**
   * Get history summary for debugging
   */
  getSummary() {
    return {
      pastActions: this.past.map(s => s.action),
      currentAction: this.currentState?.action,
      futureActions: this.future.map(s => s.action),
    }
  }

  /**
   * Clear all history
   */
  clear() {
    this.past = []
    this.future = []
    this.currentState = null
  }
}

// React hook for using history
export const useHistory = () => {
  const [history] = React.useState(() => new HistoryManager())

  return {
    push: (state: Partial<HistoryState>, action: string) => history.push(state, action),
    undo: () => history.undo(),
    redo: () => history.redo(),
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    state: history.getCurrentState(),
  }
}

// Import React for the hook
import React from 'react'
