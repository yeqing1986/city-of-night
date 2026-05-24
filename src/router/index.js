import { createRouter, createWebHistory } from 'vue-router'

// 路由配置
const routes = [
  {
    path: '/',
    name: 'LockScreen',
    component: () => import('@/views/LockScreen.vue'),
    meta: { title: '夜色迷城' }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { title: '夜色迷城 - 对话' }
  },
  {
    path: '/profile',
    name: 'CharacterProfile',
    component: () => import('@/views/CharacterProfile.vue'),
    meta: { title: '夜色迷城 - 个人资料' }
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('@/views/Gallery.vue'),
    meta: { title: '夜色迷城 - 相册' }
  },
  {
    path: '/keywords',
    name: 'KeywordGallery',
    component: () => import('@/views/KeywordGallery.vue'),
    meta: { title: '夜色迷城 - 关键词收藏' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '夜色迷城 - 设置' }
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
  
  // 这里可以添加权限控制逻辑
  // 例如：检查游戏状态、记录访问日志等
  
  next()
})

export default router
