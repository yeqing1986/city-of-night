<template>
  <div class="gallery-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="相册"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    >
      <template #right>
        <van-icon name="photograph" size="20" @click="switchView" />
      </template>
    </van-nav-bar>

    <!-- 标签切换 -->
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="结局收藏" name="endings">
        <!-- 结局画廊 -->
        <div class="gallery-grid">
          <div
            v-for="ending in endings"
            :key="ending.id"
            class="gallery-item"
            @click="viewEnding(ending)"
          >
            <div class="image-container">
              <img :src="ending.image" :alt="ending.title" class="gallery-image" />
              <div class="overlay">
                <div class="ending-title">{{ ending.title }}</div>
                <div class="ending-date">{{ formatDate(ending.timestamp) }}</div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="endings.length === 0" class="empty-state">
            <van-icon name="photo-o" size="60" />
            <p>暂无解锁的结局</p>
            <p class="hint">继续对话，解锁不同结局吧！</p>
          </div>
        </div>
      </van-tab>

      <van-tab title="道具收藏" name="items">
        <!-- 道具列表 -->
        <div class="items-list">
          <van-cell
            v-for="item in items"
            :key="item.id"
            :title="item.name"
            :label="item.description"
            @click="viewItem(item)"
          >
            <template #icon>
              <img :src="item.icon" :alt="item.name" class="item-icon" />
            </template>
          </van-cell>

          <!-- 空状态 -->
          <div v-if="items.length === 0" class="empty-state">
            <van-icon name="gift-o" size="60" />
            <p>暂无收集的道具</p>
            <p class="hint">在对话中做出特定选择，收集道具吧！</p>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 结局详情弹窗 -->
    <van-popup
      v-model:show="showEndingDetail"
      round
      :style="{ width: '85%', padding: '20px' }"
    >
      <div class="ending-detail">
        <img :src="selectedEnding.image" :alt="selectedEnding.title" class="ending-image" />
        <h3 class="ending-title">{{ selectedEnding.title }}</h3>
        <p class="ending-description">{{ selectedEnding.description }}</p>
        <p class="ending-date">解锁时间：{{ formatDate(selectedEnding.timestamp) }}</p>
        <van-button block type="primary" @click="shareEnding">
          分享结局
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import CollectionSystem from '@/engine/collection'

const router = useRouter()
const activeTab = ref('endings')
const endings = ref([])
const items = ref([])
const showEndingDetail = ref(false)
const selectedEnding = ref({})

// 初始化
onMounted(() => {
  loadEndings()
  loadItems()
})

// 加载结局
const loadEndings = () => {
  endings.value = CollectionSystem.getEndings()
}

// 加载道具
const loadItems = () => {
  items.value = CollectionSystem.getItems()
}

// 查看结局详情
const viewEnding = (ending) => {
  selectedEnding.value = ending
  showEndingDetail.value = true
}

// 查看道具详情
const viewItem = (item) => {
  showToast(`查看道具: ${item.name}`)
  // 可以打开道具详情弹窗
}

// 分享结局
const shareEnding = () => {
  showToast('分享功能即将上线')
  showEndingDetail.value = false
}

// 切换视图（网格/列表）
const switchView = () => {
  showToast('视图切换功能即将上线')
}

// 格式化日期
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style scoped>
.gallery-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
}

.gallery-item {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.gallery-item:active {
  transform: scale(0.95);
}

.image-container {
  position: relative;
  width: 100%;
  padding-top: 133%; /* 3:4 比例 */
  overflow: hidden;
}

.gallery-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
}

.ending-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.ending-date {
  font-size: 12px;
  opacity: 0.8;
}

.items-list {
  padding: 16px;
}

.item-icon {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 8px;
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

.ending-detail {
  text-align: center;
}

.ending-image {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 16px;
}

.ending-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 12px 0;
}

.ending-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 20px;
}
</style>
