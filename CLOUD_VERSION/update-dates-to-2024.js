// 将现有数据的日期从2025年更新为2024年
const axios = require('axios');

async function updateDatesTo2024() {
  try {
    console.log('🔄 开始将数据日期从2025年更新为2024年...');
    
    // 首先获取所有现有数据
    const response = await axios.get('http://localhost:3001/api/simple-records');
    
    if (!response.data || !response.data.records) {
      console.log('❌ 没有找到数据');
      return;
    }
    
    const records = response.data.records;
    console.log(`📊 找到 ${records.length} 条记录需要更新日期`);
    
    // 选择最近的7条记录进行更新，并将日期改为2024年8月13-19日
    const targetDates = [
      '2024-08-19',
      '2024-08-18', 
      '2024-08-17',
      '2024-08-16',
      '2024-08-15',
      '2024-08-14',
      '2024-08-13'
    ];
    
    let successCount = 0;
    
    // 取前7条记录并更新日期
    const recordsToUpdate = records.slice(0, 7);
    
    for (let i = 0; i < recordsToUpdate.length && i < targetDates.length; i++) {
      const record = recordsToUpdate[i];
      const newDate = targetDates[i];
      
      try {
        console.log(`\n📝 更新记录 ID ${record.id}: ${record.date} → ${newDate}`);
        
        // 创建更新后的记录数据
        const updatedRecord = {
          ...record,
          date: newDate
        };
        
        // 删除不需要的字段
        delete updatedRecord.id;
        delete updatedRecord.created_at;
        
        // 使用insert-simple-record API插入更新后的数据
        const insertResponse = await axios.post('http://localhost:3001/api/insert-simple-record', updatedRecord);
        
        if (insertResponse.data.success) {
          successCount++;
          console.log(`✅ 成功更新记录到日期 ${newDate}`);
          console.log(`   心情: ${record.mood_description?.substring(0, 30)}...`);
          console.log(`   健身: ${record.life_description?.substring(0, 30) || '无'}...`);
        } else {
          console.error(`❌ 更新记录失败:`, insertResponse.data?.message || 'Unknown error');
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ 处理记录 ID ${record.id} 时出错:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log(`\n🎯 日期更新完成！成功更新 ${successCount}/${Math.min(recordsToUpdate.length, targetDates.length)} 条记录`);
    
    // 验证更新结果
    console.log('\n🔍 验证2024年数据...');
    try {
      const verifyResponse = await axios.get('http://localhost:3001/api/simple-records?from=2024-08-13&to=2024-08-19');
      
      if (verifyResponse.data && verifyResponse.data.records) {
        const records2024 = verifyResponse.data.records;
        console.log(`📊 2024年8月13-19日共有 ${records2024.length} 条记录`);
        
        if (records2024.length > 0) {
          console.log('\n📋 2024年数据预览:');
          records2024.forEach((record, index) => {
            console.log(`${index + 1}. ${record.date}:`);
            console.log(`   心情: ${record.mood_description?.substring(0, 40) || '无'}... ${record.mood_emoji || ''} (${record.mood_score || 0}分)`);
            console.log(`   健身: ${record.life_description?.substring(0, 40) || '无'}... (${record.fitness_type || '无'})`);
            if (record.study_description) {
              console.log(`   学习: ${record.study_description.substring(0, 40)}... (${record.study_category || '无'})`);
            }
            if (record.work_description) {
              console.log(`   工作: ${record.work_description.substring(0, 40)}... (${record.work_task_type || '无'})`);
            }
            if (record.inspiration_description) {
              console.log(`   灵感: ${record.inspiration_description.substring(0, 40)}... (${record.inspiration_theme || '无'})`);
            }
            console.log('');
          });
          
          console.log('🎉 数据更新成功！现在可以在前端查看2024年8月的图表了！');
          console.log('🌐 前端地址: http://localhost:3001');
          console.log('📈 图表现在应该显示2024年8月13-19日的数据');
          
          // 显示数据统计
          const validMoodScores = records2024.filter(r => r.mood_score !== null && r.mood_score !== undefined);
          if (validMoodScores.length > 0) {
            const avgMood = (validMoodScores.reduce((a,b) => a + (b.mood_score || 0), 0) / validMoodScores.length).toFixed(1);
            console.log(`📊 平均心情分值: ${avgMood}/5`);
          }
          
          const categories = [...new Set(records2024.map(r => r.mood_category).filter(Boolean))];
          console.log(`🏷️ 心情类别: ${categories.join(', ')}`);
          
          const fitnessTypes = [...new Set(records2024.map(r => r.fitness_type).filter(Boolean))];
          console.log(`🏃‍♂️ 运动类型: ${fitnessTypes.join(', ')}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ 无法验证更新结果:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 更新日期失败:', error.message);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  updateDatesTo2024().catch(console.error);
}

module.exports = { updateDatesTo2024 };
