export class AdaptiveEngine {
  constructor(initialDifficulty = 'elementary') {
    this.difficulty = initialDifficulty
    this.consecutiveCorrect = 0
    this.consecutiveWrong = 0
    this.currentMethod = 'fillBlank'
  }

  recordAnswer(isCorrect) {
    if (isCorrect) {
      this.consecutiveCorrect++
      this.consecutiveWrong = 0
      if (this.consecutiveCorrect >= 5) {
        this.increaseDifficulty()
        this.consecutiveCorrect = 0
      }
    } else {
      this.consecutiveWrong++
      this.consecutiveCorrect = 0
      if (this.consecutiveWrong >= 3) {
        this.decreaseDifficulty()
        this.consecutiveWrong = 0
      }
    }
  }

  increaseDifficulty() {
    const levels = ['beginner', 'elementary', 'intermediate', 'advanced']
    const idx = levels.indexOf(this.difficulty)
    if (idx < levels.length - 1) {
      this.difficulty = levels[idx + 1]
      console.log('📈 Difficulty increased to:', this.difficulty)
    }
  }

  decreaseDifficulty() {
    const levels = ['beginner', 'elementary', 'intermediate', 'advanced']
    const idx = levels.indexOf(this.difficulty)
    if (idx > 0) {
      this.difficulty = levels[idx - 1]
      console.log('📉 Difficulty decreased to:', this.difficulty)
    }
  }

  switchMethod() {
    const methods = ['fillBlank', 'translate', 'reorder', 'multipleChoice']
    const available = methods.filter(m => m !== this.currentMethod)
    this.currentMethod = available[Math.floor(Math.random() * available.length)]
    return this.currentMethod
  }

  getStatus() {
    return {
      difficulty: this.difficulty,
      method: this.currentMethod,
      consecutiveCorrect: this.consecutiveCorrect,
      consecutiveWrong: this.consecutiveWrong,
    }
  }
}
