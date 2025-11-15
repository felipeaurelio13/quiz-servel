/**
 * 🧠 ULTRATHINK Main Entry Point
 * 
 * Philosophy:
 * - Think Different: Dependency injection, no singletons
 * - Obsess Over Details: Every name sings, every abstraction natural
 * - Plan Like Da Vinci: Clear separation of concerns
 * - Craft, Don't Code: This reads like a story, not instructions
 * - Iterate Relentlessly: Built for change, not just working
 * - Simplify Ruthlessly: No line exists that doesn't earn its place
 * 
 * Architecture:
 * Domain Layer → Application Layer → Presentation Layer → Infrastructure
 * 
 * The flow is inevitable:
 * 1. Wire dependencies (DI)
 * 2. Create quiz engine (state machine)
 * 3. Bind UI controller (declarative)
 * 4. Start
 */

import { QuizEngine } from './application/QuizEngine.js'
import { ScoreCalculator } from './application/ScoreCalculator.js'
import { FirebaseAdapter } from './infrastructure/FirebaseAdapter.js'
import { StorageAdapter } from './infrastructure/StorageAdapter.js'
import { UIController } from './presentation/UIController.js'
import { NotificationManager } from './presentation/NotificationManager.js'

// ULTRATHINK: Configuration is data, not code
const APP_CONFIG = {
  quiz: {
    defaultLength: 15,
    allowedLengths: [5, 10, 15],
    minimumNameLength: 2,
    maximumNameLength: 50
  },
  
  leaderboard: {
    maxEntries: 50,
    localCacheKey: 'quiz_leaderboard_cache'
  },
  
  firebase: {
    apiKey: "AIzaSyBAzyXi8wKMSN3NceSqPfBhrvePnbp2uyg",
    authDomain: "quiz-servel.firebaseapp.com",
    projectId: "quiz-servel",
    storageBucket: "quiz-servel.firebasestorage.app",
    messagingSenderId: "515841741198",
    appId: "1:515841741198:web:4762502ddc6b35819794df"
  }
}

/**
 * ULTRATHINK: Dependency Injection Container
 * 
 * Why: No hidden dependencies, no global state
 * The entire app graph is visible at a glance
 */
class Application {
  #engine
  #ui
  #storage
  #firebase
  #notifications
  
  constructor(config) {
    // Infrastructure layer: adapters to external services
    this.#firebase = new FirebaseAdapter(config.firebase)
    this.#storage = new StorageAdapter()
    this.#notifications = new NotificationManager()
    
    // Application layer: business logic
    const scoreCalculator = new ScoreCalculator()
    this.#engine = new QuizEngine({
      scoreCalculator,
      questionRepository: this.#firebase,
      scoreRepository: this.#firebase,
      storage: this.#storage
    })
    
    // Presentation layer: UI coordination
    this.#ui = new UIController({
      engine: this.#engine,
      storage: this.#storage,
      notifications: this.#notifications,
      firebase: this.#firebase,
      config: config.quiz
    })
  }
  
  async start() {
    try {
      // ULTRATHINK: Progressive enhancement
      // Load questions in background while showing UI
      const questionsPromise = this.#firebase.loadQuestions()
      
      this.#ui.showWelcome()
      
      const questions = await questionsPromise
      this.#engine.loadQuestions(questions)
      
      this.#ui.enableStart()
      
    } catch (error) {
      // ULTRATHINK: Graceful degradation
      this.#notifications.error(
        'No pudimos cargar las preguntas. Por favor, recarga la página.',
        { persistent: true }
      )
    }
  }
}

/**
 * ULTRATHINK: Single point of initialization
 * 
 * Why: No scattered DOMContentLoaded listeners
 * One clear entry point
 */
async function bootstrap() {
  const app = new Application(APP_CONFIG)
  await app.start()
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap)
} else {
  bootstrap()
}

// Export for testing
export { Application, APP_CONFIG }
