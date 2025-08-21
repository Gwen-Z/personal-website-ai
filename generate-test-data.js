// 生成过去一周的测试数据
const testData = [
  {
    date: '2025-08-13',
    mood_text: '今天心情一般，工作压力有点大，但是完成了重要任务',
    life_text: '晨跑30分钟，感觉身体状态不错',
    study_text: '学习了React新特性，掌握了useCallback的用法',
    work_text: '完成了项目的核心功能开发，代码review通过了',
    inspiration_text: '想到了一个提升用户体验的新想法'
  },
  {
    date: '2025-08-14',
    mood_text: '心情很好，和朋友聚餐很开心',
    life_text: '健身房锻炼1小时，力量训练',
    study_text: '阅读了技术博客，了解了最新的前端趋势',
    work_text: '修复了几个bug，优化了页面加载速度',
    inspiration_text: '对个人项目有了新的架构思路'
  },
  {
    date: '2025-08-15',
    mood_text: '有点疲惫，工作量比较大',
    life_text: '只做了简单的拉伸运动',
    study_text: '看了一个关于AI的在线课程',
    work_text: '开会讨论了新功能的设计方案',
    inspiration_text: '思考如何将AI更好地集成到产品中'
  },
  {
    date: '2025-08-16',
    mood_text: '心情平静，专注工作状态',
    life_text: '瑜伽练习45分钟，放松身心',
    study_text: '深入学习了数据库优化技巧',
    work_text: '完成了API接口的重构，性能提升明显',
    inspiration_text: '想到了一个数据可视化的创新方案'
  },
  {
    date: '2025-08-17',
    mood_text: '周末心情愉悦，充满活力',
    life_text: '户外徒步3小时，享受自然风光',
    study_text: '阅读了一本关于产品设计的书籍',
    work_text: '整理了这周的工作总结和下周计划',
    inspiration_text: '对生活和工作的平衡有了新的理解'
  },
  {
    date: '2025-08-18',
    mood_text: '心情不错，周日比较放松',
    life_text: '游泳1小时，全身运动很舒服',
    study_text: '学习了新的设计工具Figma的高级功能',
    work_text: '为下周的项目做了详细规划',
    inspiration_text: '想到了改善团队协作的新方法'
  },
  {
    date: '2025-08-19',
    mood_text: '新的一周开始，充满期待和动力',
    life_text: '晨练加冥想，精神状态很好',
    study_text: '复习了上周学习的内容，做了知识整理',
    work_text: '开始了新功能的开发，进展顺利',
    inspiration_text: '对个人成长和职业发展有了清晰的目标'
  }
];

// 批量提交数据的函数
async function submitTestData() {
  const baseUrl = 'https://personal-website-cloud-v2.vercel.app';
  
  console.log('开始提交测试数据...');
  
  for (let i = 0; i < testData.length; i++) {
    const data = testData[i];
    console.log(`提交第 ${i + 1} 条数据: ${data.date}`);
    
    // 组合所有文本内容
    const rawText = `日期: ${data.date}
心情: ${data.mood_text}
生活: ${data.life_text}
学习: ${data.study_text}
工作: ${data.work_text}
灵感: ${data.inspiration_text}`;

    try {
      const response = await fetch(`${baseUrl}/api/raw-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rawText: rawText
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${data.date} 数据提交成功`);
        console.log(`AI 分析结果: 心情${result.ai_analysis?.mood}/5, ${result.ai_analysis?.mood_emoji}`);
      } else {
        const error = await response.text();
        console.error(`❌ ${data.date} 数据提交失败:`, error);
      }
    } catch (error) {
      console.error(`❌ ${data.date} 请求失败:`, error.message);
    }
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('所有测试数据提交完成！');
}

// 如果直接运行此脚本
if (typeof window === 'undefined') {
  // Node.js 环境
  const fetch = require('node-fetch');
  submitTestData();
} else {
  // 浏览器环境
  window.submitTestData = submitTestData;
}

module.exports = { testData, submitTestData };
