/**
 * 收集系统 - 核心玩法之一
 * 功能：管理关键词、道具、结局图鉴的收集
 * 数据持久化：localStorage
 */

class CollectionSystem {
  constructor() {
    this.keywords = new Map() // 关键词收集 (key -> {text, context, timestamp})
    this.items = new Map()    // 道具收集 (key -> {name, description, icon, timestamp})
    this.endings = new Map()  // 结局收集 (key -> {title, description, image, timestamp})
    this.stats = {
      totalKeywords: 0,
      totalItems: 0,
      totalEndings: 0,
      firstCollectTime: null,
      lastCollectTime: null
    }
    
    // 加载本地存储
    this.loadFromStorage()
  }

  /**
   * 收集关键词
   * @param {string} keyword - 关键词文本
   * @param {string} context - 上下文（对话节点ID）
   * @returns {boolean} 是否新收集
   */
  collectKeyword(keyword, context = '') {
    if (this.keywords.has(keyword)) {
      console.log(`[CollectionSystem] 关键词已存在: ${keyword}`)
      return false
    }
    
    const data = {
      text: keyword,
      context,
      timestamp: Date.now()
    }
    
    this.keywords.set(keyword, data)
    this.stats.totalKeywords++
    this.updateStats()
    this.saveToStorage()
    
    console.log(`[CollectionSystem] 收集关键词: ${keyword}`)
    return true
  }

  /**
   * 收集道具
   * @param {string} itemId - 道具ID
   * @param {Object} itemData - 道具数据 {name, description, icon}
   * @returns {boolean} 是否新收集
   */
  collectItem(itemId, itemData) {
    if (this.items.has(itemId)) {
      console.log(`[CollectionSystem] 道具已存在: ${itemId}`)
      return false
    }
    
    const data = {
      ...itemData,
      timestamp: Date.now()
    }
    
    this.items.set(itemId, data)
    this.stats.totalItems++
    this.updateStats()
    this.saveToStorage()
    
    console.log(`[CollectionSystem] 收集道具: ${itemData.name}`)
    return true
  }

  /**
   * 解锁结局
   * @param {string} endingId - 结局ID
   * @param {Object} endingData - 结局数据 {title, description, image}
   * @returns {boolean} 是否新解锁
   */
  unlockEnding(endingId, endingData) {
    if (this.endings.has(endingId)) {
      console.log(`[CollectionSystem] 结局已解锁: ${endingId}`)
      return false
    }
    
    const data = {
      ...endingData,
      timestamp: Date.now()
    }
    
    this.endings.set(endingId, data)
    this.stats.totalEndings++
    this.updateStats()
    this.saveToStorage()
    
    console.log(`[CollectionSystem] 解锁结局: ${endingData.title}`)
    return true
  }

  /**
   * 获取所有收集的关键词
   * @returns {Array} 关键词列表
   */
  getKeywords() {
    return Array.from(this.keywords.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 获取所有收集的道具
   * @returns {Array} 道具列表
   */
  getItems() {
    return Array.from(this.items.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 获取所有解锁的结局
   * @returns {Array} 结局列表
   */
  getEndings() {
    return Array.from(this.endings.values()).sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 检查是否已收集某关键词
   * @param {string} keyword - 关键词文本
   * @returns {boolean}
   */
  hasKeyword(keyword) {
    return this.keywords.has(keyword)
  }

  /**
   * 检查是否已收集某道具
   * @param {string} itemId - 道具ID
   * @returns {boolean}
   */
  hasItem(itemId) {
    return this.items.has(itemId)
  }

  /**
   * 检查是否已解锁某结局
   * @param {string} endingId - 结局ID
   * @returns {boolean}
   */
  hasEnding(endingId) {
    return this.endings.has(endingId)
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    if (!this.stats.firstCollectTime) {
      this.stats.firstCollectTime = Date.now()
    }
    this.stats.lastCollectTime = Date.now()
  }

  /**
   * 保存到 localStorage
   */
  saveToStorage() {
    try {
      const data = {
        keywords: Array.from(this.keywords.entries()),
        items: Array.from(this.items.entries()),
        endings: Array.from(this.endings.entries()),
        stats: this.stats,
        timestamp: Date.now()
      }
      
      localStorage.setItem('city-of-night-collection', JSON.stringify(data))
      console.log('[CollectionSystem] 收集数据已保存')
    } catch (error) {
      console.error('[CollectionSystem] 保存失败:', error)
    }
  }

  /**
   * 从 localStorage 加载
   */
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('city-of-night-collection'))
      if (!data) return
      
      this.keywords = new Map(data.keywords || [])
      this.items = new Map(data.items || [])
      this.endings = new Map(data.endings || [])
      this.stats = data.stats || {
        totalKeywords: 0,
        totalItems: 0,
        totalEndings: 0,
        firstCollectTime: null,
        lastCollectTime: null
      }
      
      console.log('[CollectionSystem] 收集数据已加载')
    } catch (error) {
      console.error('[CollectionSystem] 加载失败:', error)
    }
  }

  /**
   * 重置所有收集数据
   */
  reset() {
    this.keywords.clear()
    this.items.clear()
    this.endings.clear()
    this.stats = {
      totalKeywords: 0,
      totalItems: 0,
      totalEndings: 0,
      firstCollectTime: null,
      lastCollectTime: null
    }
    
    localStorage.removeItem('city-of-night-collection')
    console.log('[CollectionSystem] 收集数据已重置')
  }

  /**
   * 获取收集率
   * @param {Object} totalData - 总数据量 {keywords, items, endings}
   * @returns {Object} 收集率 {keywords, items, endings, overall}
   */
  getCollectionRate(totalData) {
    const keywordRate = totalData.keywords > 0 
      ? (this.stats.totalKeywords / totalData.keywords * 100).toFixed(1)
      : 0
    
    const itemRate = totalData.items > 0
      ? (this.stats.totalItems / totalData.items * 100).toFixed(1)
      : 0
    
    const endingRate = totalData.endings > 0
      ? (this.stats.totalEndings / totalData.endings * 100).toFixed(1)
      : 0
    
    const overall = ((this.stats.totalKeywords + this.stats.totalItems + this.stats.totalEndings) /
                    (totalData.keywords + totalData.items + totalData.endings) * 100).toFixed(1)
    
    return {
      keywords: keywordRate,
      items: itemRate,
      endings: endingRate,
      overall
    }
  }
}

// 导出单例
export default new CollectionSystem()
