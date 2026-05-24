import { createRouter, createWebHistory } from 'vue-router'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'LockScreen',
    component: () => import('@/views/LockScreen.vue'),
    meta: { title: '夜色迷城', requiresAuth: false }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { title: '夜色迷城 - 对话', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'CharacterProfile',
    component: () => import('@/views/CharacterProfile.vue'),
    meta: { title: '夜色迷城 - 个人资料', requiresAuth: true }
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('@/views/Gallery.vue'),
    meta: { title: '夜色迷城 - 相册', requiresAuth: true }
  },
  {
    path: '/keywords',
    name: 'KeywordGallery',
    component: () => import('@/views/KeywordGallery.vue'),
    meta: { title: '夜色迷城 - 关键词收藏', requiresAuth: true }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '夜色迷城 - 设置', requiresAuth: true }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || '夜色迷城'
  
  // 检查是否需要解锁
  const isUnlocked = sessionStorage.getItem('night-city-unlocked') === 'true'
  
  if (to.meta.requiresAuth && !isUnlocked) {
    // 未解锁，跳转到锁屏页
    next({ path: '/' })
  } else if (to.path === '/' && isUnlocked) {
    // 已解锁访问锁屏页，直接跳转到聊天
    next({ path: '/chat' })
  } else {
    next()
  }
})

export default router
