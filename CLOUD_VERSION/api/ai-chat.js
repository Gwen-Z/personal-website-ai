import CloudAIService from '../lib/cloud-ai-service.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('💬 AI聊天请求:', { message: message.substring(0, 100), context });

    // 初始化 AI 服务
    const aiService = new CloudAIService();

    // 调用 AI 聊天
    const response = await aiService.chatResponse(message, context, history);

    console.log('🤖 AI聊天响应:', response.reply.substring(0, 100));

    res.status(200).json({
      ...response,
      source: 'cloud_ai',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI聊天失败:', error);
    res.status(500).json({
      error: 'AI聊天服务失败',
      message: error.message,
      reply: '抱歉，AI服务暂时不可用，请稍后再试。',
      source: 'cloud_ai'
    });
  }
}
