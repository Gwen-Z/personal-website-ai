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
    const { from, to, category } = req.query;
    
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

    sql += ' ORDER BY date DESC';

    const result = await client.execute({
      sql,
      args
    });

    let records = result.rows.map(row => {
      const record: any = {};
      result.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return record;
    });

    // 如果指定了类别，只返回该类别的数据
    if (category && ['mood', 'life', 'study', 'work', 'inspiration'].includes(category as string)) {
      const categoryKey = category + '_description';
      records = records.map(record => ({
        id: record.id,
        date: record.date,
        [categoryKey]: record[categoryKey],
        created_at: record.created_at
      }));
    }

    return res.status(200).json(records);

  } catch (error) {
    console.error('❌ 获取数据失败:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch records', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
