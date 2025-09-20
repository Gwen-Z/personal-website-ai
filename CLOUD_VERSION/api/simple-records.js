import { initDB } from '../backend/db.js';

let db;

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!db) {
      db = await initDB();
    }

    if (req.method === 'GET') {
      const { from, to, category } = req.query;
      const filters = [];
      const params = [];
      
      if (from) { filters.push('date >= ?'); params.push(from); }
      if (to) { filters.push('date <= ?'); params.push(to); }
      
      const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
      const orderBy = 'ORDER BY date DESC';
      
      const records = await db.all(`SELECT * FROM simple_records ${whereClause} ${orderBy}`, params);
      
      // 如果指定了类别，只返回该类别的数据
      if (category && ['mood', 'life', 'study', 'work', 'inspiration'].includes(category)) {
        const categoryKey = category + '_description';
        const filteredRecords = records.map(record => ({
          id: record.id,
          date: record.date,
          [categoryKey]: record[categoryKey],
          created_at: record.created_at
        }));
        res.json({ records: filteredRecords });
      } else {
        res.json({ records: records });
      }
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in simple-records API:', error);
    res.status(500).json({ message: 'Failed to fetch records', error: error.message });
  }
}
