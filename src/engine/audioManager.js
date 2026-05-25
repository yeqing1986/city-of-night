/**
 * 音频管理器 - 负责所有音频播放
 * 功能：BGM 切换、环境音效、点击音效、节奏游戏音效
 * 注意：移动端需要用户交互后才能播放音频（iOS Safari 限制）
 */

class AudioManager {
  constructor() {
    this.bgmPlayer = null      // 背景音乐播放器
    this.sfxPlayers = new Map() // 音效播放器池
    this.isMuted = false       // 是否静音
    this.volume = 0.7         // 主音量 (0-1)
    this.bgmVolume = 0.5      // BGM 音量
    this.sfxVolume = 0.8      // 音效音量
    this.currentBGM = null     // 当前 BGM 名称
    this.audioContext = null   // Web Audio API Context
    this.isAudioContextInitialized = false
    
    // 音频文件映射
    this.audioFiles = {
      bgm: {
        'title': '/audio/bgm/title.mp3',
        'chat': '/audio/bgm/chat.mp3',
        'ending': '/audio/bgm/ending.mp3'
      },
      sfx: {
        'click': '/audio/sfx/click.mp3',
        'send': '/audio/sfx/send.mp3',
        'notification': '/audio/sfx/notification.mp3',
        'perfect': '/audio/sfx/perfect.mp3',
        'good': '/audio/sfx/good.mp3',
        'miss': '/audio/sfx/miss.mp3'
      },
      ambient: {
        'rain': '/audio/ambient/rain.mp3',
        'cafe': '/audio/ambient/cafe.mp3',
        'night': '/audio/ambient/night.mp3'
      }
    }
  }

  /**
   * 初始化 AudioContext（需要用户交互）
   */
  initAudioContext() {
    if (this.isAudioContextInitialized) return
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.isAudioContextInitialized = true
      console.log('[AudioManager] AudioContext 已初始化')
    } catch (error) {
      console.error('[AudioManager] AudioContext 初始化失败:', error)
    }
  }

  /**
   * 播放 BGM（循环播放）
   * @param {string} bgmName - BGM 名称（对应 audioFiles.bgm 的 key）
   * @param {boolean} fadeIn - 是否淡入
   */
  playBGM(bgmName, fadeIn = true) {
    if (this.isMuted) return
    
    // 持久化BGM名称到localStorage
    localStorage.setItem('night-city-bgm', bgmName)
    
    const bgmPath = this.audioFiles.bgm[bgmName]
    if (!bgmPath) {
      console.error(`[AudioManager] BGM 不存在: ${bgmName}`)
      return
    }
    
    // 如果已经在播放同一首 BGM，跳过
    if (this.currentBGM === bgmName && this.bgmPlayer) {
      console.log(`[AudioManager] BGM 已在播放: ${bgmName}`)
      return
    }
    
    // 停止当前 BGM
    this.stopBGM(false)
    
    // 创建新的 Audio 元素
    const audio = new Audio(bgmPath)
    audio.loop = true
    audio.volume = fadeIn ? 0 : this.bgmVolume * this.volume
    
    audio.play().then(() => {
      this.bgmPlayer = audio
      this.currentBGM = bgmName
      
      // 淡入效果
      if (fadeIn) {
        this.fadeIn(audio, this.bgmVolume * this.volume, 1000)
      }
      
      console.log(`[AudioManager] BGM 开始播放: ${bgmName}`)
    }).catch(error => {
      console.error(`[AudioManager] BGM 播放失败: ${bgmName}`, error)
    })
  }

  /**
   * 停止 BGM
   * @param {boolean} fadeOut - 是否淡出
   */
  stopBGM(fadeOut = true) {
    if (!this.bgmPlayer) return
    
    if (fadeOut) {
      this.fadeOut(this.bgmPlayer, 1000, () => {
        this.bgmPlayer.pause()
        this.bgmPlayer = null
        this.currentBGM = null
      })
    } else {
      this.bgmPlayer.pause()
      this.bgmPlayer = null
      this.currentBGM = null
    }
    
    console.log('[AudioManager] BGM 已停止')
  }

  /**
   * 播放音效（一次性）
   * @param {string} sfxName - 音效名称（对应 audioFiles.sfx 的 key）
   * @param {number} rate - 播放速率 (0.5-2.0)
   */
  playSFX(sfxName, rate = 1.0) {
    if (this.isMuted) return
    
    const sfxPath = this.audioFiles.sfx[sfxName]
    if (!sfxPath) {
      console.error(`[AudioManager] 音效不存在: ${sfxName}`)
      return
    }
    
    const audio = new Audio(sfxPath)
    audio.volume = this.sfxVolume * this.volume
    audio.playbackRate = rate
    
    audio.play().catch(error => {
      console.error(`[AudioManager] 音效播放失败: ${sfxName}`, error)
    })
  }

  /**
   * 播放环境音效（循环）
   * @param {string} ambientName - 环境音效名称
   * @param {number} volume - 音量 (0-1)
   */
  playAmbient(ambientName, volume = 0.3) {
    if (this.isMuted) return
    
    const ambientPath = this.audioFiles.ambient[ambientName]
    if (!ambientPath) {
      console.error(`[AudioManager] 环境音效不存在: ${ambientName}`)
      return
    }
    
    const audio = new Audio(ambientPath)
    audio.loop = true
    audio.volume = volume * this.volume
    
    audio.play().catch(error => {
      console.error(`[AudioManager] 环境音效播放失败: ${ambientName}`, error)
    })
    
    // 保存到音效池
    this.sfxPlayers.set(ambientName, audio)
    
    console.log(`[AudioManager] 环境音效开始播放: ${ambientName}`)
  }

  /**
   * 停止环境音效
   * @param {string} ambientName - 环境音效名称
   */
  stopAmbient(ambientName) {
    const audio = this.sfxPlayers.get(ambientName)
    if (audio) {
      audio.pause()
      this.sfxPlayers.delete(ambientName)
      console.log(`[AudioManager] 环境音效已停止: ${ambientName}`)
    }
  }

  /**
   * 淡入效果
   * @param {HTMLAudioElement} audio - Audio 元素
   * @param {number} targetVolume - 目标音量
   * @param {number} duration - 持续时间 (ms)
   */
  fadeIn(audio, targetVolume, duration = 1000) {
    const steps = 20
    const increment = targetVolume / steps
    const interval = duration / steps
    let currentStep = 0
    
    const fadeInterval = setInterval(() => {
      currentStep++
      audio.volume = Math.min(targetVolume, audio.volume + increment)
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval)
        audio.volume = targetVolume
      }
    }, interval)
  }

  /**
   * 淡出效果
   * @param {HTMLAudioElement} audio - Audio 元素
   * @param {number} duration - 持续时间 (ms)
   * @param {Function} callback - 完成回调
   */
  fadeOut(audio, duration = 1000, callback) {
    const steps = 20
    const decrement = audio.volume / steps
    const interval = duration / steps
    let currentStep = 0
    
    const fadeInterval = setInterval(() => {
      currentStep++
      audio.volume = Math.max(0, audio.volume - decrement)
      
      if (currentStep >= steps) {
        clearInterval(fadeInterval)
        audio.volume = 0
        if (callback) callback()
      }
    }, interval)
  }

  /**
   * 设置主音量
   * @param {number} value - 音量 (0-1)
   */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value))
    
    // 更新当前播放的音频音量
    if (this.bgmPlayer) {
      this.bgmPlayer.volume = this.bgmVolume * this.volume
    }
    
    console.log(`[AudioManager] 主音量设置为: ${this.volume}`)
  }

  /**
   * 切换静音
   * @returns {boolean} 当前静音状态
   */
  toggleMute() {
    this.isMuted = !this.isMuted
    
    if (this.isMuted) {
      this.stopBGM(false)
      this.stopAmbient('rain')
      this.stopAmbient('cafe')
      this.stopAmbient('night')
    }
    
    console.log(`[AudioManager] 静音状态: ${this.isMuted}`)
    return this.isMuted
  }

  /**
   * 预加载音频文件
   * @param {Array} fileList - 文件列表
   * @returns {Promise}
   */
  preload(fileList) {
    const promises = fileList.map(file => {
      return new Promise((resolve, reject) => {
        const audio = new Audio()
        audio.src = file
        audio.preload = 'auto'
        
        audio.addEventListener('canplaythrough', () => {
          resolve(file)
        }, { once: true })
        
        audio.addEventListener('error', () => {
          reject(new Error(`预加载失败: ${file}`))
        }, { once: true })
        
        audio.load()
      })
    })
    
    return Promise.all(promises)
  }

  /**
   * 重置所有音频
   */
  reset() {
    this.stopBGM(false)
    this.sfxPlayers.forEach((audio, name) => {
      audio.pause()
    })
    this.sfxPlayers.clear()
    this.currentBGM = null
    this.isMuted = false
    
    console.log('[AudioManager] 音频管理器已重置')
  }
}

// 导出单例
export default new AudioManager()
