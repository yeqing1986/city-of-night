import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import Vant from 'vant'
import 'vant/lib/index.css'
import './style.css'

import { useGameStore } from './stores/game'

const app = createApp(App)

// 注册 Pinia（状态管理）
const pinia = createPinia()
app.use(pinia)

// 暴露 store 到 window（dialogue.js 需要通过 window 访问）
window.useGameStore = () => useGameStore()

// 注册 Vue Router（路由管理）
app.use(router)

// 注册 Vant4（移动端 UI 组件库）
app.use(Vant)

// 挂载应用
app.mount('#app')
