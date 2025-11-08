/**
 * 🧠 ULTRATHINK Domain Model: Question
 * 
 * Philosophy:
 * "Obsess Over Details" - A Question is not a data bag.
 * It's a domain concept with invariants and behavior.
 * 
 * Immutability principle:
 * Once created, a Question cannot change. This eliminates
 * entire categories of bugs and makes reasoning trivial.
 * 
 * Naming principle:
 * Methods read like natural language. No "get/set" prefixes.
 * The code tells a story.
 */

export class Question {
  // ULTRATHINK: Private fields enforce encapsulation
  // The # syntax makes invariants impossible to violate
  #text
  #options
  #correctKey
  #explanation
  
  constructor({ text, options, correctKey, explanation = '' }) {
    // ULTRATHINK: Validate at construction
    // Invalid questions cannot exist
    if (!text?.trim()) {
      throw new Error('Question text is required')
    }
    
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error('Question must have at least 2 options')
    }
    
    if (!correctKey) {
      throw new Error('Question must have a correct answer')
    }
    
    const hasCorrectOption = options.some(opt => opt.key === correctKey)
    if (!hasCorrectOption) {
      throw new Error('Correct answer key must match one of the options')
    }
    
    // ULTRATHINK: Deep freeze for true immutability
    this.#text = text.trim()
    this.#options = Object.freeze(
      options.map(opt => Object.freeze({ ...opt }))
    )
    this.#correctKey = correctKey
    this.#explanation = explanation.trim()
    
    Object.freeze(this)
  }
  
  /**
   * ULTRATHINK: Naming that sings
   * Not "checkAnswer" or "validateAnswer"
   * Simply: "is this correct?"
   */
  isCorrect(selectedKey) {
    return selectedKey === this.#correctKey
  }
  
  /**
   * ULTRATHINK: Progressive disclosure
   * Only expose what's needed for current context
   */
  get text() {
    return this.#text
  }
  
  get options() {
    // Return shallow copy to prevent mutation of array
    return [...this.#options]
  }
  
  /**
   * ULTRATHINK: Explicit intent
   * "reveal" communicates that this is special information
   * not available during normal play
   */
  revealAnswer() {
    return {
      correctKey: this.#correctKey,
      explanation: this.#explanation || 'Sin explicación disponible.'
    }
  }
  
  /**
   * ULTRATHINK: Self-documenting
   * A question knows how to shuffle its own options
   */
  withShuffledOptions() {
    const shuffled = [...this.#options]
    
    // Fisher-Yates shuffle - provably unbiased
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    return new Question({
      text: this.#text,
      options: shuffled,
      correctKey: this.#correctKey,
      explanation: this.#explanation
    })
  }
  
  /**
   * ULTRATHINK: Adapter pattern
   * Domain model knows how to construct itself from external data
   */
  static fromFirestore(data) {
    return new Question({
      text: data.question_text,
      options: data.options || [],
      correctKey: data.correct_answer_key,
      explanation: data.explanation
    })
  }
  
  /**
   * ULTRATHINK: Serialization boundary
   * Domain model knows how to convert to JSON
   */
  toJSON() {
    return {
      question_text: this.#text,
      options: this.#options,
      correct_answer_key: this.#correctKey,
      explanation: this.#explanation
    }
  }
}
