export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { text = "你好" } = req.body || {};
    
    // 豆包 API 的正确请求格式
    const requestBody = {
      model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828',
      messages: [
        {
          role: "system",
          content: "你是一个有用的AI助手。"
        },
        {
          role: "user", 
          content: text
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
      stream: false  // 明确设置为非流式
    };

    console.log('🧪 豆包请求体:', JSON.stringify(requestBody, null, 2));
    console.log('🌐 API URL:', process.env.OPENAI_BASE_URL);

    const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 响应状态:', response.status);
    console.log('📋 响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 豆包 API 错误:', errorText);
      
      // 尝试解析错误信息
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { raw_error: errorText };
      }

      return res.status(response.status).json({
        error: `豆包 API 错误 ${response.status}`,
        details: errorDetails,
        request_info: {
          model: requestBody.model,
          url: `${process.env.OPENAI_BASE_URL}/chat/completions`,
          headers_sent: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY.substring(0, 10)}...`
          }
        }
      });
    }

    const result = await response.json();
    console.log('✅ 豆包响应成功:', result);

    return res.status(200).json({
      success: true,
      message: '豆包 API 调用成功！',
      model_used: requestBody.model,
      input_text: text,
      ai_response: result.choices?.[0]?.message?.content || '无响应内容',
      full_response: result,
      usage: result.usage || null
    });

  } catch (error) {
    console.error('❌ 请求失败:', error);
    
    return res.status(500).json({
      error: '请求失败',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3), // 只返回前3行堆栈
      type: error.name
    });
  }
}
