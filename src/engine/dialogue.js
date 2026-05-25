/**
 * 对话引擎 - 核心玩法逻辑（简化版）
 * 直接支持线性场景格式：{ scenes: [{ messages: [...] }] }
 * 不再需要节点树转换
 */

class DialogueEngine {
  constructor() {
    this.chapterData = null
    this.currentSceneIdx = 0
    this.currentMessageIdx = -1  // -1 = 尚未开始
    this.history = []  // [{ sceneIdx, messageIdx, choiceText }]
    this.stats = {
      共谋值: 20,
      道德值: 60,
      怀疑值: 10
    }
  }

  /**
   * 加载章节数据（支持场景格式）
   */
  loadChapter(data) {
    this.chapterData = data
    this.currentSceneIdx = 0
    this.currentMessageIdx = -1
    this.history = []
    
    // 初始化数值
    if (data.summary?.initialStats) {
      this.stats = { ...data.summary.initialStats }
    }
    
    console.log(`[DialogueEngine] 加载章节: ${data.title}`)
  }

  /**
   * 获取当前消息
   */
  getCurrentMessage() {
    if (!this.chapterData?.scenes) return null
    const scene = this.chapterData.scenes[this.currentSceneIdx]
    if (!scene) return null
    return scene.messages[this.currentMessageIdx] || null
  }

  /**
   * 获取当前场景
   */
  getCurrentScene() {
    if (!this.chapterData?.scenes) return null
    return this.chapterData.scenes[this.currentSceneIdx] || null
  }

  /**
   * 获取当前天数
   */
  getCurrentDay() {
    const scene = this.getCurrentScene()
    return scene?.day || 1
  }

  /**
   * 获取可用选项
   */
  getAvailableChoices() {
    const msg = this.getCurrentMessage()
    if (!msg || !msg.choices) return []
    return msg.choices
  }

  /**
   * 选择选项
   * @returns 下一个消息对象（或null）
   */
  makeChoice(choiceIndex) {
    const msg = this.getCurrentMessage()
    if (!msg || !msg.choices) return null

    const choice = msg.choices[choiceIndex]
    if (!choice) return null

    // 记录历史
    this.history.push({
      sceneIdx: this.currentSceneIdx,
      messageIdx: this.currentMessageIdx,
      choiceText: choice.text
    })

    // 跳转到目标场景/消息
    // 格式: choice.nextScene, choice.nextMessage
    // 如果没有指定，默认顺序推进
    if (choice.nextScene !== undefined) {
      this.currentSceneIdx = choice.nextScene
      this.currentMessageIdx = choice.nextMessage || 0
    } else {
      // 没有指定跳转，顺序推进到下一条
      this.advance()
    }

    // 应用数值变化
    if (choice.statsChange) {
      this.applyStats(choice.statsChange)
    }

    return this.getCurrentMessage()
  }

  /**
   * 自动推进到下一条消息（无选择时）
   */
  advance() {
    const scene = this.chapterData?.scenes[this.currentSceneIdx]
    if (!scene) return null

    this.currentMessageIdx++

    // 如果超出当前场景，进入下一个场景
    if (this.currentMessageIdx >= scene.messages.length) {
      this.currentSceneIdx++
      this.currentMessageIdx = 0
    }

    return this.getCurrentMessage()
  }

  /**
   * 应用数值变化
   */
  applyStats(changes) {
    if (!changes) return
    for (const [key, value] of Object.entries(changes)) {
      if (this.stats[key] !== undefined) {
        this.stats[key] = Math.max(0, Math.min(100, this.stats[key] + value))
      }
    }
  }

  /**
   * 保存游戏状态
   */
  saveGame() {
    const saveData = {
      currentSceneIdx: this.currentSceneIdx,
      currentMessageIdx: this.currentMessageIdx,
      history: this.history,
      stats: this.stats,
      timestamp: Date.now()
    }
    localStorage.setItem('night-city-save', JSON.stringify(saveData))
    console.log('[DialogueEngine] 游戏已保存')
  }

  /**
   * 加载游戏状态
   */
  loadGame() {
    try {
      const saveData = JSON.parse(localStorage.getItem('night-city-save'))
      if (!saveData) return false

      this.currentSceneIdx = saveData.currentSceneIdx || 0
      this.currentMessageIdx = saveData.currentMessageIdx || 0
      this.history = saveData.history || []
      this.stats = saveData.stats || { 共谋值: 20, 道德值: 60, 怀疑值: 10 }
      
      console.log('[DialogueEngine] 游戏已加载')
      return true
    } catch (err) {
      console.error('[DialogueEngine] 加载失败:', err)
      return false
    }
  }

  /**
   * 重置游戏
   */
  resetGame() {
    this.currentSceneIdx = 0
    this.currentMessageIdx = -1
    this.history = []
    this.stats = {
      共谋值: 20,
      道德值: 60,
      怀疑值: 10
    }
    localStorage.removeItem('night-city-save')
    console.log('[DialogueEngine] 游戏已重置')
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      historyLength: this.history.length
    }
  }
}

export default new DialogueEngine()
