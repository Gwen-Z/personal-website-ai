#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 完整的灵感数据
const inspirationData = [
  { 
    date: '2025-08-16', 
    description: '想做一个记录个人生活的AI分析工具',
    theme: 'AI工具开发',
    product: '个人生活分析App（习惯追踪+数据洞察）',
    difficulty: '高'
  },
  { 
    date: '2025-08-15', 
    description: '想做AI工具学习博主',
    theme: '内容创作',
    product: '教育内容频道（视频博客+AI工具评测）',
    difficulty: '中'
  },
  { 
    date: '2025-08-14', 
    description: '想卖课',
    theme: '知识付费',
    product: '微课平台（聚焦AI工具教程）',
    difficulty: '高'
  },
  { 
    date: '2025-08-13', 
    description: '现在AI分析股市都是怎么实现的？',
    theme: '金融科技',
    product: '股市分析工具（实时数据可视化 + AI预测）',
    difficulty: '高'
  },
  { 
    date: '2025-08-12', 
    description: '口语可以用录屏的方式去做影子跟读，一边发到小红书抖音，一边监督自己学习',
    theme: '语言学习',
    product: '语言学习社交平台（录屏+分享+AI反馈）',
    difficulty: '中'
  },
  { 
    date: '2025-08-11', 
    description: '现在AI博主那么多，有一些挺有意思的，他们都有哪些特点呢',
    theme: '内容分析',
    product: 'AI博主分析工具（内容策略报告生成）',
    difficulty: '中'
  },
  { 
    date: '2025-08-10', 
    description: '能不能用AI帮我分析我都喜欢看什么样的视频？',
    theme: '用户分析',
    product: '视频偏好分析插件（浏览器集成）',
    difficulty: '低'
  },
  { 
    date: '2025-08-09', 
    description: '想做一个监督自己学英语的快捷指令',
    theme: '学习工具',
    product: '英语学习监督工具（iOS快捷指令 + 数据看板）',
    difficulty: '中'
  },
  { 
    date: '2025-08-07', 
    description: '想学书法',
    theme: '技能学习',
    product: '书法学习App（AI纠错+进度追踪）',
    difficulty: '高'
  },
  {
    date: '2025-08-05',
    description: '基于AI的智能日程管理系统',
    theme: '效率工具',
    product: '智能日程助手（自动优化时间分配）',
    difficulty: '高'
  },
  {
    date: '2025-08-04',
    description: '做一个AI写作助手帮助提升文章质量',
    theme: '写作工具',
    product: 'AI写作助手（语法检查+内容优化）',
    difficulty: '中'
  },
  {
    date: '2025-08-03',
    description: '开发一个智能健身推荐系统',
    theme: '健康管理',
    product: '个性化健身方案生成器（基于身体数据）',
    difficulty: '高'
  }
];

async function restoreInspirationData() {
  console.log('🚀 开始恢复灵感数据...\n');
  
  try {
    // 连接数据库
    const db = await open({
      filename: './records.db',
      driver: sqlite3.Database
    });
    
    console.log('📊 处理灵感数据...\n');
    
    // 批量插入或更新数据
    for (const item of inspirationData) {
      try {
        await db.run(`
          INSERT OR REPLACE INTO simple_records (
            date, 
            inspiration_description, 
            inspiration_theme, 
            inspiration_product, 
            inspiration_difficulty,
            created_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          item.date,
          item.description,
          item.theme,
          item.product,
          item.difficulty
        ]);
        
        console.log(`✅ ${item.date}: ${item.theme} - ${item.difficulty}`);
      } catch (insertError) {
        console.error(`❌ 插入失败 ${item.date}:`, insertError.message);
      }
    }
    
    // 统计导入结果
    const totalCount = await db.get('SELECT COUNT(*) as count FROM simple_records WHERE inspiration_description IS NOT NULL');
    const difficultyStats = await db.all(`
      SELECT inspiration_difficulty, COUNT(*) as count 
      FROM simple_records 
      WHERE inspiration_description IS NOT NULL 
      GROUP BY inspiration_difficulty
    `);
    
    console.log('\n📈 导入统计:');
    console.log(`总计灵感记录: ${totalCount.count} 条`);
    console.log('难度分布:');
    difficultyStats.forEach(stat => {
      console.log(`  ${stat.inspiration_difficulty}: ${stat.count} 条`);
    });
    
    // 预览数据
    console.log('\n🔍 数据预览:');
    const preview = await db.all(`
      SELECT date, inspiration_theme, inspiration_product, inspiration_difficulty 
      FROM simple_records 
      WHERE inspiration_description IS NOT NULL 
      ORDER BY date DESC 
      LIMIT 5
    `);
    
    preview.forEach((row, index) => {
      const difficultyEmoji = row.inspiration_difficulty === '高' ? '🔴' : 
                             row.inspiration_difficulty === '中' ? '🟡' : 
                             row.inspiration_difficulty === '低' ? '🟢' : '⚪';
      console.log(`${index + 1}. ${row.date} | ${row.inspiration_theme} | ${difficultyEmoji} ${row.inspiration_difficulty}`);
      console.log(`   产品: ${row.inspiration_product}`);
    });
    
    await db.close();
    console.log('\n🎉 数据恢复完成！');
    
  } catch (error) {
    console.error('❌ 恢复过程中出错:', error.message);
    process.exit(1);
  }
}

// 运行恢复脚本
restoreInspirationData();
