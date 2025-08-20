import { createClient } from '@libsql/client';

// 简化的批处理 - 直接调用豆包 API

export default async function handler(req, res) {
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
    const { limit = 2 } = req.body || {};

    // 检查环境变量
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      return res.status(503).json({
        error: '数据库未配置',
        details: '请配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN'
      });
    }

    // 初始化数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    console.log('🚀 开始豆包批处理...');

    // 创建处理结果表
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_processed_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_entry_id INTEGER,
        date TEXT NOT NULL,
        mood_score INTEGER,
        mood_emoji TEXT,
        mood_description TEXT,
        life_score INTEGER,
        study_score INTEGER,
        work_score INTEGER,
        inspiration_score INTEGER,
        summary TEXT,
        ai_model TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(raw_entry_id)
      )
    `);

    // 获取未处理的数据
    const rawDataResult = await turso.execute({
      sql: `
        SELECT r.* FROM raw_entries r
        LEFT JOIN ai_processed_data a ON r.id = a.raw_entry_id
        WHERE a.id IS NULL
        ORDER BY r.date DESC
        LIMIT ?
      `,
      args: [limit]
    });

    const rawDataList = rawDataResult.rows.map(row => {
      const record = {};
      rawDataResult.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return record;
    });

    if (rawDataList.length === 0) {
      return res.status(200).json({
        success: true,
        message: '没有需要处理的数据',
        processed: 0
      });
    }

    console.log(`📊 找到 ${rawDataList.length} 条待处理数据`);

    const results = [];
    let successCount = 0;

    // 逐条处理
    for (const rawEntry of rawDataList) {
      try {
        console.log(`🔄 处理 ID ${rawEntry.id}`);

        // 准备 AI 请求
        const prompt = `仅输出严格 JSON（无多余文本/代码块）：
{
  "date": "YYYY-MM-DD",
  "mood": 整数0-5,
  "mood_emoji": "单个emoji",
  "mood_description": "≤20字",
  "life": 0-5,
  "study": 0-5,
  "work": 0-5,
  "inspiration": 0-5,
  "summary": "≤60字"
}

评分：0=无内容, 1=很差, 2=一般, 3=还行, 4=不错, 5=很好
缺失信息置 0 或空字符串，禁止编造；保持中文。

数据:
日期: ${rawEntry.date}
心情: ${rawEntry.mood_text || '无'}
生活: ${rawEntry.fitness_text || rawEntry.life_text || '无'}
学习: ${rawEntry.study_text || '无'}
工作: ${rawEntry.work_text || '无'}
灵感: ${rawEntry.inspiration_text || '无'}

输出:`;

        // 直接调用豆包 API
        const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`豆包 API 错误 ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error('AI 响应为空');
        }

        // 解析 JSON
        const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
        const aiResult = JSON.parse(cleanContent);

        // 存储结果
        await turso.execute({
          sql: `INSERT OR REPLACE INTO ai_processed_data 
                (raw_entry_id, date, mood_score, mood_emoji, mood_description, 
                 life_score, study_score, work_score, inspiration_score, 
                 summary, ai_model) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            rawEntry.id,
            aiResult.date,
            aiResult.mood || 0,
            aiResult.mood_emoji || '😐',
            aiResult.mood_description || '',
            aiResult.life || 0,
            aiResult.study || 0,
            aiResult.work || 0,
            aiResult.inspiration || 0,
            aiResult.summary || '',
            process.env.OPENAI_MODEL || 'doubao-lite-32k-240828'
          ]
        });

        results.push({
          id: rawEntry.id,
          date: rawEntry.date,
          status: 'success',
          ai_result: aiResult
        });

        successCount++;
        console.log(`✅ 成功处理 ID ${rawEntry.id}`);

      } catch (error) {
        console.error(`❌ 处理 ID ${rawEntry.id} 失败:`, error.message);
        
        results.push({
          id: rawEntry.id,
          date: rawEntry.date,
          status: 'error',
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: '豆包批处理完成',
      processed: successCount,
      total: rawDataList.length,
      results: results,
      model: process.env.OPENAI_MODEL
    });

  } catch (error) {
    console.error('❌ 批处理失败:', error);
    return res.status(500).json({
      error: '批处理失败',
      message: error.message
    });
  }
}
