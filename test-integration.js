/**
 * 🧠 ULTRATHINK: Simple Integration Test
 * 
 * Purpose: Verify the complete flow works end-to-end
 * This is not a unit test - it's a smoke test
 */

// Mock minimal dependencies
const mockQuestions = [
  {
    question_text: '¿Cuál es el sistema electoral de Chile?',
    options: [
      { key: 'a', text: 'Mayoritario' },
      { key: 'b', text: 'Proporcional' },
      { key: 'c', text: 'Mixto' },
      { key: 'd', text: 'Ninguno' }
    ],
    correct_answer_key: 'b',
    explanation: 'Chile usa un sistema proporcional'
  },
  {
    question_text: '¿Quién fiscaliza las elecciones en Chile?',
    options: [
      { key: 'a', text: 'SERVEL' },
      { key: 'b', text: 'Gobierno' },
      { key: 'c', text: 'Congreso' },
      { key: 'd', text: 'Tribunal' }
    ],
    correct_answer_key: 'a',
    explanation: 'El SERVEL fiscaliza las elecciones'
  },
  {
    question_text: '¿Desde qué edad se puede votar en Chile?',
    options: [
      { key: 'a', text: '16 años' },
      { key: 'b', text: '17 años' },
      { key: 'c', text: '18 años' },
      { key: 'd', text: '21 años' }
    ],
    correct_answer_key: 'c',
    explanation: 'Se puede votar desde los 18 años'
  }
]

async function runTests() {
  console.group('🧪 ULTRATHINK Integration Tests')
  
  let passed = 0
  let failed = 0
  
  const test = (name, fn) => {
    try {
      fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.error(`❌ ${name}`)
      console.error(error)
      failed++
    }
  }
  
  const testAsync = async (name, fn) => {
    try {
      await fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.error(`❌ ${name}`)
      console.error(error)
      failed++
    }
  }
  
  // Import modules
  const { Question } = await import('./src/domain/Question.js')
  const { QuizSession } = await import('./src/domain/QuizSession.js')
  const { ScoreCalculator } = await import('./src/application/ScoreCalculator.js')
  const { QuizEngine } = await import('./src/application/QuizEngine.js')
  
  console.group('📦 Domain Layer')
  
  test('Question can be created from valid data', () => {
    const q = Question.fromFirestore(mockQuestions[0])
    if (!q.text) throw new Error('No text')
    if (q.options.length !== 4) throw new Error('Wrong options count')
  })
  
  test('Question is immutable', () => {
    const q = Question.fromFirestore(mockQuestions[0])
    if (!Object.isFrozen(q)) throw new Error('Not frozen')
  })
  
  test('Question validates correct answer', () => {
    const q = Question.fromFirestore(mockQuestions[0])
    if (!q.isCorrect('b')) throw new Error('Should be correct')
    if (q.isCorrect('a')) throw new Error('Should be incorrect')
  })
  
  test('QuizSession can be created', () => {
    const questions = mockQuestions.map(q => Question.fromFirestore(q))
    const session = new QuizSession({
      playerName: 'Test Player',
      questions
    })
    if (!session.currentQuestion()) throw new Error('No current question')
  })
  
  test('QuizSession advances on answer', () => {
    const questions = mockQuestions.map(q => Question.fromFirestore(q))
    const session = new QuizSession({
      playerName: 'Test Player',
      questions
    })
    
    const firstQuestion = session.currentQuestion()
    session.answer('a') // Answer first question
    const secondQuestion = session.currentQuestion()
    
    if (firstQuestion === secondQuestion) {
      throw new Error('Did not advance')
    }
  })
  
  test('QuizSession completes when all answered', () => {
    const questions = mockQuestions.map(q => Question.fromFirestore(q))
    const session = new QuizSession({
      playerName: 'Test Player',
      questions
    })
    
    // Answer all questions
    session.answer('a')
    session.answer('a')
    session.answer('a')
    
    if (!session.isComplete()) {
      throw new Error('Should be complete')
    }
  })
  
  console.groupEnd()
  
  console.group('⚙️ Application Layer')
  
  test('ScoreCalculator calculates correctly', () => {
    const calculator = new ScoreCalculator()
    const answers = [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: false }
    ]
    
    const score = calculator.calculate(answers)
    if (score.correct !== 2) throw new Error('Wrong correct count')
    if (score.incorrect !== 1) throw new Error('Wrong incorrect count')
    if (score.total !== 3) throw new Error('Wrong total')
  })
  
  test('ScoreCalculator calculates streaks', () => {
    const calculator = new ScoreCalculator()
    const answers = [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true }
    ]
    
    const streaks = calculator.calculateStreaks(answers)
    if (streaks.longest !== 3) throw new Error('Wrong longest streak')
  })
  
  await testAsync('QuizEngine state machine works', async () => {
    // Mock repositories
    const mockRepo = {
      loadQuestions: async () => mockQuestions,
      saveScore: async () => ({ id: 'test-123' }),
      fetchLeaderboard: async () => []
    }
    
    const calculator = new ScoreCalculator()
    const engine = new QuizEngine({
      scoreCalculator: calculator,
      questionRepository: mockRepo,
      scoreRepository: mockRepo
    })
    
    // Initial state: IDLE
    if (!engine.isIdle()) throw new Error('Should start IDLE')
    
    // Load questions: IDLE → READY
    await engine.loadQuestions(mockQuestions.map(q => Question.fromFirestore(q)))
    if (!engine.isReady()) throw new Error('Should be READY after load')
    
    // Start quiz: READY → PLAYING
    const { question } = engine.start({
      playerName: 'Test Player',
      questionCount: 3
    })
    if (!engine.isPlaying()) throw new Error('Should be PLAYING after start')
    if (!question) throw new Error('Should have current question')
    
    // Answer questions until complete: PLAYING → COMPLETE
    engine.answerCurrentQuestion('a')
    engine.answerCurrentQuestion('a')
    const lastResult = engine.answerCurrentQuestion('a')
    
    if (!engine.isComplete()) throw new Error('Should be COMPLETE after all answers')
    if (!lastResult.isSessionComplete) throw new Error('Result should indicate completion')
  })
  
  console.groupEnd()
  
  console.groupEnd()
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed!')
  } else {
    console.error('❌ Some tests failed')
  }
  
  return { passed, failed }
}

// Run tests when loaded
runTests()

export { runTests }
