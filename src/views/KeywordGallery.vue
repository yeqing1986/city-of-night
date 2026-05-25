<template>
  <div class="keyword-gallery">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="关键词收藏"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <!-- 统计信息 -->
    <div class="stats-bar">
      <span>已收集: {{ collectedCount }}/{{ totalKeywords }}</span>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: collectRate + '%' }"></div>
      </div>
    </div>

    <!-- 按章节分组 -->
    <div v-for="group in chapterGroups" :key="group.key" class="group-section">
      <div class="group-header">
        <span>{{ group.label }}</span>
        <span class="group-count">{{ group.collected }}/{{ group.total }}</span>
      </div>
      <div class="keyword-list">
        <div
          v-for="kw in group.items"
          :key="kw.id || kw.text"
          class="keyword-item"
          :class="{ locked: !kw.unlocked }"
          @click="kw.unlocked && viewKeywordDetail(kw)"
        >
          <template v-if="kw.unlocked">
            <div class="kw-text">#{{ kw.text }}</div>
            <div class="kw-context">{{ kw.context || kw.description || '' }}</div>
          </template>
          <template v-else>
            <div class="kw-locked">
              <van-icon name="lock" size="14" />
              <span>???</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="chapterGroups.length === 0 && collectedCount === 0" class="empty-state">
      <van-icon name="label-o" size="60" />
      <p>暂无收集的关键词</p>
      <p class="hint">在对话中留意关键词，点击收集吧！</p>
    </div>

    <!-- 关键词详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      round
      position="bottom"
      :style="{ maxHeight: '70%' }"
    >
      <div class="keyword-detail">
        <div class="detail-header">
          <h3 class="detail-title">#{{ selectedKeyword.text }}</h3>
          <span class="detail-chapter" v-if="selectedKeyword.chapter">{{ selectedKeyword.chapter }}</span>
        </div>

        <div class="detail-body">
          <div class="detail-section" v-if="selectedKeyword.context || selectedKeyword.description">
            <div class="section-label">描述</div>
            <div class="section-content">{{ selectedKeyword.context || selectedKeyword.description }}</div>
          </div>

          <div class="detail-section" v-if="selectedKeyword.relatedCharacter">
            <div class="section-label">相关人物</div>
            <div class="section-content">{{ selectedKeyword.relatedCharacter }}</div>
          </div>

          <div class="detail-section">
            <div class="section-label">收集时间</div>
            <div class="section-content">{{ formatDate(selectedKeyword.timestamp) }}</div>
          </div>
        </div>

        <div class="detail-actions">
          <van-button block type="primary" @click="showDetail = false">
            知道了
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CollectionSystem from '@/engine/collection'

const router = useRouter()
const showDetail = ref(false)
const selectedKeyword = ref({})
const totalKeywords = ref(50)

// 已收集的关键词（从collection系统）
const collectedKeywords = computed(() => {
  return CollectionSystem.getKeywords()
})

const collectedCount = computed(() => collectedKeywords.value.length)

const collectRate = computed(() => {
  if (totalKeywords.value === 0) return 0
  return Math.round((collectedCount.value / totalKeywords.value) * 100)
})

// 预定义的所有关键词配置（含章节分组）
const allKeywordDefs = ref([])

// 合并后的关键词列表（已收集 + 未解锁）
const allKeywords = computed(() => {
  const map = new Map()

  // 已收集的
  collectedKeywords.value.forEach(kw => {
    map.set(kw.text, {
      id: kw.text,
      text: kw.text,
      context: kw.context,
      description: '',
      unlocked: true,
      timestamp: kw.timestamp,
      chapter: kw.chapter || inferChapter(kw),
      relatedCharacter: ''
    })
  })

  // 未解锁的（从配置）
  allKeywordDefs.value.forEach(def => {
    if (!map.has(def.text)) {
      map.set(def.text, {
        id: def.id || def.text,
        text: def.text,
        context: def.context || def.description || '',
        description: def.description || '',
        unlocked: false,
        timestamp: 0,
        chapter: def.chapter || '未知',
        relatedCharacter: def.character || ''
      })
    }
  })

  return Array.from(map.values())
})

// 按章节分组
const chapterGroups = computed(() => {
  const map = new Map()
  allKeywords.value.forEach(kw => {
    const key = kw.chapter || '其他'
    if (!map.has(key)) map.set(key, { key, label: key, items: [], collected: 0, total: 0 })
    const g = map.get(key)
    g.items.push(kw)
    g.total++
    if (kw.unlocked) g.collected++
  })

  // 排序：按章节顺序
  const order = ['第1天', '第2天', '第3天', '第4天', '第5天', '第6天', '第7天', '第8天', '第9天', '第10天', '第11天', '第12天']
  return Array.from(map.values()).sort((a, b) => {
    const ai = order.indexOf(a.key)
    const bi = order.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
})

// 根据上下文推断章节（fallback）
function inferChapter(kw) {
  // 如果context中包含节点ID信息，可以推断章节
  return '未知'
}

// 加载关键词总配置
onMounted(async () => {
  try {
    const res = await fetch('/data/keywords.json')
    if (res.ok) {
      const data = await res.json()
      totalKeywords.value = data.total || data.keywords?.length || 50
      allKeywordDefs.value = data.keywords || []
    }
  } catch (e) {
    console.warn('[KeywordGallery] keywords.json not found, using defaults')
  }

  // 如果没有keywords.json，生成默认的未解锁关键词占位
  if (allKeywordDefs.value.length === 0) {
    generateDefaultDefs()
  }
})

// 生成默认关键词定义（基于剧本中的关键词）
function generateDefaultDefs() {
  const defaultKws = [
    { text: '深夜树洞', chapter: '第1天', context: '叶晓阳下载的AI倾诉软件名称' },
    { text: '孤独', chapter: '第1天', context: '叶晓阳内心最深处的感受' },
    { text: '糖糖', chapter: '第1天', context: '叶晓阳三岁的女儿，他心中最柔软的部分' },
    { text: '婚姻', chapter: '第2天', context: '叶晓阳日渐疏远的夫妻关系' },
    { text: '压力', chapter: '第2天', context: '销售工作带来的沉重负担' },
    { text: '邻居', chapter: '第3天', context: '住在对门的神秘女性——周颖' },
    { text: '秘密', chapter: '第3天', context: '每个人心中不愿诉说的部分' },
    { text: '信任', chapter: '第4天', context: '人与人之间最脆弱也最珍贵的东西' },
    { text: '选择', chapter: '第4天', context: '每一个决定都在改变命运的走向' },
    { text: '夜色', chapter: '未知', context: '这座城市夜晚的颜色，也是人心的颜色' }
  ]
  allKeywordDefs.value = defaultKws
  totalKeywords.value = defaultKws.length
}

// 查看关键词详情
function viewKeywordDetail(keyword) {
  selectedKeyword.value = keyword
  showDetail.value = true
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '未知'
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

// 返回
function goBack() {
  router.back()
}
</script>

<style scoped>
.keyword-gallery {
  min-height: 100vh;
  background: var(--bg-primary);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  font-size: 13px;
  color: var(--text-secondary);
  gap: 12px;
}
.progress-bar {
  width: 100px;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* 分组 */
.group-section {
  padding: 8px 16px 16px;
}
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 8px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.group-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 10px;
}

/* 关键词列表 */
.keyword-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.keyword-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.keyword-item:active:not(.locked) {
  transform: scale(0.98);
  background: var(--bg-tertiary);
}
.keyword-item.locked {
  opacity: 0.6;
  cursor: default;
}

.kw-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 4px;
}
.kw-context {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 锁定状态 */
.kw-locked {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 14px;
  justify-content: center;
  padding: 6px 0;
}

/* 详情弹窗 */
.keyword-detail {
  padding: 20px 20px 0;
}
.detail-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
}
.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
}
.detail-chapter {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 8px;
}
.detail-body {
  margin-bottom: 20px;
}
.detail-section {
  margin-bottom: 14px;
}
.section-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}
.section-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
}
.detail-actions {
  padding: 0 0 16px;
}

/* 空状态 */
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
