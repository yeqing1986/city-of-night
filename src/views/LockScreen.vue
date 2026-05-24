<template>
  <div class="lock-screen">
    <!-- 星空粒子背景 -->
    <div class="stars" ref="starsContainer"></div>

    <!-- 顶部消息通知 -->
    <transition name="slide-down">
      <div v-if="showNotification" class="notification" @click="onNotificationClick">
        <div class="notification-app">
          <van-icon name="chat-o" size="18" />
          <span>微信</span>
          <span class="notification-time">刚刚</span>
        </div>
        <div class="notification-body">
          <strong>{{ characterName }}</strong>&nbsp;{{ notificationText }}
        </div>
      </div>
    </transition>

    <!-- 中央时间 -->
    <div class="time-area">
      <div class="lock-icon">🔒</div>
      <div class="time">{{ currentHourMinute }}</div>
      <div class="date">{{ currentDate }}</div>
    </div>

    <!-- 密码区域 -->
    <div class="password-area">
      <div class="password-dots" :class="{ shake: isShaking }">
        <div v-for="i in 4" :key="i" class="dot" :class="{ filled: i <= password.length }">
          <div v-if="i <= password.length" class="dot-inner"></div>
        </div>
      </div>
      <div class="password-hint">{{ hintText }}</div>
    </div>

    <!-- 数字键盘 -->
    <div class="numpad">
      <button
        v-for="key in numpadKeys"
        :key="key.label || key.type"
        :class="['key', key.type || '']"
        @click="onKey(key)"
      >
        <template v-if="key.type === 'delete'">
          <van-icon name="delete-o" size="22" />
        </template>
        <template v-else-if="key.type === 'empty'">
          &nbsp;
        </template>
        <template v-else>
          {{ key.label }}
        </template>
      </button>
    </div>

    <!-- 底部提示 -->
    <div class="bottom-hint">密码：0000</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import AudioManager from '@/engine/audioManager'

const router = useRouter()
const now = ref(new Date())
let timer = null

const password = ref('')
const isShaking = ref(false)
const showNotification = ref(true)
const characterName = ref('叶晓阳')
const notificationText = ref('在吗？')

const numpadKeys = [
  { label: '1', sub: '' },
  { label: '2', sub: 'ABC' },
  { label: '3', sub: 'DEF' },
  { label: '4', sub: 'GHI' },
  { label: '5', sub: 'JKL' },
  { label: '6', sub: 'MNO' },
  { label: '7', sub: 'PQRS' },
  { label: '8', sub: 'TUV' },
  { label: '9', sub: 'WXYZ' },
  { type: 'empty' },
  { label: '0' },
  { type: 'delete' }
]

const currentHourMinute = computed(() => {
  const h = now.value.getHours().toString().padStart(2, '0')
  const m = now.value.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
})

const currentDate = computed(() => {
  const d = now.value
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

const hintText = computed(() => {
  if (isShaking.value) return '密码错误，请重试'
  if (password.value.length === 0) return '输入密码'
  return ''
})

onMounted(() => {
  timer = setInterval(() => { now.value = new Date() }, 1000)
  AudioManager.initAudioContext?.()
  AudioManager.playBGM?.('title', true)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function onKey(key) {
  AudioManager.playSFX?.('click')
  if (key.type === 'delete') {
    password.value = password.value.slice(0, -1)
    return
  }
  if (key.type === 'empty') return
  if (password.value.length >= 4) return

  password.value += key.label

  if (password.value.length === 4) {
    setTimeout(() => {
      if (password.value === '0000') {
        AudioManager.playSFX?.('unlock')
        sessionStorage.setItem('night-city-unlocked', 'true')
        router.push('/chat')
      } else {
        AudioManager.playSFX?.('error')
        isShaking.value = true
        setTimeout(() => {
          password.value = ''
          isShaking.value = false
        }, 800)
      }
    }, 200)
  }
}

function onNotificationClick() {
  showToast('请先解锁手机')
}
</script>

<style scoped>
.lock-screen {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 20px calc(24px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
  user-select: none;
}

/* === 星空背景 === */
.stars {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* === 通知 === */
.notification {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 14px 16px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}
.notification:active {
  transform: scale(0.97);
  opacity: 0.85;
}
.notification-app {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 6px;
}
.notification-time {
  margin-left: auto;
}
.notification-body {
  font-size: 15px;
  line-height: 1.5;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-down-enter-from {
  transform: translateY(-60px);
  opacity: 0;
}
.slide-down-leave-to {
  transform: translateY(-60px);
  opacity: 0;
}

/* === 时间区域 === */
.time-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}
.lock-icon {
  font-size: 24px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.time {
  font-size: 86px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: -2px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.15);
}
.date {
  font-size: 16px;
  opacity: 0.6;
  margin-top: 10px;
  letter-spacing: 2px;
  font-weight: 400;
}

/* === 密码 === */
.password-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0 16px;
}
.password-dots {
  display: flex;
  gap: 18px;
  margin-bottom: 14px;
}
.password-dots.shake {
  animation: shake 0.5s ease-in-out;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease;
}
.dot.filled {
  border-color: rgba(255, 255, 255, 0.8);
}
.dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  animation: dotPop 0.15s ease;
}
@keyframes dotPop {
  0% { transform: scale(0); }
  70% { transform: scale(1.3); }
  100% { transform: scale(1); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-12px); }
  40% { transform: translateX(12px); }
  60% { transform: translateX(-8px); }
  80% { transform: translateX(8px); }
}
.password-hint {
  font-size: 14px;
  opacity: 0.5;
  height: 20px;
  transition: all 0.3s ease;
}

/* === 数字键盘 === */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 280px;
  margin: 0 auto;
  width: 100%;
}
.key {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  min-height: 56px;
  max-height: 72px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 28px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.12s ease;
  font-family: inherit;
}
.key:active {
  background: rgba(255, 255, 255, 0.22);
  transform: scale(0.94);
}
.key.empty {
  visibility: hidden;
}
.key.delete {
  background: transparent;
  font-size: 22px;
}
.key .sub {
  font-size: 9px;
  letter-spacing: 2px;
  opacity: 0.5;
  margin-top: -2px;
}

/* === 底部 === */
.bottom-hint {
  text-align: center;
  font-size: 12px;
  opacity: 0.25;
}
</style>
