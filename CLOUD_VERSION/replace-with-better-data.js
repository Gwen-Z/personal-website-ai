// 替换现有数据为更好的分析结果，保持2024年日期
const axios = require('axios');

// 7组精心分析的测试数据 (2024年)
const betterTestData = [
  {
    date: "2024-08-19",
    mood_description: "心情特别好，项目里程碑完成",
    mood_emoji: "😄",
    mood_score: 4,
    mood_category: "积极",
    life_description: "晨跑45分钟，6公里，400卡",
    fitness_intensity: "中等",
    fitness_duration: "45分钟",
    fitness_calories: "400卡",
    fitness_type: "有氧运动",
    study_description: "React新特性学习2小时",
    study_duration: "2小时",
    study_category: "编程",
    work_description: "用户认证模块开发完成",
    work_task_type: "开发",
    work_priority: "高",
    work_complexity: "中等",
    work_estimated_hours: 8,
    inspiration_description: "AI辅助编程创意",
    inspiration_theme: "AI工具开发",
    inspiration_difficulty: "中",
    inspiration_product: "代码模板生成工具"
  },
  {
    date: "2024-08-18",
    mood_description: "紧张焦虑但也兴奋",
    mood_emoji: "😰",
    mood_score: 1,
    mood_category: "紧张",
    life_description: "健身房力量训练1小时",
    fitness_intensity: "高",
    fitness_duration: "1小时",
    fitness_calories: "350卡",
    fitness_type: "力量训练",
    study_description: "TypeScript进阶1.5小时",
    study_duration: "1.5小时",
    study_category: "编程",
    work_description: "项目演示PPT准备",
    work_task_type: "规划",
    work_priority: "高",
    work_complexity: "简单",
    work_estimated_hours: 4,
    inspiration_description: "在线协作工具想法",
    inspiration_theme: "协作工具",
    inspiration_difficulty: "高",
    inspiration_product: "文档协作平台"
  },
  {
    date: "2024-08-17",
    mood_description: "心情平静，工作顺利",
    mood_emoji: "😌",
    mood_score: 2,
    mood_category: "平静",
    life_description: "瑜伽30分钟放松",
    fitness_intensity: "低",
    fitness_duration: "30分钟",
    fitness_calories: "150卡",
    fitness_type: "柔韧性训练",
    study_description: "用户体验设计书籍1小时",
    study_duration: "1小时",
    study_category: "设计",
    work_description: "数据库性能优化",
    work_task_type: "开发",
    work_priority: "中",
    work_complexity: "中等",
    work_estimated_hours: 6,
    inspiration_description: "智能日程管理应用",
    inspiration_theme: "效率工具",
    inspiration_difficulty: "中",
    inspiration_product: "AI日程助手"
  },
  {
    date: "2024-08-16",
    mood_description: "疲惫有压力但乐观",
    mood_emoji: "😓",
    mood_score: 1,
    mood_category: "疲惫",
    life_description: "游泳40分钟，1500米",
    fitness_intensity: "中等",
    fitness_duration: "40分钟",
    fitness_calories: "300卡",
    fitness_type: "有氧运动",
    study_description: "Node.js性能优化2.5小时",
    study_duration: "2.5小时",
    study_category: "编程",
    work_description: "新API接口开发",
    work_task_type: "开发",
    work_priority: "高",
    work_complexity: "复杂",
    work_estimated_hours: 8,
    inspiration_description: "健康管理平台创意",
    inspiration_theme: "健康科技",
    inspiration_difficulty: "高",
    inspiration_product: "综合健康平台"
  },
  {
    date: "2024-08-15",
    mood_description: "心情愉快，生活充实",
    mood_emoji: "😊",
    mood_score: 4,
    mood_category: "愉快",
    life_description: "羽毛球1小时，高强度",
    fitness_intensity: "高",
    fitness_duration: "1小时",
    fitness_calories: "450卡",
    fitness_type: "球类运动",
    study_description: "Python数据分析1.5小时",
    study_duration: "1.5小时",
    study_category: "数据科学",
    work_description: "技术分享会参与",
    work_task_type: "学习",
    work_priority: "中",
    work_complexity: "简单",
    work_estimated_hours: 3,
    inspiration_description: "社交学习平台想法",
    inspiration_theme: "教育科技",
    inspiration_difficulty: "中",
    inspiration_product: "学习社区平台"
  },
  {
    date: "2024-08-14",
    mood_description: "情绪低落，技术难题",
    mood_emoji: "😞",
    mood_score: -1,
    mood_category: "低落",
    life_description: "简单拉伸20分钟",
    fitness_intensity: "低",
    fitness_duration: "20分钟",
    fitness_calories: "100卡",
    fitness_type: "拉伸运动",
    study_description: "微服务架构学习3小时",
    study_duration: "3小时",
    study_category: "架构",
    work_description: "并发问题调试",
    work_task_type: "测试/收尾",
    work_priority: "高",
    work_complexity: "复杂",
    work_estimated_hours: 10,
    inspiration_description: "开发者工具想法",
    inspiration_theme: "开发工具",
    inspiration_difficulty: "中",
    inspiration_product: "代码问题检测工具"
  },
  {
    date: "2024-08-13",
    mood_description: "心情不错，有成就感",
    mood_emoji: "😄",
    mood_score: 3,
    mood_category: "满意",
    life_description: "跑步35分钟，5公里",
    fitness_intensity: "中等",
    fitness_duration: "35分钟",
    fitness_calories: "320卡",
    fitness_type: "有氧运动",
    study_description: "机器学习基础2小时",
    study_duration: "2小时",
    study_category: "AI技术",
    work_description: "并发问题解决，性能优化",
    work_task_type: "开发",
    work_priority: "高",
    work_complexity: "复杂",
    work_estimated_hours: 8,
    inspiration_description: "AI代码审查工具创意",
    inspiration_theme: "AI工具开发",
    inspiration_difficulty: "高",
    inspiration_product: "智能代码审查系统"
  }
];

async function replaceExistingData() {
  try {
    console.log('🔄 开始替换现有数据为更好的分析结果...');
    console.log('📊 数据范围: 2024-08-13 到 2024-08-19 (共7天)');
    
    let successCount = 0;
    
    for (const item of betterTestData) {
      try {
        console.log(`\n📝 替换日期 ${item.date} 的数据...`);
        
        // 使用我们创建的insert-simple-record API
        const response = await axios.post('http://localhost:3001/api/insert-simple-record', item);
        
        if (response.data.success) {
          successCount++;
          console.log(`✅ 成功替换 ${item.date} 的数据`);
        } else {
          console.error(`❌ 替换 ${item.date} 数据失败:`, response.data?.message || 'Unknown error');
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        if (error.response?.status === 503) {
          console.error(`❌ 服务不可用 (503) - 可能是环境变量配置问题`);
        } else {
          console.error(`❌ 处理 ${item.date} 数据时出错:`, error.response?.data?.message || error.message);
        }
      }
    }
    
    console.log(`\n🎯 数据替换完成！成功替换 ${successCount}/${betterTestData.length} 条数据`);
    
    // 验证替换结果
    console.log('\n🔍 验证替换结果...');
    try {
      const verifyResponse = await axios.get('http://localhost:3001/api/simple-records?from=2024-08-13&to=2024-08-19');
      
      if (verifyResponse.data && verifyResponse.data.records) {
        const records = verifyResponse.data.records;
        console.log(`📊 simple_records表中共有 ${records.length} 条记录`);
        
        if (records.length > 0) {
          console.log('\n📋 替换后数据预览:');
          records.slice(0, 3).forEach((record, index) => {
            console.log(`${index + 1}. ${record.date}:`);
            console.log(`   心情: ${record.mood_description} ${record.mood_emoji} (分值: ${record.mood_score})`);
            console.log(`   健身: ${record.life_description} (${record.fitness_type}, ${record.fitness_calories})`);
            console.log(`   学习: ${record.study_description} (${record.study_category}, ${record.study_duration})`);
            console.log(`   工作: ${record.work_description} (${record.work_task_type}, ${record.work_priority}优先级)`);
            console.log(`   灵感: ${record.inspiration_description} (${record.inspiration_theme})`);
          });
          
          console.log('\n🎉 数据替换成功！现在可以在前端查看更真实的图表了！');
          console.log('🌐 前端地址: http://localhost:3001');
          console.log('📈 各个图表现在都应该显示这7天的高质量数据了');
          
          // 显示数据统计
          const moodScores = records.filter(r => r.mood_score !== null).map(r => r.mood_score);
          const avgMood = moodScores.length > 0 ? (moodScores.reduce((a,b) => a+b, 0) / moodScores.length).toFixed(1) : 0;
          console.log(`📊 平均心情分值: ${avgMood}/5`);
          
          const categories = [...new Set(records.map(r => r.mood_category).filter(Boolean))];
          console.log(`🏷️ 心情类别: ${categories.join(', ')}`);
          
          const fitnessTypes = [...new Set(records.map(r => r.fitness_type).filter(Boolean))];
          console.log(`🏃‍♂️ 运动类型: ${fitnessTypes.join(', ')}`);
          
        }
      } else {
        console.log('📊 数据验证：响应格式不正确');
      }
    } catch (error) {
      console.warn('⚠️ 无法验证替换结果:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 替换数据失败:', error.message);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  replaceExistingData().catch(console.error);
}

module.exports = { replaceExistingData, betterTestData };
