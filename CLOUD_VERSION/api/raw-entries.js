import { query } from '../lib/turso.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, to } = req.query;
    
    let sql = `
      SELECT 
        id,
        date,
        mood_text,
        fitness_text,
        study_text,
        work_text,
        inspiration_text,
        created_at
      FROM raw_entries 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (from) {
      sql += ` AND date >= ?`;
      params.push(from);
    }
    
    if (to) {
      sql += ` AND date <= ?`;
      params.push(to);
    }
    
    sql += ` ORDER BY date DESC, created_at DESC`;
    
    console.log('执行查询:', sql, '参数:', params);
    const rows = await query(sql, params);
    
    console.log(`✅ 查询成功，返回 ${rows.length} 条原始数据记录`);
    
    return res.status(200).json(rows);
    
  } catch (error) {
    console.error('获取原始数据失败:', error);
    return res.status(500).json({
      error: '数据查询失败',
      message: error.message,
      source: 'turso_cloud'
    });
  }
}
