<template>
  <div class="chat-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="characterName"
      left-text="返回"
      left-arrow
      @click-left="goBack"
      :border="false"
      class="chat-navbar"
    >
      <template #title>
        <div class="navbar-title">
          <span class="name">{{ characterName }}</span>
          <span class="status" :class="{ online: isOnline }">
            {{ statusText }}
          </span>
        </div>
      </template>
      <template #right>
        <van-icon name="ellipsis" size="20" color="var(--text-primary)" @click="showMenu = true" />
      </template>
    </van-nav-bar>

    <!-- 对话区域 -->
    <div class="chat-body" ref="messageContainer" @scroll="onScroll">
      <!-- 日期分隔线 -->
      <div v-if="currentDay" class="day-divider">
        <span>{{ currentDayLabel }}</span>
      </div>

      <!-- 消息列表 -->
      <template v-for="(msg, idx) in messages" :key="idx">
        <!-- 时间分隔 -->
        <div v-if="showTimeDivider(idx)" class="time-divider">
          {{ formatTime(msg.timestamp) }}
        </div>

        <!-- 系统消息 (type:6) -->
        <div v-if="msg.type === 6" class="system-msg">
          {{ msg.content }}
        </div>

        <!-- 天数过渡 -->
        <div v-else-if="msg.role === 'day-transition'" class="day-transition">
          <div class="day-divider"><span>{{ msg.content }}</span></div>
        </div>

        <!-- 对方发言 (type:1) -->
        <div v-if="msg.type === 1" class="msg-row user">
          <div class="avatar-wrap">
            <img :src="characterAvatar" alt="" class="avatar-img" />
          </div>
          <div class="bubble user-bubble">
            <span class="triangle user-tri"></span>
            <div class="bubble-text">{{ msg.content }}</div>
          </div>
        </div>

        <!-- 我方发言-选项 (type:2) -->
        <div v-else-if="msg.type === 2" class="msg-row ai">
          <div class="bubble ai-bubble">
            <span class="triangle ai-tri"></span>
            <div class="bubble-text" v-html="msg.content.replace(/\n/g, '<br/>')"></div>
          </div>
          <div class="avatar-wrap">
            <img :src="aiAvatar" alt="" class="avatar-img" />
          </div>
        </div>

        <!-- 对方发图片 (type:3) -->
        <div v-else-if="msg.type === 3" class="msg-row user">
          <div class="avatar-wrap">
            <img :src="characterAvatar" alt="" class="avatar-img" />
          </div>
          <div class="bubble user-bubble image-bubble">
            <span class="triangle user-tri"></span>
            <img :src="msg.imageUrl" alt="" class="msg-image" />
          </div>
        </div>

        <!-- 自己发图片 (type:4) -->
        <div v-else-if="msg.type === 4" class="msg-row ai">
          <div class="bubble ai-bubble image-bubble">
            <span class="triangle ai-tri"></span>
            <img :src="msg.imageUrl" alt="" class="msg-image" />
          </div>
          <div class="avatar-wrap">
            <img :src="aiAvatar" alt="" class="avatar-img" />
          </div>
        </div>

        <!-- 动态 (type:5) -->
        <div v-else-if="msg.type === 5" class="dynamic-msg">
          <div class="dynamic-content">{{ msg.content }}</div>
        </div>

        <!-- 结局 (type:7) -->
        <div v-else-if="msg.type === 7" class="ending-msg">
          <div class="ending-content">{{ msg.content }}</div>
        </div>
      </template>

      <!-- 正在输入 -->
      <div v-if="isTyping" class="msg-row ai typing-row">
        <div class="bubble ai-bubble typing-bubble">
          <span class="triangle ai-tri"></span>
          <div class="typing-dots">
            <i></i><i></i><i></i>
          </div>
        </div>
        <div class="avatar-wrap">
          <img :src="aiAvatar" alt="" class="avatar-img" />
        </div>
      </div>

      <!-- 底部留白 -->
      <div class="scroll-spacer"></div>
    </div>

    <!-- 选择区域 -->
    <transition name="slide-up">
      <div v-if="currentChoices.length > 0" class="choices-area">
        <button
          v-for="(choice, i) in currentChoices"
          :key="i"
          class="choice-btn"
          :class="choice.type || 'primary'"
          @click="makeChoice(i)"
        >
          {{ choice.text }}
        </button>
      </div>
      <div v-else-if="isWaiting" class="waiting-area">
        <van-loading type="spinner" size="18" />
        <span>{{ characterName }} 正在输入...</span>
      </div>
    </transition>

    <!-- 侧边菜单 -->
    <van-popup v-model:show="showMenu" position="right" :style="{ width: '72%' }" round>
      <div class="menu-panel">
        <!-- 用户信息 -->
        <div class="menu-header">
          <div class="menu-avatar">
            <img :src="characterAvatar" alt="" />
          </div>
          <div class="menu-name">{{ characterName }}</div>
          <div class="menu-desc">32岁 · 产品经理 · 已婚</div>
        </div>

        <!-- 数值面板 -->
        <div class="stats-panel">
          <div class="stat-item">
            <span class="stat-label">共谋值</span>
            <div class="stat-bar">
              <div class="stat-fill complicity" :style="{ width: stats.complicity + '%' }"></div>
            </div>
            <span class="stat-value">{{ stats.complicity }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">道德值</span>
            <div class="stat-bar">
              <div class="stat-fill morality" :style="{ width: stats.morality + '%' }"></div>
            </div>
            <span class="stat-value">{{ stats.morality }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">怀疑值</span>
            <div class="stat-bar">
              <div class="stat-fill suspicion" :style="{ width: stats.suspicion + '%' }"></div>
            </div>
            <span class="stat-value">{{ stats.suspicion }}</span>
          </div>
        </div>

        <!-- 保存/加载系统 (3插槽) -->
        <div class="save-panel">
          <div class="section-title">存档管理</div>
          <div class="save-slots">
            <div 
              v-for="slot in saveSlots" 
              :key="slot.id"
              class="save-slot"
              :class="{ empty: !slot.timestamp }"
              @click="handleSaveSlot(slot.id)"
            >
              <div class="slot-header">
                <span class="slot-label">插槽 {{ slot.id }}</span>
                <span v-if="slot.timestamp" class="slot-time">{{ formatSaveTime(slot.timestamp) }}</span>
                <span v-else class="slot-empty">空</span>
              </div>
              <div v-if="slot.timestamp" class="slot-info">
                <span class="slot-scene">{{ slot.sceneTitle }}</span>
                <span class="slot-stats">共谋值:{{ slot.stats.complicity }} 道德值:{{ slot.stats.morality }}</span>
              </div>
              <div v-else class="slot-action">
                {{ slot.id === 1 ? '自动存档' : '点击保存' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 功能列表 -->
        <van-cell-group :border="false" inset>
          <van-cell title="相册" icon="photo-o" is-link @click="navigate('/gallery')" />
          <van-cell title="关键词收藏" icon="label-o" is-link @click="navigate('/keywords')" />
          <van-cell title="设置" icon="setting-o" is-link @click="navigate('/settings')" />
          <van-cell title="关于" icon="info-o" is-link @click="showAbout = true" />
        </van-cell-group>

        <!-- 人物列表 -->
        <div class="characters-section" v-if="characters.length">
          <div class="section-title">人物</div>
          <div class="characters-grid">
            <div 
              v-for="char in characters" 
              :key="char.id" 
              class="char-item"
              :class="{ locked: !char.unlocked }"
              @click="selectCharacter(char)"
            >
              <div class="char-avatar-wrap">
                <img v-if="char.unlocked && char.avatar" :src="char.avatar" :alt="char.name" class="char-avatar" />
                <div v-else class="char-avatar locked-avatar">
                  <van-icon name="lock" size="18" color="#999" />
                </div>
              </div>
              <div class="char-name">{{ char.name }}</div>
            </div>
          </div>
        </div>

        <van-cell-group :border="false" inset style="margin-top: 12px;">
          <van-cell title="深夜模式" icon="moon-o">
            <template #right-icon>
              <van-switch v-model="isDarkMode" size="20" @change="toggleDarkMode" />
            </template>
          </van-cell>
          <van-cell title="重置游戏" icon="replay" @click="confirmReset" class="danger-cell" />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 关于弹窗 -->
    <van-dialog 
      v-model:show="showAbout" 
      title="关于" 
      :show-confirm-button="true"
      confirm-button-text="我知道了"
    >
      <div class="about-content">
        <div class="about-logo">🌙</div>
        <div class="about-title">夜色迷城</div>
        <div class="about-version">v1.0.0</div>
        <div class="about-desc">
          一款叙事对话游戏<br/>
          玩家以AI倾听者身份<br/>
          与叶晓阳对话，通过选择影响剧情走向
        </div>
        <div class="about-copyright">
          © 2026 City of Night
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import DialogueEngine from '@/engine/dialogue.js'
import AudioManager from '@/engine/audioManager'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const gameStore = useGameStore()
const messageContainer = ref(null)
const messages = ref([])
const currentChoices = ref([])
const isTyping = ref(false)
const isWaiting = ref(true)
const showMenu = ref(false)
const isDarkMode = ref(false)
const currentDay = ref(1)

const characterName = ref('叶晓阳')
const characterAvatar = ref('/images/avatar-ye.png')
const aiAvatar = ref('/images/avatar-ai.png')
const isOnline = ref(true)
const showAbout = ref(false)

// 保存插槽数据
const saveSlots = ref([
  { id: 1, timestamp: null, sceneId: null, sceneTitle: '', stats: { complicity: 20, morality: 60, suspicion: 10 } },
  { id: 2, timestamp: null, sceneId: null, sceneTitle: '', stats: { complicity: 20, morality: 60, suspicion: 10 } },
  { id: 3, timestamp: null, sceneId: null, sceneTitle: '', stats: { complicity: 20, morality: 60, suspicion: 10 } }
])

// 人物数据
const characters = ref([
  { id: 'ye', name: '叶晓阳', title: '32岁 · 销售 · 已婚', avatar: '/images/avatar-ye.png', unlocked: true, bio: '主角，三十二岁，在H城做销售。已婚，有一个三岁的女儿糖糖。' },
  { id: 'zhou', name: '周颖', title: '神秘的邻居', avatar: '/images/avatar-zhou.png', unlocked: false, bio: '叶晓阳的新邻居，一个神秘的女性。' },
  { id: 'wife', name: '叶晓阳的妻子', title: '糖糖妈妈', avatar: '/images/avatar-wife.png', unlocked: false, bio: '叶晓阳的妻子，每天忙碌于工作和照顾女儿糖糖。' },
  { id: 'tang', name: '糖糖', title: '3岁', avatar: '/images/avatar-tang.png', unlocked: false, bio: '叶晓阳的女儿，三岁。' }
])

const stats = reactive({
  complicity: 20,
  morality: 60,
  suspicion: 10
})

const dayLabels = {
  1: '第1天 · 周三',
  2: '第2天 · 周四',
  3: '第3天 · 周五',
  4: '第4天 · 周六'
}

const currentDayLabel = computed(() => dayLabels[currentDay.value] || `第${currentDay.value}天`)
const statusText = computed(() => isOnline.value ? '在线' : '离线')

onMounted(async () => {
  const savedTheme = localStorage.getItem('night-city-theme')
  isDarkMode.value = savedTheme === 'dark'

  // 初始化引擎（加载manifest.json）
  await DialogueEngine.init()
  
  // 尝试恢复游戏状态
  const loaded = await DialogueEngine.loadProgress(1)  // 默认加载插槽1（自动存档）
  
  if (loaded) {
    // 恢复：显示保存位置的消息
    await restoreFromSave()
  } else {
    // 新游戏：开始第一章第一节
    await startNewGame()
  }

  // BGM需要用户交互后才能播放（浏览器安全策略）
  const savedBGM = localStorage.getItem('night-city-bgm')
  const pendingBGM = savedBGM || 'chat'
  const playBGMonInteract = () => {
    AudioManager.initAudioContext()
    AudioManager.playBGM(pendingBGM, true)
    document.removeEventListener('click', playBGMonInteract)
    document.removeEventListener('touchstart', playBGMonInteract)
  }
  document.addEventListener('click', playBGMonInteract, { once: false })
  document.addEventListener('touchstart', playBGMonInteract, { once: false })

  // 加载存档列表
  loadSaveSlots()
})

// === 开始新游戏 ===
async function startNewGame() {
  try {
    // 开始第一章第一节
    await DialogueEngine.startDialogue('1-1', '1-1-000')
    
    // 显示第一条消息
    const currentMsg = DialogueEngine.getCurrentMessage()
    if (currentMsg) {
      await displayMessage(currentMsg)
    }
    
    // 显示选项（如果有）
    showChoices()
    
    // 自动保存到插槽1
    await DialogueEngine.saveProgress(1)
    loadSaveSlots()
  } catch (err) {
    showToast('游戏启动失败: ' + err.message)
  }
}

// === 恢复游戏状态 ===
async function restoreFromSave() {
  try {
    // 获取当前消息
    const currentMsg = DialogueEngine.getCurrentMessage()
    
    // 重建消息历史（显示最后10条）
    const history = DialogueEngine.getHistory()
    for (const h of history.slice(-10)) {
      // 显示历史消息
      const sceneId = h.sceneId || DialogueEngine.currentSceneId
      const node = await DialogueEngine.getNode(sceneId, h.nodeId)
      if (node) {
        messages.value.push({
          ...node,
          timestamp: h.timestamp || Date.now()
        })
      }
    }
    
    // 显示当前消息
    if (currentMsg) {
      messages.value.push({
        ...currentMsg,
        timestamp: Date.now()
      })
    }
    
    // 显示选项
    showChoices()
    
    showToast('进度已恢复')
  } catch (err) {
    showToast('恢复失败: ' + err.message)
    // 如果恢复失败，开始新游戏
    await startNewGame()
  }
}

// === 显示消息 ===
async function displayMessage(msg) {
  if (!msg || !msg.content) return
  
  // 添加到消息列表
  messages.value.push({
    ...msg,
    timestamp: Date.now()
  })
  
  // 滚动到底部
  scrollToBottom()
  
  // 等待显示时间（使用delay字段，否则动态计算）
  await delay(msg.delay ?? calcWaitTime(msg.content))
}

// === 显示选项 ===
function showChoices() {
  const choices = DialogueEngine.getCurrentChoices()
  if (choices && choices.length > 0) {
    currentChoices.value = choices.map(c => ({ 
      text: c.text, 
      type: c.type || 'primary',
      effects: c.effects || {}
    }))
    isWaiting.value = false
  } else {
    // 无选项，自动推进
    autoPlay()
  }
}

// === 自动播放（无选择时） ===
async function autoPlay() {
  let msg = DialogueEngine.getCurrentMessage()
  
  while (msg && (!msg.choices || msg.choices.length === 0)) {
    // 显示消息
    // 如果是系统消息(type:6)，不显示"正在输入"提示
    const isSystemMsg = msg.type === 6
    
    if (!isSystemMsg) {
      isTyping.value = true
      await delay(600 + Math.random() * 400)
      isTyping.value = false
    }
    
    await displayMessage(msg)
    
    // 推进到下一条
    await DialogueEngine.advance()
    msg = DialogueEngine.getCurrentMessage()
  }
  
  // 显示选项（如果有）
  if (msg && msg.choices && msg.choices.length > 0) {
    showChoices()
  } else if (!msg) {
    isWaiting.value = false
    addMessage({ type: 6, content: '（剧情结束）' })
  }
}

// === 选择处理 ===
async function makeChoice(index) {
  AudioManager.playSFX?.('click')

  const choice = currentChoices.value[index]
  
  // 显示玩家选择（我方发言，type:2）
  addMessage({ type: 2, content: choice.text })
  
  currentChoices.value = []
  isWaiting.value = true
  isTyping.value = true

  // 模拟思考延迟
  await delay(800 + Math.random() * 1200)
  isTyping.value = false

  // 应用选择
  const nextMsg = await DialogueEngine.makeChoice(index)
  
  // 更新数值显示
  updateStatsDisplay()

  // 自动保存到插槽1
  await DialogueEngine.saveProgress(1)
  loadSaveSlots()

  // 显示下一条消息
  if (nextMsg) {
    await displayMessage(nextMsg)
    await delay(calcWaitTime(nextMsg.content))
  }

  // 继续自动播放或显示选项
  const currentMsg = DialogueEngine.getCurrentMessage()
  if (currentMsg && currentMsg.choices && currentMsg.choices.length > 0) {
    showChoices()
  } else if (currentMsg) {
    await DialogueEngine.advance()
    autoPlay()
  } else {
    isWaiting.value = false
  }
}

// === 添加消息 ===
function addMessage(msgData) {
  messages.value.push({
    ...msgData,
    timestamp: Date.now()
  })
  
  scrollToBottom()
}

// === 更新数值显示 ===
function updateStatsDisplay() {
  const engineStats = DialogueEngine.getStats()
  stats.complicity = engineStats.complicity || 20
  stats.morality = engineStats.morality || 60
  stats.suspicion = engineStats.suspicion || 10
}

// === 保存/加载系统 ===

// 加载存档列表
function loadSaveSlots() {
  const saves = DialogueEngine.getAllSaves()
  for (const save of saves) {
    if (!save) continue  // 跳过空存档槽
    const slot = saveSlots.value.find(s => s.id === save.slotId)
    if (slot) {
      slot.timestamp = save.timestamp
      slot.sceneId = save.currentSceneId
      slot.sceneTitle = save.sceneTitle || ''
      slot.stats = save.stats || { complicity: 20, morality: 60, suspicion: 10 }
    }
  }
}

// 处理保存插槽点击
async function handleSaveSlot(slotId) {
  if (slotId === 1) {
    // 插槽1是自动存档，不允许手动覆盖
    showToast('插槽1是自动存档，不可手动覆盖')
    return
  }
  
  const slot = saveSlots.value.find(s => s.id === slotId)
  if (slot.timestamp) {
    // 已有存档，询问是否覆盖
    showDialog({
      title: '覆盖存档',
      message: `插槽${slotId}已有存档，是否覆盖？`,
      showCancelButton: true,
      confirmButtonText: '覆盖',
      cancelButtonText: '取消'
    }).then(async () => {
      await DialogueEngine.saveProgress(slotId)
      loadSaveSlots()
      showToast(`已保存到插槽${slotId}`)
    }).catch(() => {})
  } else {
    // 空插槽，直接保存
    await DialogueEngine.saveProgress(slotId)
    loadSaveSlots()
    showToast(`已保存到插槽${slotId}`)
  }
}

// === 工具函数 ===
function calcWaitTime(content) {
  if (!content) return 1500
  const base = Math.max(1500, Math.min(content.length * 40, 5000))
  return base + 400 + Math.random() * 600
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function scrollToBottom() {
  nextTick(() => {
    const el = messageContainer.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function showTimeDivider(idx) {
  if (idx === 0) return true
  const prev = messages.value[idx - 1]
  const curr = messages.value[idx]
  if (!prev || !curr) return false
  return curr.timestamp - prev.timestamp > 180000
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatSaveTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function onScroll() {}

// === 导航 ===
function goBack() {
  sessionStorage.removeItem('night-city-unlocked')
  router.push('/')
}

function navigate(path) {
  showMenu.value = false
  router.push(path)
}

function selectCharacter(char) {
  if (!char.unlocked) {
    showToast('该人物尚未解锁')
    return
  }
  router.push('/profile')
}

function confirmReset() {
  showMenu.value = false
  showDialog({
    title: '确认重置',
    message: '将清除所有进度，确定吗？',
    showCancelButton: true,
    confirmButtonText: '重置',
    confirmButtonColor: 'var(--color-danger)'
  }).then(() => {
    DialogueEngine.resetGame()
    messages.value = []
    currentChoices.value = []
    stats.complicity = 20
    stats.morality = 60
    stats.suspicion = 10
    currentDay.value = 1
    startNewGame()
    showToast('已重置')
  }).catch(() => {})
}

function toggleDarkMode() {
  const dark = isDarkMode.value
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '')
  localStorage.setItem('night-city-theme', dark ? 'dark' : 'light')
  showToast(dark ? '深夜模式' : '白天模式')
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-chat);
  overflow: hidden;
}

/* === 导航栏 === */
.chat-navbar {
  background: var(--bg-navbar) !important;
  border-bottom:1px solid var(--border-color);
}
.navbar-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height:1.3;
}
.navbar-title .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.navbar-title .status {
  font-size: 11px;
  color: var(--text-secondary);
}
.navbar-title .status.online {
  color: var(--color-success);
}

/* === 聊天主体 === */
.chat-body {
  flex:1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 16px;
  scroll-behavior: smooth;
}
.scroll-spacer {
  height: 16px;
}

/* === 日期/时间分隔线 === */
.day-divider,
.time-divider {
  text-align: center;
  margin: 16px 0;
  position: relative;
}
.day-divider::before,
.time-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height:1px;
  background: var(--border-color);
}
.day-divider span,
.time-divider span {
  position: relative;
  background: var(--bg-chat);
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-secondary);
}
.day-divider span {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
  letter-spacing:1px;
}

/* === 系统消息 === */
.system-msg {
  text-align: center;
  margin: 8px 0;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 12px;
}

/* === 消息行 === */
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  animation: msgIn 0.3s ease;
}
.msg-row.user {
  flex-direction: row;
}
.msg-row.ai {
  flex-direction: row-reverse;
}

@keyframes msgIn {
  from { opacity:0; transform: translateY(8px); }
  to { opacity:1; transform: translateY(0); }
}

/* === 头像 === */
.avatar-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* === 气泡 === */
.bubble {
  max-width: 72%;
  position: relative;
  padding: 10px 14px;
  border-radius: 6px;
  line-height: 1.6;
  font-size: 15px;
  word-break: break-word;
}
.ai-bubble {
  background: var(--bg-message-assistant);
  color: var(--text-primary);
  box-shadow: var(--shadow-message);
}
.user-bubble {
  background: var(--bg-message-user);
  color: #111;
  box-shadow: var(--shadow-message);
}
[data-theme='dark'] .user-bubble {
  color: #e0e0e0;
}

/* 图片气泡 */
.image-bubble {
  padding: 6px;
  max-width: 60%;
}
.msg-image {
  max-width: 200px;
  max-height: 300px;
  border-radius: 4px;
}

/* 三角箭头 */
.triangle {
  position: absolute;
  top: 12px;
  width: 0;
  height: 0;
}
.ai-bubble .ai-tri {
  left: -6px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 6px solid var(--bg-message-assistant);
}
.user-bubble .user-tri {
  right: -6px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid var(--bg-message-user);
}

/* === 动态消息 === */
.dynamic-msg {
  margin: 12px 0;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-align: center;
}
.dynamic-content {
  font-size: 14px;
  color: var(--text-secondary);
}

/* === 结局消息 === */
.ending-msg {
  margin: 20px 0;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  text-align: center;
  color: #fff;
}
.ending-content {
  font-size: 18px;
  font-weight: 600;
}

/* === 正在输入 === */
.typing-bubble {
  padding: 14px 18px;
}
.typing-dots {
  display: flex;
  gap: 4px;
}
.typing-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: bounce 1.2s infinite;
}
.typing-dots i:nth-child(2) { animation-delay: 0.15s; }
.typing-dots i:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* === 选择按钮区域 === */
.choices-area {
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--bg-primary);
  border-top:1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.choice-btn {
  width:100%;
  border: none;
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 15px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}
.choice-btn:active {
  transform: scale(0.98);
  opacity:0.85;
}
.choice-btn.primary {
  background: var(--bg-message-assistant);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}
.choice-btn.success {
  background: rgba(7, 193, 96, 0.12);
  color: var(--color-success);
  border-left: 3px solid var(--color-success);
}
.choice-btn.warning {
  background: rgba(255, 151, 106, 0.12);
  color: var(--color-warning);
  border-left: 3px solid var(--color-warning);
}
.choice-btn.danger {
  background: rgba(238, 10, 36, 0.08);
  color: var(--color-danger);
  border-left: 3px solid var(--color-danger);
}

/* === 等待提示 === */
.waiting-area {
  padding: 16px calc(16px + env(safe-area-inset-bottom));
  background: var(--bg-primary);
  border-top:1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* === 侧边菜单 === */
.menu-panel {
  padding: 24px 0;
  height: 100%;
  overflow-y: auto;
}
.menu-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 24px 20px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}
.menu-avatar {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.menu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.menu-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.menu-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top:4px;
}

/* 数值面板 */
.stats-panel {
  padding: 16px 20px;
  margin-bottom: 16px;
}
.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.stat-item:last-child { margin-bottom: 0; }
.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  width: 52px;
  flex-shrink: 0;
}
.stat-bar {
  flex:1;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}
.stat-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.stat-fill.complicity { background: var(--bar-complicity); }
.stat-fill.morality { background: var(--bar-morality); }
.stat-fill.suspicion { background: var(--bar-suspicion); }
.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  width: 28px;
  text-align: right;
}

/* 保存面板 */
.save-panel {
  padding: 12px 16px;
  margin-bottom: 16px;
}
.save-slots {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.save-slot {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.save-slot:active {
  transform: scale(0.98);
}
.save-slot.empty {
  opacity: 0.6;
}
.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.slot-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.slot-time {
  font-size: 11px;
  color: var(--text-secondary);
}
.slot-empty {
  font-size: 12px;
  color: var(--text-tertiary);
}
.slot-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.slot-scene {
  font-size: 12px;
  color: var(--text-secondary);
}
.slot-stats {
  font-size: 11px;
  color: var(--text-tertiary);
}
.slot-action {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.danger-cell :deep(.van-cell__title) {
  color: var(--color-danger) !important;
}

/* 人物列表 */
.characters-section {
  padding: 12px 16px;
  margin-top: 8px;
}
.section-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.characters-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.char-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.char-avatar-wrap {
  width: 48px;
  height: 48px;
}
.char-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-secondary);
  object-fit: cover;
}
.locked-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.char-item.locked .char-name {
  color: var(--text-tertiary);
}
.char-name {
  font-size: 12px;
  color: var(--text-primary);
}

/* 关于弹窗 */
.about-content {
  text-align: center;
  padding: 20px;
}
.about-logo {
  font-size: 48px;
  margin-bottom: 12px;
}
.about-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.about-version {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.about-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}
.about-copyright {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* === 底部动画 === */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
