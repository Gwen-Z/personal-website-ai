import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    const {
      date,
      mood_description = '',
      mood_emoji = '😐',
      mood_score = 0,
      mood_category = '普通',
      life_description = '',
      fitness_intensity = '',
      fitness_duration = '',
      fitness_calories = '',
      fitness_type = '',
      study_description = '',
      study_duration = '',
      study_category = '',
      work_description = '',
      work_task_type = '',
      work_priority = '',
      work_complexity = '',
      work_estimated_hours = 0,
      inspiration_description = '',
      inspiration_theme = '',
      inspiration_difficulty = '',
      inspiration_product = ''
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: '日期字段是必需的' });
    }

    // 插入数据到 simple_records 表
    const result = await turso.execute({
      sql: `INSERT OR REPLACE INTO simple_records 
            (date, mood_description, mood_emoji, mood_score, mood_category,
             life_description, fitness_intensity, fitness_duration, fitness_calories, fitness_type,
             study_description, study_duration, study_category,
             work_description, work_task_type, work_priority, work_complexity, work_estimated_hours,
             inspiration_description, inspiration_theme, inspiration_difficulty, inspiration_product,
             created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        date,
        mood_description,
        mood_emoji,
        mood_score,
        mood_category,
        life_description,
        fitness_intensity,
        fitness_duration,
        fitness_calories,
        fitness_type,
        study_description,
        study_duration,
        study_category,
        work_description,
        work_task_type,
        work_priority,
        work_complexity,
        work_estimated_hours,
        inspiration_description,
        inspiration_theme,
        inspiration_difficulty,
        inspiration_product
      ]
    });

    console.log(`✅ 成功插入 ${date} 的数据到 simple_records 表`);

    return res.status(200).json({
      success: true,
      message: `成功插入 ${date} 的数据`,
      rowsAffected: result.rowsAffected
    });

  } catch (error) {
    console.error('❌ 插入数据失败:', error);
    return res.status(500).json({
      error: '插入数据失败',
      message: error.message
    });
  }
}
