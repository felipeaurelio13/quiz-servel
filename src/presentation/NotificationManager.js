/**
 * 🧠 ULTRATHINK Presentation: NotificationManager
 * 
 * Philosophy:
 * "Obsess Over Details" - Notifications are not console.log wrappers.
 * They're a delightful way to give feedback to users.
 * 
 * Design principles:
 * - Non-blocking
 * - Accessible (ARIA live regions)
 * - Beautiful animations
 * - Queue management (don't spam)
 */

export class NotificationManager {
  #container
  #queue
  #current
  
  constructor() {
    this.#queue = []
    this.#current = null
    this.#createContainer()
  }
  
  /**
   * ULTRATHINK: Typed notification methods
   * Self-documenting, expressive
   */
  success(message, options = {}) {
    this.#show(message, 'success', options)
  }
  
  error(message, options = {}) {
    this.#show(message, 'error', options)
  }
  
  warning(message, options = {}) {
    this.#show(message, 'warning', options)
  }
  
  info(message, options = {}) {
    this.#show(message, 'info', options)
  }
  
  /**
   * ULTRATHINK: Core notification logic
   */
  #show(message, type, { duration = 3000, persistent = false }) {
    const notification = {
      message,
      type,
      duration,
      persistent,
      id: Date.now()
    }
    
    // ULTRATHINK: Queue management
    if (this.#current) {
      this.#queue.push(notification)
      return
    }
    
    this.#display(notification)
  }
  
  #display(notification) {
    this.#current = notification
    
    const el = document.createElement('div')
    el.className = `notification notification-${notification.type}`
    el.textContent = notification.message
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', 'polite')
    el.dataset.id = notification.id
    
    this.#container.appendChild(el)
    
    // Animate in
    requestAnimationFrame(() => {
      el.classList.add('show')
    })
    
    // Auto-dismiss (unless persistent)
    if (!notification.persistent) {
      setTimeout(() => {
        this.#dismiss(notification.id)
      }, notification.duration)
    }
  }
  
  #dismiss(id) {
    const el = this.#container.querySelector(`[data-id="${id}"]`)
    if (!el) return
    
    el.classList.remove('show')
    
    setTimeout(() => {
      el.remove()
      this.#current = null
      
      // Process queue
      if (this.#queue.length > 0) {
        const next = this.#queue.shift()
        this.#display(next)
      }
    }, 300)
  }
  
  #createContainer() {
    this.#container = document.createElement('div')
    this.#container.className = 'notification-container'
    this.#container.setAttribute('aria-live', 'polite')
    this.#container.setAttribute('aria-atomic', 'true')
    document.body.appendChild(this.#container)
  }
}
