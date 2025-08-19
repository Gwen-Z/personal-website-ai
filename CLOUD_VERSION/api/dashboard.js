import { query, selectAll, initializeTables } from '../lib/turso.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 确保表已初始化
    await initializeTables();

    // 获取最近7天的心情趋势数据
    const moodTrendResult = await query(`
      SELECT 
        date,
        mood_score,
        mood_emoji,
        mood_category,
        mood_description
      FROM simple_records 
      WHERE date >= date('now', '-7 days')
      ORDER BY date ASC
    `);

    const moodTrend = moodTrendResult.rows.map(row => ({
      date: row.date,
      score: row.mood_score || 0,
      emoji: row.mood_emoji || '😐',
      category: row.mood_category || '中性',
      description: row.mood_description || '无描述'
    }));

    // 获取最新的一条记录作为概览
    const latestResult = await query(`
      SELECT * FROM simple_records 
      ORDER BY date DESC, created_at DESC 
      LIMIT 1
    `);

    const latest = latestResult.rows.length > 0 ? latestResult.rows[0] : null;

    // 获取统计数据
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        AVG(mood_score) as avg_mood_score,
        MIN(date) as first_record_date,
        MAX(date) as last_record_date
      FROM simple_records
    `);

    const stats = statsResult.rows[0] || {
      total_records: 0,
      avg_mood_score: 0,
      first_record_date: null,
      last_record_date: null
    };

    // 获取心情分布
    const moodDistributionResult = await query(`
      SELECT 
        mood_category,
        COUNT(*) as count
      FROM simple_records 
      WHERE mood_category IS NOT NULL
      GROUP BY mood_category
      ORDER BY count DESC
    `);

    const moodDistribution = moodDistributionResult.rows.reduce((acc, row) => {
      acc[row.mood_category] = row.count;
      return acc;
    }, {});

    // 构建仪表板数据
    const dashboard = {
      moodTrend,
      latest: latest ? {
        date: latest.date,
        mood: {
          description: latest.mood_description,
          emoji: latest.mood_emoji,
          score: latest.mood_score,
          category: latest.mood_category
        },
        life: latest.life_description,
        study: latest.study_description,
        work: latest.work_description,
        inspiration: latest.inspiration_description
      } : null,
      stats: {
        totalRecords: stats.total_records,
        avgMoodScore: Math.round((stats.avg_mood_score || 0) * 100) / 100,
        dateRange: {
          start: stats.first_record_date,
          end: stats.last_record_date
        },
        moodDistribution
      },
      source: 'turso_cloud',
      generated_at: new Date().toISOString()
    };

    console.log(`✅ 仪表板数据生成成功，包含 ${moodTrend.length} 天趋势数据`);
    res.status(200).json(dashboard);

  } catch (error) {
    console.error('❌ 生成仪表板数据失败:', error);
    res.status(500).json({
      error: '仪表板数据获取失败',
      message: error.message,
      source: 'turso_cloud'
    });
  }
}
