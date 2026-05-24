/**
 * 对话引擎 - 核心玩法逻辑
 * 负责：处理对话流、解析 JSON 剧情文件、管理选择分支、计算好感度
 */

class DialogueEngine {
  constructor() {
    this.currentChapter = null
    this.currentNode = null
    this.history = [] // 对话历史
    this.affinityScore = 50 // 好感度 (0-100)
    this.endingUnlocked = [] // 已解锁结局
    this.stats = {
      totalMessages: 0,
      choicesMade: 0,
      keywordsCollected: 0
    }
  }

  /**
   * 加载章节数据
   * @param {Object} chapterData - 章节 JSON 数据
   */
  loadChapter(chapterData) {
    this.currentChapter = chapterData
    this.currentNode = chapterData.startNode
    this.history = []
    console.log(`[DialogueEngine] 加载章节: ${chapterData.title}`)
  }

  /**
   * 获取当前对话节点
   * @returns {Object} 当前节点数据
   */
  getCurrentNode() {
    if (!this.currentChapter) return null
    return this.currentChapter.nodes[this.currentNode]
  }

  /**
   * 选择对话选项
   * @param {number} choiceIndex - 选项索引
   * @returns {Object} 下一个节点数据
   */
  makeChoice(choiceIndex) {
    const currentNode = this.getCurrentNode()
    if (!currentNode || !currentNode.choices) {
      console.error('[DialogueEngine] 当前节点没有选项')
      return null
    }

    const choice = currentNode.choices[choiceIndex]
    if (!choice) {
      console.error(`[DialogueEngine] 选项索引无效: ${choiceIndex}`)
      return null
    }

    // 记录历史
    this.history.push({
      nodeId: this.currentNode,
      choiceIndex,
      choiceText: choice.text,
      timestamp: Date.now()
    })

    // 更新统计
    this.stats.choicesMade++
    this.stats.totalMessages += 2 // 玩家 + AI 各一条

    // 计算好感度变化
    if (choice.affinity) {
      this.affinityScore += choice.affinity
      this.affinityScore = Math.max(0, Math.min(100, this.affinityScore))
      console.log(`[DialogueEngine] 好感度变化: ${choice.affinity}, 当前: ${this.affinityScore}`)
    }

    // 跳转下一个节点
    this.currentNode = choice.nextNode
    return this.getCurrentNode()
  }

  /**
   * 获取可用选项（根据条件过滤）
   * @returns {Array} 可用选项列表
   */
  getAvailableChoices() {
    const currentNode = this.getCurrentNode()
    if (!currentNode || !currentNode.choices) return []

    return currentNode.choices.filter(choice => {
      if (!choice.condition) return true
      
      // 解析条件（简化版）
      // 实际项目中应该用更复杂的表达式解析器
      return this.evaluateCondition(choice.condition)
    })
  }

  /**
   * 评估条件表达式（简化版）
   * @param {string} condition - 条件表达式
   * @returns {boolean} 是否满足条件
   */
  evaluateCondition(condition) {
    // 简化版：只支持简单的好感度判断
    // 例如: "affinity >= 30", "affinity < 70"
    try {
      const match = condition.match(/(affinity)\s*(>=|<=|>|<|==|!=)\s*(\d+)/)
      if (match) {
        const [, variable, operator, value] = match
        const numValue = parseInt(value)
        
        switch (operator) {
          case '>=': return this.affinityScore >= numValue
          case '<=': return this.affinityScore <= numValue
          case '>':  return this.affinityScore > numValue
          case '<':  return this.affinityScore < numValue
          case '==': return this.affinityScore === numValue
          case '!=': return this.affinityScore !== numValue
        }
      }
      return true
    } catch (error) {
      console.error('[DialogueEngine] 条件解析失败:', error)
      return true
    }
  }

  /**
   * 保存游戏状态到 localStorage
   */
  saveGame() {
    const saveData = {
      currentChapter: this.currentChapter?.id,
      currentNode: this.currentNode,
      history: this.history,
      affinityScore: this.affinityScore,
      endingUnlocked: this.endingUnlocked,
      stats: this.stats,
      timestamp: Date.now()
    }
    
    localStorage.setItem('city-of-night-save', JSON.stringify(saveData))
    console.log('[DialogueEngine] 游戏已保存')
  }

  /**
   * 从 localStorage 加载游戏状态
   * @returns {boolean} 是否加载成功
   */
  loadGame() {
    try {
      const saveData = JSON.parse(localStorage.getItem('city-of-night-save'))
      if (!saveData) return false
      
      this.currentNode = saveData.currentNode
      this.history = saveData.history || []
      this.affinityScore = saveData.affinityScore || 50
      this.endingUnlocked = saveData.endingUnlocked || []
      this.stats = saveData.stats || { totalMessages: 0, choicesMade: 0, keywordsCollected: 0 }
      
      console.log('[DialogueEngine] 游戏已加载')
      return true
    } catch (error) {
      console.error('[DialogueEngine] 加载游戏失败:', error)
      return false
    }
  }

  /**
   * 重置游戏状态
   */
  resetGame() {
    this.currentChapter = null
    this.currentNode = null
    this.history = []
    this.affinityScore = 50
    this.endingUnlocked = []
    this.stats = {
      totalMessages: 0,
      choicesMade: 0,
      keywordsCollected: 0
    }
    
    localStorage.removeItem('city-of-night-save')
    console.log('[DialogueEngine] 游戏已重置')
  }

  /**
   * 获取游戏统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      affinityScore: this.affinityScore,
      historyLength: this.history.length,
      endingUnlocked: this.endingUnlocked.length
    }
  }
}

// 导出单例
export default new DialogueEngine()
