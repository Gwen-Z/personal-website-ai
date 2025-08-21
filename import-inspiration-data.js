#!/usr/bin/env node

const axios = require('axios');

const baseURL = 'http://localhost:5101';

// 用户提供的灵感数据
const inspirationData = [
  { date: '2025-08-16', description: '想做一个记录个人生活的AI分析工具' },
  { date: '2025-08-15', description: '想做AI工具学习博主' },
  { date: '2025-08-14', description: '想卖课' },
  { date: '2025-08-13', description: '现在AI分析股市都是怎么实现的？' },
  { date: '2025-08-12', description: '口语可以用录屏的方式去做影子跟读，一边发到小红书抖音，一边监督自己学习' },
  { date: '2025-08-11', description: '现在AI博主那么多，有一些挺有意思的，他们都有哪些特点呢' },
  { date: '2025-08-10', description: '能不能用AI帮我分析我都喜欢看什么样的视频？' },
  { date: '2025-08-09', description: '想做一个监督自己学英语的快捷指令' },
  { date: '2025-08-08', description: '没想法' },
  { date: '2025-08-07', description: '想学书法' },
  { date: '2025-08-06', description: '没想法' }
];

async function importData() {
  try {
    console.log('🚀 开始导入灵感数据...\n');
    
    const response = await axios.post(`${baseURL}/api/inspiration-data/batch`, { 
      data: inspirationData 
    });
    
    if (response.data.success) {
      console.log(`✅ 成功导入: ${response.data.message}`);
      console.log('\n📊 导入结果预览:');
      response.data.results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.date}: ${result.description}`);
        console.log(`   主题: ${result.inspiration_theme}`);
        console.log(`   产品: ${result.inspiration_product}`);
        console.log(`   难度: ${result.inspiration_difficulty}\n`);
      });
      
      if (response.data.results.length > 3) {
        console.log(`... 还有 ${response.data.results.length - 3} 条数据\n`);
      }
    } else {
      console.log(`❌ 导入失败: ${response.data.message}`);
    }
  } catch (error) {
    console.error('❌ 导入过程中出错:', error.response?.data?.message || error.message);
  }
}

importData();
