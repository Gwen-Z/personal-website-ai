import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 添加 CORS 头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 初始化 Turso 客户端
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    if (req.method === 'GET') {
      // 获取原始数据列表
      const { from, to } = req.query;
      
      let sql = 'SELECT * FROM raw_entries';
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

      const records = result.rows.map(row => {
        const record: any = {};
        result.columns.forEach((column, index) => {
          record[column] = row[index];
        });
        return record;
      });

      return res.status(200).json(records);

    } else if (req.method === 'PUT') {
      // 更新原始数据 (处理 /api/raw-entries/:id 的PUT请求)
      const url = req.url || '';
      const idMatch = url.match(/\/api\/raw-entries\/(\d+)/);
      
      if (!idMatch) {
        return res.status(400).json({ message: 'Invalid ID in URL' });
      }

      const id = parseInt(idMatch[1]);
      const { date, mood_text, fitness_text, study_text, work_text, inspiration_text } = req.body;

      await client.execute({
        sql: `UPDATE raw_entries 
              SET date = ?, mood_text = ?, fitness_text = ?, study_text = ?, work_text = ?, inspiration_text = ?
              WHERE id = ?`,
        args: [date, mood_text || '', fitness_text || '', study_text || '', work_text || '', inspiration_text || '', id]
      });

      return res.status(200).json({ message: 'Raw entry updated successfully' });

    } else if (req.method === 'DELETE') {
      // 删除原始数据 (处理 /api/raw-entries/:id 的DELETE请求)
      const url = req.url || '';
      const idMatch = url.match(/\/api\/raw-entries\/(\d+)/);
      
      if (!idMatch) {
        return res.status(400).json({ message: 'Invalid ID in URL' });
      }

      const id = parseInt(idMatch[1]);

      await client.execute({
        sql: 'DELETE FROM raw_entries WHERE id = ?',
        args: [id]
      });

      return res.status(200).json({ message: 'Raw entry deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }

  } catch (error) {
    console.error('❌ API错误:', error);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
