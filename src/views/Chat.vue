<template>
  <div class="chat-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      :title="characterName"
      :subtitle="statusText"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    >
      <template #right>
        <van-icon name="bars" size="20" @click="showMenu = true" />
      </template>
    </van-nav-bar>

    <!-- 对话区域 -->
    <div class="chat-messages" ref="messageContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="['message-item', message.role]"
      >
        <!-- AI 消息 -->
        <div v-if="message.role === 'assistant'" class="message-bubble assistant">
          <div class="avatar">
            <img :src="characterAvatar" alt="avatar" />
          </div>
          <div class="content">
            <div class="text">{{ message.content }}</div>
            <div v-if="message.keywords && message.keywords.length > 0" class="keywords">
              <van-tag
                v-for="keyword in message.keywords"
                :key="keyword"
                type="primary"
                size="small"
              >
                {{ keyword }}
              </van-tag>
            </div>
          </div>
        </div>

        <!-- 玩家消息 -->
        <div v-else class="message-bubble user">
          <div class="content">
            <div class="text">{{ message.content }}</div>
          </div>
          <div class="avatar">
            <van-icon name="user-o" size="24" />
          </div>
        </div>
      </div>

      <!-- 正在输入指示器 -->
      <div v-if="isTyping" class="typing-indicator">
        <div class="avatar">
          <img :src="characterAvatar" alt="avatar" />
        </div>
        <div class="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>

    <!-- 选择按钮区域（PRD规定：无自由输入，仅通过预设选项推进剧情） -->
    <div v-if="currentChoices.length > 0" class="choices-container">
      <van-button
        v-for="(choice, index) in currentChoices"
        :key="index"
        block
        class="choice-button"
        :type="choice.type || 'primary'"
        @click="makeChoice(index)"
      >
        {{ choice.text }}
      </van-button>
    </div>

    <!-- 无选择时显示等待提示 -->
    <div v-else class="waiting-hint">
      <van-loading type="spinner" size="24" />
      <span>{{ characterName }} 正在输入...</span>
    </div>

    <!-- 侧边菜单 -->
    <van-popup
      v-model:show="showMenu"
      position="right"
      :style="{ width: '70%' }"
    >
      <div class="menu-content">
        <van-cell title="个人资料" @click="goToProfile" />
        <van-cell title="相册" @click="goToGallery" />
        <van-cell title="关键词收藏" @click="goToKeywords" />
        <van-cell title="深夜模式" @click="toggleDarkMode">
          <template #right-icon>
            <van-switch v-model="isDarkMode" size="20" />
          </template>
        </van-cell>
        <van-cell title="设置" @click="goToSettings" />
        <van-cell title="保存游戏" @click="saveGame" />
        <van-cell title="重置游戏" @click="resetGame" />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import DialogueEngine from '@/engine/dialogue'
import AudioManager from '@/engine/audioManager'
import CollectionSystem from '@/engine/collection'

const router = useRouter()
const messageContainer = ref(null)
const userInput = ref('')
const messages = ref([])
const currentChoices = ref([])
const isTyping = ref(false)
const showMenu = ref(false)
const isDarkMode = ref(false) // 深夜模式开关

// 初始化
onMounted(() => {
  // 从 localStorage 读取主题设置
  const savedTheme = localStorage.getItem('night-city-theme')
  if (savedTheme === 'dark') {
    isDarkMode.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
  
  // ... rest of the code

// 角色信息（从游戏数据加载）
const characterName = ref('叶晓阳')
const characterAvatar = ref('/images/avatar-ye.jpg')
const statusText = computed(() => {
  return `好感度: ${DialogueEngine.affinityScore}%`
})

// 初始化
onMounted(() => {
  // 加载游戏状态
  const loaded = DialogueEngine.loadGame()
  
  if (!loaded) {
    // 新游戏：加载第一章
    loadChapter1()
  } else {
    // 恢复游戏：恢复消息历史
    restoreMessages()
  }
  
  // 播放聊天 BGM
  AudioManager.playBGM('chat', true)
})

// 加载第一章
const loadChapter1 = async () => {
  try {
    console.log('[Chat] 开始加载第一章...')
    const response = await fetch('/data/chapter1.json')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const chapterData = await response.json()
    console.log('[Chat] 剧情数据加载成功:', chapterData)
    
    DialogueEngine.loadChapter(chapterData)
    console.log('[Chat] DialogueEngine 加载完成')
    
    // 显示开场消息
    addMessage('assistant', chapterData.openingMessage)
    
    // 显示第一个选择
    showChoices()
  } catch (error) {
    const errorMsg = `加载剧情失败: ${error.message}`
    showToast(errorMsg)
    console.error('[Chat] 加载第一章失败:', error)
    console.error('[Chat] 错误详情:', {
      message: error.message,
      stack: error.stack
    })
  }
}

// 恢复消息历史
const restoreMessages = () => {
  // 从 DialogueEngine.history 恢复消息
  const history = DialogueEngine.history
  if (history.length === 0) {
    loadChapter1()
    return
  }
  
  // 简化处理：只显示最后几条消息
  const recentHistory = history.slice(-10)
  recentHistory.forEach(item => {
    addMessage('user', item.choiceText)
    // 这里应该从游戏数据中获取 AI 回复，简化处理
    addMessage('assistant', '（继续对话...）')
  })
  
  // 显示当前节点的选择
  showChoices()
}

// 添加消息
const addMessage = (role, content, keywords = []) => {
  messages.value.push({
    role,
    content,
    keywords,
    timestamp: Date.now()
  })
  
  // 滚动到底部
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

// 显示选择按钮
const showChoices = () => {
  const choices = DialogueEngine.getAvailableChoices()
  currentChoices.value = choices.map(choice => ({
    text: choice.text,
    type: choice.type || 'primary',
    affinity: choice.affinity || 0
  }))
}

// 做出选择
const makeChoice = (index) => {
  AudioManager.playSFX('click')
  
  const choice = currentChoices.value[index]
  
  // 添加玩家消息
  addMessage('user', choice.text)
  
  // 清空选择
  currentChoices.value = []
  
  // 显示"正在输入"
  isTyping.value = true
  
  // 模拟 AI 思考时间
  setTimeout(() => {
    isTyping.value = false
    
    // 调用 DialogueEngine 处理选择
    const nextNode = DialogueEngine.makeChoice(index)
    
    if (nextNode) {
      // 显示 AI 回复
      addMessage('assistant', nextNode.content, nextNode.keywords || [])
      
      // 收集关键词
      if (nextNode.keywords && nextNode.keywords.length > 0) {
        nextNode.keywords.forEach(keyword => {
          CollectionSystem.collectKeyword(keyword, nextNode.id)
        })
      }
      
      // 检查是否有下一个选择
      if (nextNode.choices && nextNode.choices.length > 0) {
        showChoices()
      } else if (nextNode.endChapter) {
        // 章节结束
        showToast('章节已完成！')
      }
    }
    
    // 自动保存
    DialogueEngine.saveGame()
  }, 1000 + Math.random() * 1000) // 1-2 秒随机延迟
}

// 发送自由文本消息
const sendMessage = () => {
  if (!userInput.value.trim()) return
  
  AudioManager.playSFX('send')
  
  const text = userInput.value.trim()
  addMessage('user', text)
  userInput.value = ''
  
  // 这里可以接入 AI API 进行自由对话
  // 当前版本只支持选择分支
  showToast('自由对话功能即将上线')
}

// 返回锁屏
const goBack = () => {
  router.push('/')
}

// 跳转页面
const goToProfile = () => {
  showMenu.value = false
  router.push('/profile')
}

const goToGallery = () => {
  showMenu.value = false
  router.push('/gallery')
}

const goToKeywords = () => {
  showMenu.value = false
  router.push('/keywords')
}

const goToSettings = () => {
  showMenu.value = false
  router.push('/settings')
}

// 保存游戏
const saveGame = () => {
  DialogueEngine.saveGame()
  showToast('游戏已保存')
  showMenu.value = false
}

// 重置游戏
const resetGame = () => {
  showDialog({
    title: '确认重置',
    message: '重置将清除所有游戏进度，是否继续？',
    showCancelButton: true
  }).then(() => {
    DialogueEngine.resetGame()
    CollectionSystem.reset()
    messages.value = []
    showMenu.value = false
    loadChapter1()
    showToast('游戏已重置')
  }).catch(() => {
    // 取消
  })
}

// 切换深夜模式
const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  
  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('night-city-theme', 'dark')
    showToast('已切换到深夜模式')
  } else {
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('night-city-theme', 'light')
    showToast('已切换到白天模式')
  }
}
</script>

<style scoped>
/* === 聊天容器 === */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  transition: background 0.3s ease;
}

/* === 聊天消息区域 === */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-chat);
}

/* === 消息项 === */
.message-item {
  margin-bottom: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* === 消息气泡 === */
.message-bubble {
  display: flex;
  gap: 12px;
  max-width: 75%;
  align-items: flex-start;
}

.message-bubble.assistant {
  flex-direction: row;
}

.message-bubble.user {
  flex-direction: row-reverse;
  margin-left: auto;
}

/* === 头像 === */
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 8px;  /* 微信风格：圆角矩形，不是圆形 */
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar .van-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-message-user);
  color: white;
  border-radius: 8px;
  font-size: 20px;
}

/* === 消息内容 === */
.content {
  background: var(--bg-message-assistant);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: var(--shadow-message);
  position: relative;
  max-width: 100%;
  word-break: break-word;
}

/* 微信风格：消息气泡三角 */
.message-bubble.assistant .content::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 14px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-right: 6px solid var(--bg-message-assistant);
}

.message-bubble.user .content::before {
  content: '';
  position: absolute;
  right: -6px;
  top: 14px;
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 6px solid var(--bg-message-user);
}

.message-bubble.user .content {
  background: var(--bg-message-user);
  color: #ffffff;
}

/* === 消息文字 === */
.text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
}

.message-bubble.user .text {
  color: #ffffff;
}

/* === 关键词标签 === */
.keywords {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* === "正在输入"指示器 === */
.typing-indicator {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-message-assistant);
  border-radius: 8px;
  box-shadow: var(--shadow-message);
}

.dots span {
  width: 8px;
  height: 8px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

/* === 选择按钮区域 === */
.choices-container {
  padding: 16px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choice-button {
  border-radius: 8px;
  font-size: 15px;
  height: 44px;
  transition: all 0.2s ease;
}

.choice-button:active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* === 等待提示 === */
.waiting-hint {
  padding: 16px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* === 侧边菜单 === */
.menu-content {
  padding: 16px;
}

.menu-content .van-cell {
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background 0.2s ease;
}

.menu-content .van-cell:active {
  background: var(--border-color);
}
</style>

