/**
 * 🧠 ULTRATHINK Domain Model: QuizSession
 * 
 * Philosophy:
 * "Think Different" - A quiz session is not a collection of variables.
 * It's a cohesive entity that owns its lifecycle and rules.
 * 
 * Encapsulation principle:
 * All quiz state lives here. No scattered global variables.
 * The session is the single source of truth.
 * 
 * Invariants:
 * - Current index never exceeds questions length
 * - Cannot answer same question twice
 * - Progress is monotonic (never goes backward)
 */

import { Question } from './Question.js'

export class QuizSession {
  #playerName
  #questions
  #answers
  #currentIndex
  #startedAt
  #completedAt
  
  constructor({ playerName, questions, startedAt = new Date() }) {
    if (!playerName?.trim()) {
      throw new Error('Player name is required')
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Session must have at least one question')
    }
    
    // ULTRATHINK: Validate domain invariants at construction
    const allValid = questions.every(q => q instanceof Question)
    if (!allValid) {
      throw new Error('All questions must be Question instances')
    }
    
    this.#playerName = playerName.trim()
    this.#questions = Object.freeze([...questions])
    this.#answers = []
    this.#currentIndex = 0
    this.#startedAt = startedAt
    this.#completedAt = null
  }
  
  /**
   * ULTRATHINK: Naming that expresses business logic
   * Not "getCurrentQuestion" - that's implementation detail
   * Simply: what question are we on?
   */
  currentQuestion() {
    if (this.isComplete()) {
      return null
    }
    return this.#questions[this.#currentIndex]
  }
  
  /**
   * ULTRATHINK: Command method
   * Records an answer and advances the session
   * Returns rich result object for UI feedback
   */
  answer(selectedKey) {
    if (this.isComplete()) {
      throw new Error('Cannot answer - quiz is complete')
    }
    
    const question = this.currentQuestion()
    const isCorrect = question.isCorrect(selectedKey)
    
    // Record the answer
    this.#answers.push({
      question,
      selectedKey,
      isCorrect,
      answeredAt: new Date()
    })
    
    // Advance to next question
    this.#currentIndex++
    
    // Mark complete if no more questions
    if (this.#currentIndex >= this.#questions.length) {
      this.#completedAt = new Date()
    }
    
    // ULTRATHINK: Return rich domain object, not primitive
    return {
      isCorrect,
      correctAnswer: question.revealAnswer(),
      progress: this.progress(),
      isSessionComplete: this.isComplete()
    }
  }
  
  /**
   * ULTRATHINK: Query methods
   * Express state in business terms, not technical ones
   */
  isComplete() {
    return this.#currentIndex >= this.#questions.length
  }
  
  totalQuestions() {
    return this.#questions.length
  }
  
  progress() {
    return {
      current: this.#currentIndex + 1,
      total: this.totalQuestions(),
      percentage: Math.round((this.#currentIndex / this.totalQuestions()) * 100)
    }
  }
  
  /**
   * ULTRATHINK: Derived state is computed, not stored
   * No redundant score variable to keep in sync
   */
  calculateScore() {
    const correct = this.#answers.filter(a => a.isCorrect).length
    const total = this.totalQuestions()
    const percentage = total > 0 ? (correct / total) * 100 : 0
    
    return {
      correct,
      incorrect: total - correct,
      total,
      percentage: Math.round(percentage * 100) / 100
    }
  }
  
  /**
   * ULTRATHINK: Domain logic for streaks
   * The session knows its own patterns
   */
  calculateStreaks() {
    let currentStreak = 0
    let longestStreak = 0
    
    for (const answer of this.#answers) {
      if (answer.isCorrect) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }
    
    return {
      current: currentStreak,
      longest: longestStreak
    }
  }
  
  /**
   * ULTRATHINK: Self-documenting API
   * Get complete summary for results screen
   */
  summary() {
    return {
      playerName: this.#playerName,
      score: this.calculateScore(),
      streaks: this.calculateStreaks(),
      answers: this.#answers.map(a => ({
        questionText: a.question.text,
        selectedKey: a.selectedKey,
        correctKey: a.question.revealAnswer().correctKey,
        explanation: a.question.revealAnswer().explanation,
        isCorrect: a.isCorrect,
        options: a.question.options
      })),
      duration: this.#completedAt 
        ? this.#completedAt - this.#startedAt 
        : Date.now() - this.#startedAt
    }
  }
  
  /**
   * ULTRATHINK: Conversion for persistence
   */
  toLeaderboardEntry() {
    const score = this.calculateScore()
    
    return {
      player_name: this.#playerName,
      score: score.correct,
      total_questions_in_quiz: score.total,
      created_at: this.#completedAt || new Date()
    }
  }
}
