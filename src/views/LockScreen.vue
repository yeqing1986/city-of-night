<template>
  <div class="lock-screen">
    <!-- 状态栏 -->
    <div class="status-bar">
      <span class="time">{{ currentTime }}</span>
      <div class="icons">
        <van-icon name="signal" />
        <van-icon name="wifi" />
        <van-icon name="battery" />
      </div>
    </div>

    <!-- 时间显示 -->
    <div class="time-display">
      <div class="hour-minute">{{ currentHourMinute }}</div>
      <div class="date">{{ currentDate }}</div>
    </div>

    <!-- 解锁按钮 -->
    <div class="unlock-button" @click="unlock">
      <van-icon name="arrow-up" size="24" />
      <span>上滑解锁</span>
    </div>

    <!-- 底部提示 -->
    <div class="hint">
      <van-icon name="chat-o" size="20" />
      <span>深夜 11:47</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AudioManager from '@/engine/audioManager'

const router = useRouter()
const now = ref(new Date())

// 更新时间
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  
  // 初始化音频（需要用户交互）
  AudioManager.initAudioContext()
  
  // 播放标题 BGM
  AudioManager.playBGM('title', true)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 当前时间格式化
const currentTime = computed(() => {
  const hours = String(now.value.getHours()).padStart(2, '0')
  const minutes = String(now.value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

const currentHourMinute = computed(() => {
  const hours = now.value.getHours()
  const minutes = String(now.value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
})

const currentDate = computed(() => {
  const year = now.value.getFullYear()
  const month = now.value.getMonth() + 1
  const date = now.value.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[now.value.getDay()]
  return `${year}年${month}月${date}日 ${weekday}`
})

// 解锁进入聊天界面
const unlock = () => {
  AudioManager.playSFX('click')
  router.push('/chat')
}
</script>

<style scoped>
.lock-screen {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%);
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding-top: 10px;
}

.icons {
  display: flex;
  gap: 8px;
}

.time-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.hour-minute {
  font-size: 120px;
  font-weight: 200;
  line-height: 1;
  margin-bottom: 10px;
  letter-spacing: -5px;
}

.date {
  font-size: 18px;
  opacity: 0.8;
}

.unlock-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  animation: float 2s ease-in-out infinite;
  cursor: pointer;
}

.unlock-button span {
  font-size: 14px;
  opacity: 0.7;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  font-size: 14px;
  opacity: 0.6;
}
</style>
