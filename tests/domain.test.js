/**
 * 🧠 ULTRATHINK Test Suite - Domain Layer
 * 
 * Philosophy:
 * "Iterate Relentlessly" - Tests are documentation that never lies.
 * 
 * These tests prove the domain model is:
 * - Self-contained (no external dependencies)
 * - Immutable (cannot be corrupted)
 * - Expressive (reads like specs)
 */

import { Question } from '../src/domain/Question.js'
import { QuizSession } from '../src/domain/QuizSession.js'

// ============================================
// Question Tests
// ============================================

describe('Question', () => {
  const validQuestionData = {
    text: '¿Cuál es la capital de Chile?',
    options: [
      { key: 'a', text: 'Santiago' },
      { key: 'b', text: 'Lima' },
      { key: 'c', text: 'Buenos Aires' },
      { key: 'd', text: 'Bogotá' }
    ],
    correctKey: 'a',
    explanation: 'Santiago es la capital de Chile desde 1818.'
  }
  
  test('creates valid question from data', () => {
    const question = new Question(validQuestionData)
    
    expect(question.text).toBe('¿Cuál es la capital de Chile?')
    expect(question.options).toHaveLength(4)
  })
  
  test('validates correct answer', () => {
    const question = new Question(validQuestionData)
    
    expect(question.isCorrect('a')).toBe(true)
    expect(question.isCorrect('b')).toBe(false)
  })
  
  test('is immutable', () => {
    const question = new Question(validQuestionData)
    
    // Cannot modify options
    expect(() => {
      question.options.push({ key: 'e', text: 'Invalid' })
    }).toThrow()
    
    // Cannot modify question itself
    expect(() => {
      question.text = 'Changed'
    }).toThrow()
  })
  
  test('throws on invalid data', () => {
    expect(() => {
      new Question({ ...validQuestionData, text: '' })
    }).toThrow('Question text is required')
    
    expect(() => {
      new Question({ ...validQuestionData, options: [] })
    }).toThrow('must have at least 2 options')
    
    expect(() => {
      new Question({ ...validQuestionData, correctKey: 'z' })
    }).toThrow('Correct answer key must match')
  })
  
  test('reveals answer with explanation', () => {
    const question = new Question(validQuestionData)
    const revealed = question.revealAnswer()
    
    expect(revealed.correctKey).toBe('a')
    expect(revealed.explanation).toContain('Santiago')
  })
  
  test('shuffles options while preserving correctness', () => {
    const question = new Question(validQuestionData)
    const shuffled = question.withShuffledOptions()
    
    // Still knows correct answer
    expect(shuffled.isCorrect('a')).toBe(true)
    
    // Has same options (different order)
    expect(shuffled.options).toHaveLength(question.options.length)
  })
  
  test('converts to/from Firestore format', () => {
    const firestoreData = {
      question_text: '¿Quién es el presidente?',
      options: [
        { key: 'a', text: 'Gabriel Boric' },
        { key: 'b', text: 'Sebastián Piñera' }
      ],
      correct_answer_key: 'a',
      explanation: 'Gabriel Boric es el presidente actual.'
    }
    
    const question = Question.fromFirestore(firestoreData)
    expect(question.text).toBe('¿Quién es el presidente?')
    
    const exported = question.toJSON()
    expect(exported.question_text).toBe(firestoreData.question_text)
  })
})

// ============================================
// QuizSession Tests
// ============================================

describe('QuizSession', () => {
  const questions = [
    new Question({
      text: 'Pregunta 1',
      options: [
        { key: 'a', text: 'Correcta' },
        { key: 'b', text: 'Incorrecta' }
      ],
      correctKey: 'a'
    }),
    new Question({
      text: 'Pregunta 2',
      options: [
        { key: 'a', text: 'Incorrecta' },
        { key: 'b', text: 'Correcta' }
      ],
      correctKey: 'b'
    }),
    new Question({
      text: 'Pregunta 3',
      options: [
        { key: 'a', text: 'Correcta' },
        { key: 'b', text: 'Incorrecta' }
      ],
      correctKey: 'a'
    })
  ]
  
  test('creates valid session', () => {
    const session = new QuizSession({
      playerName: 'Test Player',
      questions
    })
    
    expect(session.currentQuestion()).toBe(questions[0])
    expect(session.totalQuestions()).toBe(3)
    expect(session.isComplete()).toBe(false)
  })
  
  test('throws on invalid creation', () => {
    expect(() => {
      new QuizSession({ playerName: '', questions })
    }).toThrow('Player name is required')
    
    expect(() => {
      new QuizSession({ playerName: 'Test', questions: [] })
    }).toThrow('must have at least one question')
  })
  
  test('advances through questions', () => {
    const session = new QuizSession({
      playerName: 'Test',
      questions
    })
    
    // Answer first question correctly
    const result1 = session.answer('a')
    expect(result1.isCorrect).toBe(true)
    expect(session.currentQuestion()).toBe(questions[1])
    
    // Answer second incorrectly
    const result2 = session.answer('a')
    expect(result2.isCorrect).toBe(false)
    expect(session.currentQuestion()).toBe(questions[2])
    
    // Answer third correctly
    const result3 = session.answer('a')
    expect(result3.isCorrect).toBe(true)
    expect(session.isComplete()).toBe(true)
  })
  
  test('calculates score correctly', () => {
    const session = new QuizSession({
      playerName: 'Test',
      questions
    })
    
    session.answer('a') // correct
    session.answer('a') // incorrect
    session.answer('a') // correct
    
    const score = session.calculateScore()
    
    expect(score.correct).toBe(2)
    expect(score.incorrect).toBe(1)
    expect(score.total).toBe(3)
    expect(score.percentage).toBeCloseTo(66.67, 2)
  })
  
  test('tracks streaks correctly', () => {
    const session = new QuizSession({
      playerName: 'Test',
      questions
    })
    
    session.answer('a') // correct (streak = 1)
    session.answer('b') // correct (streak = 2)
    session.answer('a') // correct (streak = 3)
    
    const streaks = session.calculateStreaks()
    
    expect(streaks.current).toBe(3)
    expect(streaks.longest).toBe(3)
  })
  
  test('resets streak on incorrect answer', () => {
    const manyQuestions = Array(5).fill(null).map((_, i) => 
      new Question({
        text: `Pregunta ${i}`,
        options: [
          { key: 'a', text: 'Correcta' },
          { key: 'b', text: 'Incorrecta' }
        ],
        correctKey: 'a'
      })
    )
    
    const session = new QuizSession({
      playerName: 'Test',
      questions: manyQuestions
    })
    
    session.answer('a') // correct (streak = 1)
    session.answer('a') // correct (streak = 2)
    session.answer('b') // incorrect (streak = 0)
    session.answer('a') // correct (streak = 1)
    session.answer('a') // correct (streak = 2)
    
    const streaks = session.calculateStreaks()
    
    expect(streaks.current).toBe(2)
    expect(streaks.longest).toBe(2) // max was 2 before reset
  })
  
  test('generates complete summary', () => {
    const session = new QuizSession({
      playerName: 'Test Player',
      questions
    })
    
    session.answer('a')
    session.answer('b')
    session.answer('a')
    
    const summary = session.summary()
    
    expect(summary.playerName).toBe('Test Player')
    expect(summary.score.correct).toBe(3)
    expect(summary.answers).toHaveLength(3)
    expect(summary.streaks.longest).toBe(3)
    expect(summary.duration).toBeGreaterThan(0)
  })
  
  test('converts to leaderboard entry format', () => {
    const session = new QuizSession({
      playerName: 'Test Player',
      questions
    })
    
    session.answer('a')
    session.answer('b')
    session.answer('a')
    
    const entry = session.toLeaderboardEntry()
    
    expect(entry.player_name).toBe('Test Player')
    expect(entry.score).toBe(3)
    expect(entry.total_questions_in_quiz).toBe(3)
    expect(entry.created_at).toBeInstanceOf(Date)
  })
  
  test('prevents answering completed quiz', () => {
    const session = new QuizSession({
      playerName: 'Test',
      questions: [questions[0]]
    })
    
    session.answer('a')
    
    expect(() => {
      session.answer('b')
    }).toThrow('Cannot answer - quiz is complete')
  })
})

// Run tests
console.log('🧪 Running ULTRATHINK domain tests...')
