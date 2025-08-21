// 批量上传真实数据到后端的脚本
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5101';

// 示例数据 - 请根据您的实际数据修改
const sampleData = [
  {
    date: '2025-01-15',
    mood: 8.5,
    life: 7.2,
    study: 9.0,
    work: 6.8,
    inspiration: 8.3,
    note: '今天学习了新的技术栈，心情不错'
  },
  {
    date: '2025-01-14',
    mood: 7.0,
    life: 8.1,
    study: 7.5,
    work: 8.2,
    inspiration: 6.9,
    note: '工作进展顺利，完成了重要项目'
  },
  {
    date: '2025-01-13',
    mood: 6.5,
    life: 6.8,
    study: 8.2,
    work: 7.1,
    inspiration: 7.8,
    note: '学习时间较多，但感觉有些疲惫'
  },
  {
    date: '2025-01-12',
    mood: 9.2,
    life: 8.7,
    study: 8.8,
    work: 9.1,
    inspiration: 9.5,
    note: '非常充实的一天，各方面都很满意'
  },
  {
    date: '2025-01-11',
    mood: 7.8,
    life: 7.5,
    study: 6.9,
    work: 7.3,
    inspiration: 8.1,
    note: '平稳的一天，保持稳定状态'
  }
];

// 批量上传函数
async function uploadData() {
  console.log('开始批量上传数据...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const record of sampleData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/record`, record);
      console.log(`✅ 成功上传: ${record.date} - ${response.data.message}`);
      successCount++;
    } catch (error) {
      console.error(`❌ 上传失败: ${record.date} - ${error.response?.data?.message || error.message}`);
      errorCount++;
    }
    
    // 添加小延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 上传完成统计:`);
  console.log(`成功: ${successCount} 条`);
  console.log(`失败: ${errorCount} 条`);
}

// 执行上传
uploadData().catch(console.error);
