export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    const model = process.env.OPENAI_MODEL || 'doubao-lite-32k-240828';

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key 未配置' });
    }

    // 分析 API Key 格式
    const keyInfo = {
      length: apiKey.length,
      firstChar: apiKey.charAt(0),
      lastChar: apiKey.charAt(apiKey.length - 1),
      hasHyphen: apiKey.includes('-'),
      hyphenCount: (apiKey.match(/-/g) || []).length,
      prefix: apiKey.substring(0, 10),
      suffix: apiKey.substring(apiKey.length - 5),
      containsSpaces: apiKey.includes(' '),
      containsNewlines: apiKey.includes('\n') || apiKey.includes('\r')
    };

    console.log('测试豆包 API 调用');
    console.log('Base URL:', baseUrl);
    console.log('Model:', model);
    console.log('API Key 信息:', keyInfo);

    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: '你好，请回复"测试成功"'
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    };

    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('响应内容:', responseText);

    if (!response.ok) {
      return res.status(500).json({
        error: '豆包 API 调用失败',
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        keyInfo: keyInfo
      });
    }

    const data = JSON.parse(responseText);
    
    return res.status(200).json({
      success: true,
      response: data,
      message: data.choices?.[0]?.message?.content || '无响应内容',
      keyInfo: keyInfo
    });

  } catch (error) {
    console.error('豆包测试错误:', error);
    return res.status(500).json({
      error: '测试失败',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    });
  }
}
