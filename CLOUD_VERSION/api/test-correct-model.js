export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { text = "你好，测试豆包模型" } = req.body || {};
    
    // 使用正确的模型 ID
    const correctModel = 'doubao-lite-32k-240828';
    
    const prompt = `简单测试，只返回：{"result":"成功","text":"${text}","model":"${correctModel}"}`;

    console.log('🧪 测试正确的豆包模型:', correctModel);
    
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: correctModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('豆包 API 错误响应:', errorText);
      return res.status(500).json({
        error: `豆包 API 错误: ${response.status}`,
        details: errorText,
        tested_model: correctModel
      });
    }
    
    const result = await response.json();
    console.log('✅ 豆包 API 响应成功:', result);
    
    return res.status(200).json({
      success: true,
      message: '豆包 API 调用成功！',
      model_used: correctModel,
      response: result.choices[0].message.content,
      full_response: result
    });

  } catch (error) {
    console.error('❌ 豆包 API 测试失败:', error);
    
    return res.status(500).json({
      error: '豆包 API 调用失败',
      message: error.message
    });
  }
}
