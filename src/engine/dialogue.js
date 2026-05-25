/**
 * dialogue.js - 对话引擎 v4.1
 * 
 * 功能：
 * 1. 支持新JSON格式（按场景拆分）
 * 2. 场景按需加载
 * 3. 存档系统（3插槽）
 * 4. 离线/上线机制（type:6 + wait）
 * 5. 正在输入提示（normal/long_pause）
 * 
 * 消息类型（type字段）：
 * - type:1 = 对方发言
 * - type:2 = 我方发言（选项）
 * - type:3 = 对方发图片
 * - type:4 = 自己发图片
 * - type:5 = 动态
 * - type:6 = 系统消息（离线/上线）
 * - type:7 = 结局（不输出，直接跳转）
 */

class DialogueEngine {
  constructor() {
    this.manifest = null           // 场景清单
    this.currentScene = null       // 当前场景数据
    this.currentNode = null        // 当前节点
    this.history = []             // 选择历史
    this.sceneCache = new Map()    // 场景缓存
    this.isProcessing = false      // 是否正在处理消息
  }

  /**
   * 初始化：加载场景清单
   */
  async init() {
    try {
      const response = await fetch('/data/chapter1/manifest.json')
      this.manifest = await response.json()
      console.log('[DialogueEngine] Manifest loaded:', this.manifest)
    } catch (error) {
      console.error('[DialogueEngine] Failed to load manifest:', error)
      throw error
    }
  }

  /**
   * 加载场景
   * @param {string} sceneId - 场景ID（如 "scene_001"）
   * @returns {Promise<Object>} 场景数据
   */
  async loadScene(sceneId) {
    // 检查缓存
    if (this.sceneCache.has(sceneId)) {
      console.log(`[DialogueEngine] Scene ${sceneId} loaded from cache`)
      return this.sceneCache.get(sceneId)
    }

    // 从manifest获取文件名
    const sceneInfo = this.manifest.scenes.find(s => s.id === sceneId)
    if (!sceneInfo) {
      throw new Error(`Scene ${sceneId} not found in manifest`)
    }

    // 加载场景文件
    try {
      const response = await fetch(`/data/chapter1/${sceneInfo.file}`)
      const scene = await response.json()
      
      // 缓存场景
      this.sceneCache.set(sceneId, scene)
      console.log(`[DialogueEngine] Scene ${sceneId} loaded and cached`)
      
      return scene
    } catch (error) {
      console.error(`[DialogueEngine] Failed to load scene ${sceneId}:`, error)
      throw error
    }
  }

  /**
   * 启动对话（从指定节点开始）
   * @param {string} sceneId - 场景ID
   * @param {string} nodeId - 节点ID
   */
  async startDialogue(sceneId, nodeId) {
    this.currentScene = await this.loadScene(sceneId)
    this.currentNode = this.findNode(nodeId)
    
    if (!this.currentNode) {
      throw new Error(`Node ${nodeId} not found in scene ${sceneId}`)
    }

    console.log('[DialogueEngine] Dialogue started:', { sceneId, nodeId })
    return this.currentNode
  }

  /**
   * 在场景中查找节点
   * @param {string} nodeId - 节点ID
   * @returns {Object|null} 节点数据
   */
  findNode(nodeId) {
    if (!this.currentScene) return null
    return this.currentScene.nodes.find(n => n.id === nodeId) || null
  }

  /**
   * 处理选择
   * @param {number} choiceIndex - 选项索引
   * @returns {Promise<Object>} 下一条消息
   */
  async makeChoice(choiceIndex) {
    if (this.isProcessing) {
      console.warn('[DialogueEngine] Already processing, please wait')
      return null
    }

    const node = this.getCurrentNode()
    if (!node || node.type !== 2) {
      console.error('[DialogueEngine] Current node is not a choice node')
      return null
    }

    if (!node.choices || choiceIndex >= node.choices.length) {
      console.error('[DialogueEngine] Invalid choice index:', choiceIndex)
      return null
    }

    this.isProcessing = true

    try {
      const choice = node.choices[choiceIndex]

      // 更新数值
      if (choice.effects) {
        this.updateStats(choice.effects)
      }

      // 记录历史
      this.history.push({
        nodeId: node.id,
        sceneId: this.currentScene.sceneId,
        choiceIndex
      })

      // 自动存档（保存到slot 1）
      this.autoSave()

      // 获取下一条消息
      const nextNodeId = choice.next
      const nextSceneId = choice.nextScene || this.currentScene.sceneId

      // 如果跨场景，加载新场景
      if (nextSceneId !== this.currentScene.sceneId) {
        this.currentScene = await this.loadScene(nextSceneId)
      }

      // 找到下一个节点
      this.currentNode = this.findNode(nextNodeId)
      
      if (!this.currentNode) {
        throw new Error(`Next node ${nextNodeId} not found in scene ${nextSceneId}`)
      }

      console.log('[DialogueEngine] Choice made:', {
        choiceIndex,
        nextNodeId,
        nextSceneId,
        nextNodeType: this.currentNode.type
      })

      return this.currentNode
    } catch (error) {
      console.error('[DialogueEngine] Failed to make choice:', error)
      return null
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 获取当前节点
   * @returns {Object|null} 当前节点
   */
  getCurrentNode() {
    return this.currentNode
  }

  /**
   * 获取当前消息（getCurrentNode的别名）
   * @returns {Object|null} 当前节点
   */
  getCurrentMessage() {
    return this.currentNode
  }

  /**
   * 获取当前选项
   * @returns {Array|null} 当前节点的选项数组
   */
  getCurrentChoices() {
    return this.currentNode?.choices || null
  }

  /**
   * 更新数值
   * @param {Object} effects - 数值变化（如 { trust: 5, curiosity: -2 }）
   */
  updateStats(effects) {
    const store = window.useGameStore ? window.useGameStore() : null
    if (!store) {
      console.warn('[DialogueEngine] Game store not available')
      return
    }

    Object.keys(effects).forEach(key => {
      if (store.stats.hasOwnProperty(key)) {
        const newValue = Math.max(0, Math.min(100, store.stats[key] + effects[key]))
        store.stats[key] = newValue
      }
    })

    console.log('[DialogueEngine] Stats updated:', store.stats)
  }

  /**
   * 自动存档（保存到slot 1）
   */
  autoSave() {
    this.saveProgress(1)
  }

  /**
   * 手动存档（保存到slot 2或3）
   * @param {number} slotId - 存档位ID（2或3）
   */
  manualSave(slotId) {
    if (slotId < 2 || slotId > 3) {
      console.error('[DialogueEngine] Manual save only supports slot 2 and 3')
      return
    }
    this.saveProgress(slotId)
  }

  /**
   * 保存进度
   * @param {number} slotId - 存档位ID（1-3）
   */
  saveProgress(slotId) {
    const store = window.useGameStore ? window.useGameStore() : null
    if (!store) {
      console.warn('[DialogueEngine] Game store not available')
      return
    }

    const saveData = {
      slotId,
      currentNodeId: this.currentNode.id,
      currentSceneId: this.currentScene.sceneId,
      stats: { ...store.stats },
      unlockedGallery: [...store.unlockedGallery],
      choicesHistory: [...this.history],
      timestamp: Date.now()
    }

    try {
      localStorage.setItem(`night-city-save-${slotId}`, JSON.stringify(saveData))
      console.log(`[DialogueEngine] Progress saved to slot ${slotId}:`, saveData)
    } catch (error) {
      console.error('[DialogueEngine] Failed to save progress:', error)
    }
  }

  /**
   * 加载进度
   * @param {number} slotId - 存档位ID（1-3）
   * @returns {Promise<Object|null>} 存档数据
   */
  async loadProgress(slotId) {
    try {
      const saveDataStr = localStorage.getItem(`night-city-save-${slotId}`)
      if (!saveDataStr) {
        console.log(`[DialogueEngine] No save data found in slot ${slotId}`)
        return null
      }

      const saveData = JSON.parse(saveDataStr)

      // 加载场景
      this.currentScene = await this.loadScene(saveData.currentSceneId)

      // 找到当前节点
      this.currentNode = this.findNode(saveData.currentNodeId)
      if (!this.currentNode) {
        throw new Error(`Current node ${saveData.currentNodeId} not found`)
      }

      // 恢复历史
      this.history = [...saveData.choicesHistory]

      // 恢复数值
      const store = window.useGameStore ? window.useGameStore() : null
      if (store) {
        store.stats = { ...saveData.stats }
        store.unlockedGallery = [...saveData.unlockedGallery]
      }

      console.log(`[DialogueEngine] Progress loaded from slot ${slotId}:`, saveData)
      return saveData
    } catch (error) {
      console.error('[DialogueEngine] Failed to load progress:', error)
      return null
    }
  }

  /**
   * 获取所有存档信息
   * @returns {Array} 存档信息列表
   */
  getAllSaves() {
    const saves = []
    for (let i = 1; i <= 3; i++) {
      const saveDataStr = localStorage.getItem(`night-city-save-${i}`)
      if (saveDataStr) {
        try {
          saves[i - 1] = JSON.parse(saveDataStr)
        } catch (error) {
          saves[i - 1] = null
        }
      } else {
        saves[i - 1] = null
      }
    }
    return saves
  }

  /**
   * 删除存档
   * @param {number} slotId - 存档位ID（1-3）
   */
  deleteSave(slotId) {
    localStorage.removeItem(`night-city-save-${slotId}`)
    console.log(`[DialogueEngine] Save slot ${slotId} deleted`)
  }

  /**
   * 重置引擎状态
   */
  reset() {
    this.currentScene = null
    this.currentNode = null
    this.history = []
    this.isProcessing = false
    console.log('[DialogueEngine] Engine reset')
  }

  /**
   * 获取当前场景ID
   * @returns {string|null}
   */
  get currentSceneId() {
    return this.currentScene?.sceneId || null
  }

  /**
   * 获取选择历史
   * @returns {Array} 历史记录
   */
  getHistory() {
    return [...this.history]
  }

  /**
   * 获取指定场景的指定节点
   * @param {string} sceneId
   * @param {string} nodeId
   * @returns {Promise<Object|null>}
   */
  async getNode(sceneId, nodeId) {
    const scene = await this.loadScene(sceneId)
    return scene.nodes.find(n => n.id === nodeId) || null
  }

  /**
   * 获取当前数值状态
   * @returns {Object}
   */
  getStats() {
    const store = window.useGameStore ? window.useGameStore() : null
    return store?.stats || { complicity: 20, morality: 60, suspicion: 10 }
  }

  /**
   * 推进到下一条消息
   * @returns {Promise<Object|null>}
   */
  async advance() {
    const node = this.currentNode
    if (!node || !node.next) return null

    const nextNodeId = node.next
    const nextSceneId = node.nextScene || this.currentScene.sceneId

    if (nextSceneId !== this.currentScene.sceneId) {
      this.currentScene = await this.loadScene(nextSceneId)
    }

    this.currentNode = this.findNode(nextNodeId)
    return this.currentNode
  }

  /**
   * 重置游戏（别名）
   */
  resetGame() {
    this.reset()
  }
}

// 导出单例
const dialogueEngine = new DialogueEngine()
export default dialogueEngine
