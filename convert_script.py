#!/usr/bin/env python3
"""
剧本转换脚本 - 将 Markdown 剧本转换为 JSON 格式
用法: python convert_script.py <input_md> <output_json>
"""

import json
import re
import sys
from pathlib import Path

def parse_script(md_file):
    """解析 Markdown 剧本文件"""
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取章节信息
    chapter_info = extract_chapter_info(content)
    
    # 解析对话节点
    nodes = parse_dialogue_nodes(content)
    
    # 解析结局
    endings = parse_endings(content)
    
    # 构建 JSON 结构
    script_data = {
        "id": chapter_info.get("id", "chapter1"),
        "title": chapter_info.get("title", "第一章"),
        "description": chapter_info.get("description", ""),
        "timeSpan": chapter_info.get("timeSpan", ""),
        "initialStats": chapter_info.get("initialStats", {
            "complicity": 20,
            "morality": 60,
            "suspicion": 10
        }),
        "startNode": "node_1_1",
        "openingMessage": extract_opening_message(content),
        "nodes": nodes,
        "endings": endings,
        "totalKeywords": 50,
        "version": "1.0.0"
    }
    
    return script_data

def extract_chapter_info(content):
    """提取章节信息"""
    info = {}
    
    # 提取标题
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    if title_match:
        info['title'] = title_match.group(1)
    
    # 提取章节概述
    desc_match = re.search(r'\*\*核心目标\*\*：(.+)', content)
    if desc_match:
        info['description'] = desc_match.group(1).strip()
    
    # 提取时间跨度
    time_match = re.search(r'\*\*时间跨度\*\*：(.+)', content)
    if time_match:
        info['timeSpan'] = time_match.group(1).strip()
    
    # 提取初始数值
    stats_match = re.search(r'\*\*初始数值\*\*：(.+)', content)
    if stats_match:
        stats_str = stats_match.group(1)
        stats = {}
        for item in stats_str.split('|'):
            item = item.strip()
            if '共谋值' in item:
                stats['complicity'] = int(re.search(r'(\d+)', item).group(1))
            elif '道德值' in item:
                stats['morality'] = int(re.search(r'(\d+)', item).group(1))
            elif '怀疑值' in item:
                stats['suspicion'] = int(re.search(r'(\d+)', item).group(1))
        info['initialStats'] = stats
    
    return info

def extract_opening_message(content):
    """提取开场消息"""
    # 查找首次启动消息
    match = re.search(r'欢迎来到深夜树洞\n我是你的AI倾听者\n(.*?)```', content, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    return "欢迎来到深夜树洞\n我是你的AI倾听者\n愿意跟我说说今天发生了什么吗？"

def parse_dialogue_nodes(content):
    """解析对话节点"""
    nodes = {}
    
    # 这是一个简化版解析器
    # 实际剧本格式复杂，需要根据具体格式调整
    
    # 查找所有对话块
    dialogue_blocks = re.findall(r'```\n(.*?)\n```', content, re.DOTALL)
    
    node_id = 1
    for block in dialogue_blocks:
        lines = block.strip().split('\n')
        
        # 提取叶晓阳的对话
        user_lines = [line.replace('叶晓阳：', '').strip() 
                      for line in lines if line.startswith('叶晓阳：')]
        
        # 提取 AI 的回复（选择分支前的最后一句）
        ai_choices = re.findall(r'\[(\d+)\] (.+)$', block, re.MULTILINE)
        
        if user_lines or ai_choices:
            node_key = f"node_1_{node_id}"
            
            node_data = {
                "id": node_key,
                "content": '\n'.join(user_lines) if user_lines else "",
                "speaker": "user" if user_lines else "ai",
                "delay": 3000,  # 默认延迟 3 秒
                "choices": []
            }
            
            # 添加选择分支
            for choice_num, choice_text in ai_choices:
                node_data["choices"].append({
                    "text": choice_text,
                    "nextNode": f"node_1_{node_id + 1}",
                    "affinity": 2
                })
            
            nodes[node_key] = node_data
            node_id += 1
    
    return nodes

def parse_endings(content):
    """解析结局"""
    endings = []
    
    # 查找结局部分
    ending_matches = re.findall(r'\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \|', content)
    
    for i, (title, description, condition) in enumerate(ending_matches, 1):
        endings.append({
            "id": f"ending_1_{i}",
            "title": title.strip(),
            "description": description.strip(),
            "condition": condition.strip(),
            "image": f"/images/endings/ending-1-{i}.jpg"
        })
    
    return endings

def convert_script(input_file, output_file):
    """转换剧本文件"""
    print(f"正在读取: {input_file}")
    
    # 解析剧本
    script_data = parse_script(input_file)
    
    # 写入 JSON 文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(script_data, f, ensure_ascii=False, indent=2)
    
    print(f"转换完成: {output_file}")
    print(f"  - 章节: {script_data['title']}")
    print(f"  - 节点数: {len(script_data['nodes'])}")
    print(f"  - 结局数: {len(script_data['endings'])}")

def main():
    if len(sys.argv) != 3:
        print("用法: python convert_script.py <input_md> <output_json>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    if not Path(input_file).exists():
        print(f"错误: 输入文件不存在: {input_file}")
        sys.exit(1)
    
    convert_script(input_file, output_file)

if __name__ == '__main__':
    main()
