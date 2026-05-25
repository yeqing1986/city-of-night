<template>
  <div class="profile-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="个人资料"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <!-- 角色卡片 -->
    <div class="character-card">
      <div class="avatar-section">
        <img :src="character.avatar" :alt="character.name" class="avatar" />
        <div class="status-badge" :class="character.status">
          {{ character.statusText }}
        </div>
      </div>

      <div class="info-section">
        <h2 class="name">{{ character.name }}</h2>
        <p class="title">{{ character.title }}</p>
        <p class="description">{{ character.description }}</p>
      </div>

      <!-- 好感度 -->
      <div class="affinity-section">
        <div class="affinity-label">好感度</div>
        <van-progress
          :percentage="affinityScore"
          :color="affinityColor"
          stroke-width="8"
        />
        <div class="affinity-text">{{ affinityScore }}% - {{ affinityLevel }}</div>
      </div>
    </div>

    <!-- 角色详情 -->
    <div class="detail-section">
      <van-cell-group inset>
        <van-cell title="年龄" :value="character.age" />
        <van-cell title="职业" :value="character.occupation" />
        <van-cell title="性格" :value="character.personality" />
        <van-cell title="喜好" :value="character.likes" />
        <van-cell title="不喜" :value="character.dislikes" />
      </van-cell-group>

      <van-cell-group inset title="背景故事">
        <van-cell>
          <template #default>
            <p class="story-text">{{ character.backstory }}</p>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 收集统计 -->
      <van-cell-group inset title="收集统计">
        <van-cell title="对话消息" :value="stats.totalMessages" />
        <van-cell title="做出选择" :value="stats.choicesMade" />
        <van-cell title="收集关键词" :value="stats.keywordsCollected" />
        <van-cell title="解锁结局" :value="`${endingsUnlocked}/${totalEndings}`" />
      </van-cell-group>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <van-button block type="primary" @click="startChat">
        开始对话
      </van-button>
      <van-button block plain type="primary" @click="viewGallery">
        查看相册
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import DialogueEngine from '@/engine/dialogue'
import CollectionSystem from '@/engine/collection'

const router = useRouter()

// 角色数据（从 JSON 加载）
const character = ref({
  avatar: '/images/avatar-ye.png',
  name: '叶晓阳',
  title: '产品经理',
  description: '外表冷静，内心热情。喜欢在深夜思考人生。',
  status: 'online',
  statusText: '在线',
  age: 32,
  occupation: '产品经理',
  personality: '温和、体面、有责任感的上班族',
  likes: '设计、茶、深夜独处',
  dislikes: '害怕孤独，害怕被抛弃，道德感逐步沦丧',
  backstory: '一个典型的都市中年男性，有着看似稳定的家庭和婚姻。然而，他和妻子陆夕瑶已经分房睡两年，两人之间的感情早已名存实亡。他的生活按部就班却缺乏激情，婚姻中的疏离让他感到孤独。'
})

// 好感度
const affinityScore = computed(() => DialogueEngine.affinityScore)

// 好感度等级
const affinityLevel = computed(() => {
  const score = affinityScore.value
  if (score >= 90) return '挚友'
  if (score >= 70) return '好友'
  if (score >= 50) return '相识'
  if (score >= 30) return '陌生人'
  return '冷淡'
})

// 好感度颜色
const affinityColor = computed(() => {
  const score = affinityScore.value
  if (score >= 70) return '#07c160'
  if (score >= 40) return '#1989fa'
  return '#ee0a24'
})

// 统计数据
const stats = computed(() => DialogueEngine.getStats())

// 结局统计
const endingsUnlocked = computed(() => CollectionSystem.getEndings().length)
const totalEndings = 5 // 假设总共有 5 个结局

// 初始化
onMounted(() => {
  // 这里可以从服务器或本地 JSON 加载角色数据
  loadCharacterData()
})

// 加载角色数据
const loadCharacterData = async () => {
  try {
    const response = await fetch('/data/characters.json')
    const data = await response.json()
    character.value = data[0] // 假设第一个角色是叶晓阳
  } catch (error) {
    console.error('[Profile] 加载角色数据失败:', error)
    // 使用默认数据
  }
}

// 开始对话
const startChat = () => {
  router.push('/chat')
}

// 查看相册
const viewGallery = () => {
  router.push('/gallery')
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.character-card {
  margin: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar-section {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 16px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
}

.status-badge.online {
  background: #07c160;
}

.status-badge.offline {
  background: #999;
}

.info-section {
  text-align: center;
  margin-bottom: 20px;
}

.name {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px;
}

.title {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
}

.description {
  font-size: 14px;
  color: #999;
  margin: 0;
  line-height: 1.6;
}

.affinity-section {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.affinity-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.affinity-text {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
  text-align: center;
}

.detail-section {
  margin-top: 16px;
}

.story-text {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  margin: 0;
}

.action-buttons {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
