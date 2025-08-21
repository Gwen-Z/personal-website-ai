const axios = require('axios');

// 根据提供的表格数据填充健身记录
const fitnessData = [
  {
    date: '2025-08-14',
    mood_text: '今天心情很好，完成了数据结构改造',
    life_text: '跳绳3050，哑铃20分钟，散步5公里，骑车4.5公里',
    study_text: '学习新技术',
    work_text: '工作进展顺利',
    inspiration_text: '有了新的想法'
  },
  {
    date: '2025-08-13',
    mood_text: '今天心情不错',
    life_text: '很困，骑车5公里',
    study_text: '学习进展良好',
    work_text: '工作正常',
    inspiration_text: '有一些想法'
  },
  {
    date: '2025-08-12',
    mood_text: '今天心情一般',
    life_text: '没有健身，今天落枕了有点不是很舒服',
    study_text: '学习正常',
    work_text: '工作进展',
    inspiration_text: '创意想法'
  },
  {
    date: '2025-08-11',
    mood_text: '今天心情回升',
    life_text: '跳绳2500',
    study_text: '学习新知识',
    work_text: '工作顺利',
    inspiration_text: '有灵感'
  },
  {
    date: '2025-08-10',
    mood_text: '今天心情有点低落',
    life_text: '来大姨妈第一天，床上躺了一天，很难受',
    study_text: '学习较少',
    work_text: '工作一般',
    inspiration_text: '创意不多'
  },
  {
    date: '2025-08-09',
    mood_text: '今天心情还可以',
    life_text: '没出门，在家有氧1小时',
    study_text: '学习进展',
    work_text: '工作正常',
    inspiration_text: '有想法'
  },
  {
    date: '2025-08-08',
    mood_text: '今天心情不错',
    life_text: '出门散步50分钟',
    study_text: '学习新技术',
    work_text: '工作顺利',
    inspiration_text: '灵感丰富'
  },
  {
    date: '2025-08-07',
    mood_text: '今天心情一般',
    life_text: '跳绳3400',
    study_text: '学习正常',
    work_text: '工作进展',
    inspiration_text: '有创意'
  },
  {
    date: '2025-08-06',
    mood_text: '今天心情还行',
    life_text: '跳绳2700，有氧哑铃30分钟',
    study_text: '学习进展良好',
    work_text: '工作正常',
    inspiration_text: '想法不少'
  }
];

// 批量导入健身数据
async function importFitnessData() {
  const baseURL = 'http://localhost:5101';
  let successCount = 0;
  let errorCount = 0;

  console.log('🏃‍♂️ 开始导入健身打卡数据...\n');

  // 先删除现有数据（可选）
  try {
    console.log('🗑️ 清理现有数据...');
    const existingRecords = await axios.get(`${baseURL}/api/simple-records`);
    const records = existingRecords.data || [];
    
    for (const record of records) {
      await axios.delete(`${baseURL}/api/simple-records/${record.id}`);
    }
    console.log(`✅ 已清理 ${records.length} 条现有记录\n`);
  } catch (error) {
    console.log('⚠️ 清理数据时出错，继续导入新数据...\n');
  }

  for (const dayData of fitnessData) {
    try {
      console.log(`📅 正在处理 ${dayData.date} 的健身数据...`);
      console.log(`   健身描述: ${dayData.life_text.substring(0, 40)}...`);
      
      const response = await axios.post(`${baseURL}/api/raw-entry`, dayData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.message && response.data.record_id) {
        console.log(`✅ 健身数据导入成功:`);
        console.log(`   - 记录ID: ${response.data.record_id}`);
        console.log(`   - 心情emoji: ${response.data.data.mood_emoji}`);
        console.log(`   - 运动强度: ${response.data.data.fitness_intensity}`);
        console.log(`   - 运动时间: ${response.data.data.fitness_duration}`);
        console.log(`   - 消耗热量: ${response.data.data.fitness_calories}`);
        console.log(`   - 运动类型: ${response.data.data.fitness_type}`);
        successCount++;
      } else {
        console.log(`❌ ${dayData.date} 数据导入失败`);
        errorCount++;
      }
    } catch (error) {
      console.log(`❌ ${dayData.date} 数据导入出错:`, error.response?.data?.error || error.message);
      errorCount++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 导入完成统计:');
  console.log(`✅ 成功: ${successCount} 条`);
  console.log(`❌ 失败: ${errorCount} 条`);
  console.log(`📝 总计: ${fitnessData.length} 条`);

  if (successCount > 0) {
    console.log('\n🎉 健身数据导入完成！');
    console.log('现在可以在前端查看：');
    console.log('- 选择"健身打卡"类别可以看到完整的AI分析结果');
    console.log('- 包含：强度(AI总结)、运动总时间(AI总结)、运动消耗预估(AI总结)、运动种类(AI总结)');
    console.log('- 前端地址: http://localhost:3000');
  }
}

// 运行导入
importFitnessData().catch(console.error);
