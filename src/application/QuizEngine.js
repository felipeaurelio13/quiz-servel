/**
 * 🧠 ULTRATHINK Application Layer: QuizEngine
 * 
 * Philosophy:
 * "Plan Like Da Vinci" - The engine is a state machine.
 * States are explicit, transitions are controlled.
 * 
 * State Machine:
 * IDLE → READY → PLAYING → COMPLETE
 * 
 * IDLE: No questions loaded yet
 * READY: Questions loaded, waiting for player to start
 * PLAYING: Active quiz session
 * COMPLETE: Session finished, showing results
 * 
 * Why this matters:
 * - Impossible to reach invalid states
 * - Clear mental model of application flow
 * - Easy to test (just verify state transitions)
 */

import { QuizSession } from '../domain/QuizSession.js'
import { Question } from '../domain/Question.js'

// ULTRATHINK: States are values, not strings
// This prevents typos and enables IDE autocomplete
const State = Object.freeze({
  IDLE: 'IDLE',
  READY: 'READY',
  PLAYING: 'PLAYING',
  COMPLETE: 'COMPLETE'
})

export class QuizEngine {
  #state
  #questions
  #currentSession
  #scoreCalculator
  #questionRepository
  #scoreRepository
  #storage
  
  constructor({ scoreCalculator, questionRepository, scoreRepository, storage }) {
    this.#state = State.IDLE
    this.#questions = []
    this.#currentSession = null
    this.#scoreCalculator = scoreCalculator
    this.#questionRepository = questionRepository
    this.#scoreRepository = scoreRepository
    this.#storage = storage
  }
  
  /**
   * ULTRATHINK: State queries
   * Expressive, self-documenting
   */
  state() { return this.#state }
  isIdle() { return this.#state === State.IDLE }
  isReady() { return this.#state === State.READY }
  isPlaying() { return this.#state === State.PLAYING }
  isComplete() { return this.#state === State.COMPLETE }
  
  /**
   * ULTRATHINK: Initialization
   * Load questions from repository
   */
  async loadQuestions(questions) {
    if (this.#state !== State.IDLE) {
      console.warn('Questions already loaded')
      return
    }
    
    // ULTRATHINK: Domain objects, not raw data
    this.#questions = questions.map(q => 
      q instanceof Question ? q : Question.fromFirestore(q)
    )
    
    this.#state = State.READY
  }
  
  /**
   * ULTRATHINK: Start new session
   * Transition: READY → PLAYING
   */
  start({ playerName, questionCount = 15 }) {
    if (this.#state !== State.READY && this.#state !== State.COMPLETE) {
      throw new Error(`Cannot start from state: ${this.#state}`)
    }
    
    if (this.#questions.length === 0) {
      throw new Error('No questions available')
    }
    
    if (questionCount > this.#questions.length) {
      throw new Error(`Only ${this.#questions.length} questions available`)
    }
    
    // ULTRATHINK: Select and shuffle questions
    const selectedQuestions = this.#selectRandomQuestions(questionCount)
      .map(q => q.withShuffledOptions())
    
    // Track seen question IDs
    const questionIds = selectedQuestions.map((q, idx) => 
      this.#questions.findIndex(original => original.text === q.text)
    )
    this.#storage?.addSeenQuestionIds(questionIds)
    
    this.#currentSession = new QuizSession({
      playerName,
      questions: selectedQuestions
    })
    
    this.#state = State.PLAYING
    
    return {
      question: this.currentQuestion(),
      progress: this.#currentSession.progress()
    }
  }
  
  /**
   * ULTRATHINK: Answer current question
   * This is the core game loop action
   */
  answerCurrentQuestion(selectedKey) {
    if (this.#state !== State.PLAYING) {
      throw new Error('No active quiz session')
    }
    
    const result = this.#currentSession.answer(selectedKey)
    
    if (result.isSessionComplete) {
      this.#state = State.COMPLETE
    }
    
    return result
  }
  
  /**
   * ULTRATHINK: Query current state
   */
  currentQuestion() {
    return this.#currentSession?.currentQuestion()
  }
  
  currentProgress() {
    return this.#currentSession?.progress() || { current: 0, total: 0, percentage: 0 }
  }
  
  /**
   * ULTRATHINK: Get final results
   * Only available in COMPLETE state
   */
  results() {
    if (!this.#currentSession) {
      return {
        score: { correct: 0, incorrect: 0, total: 0, percentage: 0 },
        streaks: { current: 0, longest: 0 },
        answers: []
      }
    }
    
    if (this.#state !== State.COMPLETE) {
      // Return partial results for live updates
      return this.#currentSession.summary()
    }
    
    return this.#currentSession.summary()
  }
  
  /**
   * ULTRATHINK: Save score to leaderboard
   */
  async saveScore() {
    if (this.#state !== State.COMPLETE) {
      throw new Error('Cannot save incomplete quiz')
    }
    
    const entry = this.#currentSession.toLeaderboardEntry()
    await this.#scoreRepository.saveScore(entry)
    
    return entry
  }
  
  /**
   * ULTRATHINK: Reset for new game
   * Transition: COMPLETE → READY
   */
  restart() {
    if (this.#state !== State.COMPLETE) {
      throw new Error('Can only restart completed quiz')
    }
    
    this.#currentSession = null
    this.#state = State.READY
  }
  
  /**
   * ULTRATHINK: Private helper
   * Smart selection: avoids recently seen questions
   */
  #selectRandomQuestions(count) {
    // Get seen question indices
    const seenIds = new Set(this.#storage?.getSeenQuestionIds() || [])
    
    // Filter unseen questions
    let availableQuestions = this.#questions
      .map((q, idx) => ({ question: q, index: idx }))
      .filter(item => !seenIds.has(item.index))
    
    // If not enough unseen, reset and use all
    if (availableQuestions.length < count) {
      console.log('Resetting seen questions - you completed the bank!')
      this.#storage?.clearSeenQuestions()
      availableQuestions = this.#questions.map((q, idx) => ({ question: q, index: idx }))
    }
    
    // Regular random selection
    const selected = this.#fisherYatesShuffle(availableQuestions).slice(0, count)
    
    return selected.map(item => item.question)
  }
  
  #fisherYatesShuffle(array) {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
}

// Export State for testing
export { State }
