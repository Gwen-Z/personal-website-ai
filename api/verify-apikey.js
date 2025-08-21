export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL;
    const model = process.env.OPENAI_MODEL;

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

    // 尝试一个最简单的 API 调用
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      });

      const responseText = await response.text();
      
      return res.status(200).json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        keyInfo: keyInfo,
        response: responseText.substring(0, 500),
        config: {
          baseUrl,
          model,
          hasApiKey: !!apiKey
        }
      });

    } catch (fetchError) {
      return res.status(500).json({
        error: 'API 调用失败',
        message: fetchError.message,
        keyInfo: keyInfo,
        config: {
          baseUrl,
          model,
          hasApiKey: !!apiKey
        }
      });
    }

  } catch (error) {
    return res.status(500).json({
      error: '验证失败',
      message: error.message
    });
  }
}
