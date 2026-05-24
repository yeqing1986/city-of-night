<template>
  <div class="keyword-gallery">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="关键词收藏"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    >
      <template #right>
        <van-icon name="search" size="20" @click="showSearch = true" />
      </template>
    </van-nav-bar>

    <!-- 搜索栏 -->
    <van-search
      v-if="showSearch"
      v-model="searchKeyword"
      placeholder="搜索关键词..."
      show-action
      @search="onSearch"
      @cancel="showSearch = false"
    />

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>已收集: {{ filteredKeywords.length }}/{{ totalKeywords }}</span>
      <van-button size="small" @click="toggleView">
        {{ isGridView ? '列表视图' : '网格视图' }}
      </van-button>
    </div>

    <!-- 网格视图 -->
    <div v-if="isGridView" class="keyword-grid">
      <div
        v-for="keyword in filteredKeywords"
        :key="keyword.text"
        class="keyword-card"
        @click="viewKeywordDetail(keyword)"
      >
        <div class="keyword-text">{{ keyword.text }}</div>
        <div class="keyword-context">{{ keyword.context }}</div>
        <div class="keyword-date">{{ formatDate(keyword.timestamp) }}</div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else class="keyword-list">
      <van-cell
        v-for="keyword in filteredKeywords"
        :key="keyword.text"
        :title="keyword.text"
        :label="keyword.context"
        @click="viewKeywordDetail(keyword)"
      >
        <template #right-icon>
          <span class="keyword-date">{{ formatDate(keyword.timestamp) }}</span>
        </template>
      </van-cell>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredKeywords.length === 0" class="empty-state">
      <van-icon name="search" size="60" />
      <p>{{ searchKeyword ? '没有找到匹配的关键词' : '暂无收藏的关键词' }}</p>
      <p class="hint">在对话中留意关键词，点击收集吧！</p>
    </div>

    <!-- 关键词详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      round
      :style="{ width: '85%', padding: '20px' }"
    >
      <div class="keyword-detail">
        <h3 class="detail-title">{{ selectedKeyword.text }}</h3>
        <p class="detail-context">
          <strong>上下文:</strong> {{ selectedKeyword.context }}
        </p>
        <p class="detail-date">
          收集时间: {{ formatDate(selectedKeyword.timestamp) }}
        </p>
        <div class="detail-actions">
          <van-button size="small" type="primary" @click="shareKeyword">
            分享
          </van-button>
          <van-button size="small" @click="showDetail = false">
            关闭
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import CollectionSystem from '@/engine/collection'

const router = useRouter()
const searchKeyword = ref('')
const showSearch = ref(false)
const isGridView = ref(true)
const showDetail = ref(false)
const selectedKeyword = ref({})
const totalKeywords = ref(50) // 假设总共有 50 个关键词

// 获取已收集的关键词
const keywords = computed(() => {
  return CollectionSystem.getKeywords()
})

// 过滤后的关键词（搜索功能）
const filteredKeywords = computed(() => {
  if (!searchKeyword.value.trim()) {
    return keywords.value
  }
  
  const query = searchKeyword.value.toLowerCase()
  return keywords.value.filter(kw => 
    kw.text.toLowerCase().includes(query) ||
    kw.context.toLowerCase().includes(query)
  )
})

// 初始化
onMounted(() => {
  loadTotalKeywords()
})

// 加载总关键词数（从配置文件）
const loadTotalKeywords = async () => {
  try {
    const response = await fetch('/data/keywords.json')
    const data = await response.json()
    totalKeywords.value = data.total || 50
  } catch (error) {
    console.error('[KeywordGallery] 加载关键词配置失败:', error)
  }
}

// 查看关键词详情
const viewKeywordDetail = (keyword) => {
  selectedKeyword.value = keyword
  showDetail.value = true
}

// 分享关键词
const shareKeyword = () => {
  showToast('分享功能即将上线')
  showDetail.value = false
}

// 搜索
const onSearch = () => {
  showToast(`搜索: ${searchKeyword.value}`)
}

// 切换视图
const toggleView = () => {
  isGridView.value = !isGridView.value
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style scoped>
.keyword-gallery {
  min-height: 100vh;
  background: #f5f5f5;
}

.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  color: #666;
}

.keyword-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
}

.keyword-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.keyword-card:active {
  transform: scale(0.95);
}

.keyword-text {
  font-size: 16px;
  font-weight: bold;
  color: #1989fa;
  margin-bottom: 8px;
}

.keyword-context {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.keyword-date {
  font-size: 10px;
  color: #999;
}

.keyword-list {
  padding: 16px;
}

.keyword-list .van-cell {
  border-radius: 8px;
  margin-bottom: 8px;
}

.keyword-date {
  font-size: 12px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999;
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

.empty-state .hint {
  font-size: 12px;
  color: #bbb;
  margin-top: 8px;
}

.keyword-detail {
  text-align: center;
}

.detail-title {
  font-size: 20px;
  font-weight: bold;
  color: #1989fa;
  margin-bottom: 16px;
}

.detail-context {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 12px;
  text-align: left;
}

.detail-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 20px;
}

.detail-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
