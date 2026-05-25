#!/usr/bin/env node
/**
 * chapter1_script_converter.js
 * 将线性剧本格式转换为节点树格式（DialogueEngine兼容）
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, '../public/data/chapter1.json');
const outputPath = process.argv[3] || path.join(__dirname, '../public/data/chapter1_nodes.json');

console.log('[Converter] 读取剧本:', inputPath);

const script = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

console.log('[Converter] 场景数:', script.scenes?.length || 0);

const result = {
  chapter: script.chapter || 1,
  title: script.title || '第一章',
  summary: script.summary,
  startNode: 'node_001',
  nodes: {},
  characterList: ['叶晓阳', '周颖', '妻子', '糖糖', 'AI'],
  initialStats: script.summary?.initialStats || { '共谋值': 20, '道德值': 60, '怀疑值': 10 }
};

let nodeIndex = 1;
let currentNodeId = 'node_001';
let prevNodeId = null;
const choicesMap = new Map(); // 存储后续场景的选择入口

// 遍历所有场景
script.scenes?.forEach((scene, sceneIdx) => {
  const sceneId = scene.id || `${sceneIdx + 1}`;
  
  scene.messages?.forEach((msg, msgIdx) => {
    const nodeId = `node_${String(nodeIndex).padStart(3, '0')}`;
    const role = msg.speaker === '叶晓阳' ? 'user' : 
                 msg.speaker === 'AI' ? 'assistant' : 
                 msg.speaker === 'system' ? 'system' : 'assistant';
    
    const node = {
      id: nodeId,
      role,
      content: msg.content,
      speaker: msg.speaker,
      sceneId,
      sceneTitle: scene.title,
      day: scene.day,
      time: scene.time,
      date: scene.date,
      keywords: msg.keywords || [],
      statsChange: msg.statsChange || null,
      choices: []
    };
    
    // 检查是否有choices字段（分支点）
    if (msg.choices && msg.choices.length > 0) {
      msg.choices.forEach((choice, choiceIdx) => {
        const choiceNodeId = `node_${String(nodeIndex + choiceIdx + 1).padStart(3, '0')}`;
        node.choices.push({
          text: choice.text,
          type: choice.type || 'primary',
          nextNode: choiceNodeId,
          stats: choice.stats || null,
          affinity: choice.affinity || 0
        });
        // 记录选择对应的后续内容
        if (choice.nextContent) {
          choicesMap.set(choiceNodeId, choice.nextContent);
        }
      });
    }
    
    result.nodes[nodeId] = node;
    
    // 如果有前一个节点且没有choices，自动连接
    if (prevNodeId && result.nodes[prevNodeId] && result.nodes[prevNodeId].choices.length === 0) {
      result.nodes[prevNodeId].nextNode = nodeId;
    }
    
    prevNodeId = nodeId;
    nodeIndex++;
    
    // 处理分支后的内容
    if (choicesMap.has(nodeId)) {
      const nextContent = choicesMap.get(nodeId);
      if (Array.isArray(nextContent)) {
        nextContent.forEach(nc => {
          const nextId = `node_${String(nodeIndex).padStart(3, '0')}`;
          result.nodes[nextId] = {
            id: nextId,
            role: nc.speaker === '叶晓阳' ? 'user' : 'assistant',
            content: nc.content,
            speaker: nc.speaker,
            keywords: nc.keywords || [],
            choices: []
          };
          if (result.nodes[nodeId] && result.nodes[nodeId].choices.length === 0) {
            result.nodes[nodeId].nextNode = nextId;
          }
          prevNodeId = nextId;
          nodeIndex++;
        });
      }
      choicesMap.delete(nodeId);
    }
  });
});

// 为没有choices的节点添加默认"继续"选项
Object.keys(result.nodes).forEach(nodeId => {
  const node = result.nodes[nodeId];
  if (node.role === 'assistant' && node.choices.length === 0 && !node.nextNode) {
    // 找下一个节点
    const nextIdx = parseInt(nodeId.replace('node_', '')) + 1;
    const nextId = `node_${String(nextIdx).padStart(3, '0')}`;
    if (result.nodes[nextId]) {
      node.nextNode = nextId;
    }
  }
});

console.log('[Converter] 生成节点数:', Object.keys(result.nodes).length);
console.log('[Converter] 输出到:', outputPath);

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log('[Converter] 转换完成!');