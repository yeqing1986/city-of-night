<template>
  <div class="gallery-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="相册"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <!-- 分组切换：按章节 / 按人物 -->
    <van-tabs v-model:active="groupMode" sticky>
      <van-tab title="按章节" name="chapter">
        <div v-for="group in chapterGroups" :key="group.key" class="group-section">
          <div class="group-header">{{ group.label }}</div>
          <div class="gallery-grid">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="gallery-item"
              :class="{ locked: !item.unlocked }"
              @click="!item.unlocked && viewImage(item)"
            >
              <div class="image-container">
                <img
                  v-if="item.unlocked"
                  :src="item.image || item.thumb"
                  :alt="item.title"
                  class="gallery-thumb"
                />
                <div v-else class="locked-overlay">
                  <van-icon name="lock" size="28" color="#fff" />
                  <span class="lock-hint">未解锁</span>
                </div>
                <div v-if="item.unlocked" class="image-title">{{ item.title }}</div>
              </div>
            </div>
          </div>
          <!-- 章节空状态 -->
          <div v-if="group.items.length === 0" class="group-empty">暂无图片</div>
        </div>

        <!-- 全局空状态 -->
        <div v-if="chapterGroups.length === 0" class="empty-state">
          <van-icon name="photo-o" size="60" />
          <p>相册是空的</p>
          <p class="hint">继续剧情，解锁更多图片吧！</p>
        </div>
      </van-tab>

      <van-tab title="按人物" name="character">
        <div v-for="group in characterGroups" :key="group.key" class="group-section">
          <div class="group-header group-header-char">
            <img v-if="group.avatar" :src="group.avatar" class="header-avatar" />
            <span>{{ group.label }}</span>
          </div>
          <div class="gallery-grid">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="gallery-item"
              :class="{ locked: !item.unlocked }"
              @click="item.unlocked && viewImage(item)"
            >
              <div class="image-container">
                <img
                  v-if="item.unlocked"
                  :src="item.image || item.thumb"
                  :alt="item.title"
                  class="gallery-thumb"
                />
                <div v-else class="locked-overlay">
                  <van-icon name="lock" size="28" color="#fff" />
                  <span class="lock-hint">未解锁</span>
                </div>
                <div v-if="item.unlocked" class="image-title">{{ item.title }}</div>
              </div>
            </div>
          </div>
          <div v-if="group.items.length === 0" class="group-empty">暂无图片</div>
        </div>

        <div v-if="characterGroups.length === 0" class="empty-state">
          <van-icon name="photo-o" size="60" />
          <p>相册是空的</p>
          <p class="hint">继续剧情，解锁更多图片吧！</p>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 图片预览（全屏放大） -->
    <van-image-preview
      v-model:show="showPreview"
      :images="previewImages"
      :start-position="previewIndex"
      closeable
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CollectionSystem from '@/engine/collection'

const router = useRouter()
const groupMode = ref('chapter')
const showPreview = ref(false)
const previewImages = ref([])
const previewIndex = ref(0)

// 所有收集的图片（结局 + 道具 + 场景图）
const allImages = computed(() => {
  const images = []

  // 结局图鉴
  CollectionSystem.getEndings().forEach(e => {
    images.push({
      id: 'ending_' + e.id,
      type: 'ending',
      title: e.title,
      image: e.image,
      thumb: e.image,
      description: e.description,
      unlocked: true,
      timestamp: e.timestamp,
      chapter: e.chapter || '未知章节',
      character: e.character || ''
    })
  })

  // 道具（有icon的）
  CollectionSystem.getItems().forEach(item => {
    if (item.icon) {
      images.push({
        id: 'item_' + item.id,
        type: 'item',
        title: item.name,
        image: item.icon,
        thumb: item.icon,
        description: item.description,
        unlocked: true,
        timestamp: item.timestamp,
        chapter: item.chapter || '未知章节',
        character: item.character || ''
      })
    }
  })

  // 预定义的未解锁图片（从配置加载）
  const allDefs = window.__GALLERY_DEFS__ || []
  allDefs.forEach(def => {
    const exists = images.some(img => img.id === def.id)
    if (!exists) {
      images.push({
        ...def,
        unlocked: false,
        timestamp: 0
      })
    }
  })

  return images
})

// 按章节分组
const chapterGroups = computed(() => {
  const map = new Map()
  allImages.value.forEach(img => {
    const key = img.chapter || '其他'
    if (!map.has(key)) map.set(key, { key, label: key, items: [] })
    map.get(key).items.push(img)
  })
  // 章节排序
  const order = ['第1天', '第2天', '第3天', '第4天', '第5天', '第6天', '第7天', '第8天', '第9天', '第10天', '第11天', '第12天']
  return Array.from(map.values()).sort((a, b) => {
    const ai = order.indexOf(a.key)
    const bi = order.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
})

// 按人物分组
const characterGroups = computed(() => {
  const map = new Map()
  // 人物定义
  const charDefs = {
    '叶晓阳': { avatar: '/images/avatar-ye.png' },
    '周颖': { avatar: '/images/avatar-zhou.png' },
    '妻子': { avatar: '/images/avatar-wife.png' },
    '糖糖': { avatar: '/images/avatar-tang.png' },
    '小七': { avatar: '/images/avatar-ai.png' }
  }

  allImages.value.forEach(img => {
    const key = img.character || '其他'
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: key,
        avatar: (charDefs[key] || {}).avatar || '',
        items: []
      })
    }
    map.get(key).items.push(img)
  })

  return Array.from(map.values())
})

// 查看大图
function viewImage(item) {
  // 收集当前分组中所有已解锁图片URL
  const unlockedInGroup = (groupMode.value === 'chapter'
    ? chapterGroups.value.find(g => g.items.some(i => i.id === item.id))
    : characterGroups.value.find(g => g.items.some(i => i.id === item.id))
  )
  if (!unlockedInGroup) return

  const urls = unlockedInGroup.items.filter(i => i.unlocked).map(i => i.image || i.thumb)
  previewImages.value = urls
  previewIndex.value = urls.findIndex(u => u === (item.image || item.thumb))
  showPreview.value = true
}

// 返回
function goBack() {
  router.back()
}
</script>

<style scoped>
.gallery-container {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* 分组区域 */
.group-section {
  padding: 12px 16px;
}
.group-header {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 10px;
}
.group-header-char {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

/* 缩略图网格 */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.gallery-item {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.gallery-item:active {
  transform: scale(0.96);
}
.gallery-item.locked {
  cursor: default;
}

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.gallery-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18px 6px 6px;
  font-size: 11px;
  color: #fff;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 锁定遮罩 */
.locked-overlay {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2a2a3e 0%, #1a1a2e 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.lock-hint {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
}

.group-empty {
  text-align: center;
  padding: 20px;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 全局空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: var(--text-tertiary);
}
.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}
.empty-state .hint {
  font-size: 12px;
  margin-top: 6px;
}
</style>
