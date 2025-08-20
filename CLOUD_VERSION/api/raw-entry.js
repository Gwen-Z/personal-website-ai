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
    // 兼容 rawText 字段
    const body = req.body || {};
    const normalizedRawText = typeof body.rawText === 'string' ? body.rawText : body.raw_text;
    const hasRaw = normalizedRawText && normalizedRawText.trim();

    if (!hasRaw) {
      return res.status(400).json({ error: '原始文本不能为空', hint: '使用 rawText 或 raw_text 字段' });
    }

    console.log('📥 收到原始数据:', normalizedRawText);

    // 检查配置状态
    const hasDbUrl = !!(process.env.DATABASE_URL || process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL);
    const hasDbToken = !!(process.env.DATABASE_TOKEN || process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN);
    const hasAI = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
    
    // 简单解析数据
    const parsedData = {
      date: new Date().toISOString().split('T')[0],
      mood_text: normalizedRawText,
      life_text: '',
      study_text: '',
      work_text: '',
      inspiration_text: ''
    };

    // 如果配置了 AI，进行真实调用
    if (hasAI) {
      try {
        // 初始化 AI 服务
        const aiService = new CloudAIService();
        
        console.log('🤖 开始 AI 处理...');
        const aiAnalysis = await aiService.processRawData(parsedData);
        console.log('✅ AI 处理完成:', aiAnalysis);
        
        // 如果数据库配置正确，尝试存储
        if (hasDbUrl && hasDbToken) {
          try {
            const { insert } = await import('../lib/turso.js');
            await insert('raw_entries', parsedData);
            console.log('✅ 数据已存储到数据库');
          } catch (dbError) {
            console.error('⚠️ 数据库存储失败:', dbError.message);
            // 数据库失败不影响 AI 处理结果的返回
          }
        }
        
        return res.status(200).json({
          success: true,
          message: '豆包 AI 处理成功',
          ai_analysis: aiAnalysis,
          parsed_data: parsedData,
          config_status: {
            database: hasDbUrl && hasDbToken ? 'configured' : 'not_configured',
            ai: 'configured',
            ai_model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828'
          }
        });
        
      } catch (aiError) {
        console.error('❌ AI 处理失败:', aiError);
        return res.status(500).json({
          error: 'AI 处理失败',
          message: aiError.message,
          parsed_data: parsedData,
          config_status: {
            database: hasDbUrl && hasDbToken ? 'configured' : 'not_configured',
            ai: 'error',
            ai_model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828'
          }
        });
      }
    } else {
      return res.status(503).json({ 
        error: 'AI 未配置', 
        details: '请配置 OPENAI_API_KEY',
        parsed_data: parsedData
      });
    }

  } catch (error) {
    console.error('❌ 处理失败:', error);
    res.status(500).json({
      error: '数据处理失败',
      message: error.message
    });
  }
}