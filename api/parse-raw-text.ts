import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

// 解析原始文本的函数
function parseRawText(rawText: string) {
  const result = {
    mood_text: '',
    fitness_text: '',
    study_text: '',
    work_text: '',
    inspiration_text: ''
  };

  if (!rawText) return result;

  // 按行分割并解析
  const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // 心情相关关键词
    if (lowerLine.includes('心情') || lowerLine.includes('情绪') || lowerLine.includes('感觉') || 
        lowerLine.includes('mood') || lowerLine.includes('开心') || lowerLine.includes('难过') ||
        lowerLine.includes('高兴') || lowerLine.includes('郁闷') || lowerLine.includes('烦躁')) {
      result.mood_text = line;
    }
    // 健身/运动相关关键词
    else if (lowerLine.includes('健身') || lowerLine.includes('运动') || lowerLine.includes('跑步') ||
             lowerLine.includes('游泳') || lowerLine.includes('瑜伽') || lowerLine.includes('锻炼') ||
             lowerLine.includes('fitness') || lowerLine.includes('gym') || lowerLine.includes('卡路里') ||
             lowerLine.includes('消耗') || lowerLine.includes('力量') || lowerLine.includes('有氧')) {
      result.fitness_text = line;
    }
    // 学习相关关键词
    else if (lowerLine.includes('学习') || lowerLine.includes('学会') || lowerLine.includes('课程') ||
             lowerLine.includes('阅读') || lowerLine.includes('书') || lowerLine.includes('study') ||
             lowerLine.includes('learn') || lowerLine.includes('编程') || lowerLine.includes('代码') ||
             lowerLine.includes('技术') || lowerLine.includes('知识')) {
      result.study_text = line;
    }
    // 工作相关关键词
    else if (lowerLine.includes('工作') || lowerLine.includes('项目') || lowerLine.includes('任务') ||
             lowerLine.includes('开发') || lowerLine.includes('work') || lowerLine.includes('job') ||
             lowerLine.includes('会议') || lowerLine.includes('同事') || lowerLine.includes('客户') ||
             lowerLine.includes('需求') || lowerLine.includes('bug') || lowerLine.includes('测试')) {
      result.work_text = line;
    }
    // 灵感相关关键词
    else if (lowerLine.includes('灵感') || lowerLine.includes('想法') || lowerLine.includes('创意') ||
             lowerLine.includes('点子') || lowerLine.includes('idea') || lowerLine.includes('产品') ||
             lowerLine.includes('设计') || lowerLine.includes('方案') || lowerLine.includes('创新') ||
             lowerLine.includes('思路')) {
      result.inspiration_text = line;
    }
    // 如果没有明确分类，默认归为心情
    else if (!result.mood_text) {
      result.mood_text = line;
    }
  }

  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 添加 CORS 头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { raw_text } = req.body;

    if (!raw_text || typeof raw_text !== 'string') {
      return res.status(400).json({ message: '原始文本不能为空' });
    }

    console.log('📥 收到原始数据:', raw_text);

    // 解析原始文本
    const parsedData = parseRawText(raw_text);
    
    // 提取日期信息，如果包含日期则使用，否则使用今天
    const dateMatch = raw_text.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    // 初始化 Turso 客户端
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    // 存储到 raw_entries 表
    await client.execute({
      sql: `INSERT INTO raw_entries 
            (date, mood_text, fitness_text, study_text, work_text, inspiration_text, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        date,
        parsedData.mood_text || '',
        parsedData.fitness_text || '',
        parsedData.study_text || '',
        parsedData.work_text || '',
        parsedData.inspiration_text || ''
      ]
    });

    console.log('✅ 原始数据已存储');

    return res.status(200).json({
      success: true,
      message: '原始数据解析并存储成功',
      data: {
        date,
        ...parsedData
      }
    });

  } catch (error) {
    console.error('❌ 解析原始文本失败:', error);
    return res.status(500).json({
      message: '解析原始文本失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
