import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 添加 CORS 头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { from, to, limit = '30' } = req.query;
    
    // 初始化 Turso 客户端
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    let sql = 'SELECT * FROM simple_records';
    const conditions = [];
    const args = [];

    // 添加日期过滤
    if (from) {
      conditions.push('date >= ?');
      args.push(from as string);
    }
    if (to) {
      conditions.push('date <= ?');
      args.push(to as string);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY date ASC LIMIT ?';
    args.push(parseInt(limit as string) || 30);

    const result = await client.execute({
      sql,
      args
    });

    const records = result.rows.map(row => {
      const record: any = {};
      result.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return record;
    });

    // 生成仪表盘数据
    const moodTrend = records.map(r => ({
      date: r.date,
      score: typeof r.mood_score === 'number' ? r.mood_score : 0,
      emoji: r.mood_emoji || '😐',
      event: r.mood_event || ''
    }));

    // 生活/健身数据
    const lifeFitness = records.map(r => ({
      date: r.date,
      intensity: r.fitness_intensity || '',
      duration: r.fitness_duration || '',
      calories: r.fitness_calories || '',
      type: r.fitness_type || ''
    }));

    // 学习数据
    const study = records.map(r => ({
      date: r.date,
      description: r.study_description || '',
      duration: '', // 可以从描述中提取
      category: '' // 可以从描述中提取
    }));

    // 工作数据
    const work = records.map(r => ({
      date: r.date,
      description: r.work_description || '',
      task_type: '',
      priority: ''
    }));

    // 灵感数据
    const inspiration = records.map(r => ({
      date: r.date,
      description: r.inspiration_description || '',
      theme: '',
      difficulty: ''
    }));

    // 最新一条记录
    const latest = records.length ? records[records.length - 1] : null;

    return res.status(200).json({
      moodTrend,
      lifeFitness,
      study,
      work,
      inspiration,
      latest,
      themesAgg: [],
      actionsAgg: []
    });

  } catch (error) {
    console.error('❌ 获取仪表盘数据失败:', error);
    return res.status(500).json({ 
      message: 'Failed to build dashboard data', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
