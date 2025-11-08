/**
 * 🧠 ULTRATHINK Presentation: UIController
 * 
 * Philosophy:
 * "Craft, Don't Code" - The UI is a declarative projection of state.
 * Not imperative DOM manipulation. Not "show this, hide that."
 * 
 * Pattern: UI = f(state)
 * When state changes, UI re-renders.
 * Single direction data flow.
 * 
 * Responsibilities:
 * - Coordinate view components
 * - Handle user input
 * - Delegate to engine
 * - Never contain business logic
 */

export class UIController {
  #engine
  #storage
  #notifications
  #firebase
  #config
  #currentView
  
  constructor({ engine, storage, notifications, firebase, config }) {
    this.#engine = engine
    this.#storage = storage
    this.#notifications = notifications
    this.#firebase = firebase
    this.#config = config
    this.#currentView = null
    
    this.#setupKeyboardShortcuts()
  }
  
  /**
   * ULTRATHINK: Show welcome screen
   * State: READY
   */
  showWelcome() {
    const container = document.getElementById('quiz-area')
    if (!container) return
    
    // ULTRATHINK: Restore saved preferences
    const savedName = this.#storage.get('player_name') || ''
    const savedLength = this.#storage.get('quiz_length') || this.#config.defaultLength
    
    container.innerHTML = this.#renderWelcome({ savedName, savedLength })
    
    // ULTRATHINK: Event delegation with null checks
    const startBtn = container.querySelector('#start-quiz-btn')
    const leaderboardBtn = container.querySelector('#view-leaderboard-btn')
    const nameInput = container.querySelector('#player-name-input')
    
    if (startBtn) {
      startBtn.addEventListener('click', () => this.#handleStart())
    }
    
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => this.#showLeaderboard())
    }
    
    // Focus name input for accessibility
    if (nameInput) nameInput.focus()
  }
  
  enableStart() {
    const btn = document.getElementById('start-quiz-btn')
    if (btn) {
      btn.disabled = false
      btn.textContent = 'Comenzar quiz'
    }
  }
  
  /**
   * ULTRATHINK: Render question view
   * State: PLAYING
   */
  #showQuestion(questionData, progress) {
    const container = document.getElementById('quiz-area')
    if (!container) return
    
    const currentScore = this.#getCurrentScore()
    
    container.innerHTML = this.#renderQuestion({
      question: questionData,
      progress,
      score: currentScore
    })
    
    // ULTRATHINK: Single event listener for all options
    const optionsGrid = container.querySelector('.options-grid')
    if (optionsGrid) {
      optionsGrid.addEventListener('click', (e) => {
        const option = e.target.closest('[data-key]')
        if (option && !option.disabled) {
          this.#handleAnswer(option.dataset.key)
        }
      })
    }
  }
  
  #getCurrentScore() {
    try {
      const results = this.#engine.results()
      return results.score
    } catch {
      return { correct: 0, incorrect: 0 }
    }
  }
  
  /**
   * ULTRATHINK: Handle answer selection
   * Philosophy: Immediate feedback, user-controlled pacing
   */
  async #handleAnswer(selectedKey) {
    try {
      const result = this.#engine.answerCurrentQuestion(selectedKey)
      
      // ULTRATHINK: Immediate visual feedback
      this.#revealAnswer({
        selectedKey,
        ...result.correctAnswer,
        isCorrect: result.isCorrect
      })
      
      // Celebrate streaks
      this.#celebrateIfStreak()
      
      // ULTRATHINK: Show next button - let user control pace
      this.#showNextButton(result)
      
    } catch (error) {
      this.#notifications.error('Error al procesar respuesta')
      console.error(error)
    }
  }
  
  #showNextButton(result) {
    const container = document.querySelector('.question-container')
    if (!container) return
    
    // Remove if already exists
    const existing = container.querySelector('.next-action')
    if (existing) existing.remove()
    
    const nextBtn = document.createElement('button')
    nextBtn.className = 'next-action primary'
    nextBtn.textContent = result.isSessionComplete ? '✨ Ver resultados' : '→ Siguiente pregunta'
    
    nextBtn.addEventListener('click', () => {
      if (result.isSessionComplete) {
        this.#showResults()
      } else {
        const nextQuestion = this.#engine.currentQuestion()
        this.#showQuestion(nextQuestion, result.progress)
      }
    })
    
    container.appendChild(nextBtn)
    nextBtn.focus() // Accessibility: focus on next action
  }
  
  /**
   * ULTRATHINK: Show results
   * State: COMPLETE
   */
  async #showResults() {
    const results = this.#engine.results()
    const container = document.getElementById('quiz-area')
    if (!container) return
    
    container.innerHTML = this.#renderResults(results)
    
    // Save score
    try {
      await this.#engine.saveScore()
      this.#notifications.success('¡Puntaje guardado en el ranking!')
    } catch (error) {
      this.#notifications.warning('No se pudo guardar tu puntaje')
    }
    
    // Event listeners with null checks
    const restartBtn = container.querySelector('#restart-btn')
    const leaderboardBtn = container.querySelector('#view-leaderboard-btn')
    
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.#engine.restart()
        this.showWelcome()
      })
    }
    
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => this.#showLeaderboard())
    }
  }
  
  /**
   * ULTRATHINK: Visual feedback for answer
   */
  #revealAnswer({ selectedKey, correctKey, explanation, isCorrect }) {
    const options = document.querySelectorAll('[data-key]')
    
    options.forEach(el => {
      const key = el.dataset.key
      
      if (key === correctKey) {
        el.classList.add('correct')
        el.setAttribute('aria-label', 'Respuesta correcta')
      }
      
      if (key === selectedKey && !isCorrect) {
        el.classList.add('incorrect')
        el.setAttribute('aria-label', 'Respuesta incorrecta')
      }
      
      // Disable all options
      el.disabled = true
    })
    
    // Show explanation if answer was incorrect
    if (!isCorrect && explanation) {
      const explanationEl = document.createElement('div')
      explanationEl.className = 'explanation'
      
      const strong = document.createElement('strong')
      strong.textContent = 'Explicación: '
      
      const text = document.createTextNode(explanation)
      
      explanationEl.appendChild(strong)
      explanationEl.appendChild(text)
      
      document.querySelector('.question-container').appendChild(explanationEl)
    }
  }
  
  /**
   * ULTRATHINK: Private helper methods
   */
  #handleStart() {
    const nameInput = document.getElementById('player-name-input')
    const lengthInput = document.querySelector('input[name="quiz-length"]:checked')
    
    if (!nameInput || !lengthInput) {
      this.#notifications.error('Error al leer el formulario')
      return
    }
    
    const playerName = nameInput.value.trim()
    const questionCount = parseInt(lengthInput.value, 10)
    
    // Validation
    if (!playerName) {
      this.#notifications.warning('Ingresa tu nombre para continuar')
      nameInput.focus()
      return
    }
    
    if (playerName.length < this.#config.minimumNameLength) {
      this.#notifications.warning(`El nombre debe tener al menos ${this.#config.minimumNameLength} caracteres`)
      return
    }
    
    // Save preferences
    this.#storage.set('player_name', playerName)
    this.#storage.set('quiz_length', questionCount)
    
    // Start quiz
    try {
      const { question, progress } = this.#engine.start({ playerName, questionCount })
      this.#showQuestion(question, progress)
    } catch (error) {
      this.#notifications.error(error.message)
    }
  }
  
  #celebrateIfStreak() {
    try {
      const results = this.#engine.results()
      const streak = results.streaks.current
      
      if (streak === 3) {
        this.#notifications.success('¡3 respuestas correctas seguidas! 🔥')
      } else if (streak === 5) {
        this.#notifications.success('¡Racha de 5! Estás imparable 👏')
      } else if (streak > 0 && streak % 10 === 0) {
        this.#notifications.success(`¡${streak} correctas seguidas! 🏆`)
      }
    } catch {
      // No results yet, skip celebration
    }
  }
  
  #pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  #setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const state = this.#engine.state()
      
      // Prevent shortcuts when typing
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }
      
      // Playing state: 1-4 for options, Enter for next
      if (state === 'PLAYING') {
        const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3 }
        
        if (keyMap[e.key] !== undefined) {
          e.preventDefault()
          const options = document.querySelectorAll('[data-key]')
          options[keyMap[e.key]]?.click()
          return
        }
        
        if (e.key === 'Enter') {
          // Try new-style next button first, fallback to data-action
          const nextBtn = document.querySelector('.next-action') || 
                         document.querySelector('[data-action="next"]')
          if (nextBtn) {
            e.preventDefault()
            nextBtn.click()
          }
          return
        }
      }
      
      // Complete state: Enter to restart
      if (state === 'COMPLETE' && e.key === 'Enter') {
        e.preventDefault()
        const restartBtn = document.querySelector('[data-action="restart"]')
        if (restartBtn) restartBtn.click()
        return
      }
      
      // Global: Escape closes modal, Ctrl+R restarts
      if (e.key === 'Escape') {
        e.preventDefault()
        const modal = document.getElementById('leaderboard-modal')
        if (modal && modal.style.display === 'flex') {
          modal.style.display = 'none'
        }
      }
      
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault()
        window.location.reload()
      }
    })
  }
  
  async #showLeaderboard() {
    // Create modal container if doesn't exist
    let modal = document.getElementById('leaderboard-modal')
    
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'leaderboard-modal'
      modal.className = 'modal'
      modal.innerHTML = '<div class="modal-content card"></div>'
      document.body.appendChild(modal)
      
      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none'
        }
      })
    }
    
    // Render leaderboard
    const container = modal.querySelector('.modal-content')
    container.innerHTML = this.#renderLeaderboard()
    
    // Show modal
    modal.style.display = 'flex'
    
    // Attach listeners
    container.querySelector('.close-btn').addEventListener('click', () => {
      modal.style.display = 'none'
    })
    
    // Load entries
    await this.#loadLeaderboardEntries(this.#storage.get('quiz_length') || 15)
  }
  
  async #loadLeaderboardEntries(length) {
    const tbody = document.querySelector('#leaderboard-tbody')
    if (!tbody) return
    
    tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>'
    
    try {
      const entries = await this.#firebase.fetchLeaderboard({
        questionCount: length,
        limit: 50
      })
      
      tbody.innerHTML = entries.length > 0
        ? entries.map((entry, i) => this.#renderLeaderboardRow(entry, i)).join('')
        : '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No hay puntajes registrados</td></tr>'
        
    } catch (error) {
      console.error('Leaderboard error:', error)
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Error al cargar</td></tr>'
    }
  }
  
  #renderLeaderboardRow(entry, index) {
    const position = index + 1
    const score = entry.score || 0
    const total = entry.total_questions_in_quiz || 0
    const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0
    const name = this.#escapeHtml(entry.player_name || 'Anónimo')
    
    const badges = { 1: '🥇', 2: '🥈', 3: '🥉' }
    const badge = badges[position] || position
    
    let date = '—'
    try {
      const d = entry.created_at?.toDate ? entry.created_at.toDate() : new Date(entry.created_at)
      date = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(d)
    } catch {}
    
    return `
      <tr class="${position <= 3 ? 'top-' + position : ''}">
        <td class="position">${badge}</td>
        <td class="name">${name}</td>
        <td class="score">${score}/${total} <span class="percentage">(${percentage}%)</span></td>
        <td class="date">${date}</td>
      </tr>
    `
  }
  
  #renderLeaderboard() {
    const currentLength = this.#storage.get('quiz_length') || 15
    
    return `
      <div class="leaderboard">
        <div class="leaderboard-header">
          <h2>🏆 Ranking</h2>
          <p>Los mejores puntajes del quiz</p>
        </div>
        
        <div class="leaderboard-table-wrapper">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Jugador</th>
                <th>Puntaje</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody id="leaderboard-tbody"></tbody>
          </table>
        </div>
        
        <button class="close-btn">Cerrar</button>
      </div>
    `
  }
  
  /**
   * ULTRATHINK: Template methods
   * Pure functions that return HTML strings
   */
  #renderWelcome({ savedName, savedLength }) {
    return `
      <section class="welcome card">
        <h2>Prepárate para el desafío</h2>
        <p class="subtitle">Responde preguntas del Sistema Electoral Chileno</p>
        
        <input 
          type="text" 
          id="player-name-input" 
          placeholder="Tu nombre o apodo"
          value="${savedName}"
          maxlength="${this.#config.maximumNameLength}"
          autocomplete="name"
        />
        
        <fieldset class="quiz-length-selector">
          <legend>Selecciona la cantidad de preguntas</legend>
          ${this.#config.allowedLengths.map(len => `
            <label>
              <input 
                type="radio" 
                name="quiz-length" 
                value="${len}"
                ${len === savedLength ? 'checked' : ''}
              />
              <span>${len} preguntas</span>
            </label>
          `).join('')}
        </fieldset>
        
        <div class="keyboard-shortcuts-info">
          <p><strong>⌨️ Atajos de teclado:</strong></p>
          <ul>
            <li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> - Seleccionar opción</li>
            <li><kbd>Enter</kbd> - Siguiente pregunta</li>
            <li><kbd>Esc</kbd> - Cerrar modal</li>
          </ul>
        </div>
        
        <div class="actions">
          <button id="start-quiz-btn" disabled>Cargando preguntas...</button>
          <button id="view-leaderboard-btn" class="secondary">Ver ranking</button>
        </div>
      </section>
    `
  }
  
  #renderQuestion({ question, progress, score }) {
    return `
      <section class="question-container card">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress.percentage}%"></div>
        </div>
        
        <div class="question-meta">
          <p class="question-counter">Pregunta ${progress.current} de ${progress.total}</p>
          <div class="live-stats">
            <span>✓ <strong>${score.correct}</strong></span>
            <span>✗ <strong>${score.incorrect}</strong></span>
          </div>
        </div>
        
        <h2 class="question-text">${this.#escapeHtml(question.text)}</h2>
        
        <div class="options-grid" role="radiogroup">
          ${question.options.map((opt, i) => `
            <button 
              class="option" 
              data-key="${opt.key}"
              role="radio"
              aria-label="Opción ${i + 1}: ${this.#escapeHtml(opt.text)}"
            >
              <span class="option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="option-text">${this.#escapeHtml(opt.text)}</span>
              <span class="keyboard-hint">${i + 1}</span>
            </button>
          `).join('')}
        </div>
      </section>
    `
  }
  
  #renderResults(results) {
    const { score, streaks, answers } = results
    
    return `
      <section class="results card">
        <h2>¡Quiz completado!</h2>
        
        <div class="score-display">
          <p class="score-value">${score.correct}/${score.total}</p>
          <p class="score-percentage">${score.percentage.toFixed(1)}% de precisión</p>
        </div>
        
        ${streaks.longest >= 3 ? `
          <div class="streak-badge">
            🔥 Racha máxima: ${streaks.longest} respuestas correctas
          </div>
        ` : ''}
        
        <div class="summary">
          <h3>Resumen de respuestas</h3>
          ${answers.map(a => `
            <div class="answer-summary ${a.isCorrect ? 'correct' : 'incorrect'}">
              <p class="question">${a.questionText}</p>
              <p class="your-answer">
                Tu respuesta: ${a.selectedKey.toUpperCase()}
                ${a.isCorrect ? '✓' : '✗'}
              </p>
              ${!a.isCorrect ? `
                <p class="correct-answer">Correcta: ${a.correctKey.toUpperCase()}</p>
                <p class="explanation">${a.explanation}</p>
              ` : ''}
            </div>
          `).join('')}
        </div>
        
        <div class="actions">
          <button id="restart-btn">Jugar de nuevo</button>
          <button id="view-leaderboard-btn" class="secondary">Ver ranking</button>
        </div>
      </section>
    `
  }
  
  /**
   * ULTRATHINK: Helper utilities
   */
  #escapeHtml(unsafe) {
    const div = document.createElement('div')
    div.textContent = unsafe
    return div.innerHTML
  }
  
  #formatDate(timestamp) {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
      return new Intl.DateTimeFormat('es-CL', { 
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date)
    } catch {
      return '—'
    }
  }
}
