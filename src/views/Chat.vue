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
        <!-- 时间分隔（每5条或30分钟间隔） -->
        <div v-if="showTimeDivider(idx)" class="time-divider">
          {{ formatTime(msg.timestamp) }}
        </div>

        <!-- 系统消息 -->
        <div v-if="msg.role === 'system'" class="system-msg">
          {{ msg.content }}
        </div>

        <!-- 天数过渡 -->
        <div v-else-if="msg.role === 'day-transition'" class="day-transition">
          <div class="day-divider"><span>{{ msg.content }}</span></div>
        </div>

        <!-- AI 消息 -->
        <div v-else-if="msg.role === 'assistant'" class="msg-row ai">
          <div class="avatar-wrap">
            <img :src="aiAvatar" alt="" class="avatar-img" />
          </div>
          <div class="bubble ai-bubble">
            <span class="triangle"></span>
            <div class="bubble-text" v-html="msg.content.replace(/\n/g, '<br/>')"></div>
            <div v-if="msg.keywords?.length" class="bubble-keywords">
              <span v-for="kw in msg.keywords" :key="kw" class="kw-tag">#{{ kw }}</span>
            </div>
          </div>
        </div>

        <!-- 玩家消息 -->
        <div v-else class="msg-row user">
          <div class="bubble user-bubble">
            <span class="triangle"></span>
            <div class="bubble-text">{{ msg.content }}</div>
          </div>
          <div class="avatar-wrap">
            <img :src="aiAvatar" alt="" class="avatar-img" />
          </div>
        </div>
      </template>

      <!-- 正在输入 -->
      <div v-if="isTyping" class="msg-row ai typing-row">
        <div class="avatar-wrap">
          <img :src="aiAvatar" alt="" class="avatar-img" />
        </div>
        <div class="bubble ai-bubble typing-bubble">
          <span class="triangle"></span>
          <div class="typing-dots">
            <i></i><i></i><i></i>
          </div>
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
          <div class="menu-desc">32岁 · 销售 · 已婚</div>
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

        <!-- 功能列表 -->
        <van-cell-group :border="false" inset>
          <van-cell title="个人资料" icon="contact" is-link @click="navigate('/profile')" />
          <van-cell title="相册" icon="photo-o" is-link @click="navigate('/gallery')" />
          <van-cell title="关键词收藏" icon="label-o" is-link @click="navigate('/keywords')" />
          <van-cell title="设置" icon="setting-o" is-link @click="navigate('/settings')" />
        </van-cell-group>

        <van-cell-group :border="false" inset style="margin-top: 12px;">
          <van-cell title="深夜模式" icon="moon-o">
            <template #right-icon>
              <van-switch v-model="isDarkMode" size="20" @change="toggleDarkMode" />
            </template>
          </van-cell>
          <van-cell title="保存进度" icon="passed" @click="saveGame" />
          <van-cell title="重置游戏" icon="replay" @click="confirmReset" class="danger-cell" />
        </van-cell-group>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import DialogueEngine from '@/engine/dialogue'
import AudioManager from '@/engine/audioManager'
import CollectionSystem from '@/engine/collection'
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

onMounted(() => {
  const savedTheme = localStorage.getItem('night-city-theme')
  isDarkMode.value = savedTheme === 'dark'

  // 加载游戏
  const loaded = DialogueEngine.loadGame()
  if (!loaded) {
    loadChapter()
  } else {
    restoreMessages()
  }

  AudioManager.playBGM('chat', true)
})

// === 剧情加载 ===
async function loadChapter() {
  try {
    const res = await fetch('/data/chapter1.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    DialogueEngine.loadChapter(data)

    // 开场白拆行显示
    const lines = data.openingMessage.split('\n').filter(Boolean)
    for (const line of lines) {
      addMessage('system', line)
    }

    addMessage('assistant', '你好，我是小七。睡不着——有什么心事吗？')
    showChoices()
  } catch (err) {
    showToast('剧情加载失败: ' + err.message)
  }
}

function restoreMessages() {
  const history = DialogueEngine.history
  if (!history.length) return loadChapter()

  history.slice(-15).forEach(h => {
    addMessage('user', h.choiceText)
    addMessage('assistant', '（继续对话...）')
  })
  showChoices()
}

// === 消息管理 ===
function addMessage(role, content, extra = {}) {
  messages.value.push({ role, content, timestamp: Date.now(), ...extra })
  // 同步最新AI消息到store，供锁屏通知使用
  if (role === 'assistant') {
    gameStore.lastAssistantMessage = content
  }
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    const el = messageContainer.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function showChoices() {
  const choices = DialogueEngine.getAvailableChoices()
  if (choices.length) {
    currentChoices.value = choices.map(c => ({ text: c.text, type: c.type || 'primary', affinity: c.affinity || 0 }))
    isWaiting.value = false
  }
}

// === 选择处理 ===
async function makeChoice(index) {
  AudioManager.playSFX?.('click')

  const choice = currentChoices.value[index]
  addMessage('user', choice.text)
  currentChoices.value = []
  isWaiting.value = true
  isTyping.value = true

  // 模拟思考延迟
  const delay = 800 + Math.random() * 1200
  await new Promise(r => setTimeout(r, delay))

  isTyping.value = false

  const nextNode = DialogueEngine.makeChoice(index)
  if (!nextNode) return

  // 天数过渡检测
  if (nextNode.timestamp && nextNode.timestamp < '12:00' && currentDay.value > 1) {
    currentDay.value = 0
  }

  // 天数结束
  if (nextNode.endDay && nextNode.daySummary) {
    currentDay.value++
    addMessage('day-transition', dayLabels[currentDay.value] || `第${currentDay.value}天`)
    if (nextNode.nextNode) {
      DialogueEngine.currentNode = nextNode.nextNode
      // 短暂延迟后继续
      isWaiting.value = false
      isTyping.value = true
      await new Promise(r => setTimeout(r, 1500))
      isTyping.value = false
      const follow = DialogueEngine.getCurrentNode()
      if (follow) {
        addMessage('assistant', follow.content, { keywords: follow.keywords })
        if (follow.statsChange) applyStats(follow.statsChange)
        if (follow.choices?.length) showChoices()
        else if (follow.autoNext && follow.nextNode) {
          DialogueEngine.currentNode = follow.nextNode
          showChoices()
        }
      }
      DialogueEngine.saveGame()
      return
    }
  }

  addMessage('assistant', nextNode.content, { keywords: nextNode.keywords })

  // 关键词收集
  if (nextNode.keywords?.length) {
    nextNode.keywords.forEach(kw => CollectionSystem.collectKeyword(kw, nextNode.id))
  }

  // 数值变化
  if (nextNode.statsChange) applyStats(nextNode.statsChange)

  // 章节结束
  if (nextNode.endChapter) {
    addMessage('system', '—— 第一章完 ——')
    isWaiting.value = false
    return
  }

  // 自动跳转
  if (nextNode.autoNext && nextNode.nextNode) {
    DialogueEngine.currentNode = nextNode.nextNode
    const auto = DialogueEngine.getCurrentNode()
    if (auto) {
      isTyping.value = true
      await new Promise(r => setTimeout(r, 1000))
      isTyping.value = false
      addMessage('assistant', auto.content, { keywords: auto.keywords })
      if (auto.statsChange) applyStats(auto.statsChange)
      if (auto.choices?.length) showChoices()
    }
  } else if (nextNode.choices?.length) {
    showChoices()
  } else {
    isWaiting.value = false
  }

  DialogueEngine.saveGame()
}

function applyStats(changes) {
  if (changes.complicity) stats.complicity = Math.max(0, Math.min(100, stats.complicity + changes.complicity))
  if (changes.morality) stats.morality = Math.max(0, Math.min(100, stats.morality + changes.morality))
  if (changes.suspicion) stats.suspicion = Math.max(0, Math.min(100, stats.suspicion + changes.suspicion))
  gameStore.updateStats(changes)
}

// === 时间分隔 ===
function showTimeDivider(idx) {
  if (idx === 0) return true
  const prev = messages.value[idx - 1]
  const curr = messages.value[idx]
  if (!prev || !curr) return false
  // 首条或间隔 > 3 分钟
  return curr.timestamp - prev.timestamp > 180000
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
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

function saveGame() {
  DialogueEngine.saveGame()
  showToast('进度已保存')
  showMenu.value = false
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
    CollectionSystem.reset()
    messages.value = []
    currentChoices.value = []
    stats.complicity = 20
    stats.morality = 60
    stats.suspicion = 10
    currentDay.value = 1
    loadChapter()
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
  border-bottom: 1px solid var(--border-color);
}
.navbar-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.3;
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
  flex: 1;
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
  height: 1px;
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
  letter-spacing: 1px;
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
  flex-direction: row-reverse;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
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
.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: #fff;
  border-radius: 6px;
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

/* 三角箭头 */
.triangle {
  position: absolute;
  top: 12px;
  width: 0;
  height: 0;
}
.ai-bubble .triangle {
  left: -6px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 6px solid var(--bg-message-assistant);
}
.user-bubble .triangle {
  right: -6px;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid var(--bg-message-user);
}

.bubble-text {
  font-size: 15px;
  line-height: 1.65;
}

/* === 关键词标签 === */
.bubble-keywords {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.kw-tag {
  font-size: 12px;
  color: var(--text-link);
  opacity: 0.8;
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
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.choice-btn {
  width: 100%;
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
  opacity: 0.85;
}

/* 选项类型颜色 */
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
  border-top: 1px solid var(--border-color);
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
  margin-top: 4px;
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
  flex: 1;
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

.danger-cell :deep(.van-cell__title) {
  color: var(--color-danger) !important;
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
