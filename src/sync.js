/**
 * 🧠 ULTRATHINK: Seed/Sync Questions
 * 
 * Philosophy: "Simplify Ruthlessly"
 * This script does ONE thing: sync local questions.json to Firebase
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js'

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBAzyXi8wKMSN3NceSqPfBhrvePnbp2uyg",
  authDomain: "quiz-servel.firebaseapp.com",
  projectId: "quiz-servel",
  storageBucket: "quiz-servel.firebasestorage.app",
  messagingSenderId: "515841741198",
  appId: "1:515841741198:web:4762502ddc6b35819794df"
}

class QuestionSyncer {
  #db
  
  constructor() {
    const app = initializeApp(FIREBASE_CONFIG)
    this.#db = getFirestore(app)
  }
  
  async sync() {
    console.log('🔄 Starting sync...')
    
    try {
      // 1. Delete existing
      await this.#deleteAll()
      
      // 2. Load from JSON
      const questions = await this.#loadLocal()
      console.log(`📦 Loaded ${questions.length} questions from local file`)
      
      // 3. Upload to Firebase
      await this.#upload(questions)
      
      console.log('✅ Sync complete!')
      
    } catch (error) {
      console.error('❌ Sync failed:', error)
      throw error
    }
  }
  
  async #deleteAll() {
    console.log('🗑️  Deleting existing questions...')
    const snapshot = await getDocs(collection(this.#db, 'questions'))
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(this.#db, 'questions', docSnap.id))
    }
    
    console.log(`   Deleted ${snapshot.size} questions`)
  }
  
  async #loadLocal() {
    const response = await fetch('/questions.json')
    if (!response.ok) {
      throw new Error('Failed to load questions.json')
    }
    
    const data = await response.json()
    
    // Normalize to Firestore format and filter out invalid entries
    return data
      .map((q, index) => {
        // Validate required fields
        const questionText = q.question || q.question_text
        const correctAnswerKey = q.correctAnswerKey || q.correct_answer_key || q.answer
        
        if (!questionText || !Array.isArray(q.options) || !correctAnswerKey) {
          console.warn(`⚠️  Skipping invalid question at index ${index}:`, {
            hasQuestion: !!questionText,
            hasOptions: Array.isArray(q.options),
            hasAnswer: !!correctAnswerKey
          })
          return null
        }
        
        // Build normalized object with only defined values
        const normalized = {
          question_text: questionText,
          options: q.options.map(opt => ({
            key: opt.key || opt.option_key || '',
            text: opt.text || opt.label || ''
          })),
          correct_answer_key: correctAnswerKey
        }
        
        // Only add explanation if it exists and is not empty
        const explanation = q.explanation || q.detail || ''
        if (explanation) {
          normalized.explanation = explanation
        }
        
        return normalized
      })
      .filter(q => q !== null) // Remove invalid entries
  }
  
  async #upload(questions) {
    console.log('⬆️  Uploading to Firebase...')
    
    let count = 0
    for (const question of questions) {
      await addDoc(collection(this.#db, 'questions'), question)
      count++
      
      if (count % 10 === 0) {
        console.log(`   Uploaded ${count}/${questions.length}...`)
      }
    }
    
    console.log(`   Uploaded ${count} questions`)
  }
}

// Auto-run if loaded with ?sync=1
const params = new URLSearchParams(window.location.search)
if (params.get('sync') === '1') {
  const syncer = new QuestionSyncer()
  syncer.sync()
    .then(() => {
      document.body.innerHTML = `
        <div style="
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: system-ui, sans-serif;
        ">
          <div style="text-align: center;">
            <h1 style="font-size: 3rem; margin: 0;">✅</h1>
            <h2 style="font-size: 2rem; margin: 1rem 0;">Sync Complete</h2>
            <p style="opacity: 0.9;">Questions uploaded to Firebase</p>
            <a href="/" style="
              display: inline-block;
              margin-top: 2rem;
              padding: 0.75rem 2rem;
              background: white;
              color: #667eea;
              text-decoration: none;
              border-radius: 0.5rem;
              font-weight: 600;
            ">Go to Quiz</a>
          </div>
        </div>
      `
    })
    .catch(error => {
      document.body.innerHTML = `
        <div style="
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1f2937;
          color: white;
          font-family: system-ui, sans-serif;
        ">
          <div style="text-align: center; max-width: 600px; padding: 2rem;">
            <h1 style="font-size: 3rem; margin: 0;">❌</h1>
            <h2 style="font-size: 2rem; margin: 1rem 0;">Sync Failed</h2>
            <pre style="
              background: #111827;
              padding: 1rem;
              border-radius: 0.5rem;
              text-align: left;
              overflow-x: auto;
            ">${error.message}</pre>
          </div>
        </div>
      `
    })
}

export { QuestionSyncer }
