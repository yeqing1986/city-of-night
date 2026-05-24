/**
 * 节奏系统 - 核心玩法之一
 * 功能：在对话过程中触发节奏小游戏，影响好感度
 * 玩法：点击/滑动跟随节奏，成功获得好感度加成，失败降低好感度
 */

class RhythmSystem {
  constructor() {
    this.isActive = false
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.notes = [] // 音符序列
    this.currentNoteIndex = 0
    this.timingWindow = {
      perfect: 50,  // ±50ms
      good: 100,     // ±100ms
      miss: 150      // ±150ms
    }
    this.onComplete = null // 完成回调
  }

  /**
   * 初始化节奏游戏
   * @param {Array} noteSequence - 音符序列 [{time, type, position}]
   * @param {Function} onComplete - 完成回调 (score, affinityChange)
   */
  init(noteSequence, onComplete) {
    this.isActive = true
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.notes = noteSequence
    this.currentNoteIndex = 0
    this.onComplete = onComplete
    
    console.log('[RhythmSystem] 节奏游戏初始化，音符数量:', noteSequence.length)
  }

  /**
   * 处理玩家输入（点击/滑动）
   * @param {number} currentTime - 当前时间 (ms)
   * @param {string} inputType - 输入类型 ('click' | 'swipe')
   * @returns {Object} 判定结果 {judgment, score, combo}
   */
  handleInput(currentTime, inputType) {
    if (!this.isActive || this.currentNoteIndex >= this.notes.length) {
      return null
    }

    const note = this.notes[this.currentNoteIndex]
    const timeDiff = Math.abs(currentTime - note.time)
    
    // 判定时机
    let judgment = 'miss'
    let scoreAdd = 0
    
    if (timeDiff <= this.timingWindow.perfect) {
      judgment = 'perfect'
      scoreAdd = 100
      this.combo++
    } else if (timeDiff <= this.timingWindow.good) {
      judgment = 'good'
      scoreAdd = 50
      this.combo++
    } else if (timeDiff <= this.timingWindow.miss) {
      judgment = 'miss'
      scoreAdd = 0
      this.combo = 0
    } else {
      // 超出判定窗口，忽略
      return null
    }
    
    // 更新分数
    this.score += scoreAdd
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    
    // 移动到下一个音符
    this.currentNoteIndex++
    
    // 检查是否完成
    if (this.currentNoteIndex >= this.notes.length) {
      this.complete()
    }
    
    return {
      judgment,
      score: scoreAdd,
      combo: this.combo,
      maxCombo: this.maxCombo,
      totalScore: this.score
    }
  }

  /**
   * 完成节奏游戏
   */
  complete() {
    this.isActive = false
    
    // 计算好感度变化
    const maxScore = this.notes.length * 100
    const scoreRatio = this.score / maxScore
    
    let affinityChange = 0
    if (scoreRatio >= 0.9) {
      affinityChange = 15 // S 评级
    } else if (scoreRatio >= 0.7) {
      affinityChange = 10 // A 评级
    } else if (scoreRatio >= 0.5) {
      affinityChange = 5  // B 评级
    } else if (scoreRatio >= 0.3) {
      affinityChange = 0  // C 评级
    } else {
      affinityChange = -5 // D 评级
    }
    
    console.log(`[RhythmSystem] 节奏游戏完成，得分: ${this.score}/${maxScore}, 好感度变化: ${affinityChange}`)
    
    // 调用回调
    if (this.onComplete) {
      this.onComplete(this.score, affinityChange)
    }
  }

  /**
   * 生成随机音符序列（用于测试）
   * @param {number} count - 音符数量
   * @param {number} bpm - BPM（每分钟节拍数）
   * @returns {Array} 音符序列
   */
  static generateRandomNotes(count, bpm = 120) {
    const noteTypes = ['click', 'swipe-left', 'swipe-right', 'hold']
    const interval = 60000 / bpm // 每个音符的间隔 (ms)
    
    const notes = []
    for (let i = 0; i < count; i++) {
      notes.push({
        time: i * interval,
        type: noteTypes[Math.floor(Math.random() * noteTypes.length)],
        position: Math.random() // 0-1 之间的位置
      })
    }
    
    return notes
  }

  /**
   * 重置状态
   */
  reset() {
    this.isActive = false
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.notes = []
    this.currentNoteIndex = 0
    this.onComplete = null
    
    console.log('[RhythmSystem] 状态已重置')
  }
}

// 导出单例
export default new RhythmSystem()
