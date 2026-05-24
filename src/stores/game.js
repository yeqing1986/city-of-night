import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  // 游戏状态
  const currentChapter = ref(1)
  const currentNode = ref(null)
  const isPlaying = ref(false)
  const gameStarted = ref(false)

  // 数值系统
  const complicity = ref(20)   // 共谋值
  const morality = ref(60)     // 道德值
  const suspicion = ref(10)    // 怀疑值

  // 剧情数据
  const chapterData = ref(null)

  // 计算属性
  const totalAffinity = computed(() => complicity.value + (100 - suspicion.value))
  
  const endingType = computed(() => {
    if (complicity.value >= 80 && suspicion.value <= 20) return 'deep'
    if (complicity.value >= 50) return 'warm'
    if (suspicion.value >= 70) return 'cold'
    return 'normal'
  })

  // Actions
  function startGame() {
    gameStarted.value = true
    isPlaying.value = true
  }

  function setChapterData(data) {
    chapterData.value = data
  }

  function setCurrentNode(nodeId) {
    currentNode.value = nodeId
  }

  function updateStats(changes = {}) {
    if (changes.complicity) complicity.value = Math.max(0, Math.min(100, complicity.value + changes.complicity))
    if (changes.morality) morality.value = Math.max(0, Math.min(100, morality.value + changes.morality))
    if (changes.suspicion) suspicion.value = Math.max(0, Math.min(100, suspicion.value + changes.suspicion))
    
    // 保存到 localStorage
    saveGame()
  }

  function addComplicity(value) {
    complicity.value = Math.min(100, complicity.value + value)
    saveGame()
  }

  function addMorality(value) {
    morality.value = Math.min(100, morality.value + value)
    saveGame()
  }

  function addSuspicion(value) {
    suspicion.value = Math.min(100, suspicion.value + value)
    saveGame()
  }

  function nextChapter() {
    currentChapter.value++
  }

  function resetGame() {
    currentChapter.value = 1
    currentNode.value = null
    isPlaying.value = false
    gameStarted.value = false
    complicity.value = 20
    morality.value = 60
    suspicion.value = 10
    chapterData.value = null
    localStorage.removeItem('city-of-night-save')
  }

  function saveGame() {
    const saveData = {
      currentChapter: currentChapter.value,
      currentNode: currentNode.value,
      complicity: complicity.value,
      morality: morality.value,
      suspicion: suspicion.value,
      timestamp: Date.now()
    }
    localStorage.setItem('city-of-night-save', JSON.stringify(saveData))
  }

  function loadGame() {
    try {
      const saved = localStorage.getItem('city-of-night-save')
      if (saved) {
        const data = JSON.parse(saved)
        currentChapter.value = data.currentChapter || 1
        currentNode.value = data.currentNode || null
        complicity.value = data.complicity || 20
        morality.value = data.morality || 60
        suspicion.value = data.suspicion || 10
        gameStarted.value = true
        return true
      }
    } catch (e) {
      console.error('[GameStore] 加载存档失败:', e)
    }
    return false
  }

  return {
    // State
    currentChapter,
    currentNode,
    isPlaying,
    gameStarted,
    complicity,
    morality,
    suspicion,
    chapterData,
    // Computed
    totalAffinity,
    endingType,
    // Actions
    startGame,
    setChapterData,
    setCurrentNode,
    updateStats,
    addComplicity,
    addMorality,
    addSuspicion,
    nextChapter,
    resetGame,
    saveGame,
    loadGame
  }
})
