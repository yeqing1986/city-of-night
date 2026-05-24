<template>
  <div class="settings-container">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="设置"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />

    <!-- 音频设置 -->
    <van-cell-group inset title="音频设置">
      <van-cell title="背景音乐" center>
        <template #right-icon>
          <van-switch v-model="bgmEnabled" @change="toggleBGM" />
        </template>
      </van-cell>
      
      <van-cell title="BGM 音量" v-if="bgmEnabled">
        <template #value>
          <van-slider
            v-model="bgmVolume"
            :min="0"
            :max="100"
            @change="changeBGMVolume"
            style="width: 120px;"
          />
        </template>
      </van-cell>
      
      <van-cell title="音效" center>
        <template #right-icon>
          <van-switch v-model="sfxEnabled" @change="toggleSFX" />
        </template>
      </van-cell>
      
      <van-cell title="音效音量" v-if="sfxEnabled">
        <template #value>
          <van-slider
            v-model="sfxVolume"
            :min="0"
            :max="100"
            @change="changeSFXVolume"
            style="width: 120px;"
          />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 显示设置 -->
    <van-cell-group inset title="显示设置">
      <van-cell title="深色模式" center>
        <template #right-icon>
          <van-switch v-model="darkMode" @change="toggleDarkMode" />
        </template>
      </van-cell>
      
      <van-cell title="字体大小">
        <template #value>
          <van-stepper v-model="fontSize" :min="12" :max="20" @change="changeFontSize" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 游戏设置 -->
    <van-cell-group inset title="游戏设置">
      <van-cell title="自动保存" center>
        <template #right-icon>
          <van-switch v-model="autoSave" @change="toggleAutoSave" />
        </template>
      </van-cell>
      
      <van-cell title="推送通知" center>
        <template #right-icon>
          <van-switch v-model="notifications" @change="toggleNotifications" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 数据管理 -->
    <van-cell-group inset title="数据管理">
      <van-cell title="保存游戏" @click="saveGame" />
      <van-cell title="导出存档" @click="exportSave" />
      <van-cell title="导入存档" @click="importSave" />
      <van-cell title="清除缓存" @click="clearCache" />
    </van-cell-group>

    <!-- 重置游戏 -->
    <van-cell-group inset>
      <van-cell title="重置游戏" class="danger-cell" @click="resetGame" />
    </van-cell-group>

    <!-- 关于 -->
    <van-cell-group inset title="关于">
      <van-cell title="版本" :value="version" />
      <van-cell title="检查更新" @click="checkUpdate" />
      <van-cell title="隐私政策" @click="showPrivacy" />
      <van-cell title="用户协议" @click="showTerms" />
    </van-cell-group>

    <!-- 底部信息 -->
    <div class="footer">
      <p>《夜色迷城》 v{{ version }}</p>
      <p>© 2026 深夜工作室</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showDialog, showLoadingToast, closeToast } from 'vant'
import DialogueEngine from '@/engine/dialogue'
import AudioManager from '@/engine/audioManager'
import CollectionSystem from '@/engine/collection'

// 设置状态
const bgmEnabled = ref(true)
const bgmVolume = ref(50)
const sfxEnabled = ref(true)
const sfxVolume = ref(80)
const darkMode = ref(false)
const fontSize = ref(14)
const autoSave = ref(true)
const notifications = ref(true)
const version = ref('1.0.0')

// 初始化
onMounted(() => {
  loadSettings()
})

// 加载设置
const loadSettings = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('city-of-night-settings'))
    if (settings) {
      bgmEnabled.value = settings.bgmEnabled ?? true
      bgmVolume.value = (settings.bgmVolume ?? 0.5) * 100
      sfxEnabled.value = settings.sfxEnabled ?? true
      sfxVolume.value = (settings.sfxVolume ?? 0.8) * 100
      darkMode.value = settings.darkMode ?? false
      fontSize.value = settings.fontSize ?? 14
      autoSave.value = settings.autoSave ?? true
      notifications.value = settings.notifications ?? true
    }
  } catch (error) {
    console.error('[Settings] 加载设置失败:', error)
  }
}

// 保存设置
const saveSettings = () => {
  const settings = {
    bgmEnabled: bgmEnabled.value,
    bgmVolume: bgmVolume.value / 100,
    sfxEnabled: sfxEnabled.value,
    sfxVolume: sfxVolume.value / 100,
    darkMode: darkMode.value,
    fontSize: fontSize.value,
    autoSave: autoSave.value,
    notifications: notifications.value
  }
  
  localStorage.setItem('city-of-night-settings', JSON.stringify(settings))
  console.log('[Settings] 设置已保存')
}

// 切换 BGM
const toggleBGM = (value) => {
  if (value) {
    AudioManager.playBGM('chat')
  } else {
    AudioManager.stopBGM(false)
  }
  saveSettings()
}

// 改变 BGM 音量
const changeBGMVolume = (value) => {
  AudioManager.setVolume(value / 100)
  saveSettings()
}

// 切换音效
const toggleSFX = (value) => {
  AudioManager.isMuted = !value
  saveSettings()
}

// 改变音效音量
const changeSFXVolume = (value) => {
  AudioManager.sfxVolume = value / 100
  saveSettings()
}

// 切换深色模式
const toggleDarkMode = (value) => {
  showToast(value ? '深色模式已开启' : '浅色模式已开启')
  // 实际应用深色模式逻辑
  saveSettings()
}

// 改变字体大小
const changeFontSize = (value) => {
  document.documentElement.style.fontSize = `${value}px`
  saveSettings()
}

// 切换自动保存
const toggleAutoSave = (value) => {
  showToast(value ? '自动保存已开启' : '自动保存已关闭')
  saveSettings()
}

// 切换推送通知
const toggleNotifications = (value) => {
  showToast(value ? '推送通知已开启' : '推送通知已关闭')
  saveSettings()
}

// 保存游戏
const saveGame = () => {
  DialogueEngine.saveGame()
  showToast('游戏已保存')
}

// 导出存档
const exportSave = () => {
  try {
    const saveData = {
      dialogue: localStorage.getItem('city-of-night-save'),
      collection: localStorage.getItem('city-of-night-collection'),
      settings: localStorage.getItem('city-of-night-settings')
    }
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `city-of-night-save-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    showToast('存档已导出')
  } catch (error) {
    showToast('导出失败')
    console.error('[Settings] 导出存档失败:', error)
  }
}

// 导入存档
const importSave = () => {
  showToast('导入功能即将上线')
}

// 清除缓存
const clearCache = () => {
  showDialog({
    title: '确认清除',
    message: '清除缓存将删除所有本地数据，是否继续？',
    showCancelButton: true
  }).then(() => {
    localStorage.clear()
    showToast('缓存已清除')
  }).catch(() => {
    // 取消
  })
}

// 重置游戏
const resetGame = () => {
  showDialog({
    title: '确认重置',
    message: '重置将清除所有游戏进度和收集，是否继续？',
    showCancelButton: true
  }).then(() => {
    DialogueEngine.resetGame()
    CollectionSystem.reset()
    showToast('游戏已重置')
  }).catch(() => {
    // 取消
  })
}

// 检查更新
const checkUpdate = () => {
  showToast('已是最新版本')
}

// 显示隐私政策
const showPrivacy = () => {
  showToast('隐私政策即将上线')
}

// 显示用户协议
const showTerms = () => {
  showToast('用户协议即将上线')
}

// 返回
const goBack = () => {
  history.back()
}
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.danger-cell {
  color: #ee0a24;
}

.footer {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #999;
}

.footer p {
  margin: 4px 0;
}
</style>
