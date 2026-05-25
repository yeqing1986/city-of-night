<template>
  <div class="profile-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="个人资料"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <div class="profile-scroll">
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
          <div class="story-card">
            <p class="story-text">{{ character.backstory }}</p>
          </div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import DialogueEngine from '@/engine/dialogue'
import CollectionSystem from '@/engine/collection'

const router = useRouter()

// 角色数据
const character = ref({
  avatar: '/images/avatar-ye.png',
  name: '叶晓阳',
  title: '32岁 · 销售 · 已婚',
  description: '外表冷静，内心热情。喜欢在深夜思考人生。',
  status: 'online',
  statusText: '在线',
  age: 32,
  occupation: '销售',
  personality: '温和、体面、有责任感的上班族',
  likes: '设计、茶、深夜独处',
  dislikes: '害怕孤独，害怕被抛弃，道德感逐步沦丧',
  backstory: '一个典型的都市中年男性，有着看似稳定的家庭和婚姻。然而，他和妻子陆夕瑶已经分房睡两年，两人之间的感情早已名存实亡。他的生活按部就班却缺乏激情，婚姻中的疏离让他感到孤独。近来，他下载了一款名为"深夜树洞"的AI倾诉软件，试图在虚拟世界中寻找一丝慰藉。'
})

// 好感度
const affinityScore = computed(() => DialogueEngine.affinityScore || 30)

const affinityLevel = computed(() => {
  const score = affinityScore.value
  if (score >= 90) return '挚友'
  if (score >= 70) return '好友'
  if (score >= 50) return '相识'
  if (score >= 30) return '陌生人'
  return '冷淡'
})

const affinityColor = computed(() => {
  const score = affinityScore.value
  if (score >= 70) return '#07c160'
  if (score >= 40) return '#1989fa'
  return '#ee0a24'
})

const stats = computed(() => DialogueEngine.getStats ? DialogueEngine.getStats() : { totalMessages: 0, choicesMade: 0, keywordsCollected: 0 })
const endingsUnlocked = computed(() => CollectionSystem.getEndings().length)
const totalEndings = 5

onMounted(() => {
  loadCharacterData()
})

const loadCharacterData = async () => {
  try {
    const response = await fetch('/data/characters.json')
    if (response.ok) {
      const data = await response.json()
      if (data[0]) character.value = data[0]
    }
  } catch (error) {
    // 使用默认数据
  }
}

const startChat = () => router.push('/chat')
const viewGallery = () => router.push('/gallery')
const goBack = () => router.back()
</script>

<style scoped>
.profile-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: var(--bg-primary);
  overflow: hidden;
}

.profile-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.character-card {
  margin: 16px;
  padding: 24px 20px;
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.avatar-section {
  position: relative;
  width: 88px;
  height: 88px;
  margin: 0 auto 16px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--border-color);
}

.status-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #fff;
}

.status-badge.online { background: #07c160; }
.status-badge.offline { background: #999; }

.info-section {
  text-align: center;
  margin-bottom: 20px;
}

.name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.title {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 10px;
}

.description {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.6;
}

.affinity-section {
  padding: 14px 16px;
  background: var(--bg-primary);
  border-radius: 10px;
}

.affinity-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.affinity-text {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
  text-align: center;
}

.detail-section {
  margin-top: 8px;
}

.story-card {
  padding: 14px 16px;
  margin: 0 16px;
  background: var(--bg-primary);
  border-radius: 0 0 8px 8px;
}

.story-text {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
  text-indent: 2em;
}

.action-buttons {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
