<template>
  <div class="lock-screen">
    <!-- 顶部消息提示 -->
    <transition name="slide-down">
      <div v-if="showNotification" class="notification" @click="goToChat">
        <div class="notification-header">
          <span class="app-name">微信</span>
        </div>
        <div class="notification-content">
          <strong>叶晓阳：</strong>{{ notificationText }}
        </div>
      </div>
    </transition>

    <!-- 时间显示区域 -->
    <div class="time-display">
      <div class="hour-minute">{{ currentHourMinute }}</div>
      <div class="date">{{ currentDate }}</div>
    </div>

    <!-- 密码输入区域 -->
    <div class="password-section">
      <!-- 密码输入框（4个圆圈） -->
      <div class="password-dots">
        <div 
          v-for="(dot, index) in 4" 
          :key="index"
          :class="['dot', { filled: index < password.length, shake: isShaking }]"
        >
          <span v-if="index < password.length">●</span>
        </div>
      </div>
      
      <!-- 提示文字 -->
      <div class="password-hint">
        {{ passwordHint }}
      </div>
    </div>

    <!-- 数字键盘 -->
    <div class="numpad">
      <button 
        v-for="key in numpadKeys" 
        :key="key.value"
        :class="['key', key.type || 'number']"
        @click="handleKeyPress(key)"
      >
        <van-icon v-if="key.type === 'delete'" name="clear" size="24" />
        <span v-else>{{ key.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AudioManager from '@/engine/audioManager'

const router = useRouter()

// 时间相关
const now = ref(new Date())
let timer = null

// 密码相关
const password = ref('')
const correctPassword = '0000' // 正确密码
const isShaking = ref(false)
const maxPasswordLength = 4

// 消息通知
const showNotification = ref(true)
const notificationText = ref('你到底在哪里？')

// 数字键盘布局
const numpadKeys = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: '7', value: '7' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { type: 'empty' }, // 占位
  { label: '0', value: '0' },
  { type: 'delete', value: 'delete' }
]

// 计算属性：当前时间格式化
const currentHourMinute = computed(() => {
  const hours = now.value.getHours()
  const minutes = String(now.value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

const currentDate = computed(() => {
  const month = now.value.getMonth() + 1
  const date = now.value.getDate()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekday = weekdays[now.value.getDay()]
  return `${month}月${date}日 ${weekday}`
})

// 计算属性：密码提示文字
const passwordHint = computed(() => {
  if (isShaking.value) return '密码错误，请重试'
  if (password.value.length === 0) return '输入密码'
  if (password.value.length < maxPasswordLength) return ''
  return ''
})

// 初始化
onMounted(() => {
  // 更新时间
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  
  // 初始化音频（需要用户交互）
  AudioManager.initAudioContext()
  
  // 播放标题 BGM
  AudioManager.playBGM('title', true)
  
  // 检查是否有未读消息（从游戏数据读取）
  checkUnreadMessage()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 检查未读消息
const checkUnreadMessage = () => {
  // 从 localStorage 读取游戏状态
  const gameState = localStorage.getItem('night-city-game-state')
  if (gameState) {
    try {
      const state = JSON.parse(gameState)
      // 如果有未读消息，显示通知
      if (state.hasUnreadMessage) {
        showNotification.value = true
        notificationText.value = state.lastMessage || '你到底在哪里？'
      }
    } catch (e) {
      console.warn('[LockScreen] Failed to parse game state')
    }
  }
}

// 处理按键点击
const handleKeyPress = (key) => {
  AudioManager.playSFX('click')
  
  if (key.type === 'delete') {
    // 删除键
    password.value = password.value.slice(0, -1)
    return
  }
  
  if (key.type === 'empty') return
  
  // 数字键
  if (password.value.length < maxPasswordLength) {
    password.value += key.value
    
    // 检查密码是否完整
    if (password.value.length === maxPasswordLength) {
      verifyPassword()
    }
  }
}

// 验证密码
const verifyPassword = () => {
  setTimeout(() => {
    if (password.value === correctPassword) {
      // 密码正确，解锁
      unlockSuccess()
    } else {
      // 密码错误，抖动动画
      passwordError()
    }
  }, 200)
}

// 解锁成功
const unlockSuccess = () => {
  AudioManager.playSFX('unlock')
  
  // 标记为已解锁
  sessionStorage.setItem('night-city-unlocked', 'true')
  
  // 跳转到聊天页面
  router.push('/chat')
}

// 密码错误
const passwordError = () => {
  AudioManager.playSFX('error')
  
  // 触发抖动动画
  isShaking.value = true
  
  // 清空密码
  setTimeout(() => {
    password.value = ''
    isShaking.value = false
  }, 1000)
}

// 点击通知跳转（需要先解锁）
const goToChat = () => {
  // 如果还没解锁，不跳转，只是提示
  showToast('请先输入密码解锁')
}
</script>

<style scoped>
.lock-screen {
  width: 100%;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a3e 0%, #2d1b69 50%, #1a1a3e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 24px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

/* === 顶部消息通知 === */
.notification {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.notification:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.notification-header {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 6px;
}

.app-name {
  font-weight: 500;
}

.notification-content {
  font-size: 15px;
  line-height: 1.5;
}

/* 通知滑入动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.5s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* === 时间显示区域 === */
.time-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.hour-minute {
  font-size: 96px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: -4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.date {
  font-size: 17px;
  opacity: 0.7;
  margin-top: 12px;
  letter-spacing: 2px;
}

/* === 密码输入区域 === */
.password-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.password-dots {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.dot.filled {
  border-color: white;
}

.dot.filled span {
  color: white;
  font-size: 14px;
}

/* 抖动动画（密码错误） */
.dot.shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}

.password-hint {
  font-size: 14px;
  opacity: 0.6;
  height: 20px;
  transition: all 0.3s ease;
}

/* === 数字键盘 === */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 20px 0;
  max-width: 320px;
  margin: 0 auto;
  width: 100%;
}

.key {
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 28px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.key:active {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(0.95);
}

.key.number {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.key.delete {
  background: transparent;
}

.key.empty {
  visibility: hidden;
}
</style>
