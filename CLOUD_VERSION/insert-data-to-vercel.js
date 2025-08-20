// 直接向Vercel环境的Turso数据库插入测试数据
const axios = require('axios');

// 2025年8月的测试数据
const testData = [
  {
    date: '2025-08-16',
    mood_description: '今天遇到了claude code听不懂人话的情况，切换到gpt5它一下这就明白了',
    mood_score: 0,
    mood_emoji: '😐',
    mood_category: '中性',
    fitness_calories: null,
    fitness_duration: null,
    fitness_type: null,
    life_description: null,
    study_description: null,
    study_category: null,
    work_description: null,
    work_task_type: null,
    inspiration_description: null,
    inspiration_theme: null
  },
  {
    date: '2025-08-15',
    mood_description: '今天心情不错，完成了重要的项目里程碑',
    mood_score: 8,
    mood_emoji: '😊',
    mood_category: '正面',
    fitness_calories: '280',
    fitness_duration: '30',
    fitness_type: '有氧运动',
    life_description: '晨跑30分钟，感觉精力充沛',
    study_description: '学习React新特性，花了2小时研究Server Components',
    study_category: '编程',
    work_description: '完成了用户界面设计优化',
    work_task_type: '界面优化',
    inspiration_description: '想到了一个新的数据可视化方案',
    inspiration_theme: '技术创新'
  },
  {
    date: '2025-08-14',
    mood_description: '今天出去吃了好吃的烤鱼，还有看了电影F1，很开心',
    mood_score: 3,
    mood_emoji: '😄',
    mood_category: '积极高',
    fitness_calories: '100',
    fitness_duration: '20',
    fitness_type: '拉伸运动',
    life_description: '今天休息日，在家做了简单的拉伸运动',
    study_description: '阅读了技术文章，了解最新前端趋势',
    study_category: '技术阅读',
    work_description: '整理了项目文档和待办事项',
    work_task_type: '文档整理',
    inspiration_description: '想到可以增加数据可视化的交互功能',
    inspiration_theme: '产品优化'
  },
  {
    date: '2025-08-13',
    mood_description: '计划被打乱了有点失落，但决定重新安排',
    mood_score: -2,
    mood_emoji: '😔',
    mood_category: '中度消极',
    fitness_calories: '120',
    fitness_duration: '30',
    fitness_type: '骑车',
    life_description: '很困，骑车5公里',
    study_description: 'python 1小时',
    study_category: '编程',
    work_description: '用MCP实现Figma设计',
    work_task_type: '开发',
    inspiration_description: '现在AI分析股市都是怎么实现的？',
    inspiration_theme: 'AI股市分析'
  },
  {
    date: '2025-08-12',
    mood_description: '计划被打乱了有点失落，但决定重新安排',
    mood_score: -2,
    mood_emoji: '😔',
    mood_category: '中度消极',
    fitness_calories: '0',
    fitness_duration: '0',
    fitness_type: '休息',
    life_description: '没有健身，今天落枕了有点不是很舒服',
    study_description: '口语一小时',
    study_category: '外语',
    work_description: 'Figma设计AI工具网页',
    work_task_type: 'UI/UX设计',
    inspiration_description: '口语可以用录屏的方式…',
    inspiration_theme: '英语口语监督'
  },
  {
    date: '2025-08-11',
    mood_description: '今天做饭特别成功，给自己点个赞',
    mood_score: 2,
    mood_emoji: '😊',
    mood_category: '积极中',
    fitness_calories: '200',
    fitness_duration: '20',
    fitness_type: '跳绳',
    life_description: '跳绳2500',
    study_description: '机器学习-分类算法',
    study_category: 'AI技术',
    work_description: '选择Vercel作为前端部署平台',
    work_task_type: '部署',
    inspiration_description: '现在AI博主…',
    inspiration_theme: 'AI博主分析'
  },
  {
    date: '2025-08-10',
    mood_description: '身体有点不舒服，心情也跟着低落',
    mood_score: -2,
    mood_emoji: '😔',
    mood_category: '中度消极',
    fitness_calories: '0',
    fitness_duration: '0',
    fitness_type: '休息',
    life_description: '来大姨妈第一天，床上躺了一天，很难受',
    study_description: '机器学习-聚类算法',
    study_category: 'AI技术',
    work_description: 'GitHub与后端实时更新机制',
    work_task_type: '开发',
    inspiration_description: '能不能用AI 帮我分析…',
    inspiration_theme: '视频喜好分析'
  }
];

async function insertDataToVercel() {
  console.log('🚀 开始向Vercel环境插入测试数据...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testData.length; i++) {
    const record = testData[i];
    
    try {
      console.log(`\n📝 插入第 ${i + 1}/${testData.length} 条记录: ${record.date}`);
      console.log(`   心情: ${record.mood_description?.substring(0, 30)}...`);
      
      const response = await axios.post('https://personal-website-cloud-v2.vercel.app/api/insert-simple-record', record, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        successCount++;
        console.log(`✅ 成功插入记录 ${record.date}`);
      } else {
        failCount++;
        console.log(`❌ 插入失败: ${response.data.message || 'Unknown error'}`);
      }
      
      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      failCount++;
      console.error(`❌ 插入记录 ${record.date} 时出错:`, error.response?.data?.message || error.message);
    }
  }
  
  console.log(`\n🎯 数据插入完成！成功: ${successCount}，失败: ${failCount}`);
  
  // 验证插入结果
  console.log('\n🔍 验证数据插入结果...');
  try {
    const verifyResponse = await axios.get('https://personal-website-cloud-v2.vercel.app/api/simple-records?from=2025-08-10&to=2025-08-16');
    
    if (verifyResponse.data && verifyResponse.data.records) {
      const records = verifyResponse.data.records;
      console.log(`📊 Vercel环境现有 ${records.length} 条记录`);
      
      if (records.length > 0) {
        console.log('\n📋 数据验证成功！前3条记录预览:');
        records.slice(0, 3).forEach((record, index) => {
          console.log(`${index + 1}. ${record.date}:`);
          console.log(`   心情: ${record.mood_description?.substring(0, 40) || '无'}... ${record.mood_emoji || ''} (${record.mood_score || 0}分)`);
          console.log(`   健身: ${record.fitness_type || '无'} (${record.fitness_calories || 0}卡)`);
        });
        
        console.log('\n🎉 数据插入成功！');
        console.log('🌐 现在访问 https://personal-website-cloud-v2.vercel.app/ 查看图表效果');
      }
    } else {
      console.log('⚠️ 数据验证失败，API可能还有问题');
    }
  } catch (error) {
    console.warn('⚠️ 无法验证插入结果:', error.message);
  }
}

// 运行脚本
if (require.main === module) {
  insertDataToVercel().catch(console.error);
}

module.exports = { insertDataToVercel };
