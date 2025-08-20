export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    const apiKey = process.env.OPENAI_API_KEY;

    // 测试信息
    const testInfo = {
      baseUrl,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'None',
      timestamp: new Date().toISOString()
    };

    console.log('连接测试信息:', testInfo);

    // 尝试一个更简单的请求，使用更短的超时时间
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        testInfo
      };

      if (response.ok) {
        try {
          const data = await response.text();
          result.responseData = data.substring(0, 500); // 只取前500字符
        } catch (e) {
          result.responseData = '无法解析响应内容';
        }
      }

      return res.status(200).json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return res.status(500).json({
          error: '请求超时',
          message: '5秒内未收到响应',
          testInfo
        });
      }

      throw fetchError;
    }

  } catch (error) {
    console.error('连接测试错误:', error);
    return res.status(500).json({
      error: '连接测试失败',
      message: error.message,
      name: error.name,
      code: error.code,
      testInfo: {
        baseUrl: process.env.OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      }
    });
  }
}
