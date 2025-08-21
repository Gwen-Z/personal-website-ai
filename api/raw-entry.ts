import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 添加 CORS 头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 兼容简单的 rawText 输入：如果传入 { rawText: "测试数据" }
    // 则将其作为 life_text，并自动填充今天日期
    let body = req.body || {};
    if (body && typeof body.rawText === 'string' && !body.date) {
      const today = new Date().toISOString().split('T')[0];
      body = {
        date: today,
        life_text: body.rawText,
      };
    }

    const { 
      date, 
      mood_text = '', 
      life_text = '', 
      study_text = '', 
      work_text = '', 
      inspiration_text = '',
      fitness_text = life_text // 兼容健身数据字段
    } = body;

    if (!date) {
      return res.status(400).json({ message: 'date is required (YYYY-MM-DD format)' });
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // 初始化 Turso 客户端
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    // 创建表（幂等操作）
    await client.execute(`
      CREATE TABLE IF NOT EXISTS simple_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood_description TEXT,
        life_description TEXT,
        study_description TEXT,
        work_description TEXT,
        inspiration_description TEXT,
        fitness_description TEXT,
        mood_emoji TEXT DEFAULT '😐',
        mood_event TEXT DEFAULT '日常心情',
        mood_score REAL DEFAULT 0,
        mood_category TEXT DEFAULT '中性',
        fitness_intensity TEXT,
        fitness_duration TEXT,
        fitness_calories TEXT,
        fitness_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date)
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS raw_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood_text TEXT,
        life_text TEXT,
        study_text TEXT,
        work_text TEXT,
        inspiration_text TEXT,
        fitness_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 生成简单的 AI 摘要（占位，后续可接入真实 AI）
    const generateMoodSummary = (text: string) => {
      if (!text) return { emoji: '😐', event: '无记录', score: 0, category: '中性' };
      
      const positiveWords = ['开心', '快乐', '兴奋', '满意', '愉快', '高兴', '棒', '好'];
      const negativeWords = ['难过', '沮丧', '焦虑', '压力', '累', '烦', '不好', '糟糕'];
      
      const hasPositive = positiveWords.some(word => text.includes(word));
      const hasNegative = negativeWords.some(word => text.includes(word));
      
      if (hasPositive && !hasNegative) {
        return { emoji: '😊', event: '心情不错', score: 2, category: '积极' };
      } else if (hasNegative && !hasPositive) {
        return { emoji: '😔', event: '情绪低落', score: -2, category: '消极' };
      } else {
        return { emoji: '😐', event: '心情平静', score: 0, category: '中性' };
      }
    };

    const generateFitnessSummary = (text: string) => {
      if (!text) return { intensity: '', duration: '', calories: '', type: '' };
      
      const intensity = /高强度|剧烈|intense/i.test(text) ? '高强度' : 
                       /中等|moderate/i.test(text) ? '中等强度' : '轻度运动';
      
      const durationMatch = text.match(/(\d+)\s*分钟/);
      const duration = durationMatch ? `${durationMatch[1]}分钟` : '';
      
      const caloriesMatch = text.match(/(\d+)\s*卡/);
      const calories = caloriesMatch ? `${caloriesMatch[1]}卡` : '';
      
      const type = /跑步|running/i.test(text) ? '跑步' :
                   /游泳|swimming/i.test(text) ? '游泳' :
                   /健身房|gym/i.test(text) ? '力量训练' :
                   /瑜伽|yoga/i.test(text) ? '瑜伽' :
                   /走路|散步|walking/i.test(text) ? '步行' : '运动';
      
      return { intensity, duration, calories, type };
    };

    const moodSummary = generateMoodSummary(mood_text);
    const fitnessSummary = generateFitnessSummary(fitness_text);

    // 插入原始数据（备份）
    await client.execute({
      sql: `INSERT INTO raw_entries (date, mood_text, life_text, study_text, work_text, inspiration_text, fitness_text) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [date, mood_text, life_text, study_text, work_text, inspiration_text, fitness_text],
    });

    // 插入或更新结构化数据
    await client.execute({
      sql: `INSERT OR REPLACE INTO simple_records 
            (date, mood_description, life_description, study_description, work_description, inspiration_description, fitness_description,
             mood_emoji, mood_event, mood_score, mood_category, fitness_intensity, fitness_duration, fitness_calories, fitness_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        date, mood_text, life_text, study_text, work_text, inspiration_text, fitness_text,
        moodSummary.emoji, moodSummary.event, moodSummary.score, moodSummary.category,
        fitnessSummary.intensity, fitnessSummary.duration, fitnessSummary.calories, fitnessSummary.type
      ],
    });

    console.log(`✅ 成功保存数据 - 日期: ${date}`);

    return res.status(201).json({ 
      success: true, 
      message: 'Data saved successfully',
      data: {
        date,
        mood_summary: moodSummary,
        fitness_summary: fitnessSummary
      }
    });

  } catch (error) {
    console.error('❌ 保存数据失败:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to save data', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
