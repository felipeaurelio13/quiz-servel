/**
 * 🧠 ULTRATHINK Infrastructure: FirebaseAdapter
 * 
 * Philosophy:
 * "Simplify Ruthlessly" - Firebase is an implementation detail.
 * The domain doesn't know about Firestore, collections, or serverTimestamp.
 * 
 * Adapter Pattern:
 * Translates between domain model and Firebase's data format.
 * This allows us to swap Firebase for another backend without touching domain logic.
 * 
 * Graceful Degradation:
 * If Firebase fails, fall back to local cache or demo data.
 * The app still works, just with reduced functionality.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'

import { Question } from '../domain/Question.js'

export class FirebaseAdapter {
  #db
  #isConnected
  
  constructor(config) {
    try {
      // ULTRATHINK: Validate config before initialization
      if (!config?.apiKey || config.apiKey === 'YOUR_API_KEY') {
        throw new Error('Invalid Firebase configuration')
      }
      
      const app = initializeApp(config)
      this.#db = getFirestore(app)
      this.#isConnected = true
      
    } catch (error) {
      console.warn('Firebase initialization failed:', error.message)
      this.#isConnected = false
    }
  }
  
  /**
   * ULTRATHINK: Load questions from Firestore
   * Returns domain objects, not raw data
   */
  async loadQuestions() {
    if (!this.#isConnected) {
      return this.#loadFromLocalFallback()
    }
    
    try {
      const snapshot = await getDocs(collection(this.#db, 'questions'))
      
      const questions = snapshot.docs
        .map(doc => {
          try {
            return Question.fromFirestore(doc.data())
          } catch (error) {
            console.warn('Invalid question in Firestore:', error.message)
            return null
          }
        })
        .filter(Boolean)
      
      // ULTRATHINK: Cache for offline use
      this.#cacheQuestions(questions)
      
      return questions
      
    } catch (error) {
      console.warn('Failed to load from Firebase:', error.message)
      return this.#loadFromLocalFallback()
    }
  }
  
  /**
   * ULTRATHINK: Save score to leaderboard
   * Accepts domain object, converts to Firestore format
   */
  async saveScore(scoreEntry) {
    if (!this.#isConnected) {
      // ULTRATHINK: Graceful degradation - save locally
      this.#saveToLocalQueue(scoreEntry)
      throw new Error('Offline - score saved locally')
    }
    
    try {
      const firestoreEntry = {
        player_name: scoreEntry.player_name,
        score: scoreEntry.score,
        total_questions_in_quiz: scoreEntry.total_questions_in_quiz,
        created_at: serverTimestamp()
      }
      
      await addDoc(collection(this.#db, 'leaderboard'), firestoreEntry)
      
      return true
      
    } catch (error) {
      console.error('Failed to save score:', error.message)
      this.#saveToLocalQueue(scoreEntry)
      throw error
    }
  }
  
  /**
   * ULTRATHINK: Fetch leaderboard
   * Returns sorted, filtered entries
   */
  async fetchLeaderboard({ questionCount, limit: maxEntries = 50 }) {
    if (!this.#isConnected) {
      return this.#loadLeaderboardFromCache()
    }
    
    try {
      // ULTRATHINK: Try compound query first (requires index)
      const q = query(
        collection(this.#db, 'leaderboard'),
        where('total_questions_in_quiz', '==', questionCount),
        orderBy('score', 'desc'),
        orderBy('created_at', 'asc'),
        limit(maxEntries)
      )
      
      const snapshot = await getDocs(q)
      const entries = snapshot.docs.map(doc => doc.data())
      
      // Cache for offline
      this.#cacheLeaderboard(entries, questionCount)
      
      return entries
      
    } catch (error) {
      if (error.code === 'failed-precondition') {
        // ULTRATHINK: Fallback to client-side filtering
        return this.#fetchLeaderboardWithClientFilter(questionCount, maxEntries)
      }
      
      console.warn('Leaderboard fetch failed:', error.message)
      return this.#loadLeaderboardFromCache()
    }
  }
  
  /**
   * ULTRATHINK: Private helpers for graceful degradation
   */
  #loadFromLocalFallback() {
    try {
      const cached = localStorage.getItem('quiz_questions_cache')
      if (cached) {
        const data = JSON.parse(cached)
        return data.map(q => Question.fromFirestore(q))
      }
    } catch (error) {
      console.warn('Cache load failed:', error.message)
    }
    
    // ULTRATHINK: Last resort - return empty array
    // Better to show "no questions" than crash
    return []
  }
  
  #cacheQuestions(questions) {
    try {
      const serialized = questions.map(q => q.toJSON())
      localStorage.setItem('quiz_questions_cache', JSON.stringify(serialized))
    } catch (error) {
      // Storage full or disabled - not critical
      console.warn('Could not cache questions:', error.message)
    }
  }
  
  #saveToLocalQueue(scoreEntry) {
    try {
      const queue = JSON.parse(localStorage.getItem('pending_scores') || '[]')
      queue.push(scoreEntry)
      localStorage.setItem('pending_scores', JSON.stringify(queue))
    } catch (error) {
      console.warn('Could not save score locally:', error.message)
    }
  }
  
  #cacheLeaderboard(entries, questionCount) {
    try {
      const key = `leaderboard_${questionCount}`
      localStorage.setItem(key, JSON.stringify(entries))
    } catch (error) {
      console.warn('Could not cache leaderboard:', error.message)
    }
  }
  
  #loadLeaderboardFromCache() {
    try {
      const cached = localStorage.getItem('leaderboard_cache')
      return cached ? JSON.parse(cached) : []
    } catch (error) {
      return []
    }
  }
  
  async #fetchLeaderboardWithClientFilter(questionCount, maxEntries) {
    // Fallback when compound index doesn't exist
    const q = query(
      collection(this.#db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(200) // Get larger set for filtering
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs
      .map(doc => doc.data())
      .filter(entry => entry.total_questions_in_quiz === questionCount)
      .slice(0, maxEntries)
  }
}
