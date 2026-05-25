/**
 * scene_splitter.js - 剧本JSON按场景拆分工具 (ES Module版)
 * 
 * 功能：
 * 1. 读取 chapter1.json（原始格式：{ scenes: [{ messages: [...] }] }）
 * 2. 按场景拆分，生成 manifest.json + scene_xxx.json
 * 3. 自动填充 nextScene 字段（跨场景跳转）
 * 
 * 使用方法：
 * node scripts/scene_splitter.js
 * 
 * 输出目录：
 * public/data/chapter1/manifest.json
 * public/data/chapter1/scene_001.json
 * public/data/chapter1/scene_002.json
 * ...
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取当前文件目录（ES Module 兼容）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 路径配置
const INPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'chapter1.json')
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data', 'chapter1')

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`[SceneSplitter] Created output directory: ${OUTPUT_DIR}`)
}

// 读取原始剧本
console.log('[SceneSplitter] Reading input file...')
let chapterData
try {
  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8')
  chapterData = JSON.parse(rawData)
  console.log(`[SceneSplitter] Loaded ${chapterData.scenes.length} scenes`)
} catch (error) {
  console.error('[SceneSplitter] Failed to read input file:', error)
  process.exit(1)
}

// 处理每个场景
const manifest = {
  chapter: chapterData.chapter || 1,
  scenes: []
}

console.log('[SceneSplitter] Splitting scenes...')

chapterData.scenes.forEach((scene, sceneIndex) => {
  const sceneId = scene.id || `scene_${String(sceneIndex + 1).padStart(3, '0')}`
  const sceneFile = `${sceneId}.json`
  
  console.log(`[SceneSplitter] Processing ${sceneId} (${scene.messages.length} messages)...`)
  
  // 转换消息格式
  const nodes = []
  let lastNodeId = null
  
  scene.messages.forEach((msg, msgIndex) => {
    const nodeId = msg.id || `${sceneId}_msg_${String(msgIndex + 1).padStart(3, '0')}`
    
    // 构建节点
    const node = {
      id: nodeId,
      type: msg.type || 1,  // 默认type:1（对方发言）
      content: msg.content || '',
      delay: msg.delay || 0
    }
    
    // 处理图片消息
    if (msg.imageUrl) {
      node.imageUrl = msg.imageUrl
    }
    
    // 处理选项
    if (msg.type === 2 && msg.choices) {
      node.choices = msg.choices.map(choice => ({
        text: choice.text,
        next: choice.next || '',
        nextScene: choice.nextScene || sceneId,
        effects: choice.effects || {}
      }))
    }
    
    // 处理系统消息（离线/上线）
    if (msg.type === 6) {
      node.wait = msg.wait || 0
    }
    
    // 设置 next 字段（指向下一个节点）
    if (lastNodeId) {
      nodes.find(n => n.id === lastNodeId).next = nodeId
    }
    lastNodeId = nodeId
    
    nodes.push(node)
  })
  
  // 设置 nextScene（指向下一个场景）
  const nextSceneId = scene.nextScene || (
    sceneIndex < chapterData.scenes.length - 1 
      ? chapterData.scenes[sceneIndex + 1].id || `scene_${String(sceneIndex + 2).padStart(3, '0')}`
      : null
  )
  
  // 写入场景文件
  const sceneData = {
    sceneId: sceneId,
    title: scene.title || `场景${sceneIndex + 1}`,
    nodes: nodes
  }
  
  const sceneOutputPath = path.join(OUTPUT_DIR, sceneFile)
  fs.writeFileSync(sceneOutputPath, JSON.stringify(sceneData, null, 2), 'utf-8')
  console.log(`[SceneSplitter] Written ${sceneOutputPath} (${nodes.length} nodes)`)
  
  // 添加到 manifest
  manifest.scenes.push({
    id: sceneId,
    file: sceneFile,
    title: scene.title || `场景${sceneIndex + 1}`,
    nextScene: nextSceneId
  })
})

// 写入 manifest.json
const manifestOutputPath = path.join(OUTPUT_DIR, 'manifest.json')
fs.writeFileSync(manifestOutputPath, JSON.stringify(manifest, null, 2), 'utf-8')
console.log(`[SceneSplitter] Written ${manifestOutputPath} (${manifest.scenes.length} scenes)`)

console.log('[SceneSplitter] Done!')
console.log(`[SceneSplitter] Output directory: ${OUTPUT_DIR}`)
console.log(`[SceneSplitter] Total scenes: ${manifest.scenes.length}`)

// 统计总节点数
const totalNodes = manifest.scenes.reduce((sum, s) => {
  const scenePath = path.join(OUTPUT_DIR, s.file)
  const sceneData = JSON.parse(fs.readFileSync(scenePath, 'utf-8'))
  return sum + sceneData.nodes.length
}, 0)
console.log(`[SceneSplitter] Total nodes: ${totalNodes}`)
