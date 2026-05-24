import { createRouter, createWebHistory } from 'vue-router'

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
    meta: { title: '夜色迷城', requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'CharacterProfile',
    component: () => import('@/views/CharacterProfile.vue'),
    meta: { title: '个人资料', requiresAuth: true, transition: 'slide-left' }
  },
  {
    path: '/gallery',
    name: 'Gallery',
    component: () => import('@/views/Gallery.vue'),
    meta: { title: '相册', requiresAuth: true, transition: 'slide-left' }
  },
  {
    path: '/keywords',
    name: 'KeywordGallery',
    component: () => import('@/views/KeywordGallery.vue'),
    meta: { title: '关键词收藏', requiresAuth: true, transition: 'slide-left' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置', requiresAuth: true, transition: 'slide-left' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '夜色迷城'
  const isUnlocked = sessionStorage.getItem('night-city-unlocked') === 'true'

  if (to.meta.requiresAuth && !isUnlocked) {
    next({ path: '/' })
  } else if (to.path === '/' && isUnlocked) {
    next({ path: '/chat' })
  } else {
    next()
  }
})

export default router
