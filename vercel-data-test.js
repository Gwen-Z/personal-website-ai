const axios = require('axios');

// 测试Vercel后端API
async function testVercelData() {
  // 请替换为你的实际Vercel后端URL
  const VERCEL_API_URL = process.env.VERCEL_API_URL || 'https://personal-website-hpkr7fq67-gwen-zs-projects.vercel.app';
  
  console.log('🔍 测试Vercel数据传输...');
  console.log(`📍 API地址: ${VERCEL_API_URL}`);
  console.log('='.repeat(50));
  
  try {
    // 1. 测试健康检查
    console.log('\n1️⃣ 测试健康检查...');
    const healthCheck = await axios.get(`${VERCEL_API_URL}/health`);
    console.log('✅ 健康检查通过:', healthCheck.data);
    
    // 2. 测试数据添加（原始文本格式）
    console.log('\n2️⃣ 测试数据添加（原始文本格式）...');
    const testRawText = `日期：${new Date().toISOString().split('T')[0]}
【语音输入】
日期：
健身：
学习： 
工作：
灵感：
【文本输入】
心情：今天心情不错，工作很顺利
健身：跑步30分钟，消耗300卡路里
学习：学习了TypeScript和Vercel部署
工作：完成了API开发和数据库配置
灵感：想到了一个新的项目想法`;
    
    const testData = {
      raw_text: testRawText
    };
    
    const addResponse = await axios.post(`${VERCEL_API_URL}/api/raw-entry`, testData);
    console.log('✅ 数据添加成功:', addResponse.data);
    
    // 3. 测试数据获取
    console.log('\n3️⃣ 测试数据获取...');
    const getResponse = await axios.get(`${VERCEL_API_URL}/api/simple-records`);
    console.log(`✅ 数据获取成功，共 ${getResponse.data.length} 条记录`);
    
    // 4. 测试仪表盘数据
    console.log('\n4️⃣ 测试仪表盘数据...');
    const dashboardResponse = await axios.get(`${VERCEL_API_URL}/api/dashboard`);
    console.log('✅ 仪表盘数据获取成功');
    console.log('心情趋势数据点:', dashboardResponse.data.moodTrend?.length || 0);
    
    console.log('\n🎉 所有测试通过！Vercel数据传输正常！');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else if (error.request) {
      console.error('网络错误 - 无法连接到Vercel API');
      console.error('请检查:');
      console.error('1. Vercel后端是否已部署');
      console.error('2. API URL是否正确');
      console.error('3. 网络连接是否正常');
    } else {
      console.error('请求错误:', error.message);
    }
  }
}

// 运行测试
testVercelData(); 