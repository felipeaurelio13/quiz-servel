/**
 * 🧠 ULTRATHINK Infrastructure: StorageAdapter
 * 
 * Philosophy:
 * "Simplify Ruthlessly" - LocalStorage is an implementation detail.
 * Wrap it in a clean interface that handles errors gracefully.
 * 
 * Why adapter?
 * - Domain doesn't know about localStorage
 * - Easy to swap for sessionStorage, IndexedDB, or API
 * - Centralized error handling
 * - Type-safe methods
 */

export class StorageAdapter {
  #prefix
  
  constructor(prefix = 'quiz_') {
    this.#prefix = prefix
  }
  
  /**
   * ULTRATHINK: Get value with type safety
   * Returns null if not found or error
   */
  get(key) {
    try {
      const fullKey = this.#prefix + key
      const value = localStorage.getItem(fullKey)
      
      if (value === null) return null
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    } catch (error) {
      console.warn(`Storage get failed for key: ${key}`, error.message)
      return null
    }
  }
  
  /**
   * ULTRATHINK: Set value with automatic serialization
   */
  set(key, value) {
    try {
      const fullKey = this.#prefix + key
      const serialized = typeof value === 'string' 
        ? value 
        : JSON.stringify(value)
      
      localStorage.setItem(fullKey, serialized)
      return true
    } catch (error) {
      console.warn(`Storage set failed for key: ${key}`, error.message)
      return false
    }
  }
  
  /**
   * ULTRATHINK: Remove value
   */
  remove(key) {
    try {
      const fullKey = this.#prefix + key
      localStorage.removeItem(fullKey)
      return true
    } catch (error) {
      console.warn(`Storage remove failed for key: ${key}`, error.message)
      return false
    }
  }
  
  /**
   * ULTRATHINK: Clear all app storage
   */
  clear() {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.#prefix)) {
          localStorage.removeItem(key)
        }
      })
      return true
    } catch (error) {
      console.warn('Storage clear failed', error.message)
      return false
    }
  }
  
  /**
   * ULTRATHINK: Check if storage is available
   * Useful for privacy mode detection
   */
  isAvailable() {
    try {
      const testKey = this.#prefix + '__test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}
