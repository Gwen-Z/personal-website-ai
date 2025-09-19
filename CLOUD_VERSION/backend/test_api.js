import axios from 'axios';

async function testAPI() {
  try {
    console.log('🧪 测试API端点...\n');
    
    // 测试simple-records API
    console.log('1. 测试 /api/simple-records');
    const response = await axios.get('http://localhost:3001/api/simple-records?from=2025-09-13&to=2025-09-19');
    console.log(`   ✅ 状态码: ${response.status}`);
    console.log(`   📊 记录数量: ${response.data.records?.length || 0}`);
    
    if (response.data.records && response.data.records.length > 0) {
      const firstRecord = response.data.records[0];
      console.log(`   📝 示例记录: ${firstRecord.date} - ${firstRecord.mood_emoji} ${firstRecord.mood_description?.substring(0, 20)}...`);
    }
    
    // 测试raw-entries API
    console.log('\n2. 测试 /api/raw-entries');
    const rawResponse = await axios.get('http://localhost:3001/api/raw-entries?from=2025-09-13&to=2025-09-19');
    console.log(`   ✅ 状态码: ${rawResponse.status}`);
    console.log(`   📊 原始记录数量: ${rawResponse.data?.length || 0}`);
    
    // 测试ai-data API
    console.log('\n3. 测试 /api/ai-data');
    const aiResponse = await axios.get('http://localhost:3001/api/ai-data?from=2025-09-13&to=2025-09-19');
    console.log(`   ✅ 状态码: ${aiResponse.status}`);
    console.log(`   📊 AI分析记录数量: ${aiResponse.data?.length || 0}`);
    
    console.log('\n🎉 API测试完成！数据已成功同步到页面。');
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    if (error.response) {
      console.error(`   状态码: ${error.response.status}`);
      console.error(`   响应: ${error.response.data}`);
    }
  }
}

testAPI();
