import { selectAll, query, initializeTables } from '../lib/turso.js';

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
    // 确保表已初始化（若缺少环境变量，返回 503 而不是崩溃）
    try {
      await initializeTables();
    } catch (e) {
      if (e && e.code === 'MISSING_DB_ENV') {
        return res.status(503).json({ error: '数据库未配置', details: e.message });
      }
      throw e;
    }

    const { from, to } = req.query;
    let whereClause = '';
    let params = [];

    // 处理日期筛选
    if (from && to) {
      whereClause = 'WHERE date >= ? AND date <= ?';
      params = [from, to];
    } else if (from) {
      whereClause = 'WHERE date >= ?';
      params = [from];
    } else if (to) {
      whereClause = 'WHERE date <= ?';
      params = [to];
    }

    // 查询数据
    const records = await selectAll('simple_records', whereClause, params);

    // 统计信息
    const stats = {
      total: records.length,
      date_range: {
        start: records.length > 0 ? records[records.length - 1]?.date : null,
        end: records.length > 0 ? records[0]?.date : null
      },
      mood_distribution: {},
      avg_scores: {}
    };

    // 计算心情分布
    records.forEach(record => {
      const category = record.mood_category || '未知';
      stats.mood_distribution[category] = (stats.mood_distribution[category] || 0) + 1;
    });

    // 计算平均分数
    if (records.length > 0) {
      const scores = records.filter(r => r.mood_score !== null);
      if (scores.length > 0) {
        stats.avg_scores.mood = scores.reduce((sum, r) => sum + (r.mood_score || 0), 0) / scores.length;
      }
    }

    console.log(`✅ 返回 ${records.length} 条记录`);
    res.status(200).json({ 
      records, 
      stats,
      source: 'turso_cloud'
    });

  } catch (error) {
    console.error('❌ 查询 simple_records 失败:', error);
    res.status(500).json({ 
      error: '数据查询失败',
      message: error.message,
      source: 'turso_cloud'
    });
  }
}
