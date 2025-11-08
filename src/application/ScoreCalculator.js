/**
 * 🧠 ULTRATHINK Application: ScoreCalculator
 * 
 * Philosophy:
 * "Think Different" - Scoring is not just counting correct answers.
 * It's a domain service that encapsulates business rules.
 * 
 * Why a separate class?
 * - Single Responsibility
 * - Easy to test scoring logic in isolation
 * - Future: could add weighted questions, time bonuses, etc.
 */

export class ScoreCalculator {
  /**
   * ULTRATHINK: Calculate final score
   * Returns rich score object, not just a number
   */
  calculate(answers) {
    const total = answers.length
    const correct = answers.filter(a => a.isCorrect).length
    const incorrect = total - correct
    const percentage = total > 0 ? (correct / total) * 100 : 0
    
    return {
      correct,
      incorrect,
      total,
      percentage: Math.round(percentage * 100) / 100,
      grade: this.#calculateGrade(percentage)
    }
  }
  
  /**
   * ULTRATHINK: Calculate streak statistics
   */
  calculateStreaks(answers) {
    let current = 0
    let longest = 0
    const milestones = []
    
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].isCorrect) {
        current++
        longest = Math.max(longest, current)
        
        // Track milestone achievements
        if (current === 3 || current === 5 || current % 10 === 0) {
          milestones.push({
            streak: current,
            at: i
          })
        }
      } else {
        current = 0
      }
    }
    
    return {
      current,
      longest,
      milestones
    }
  }
  
  /**
   * ULTRATHINK: Private helper
   * Calculate letter grade (could be i18n)
   */
  #calculateGrade(percentage) {
    if (percentage >= 90) return 'A'
    if (percentage >= 80) return 'B'
    if (percentage >= 70) return 'C'
    if (percentage >= 60) return 'D'
    return 'F'
  }
}
