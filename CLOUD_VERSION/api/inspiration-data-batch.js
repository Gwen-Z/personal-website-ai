import { createClient } from '@libsql/client';
import { analyzeInspirationData } from '../backend/ai-service.js';

async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('Missing Turso environment variables');
  return createClient({ url, authToken });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: '需要提供灵感数据数组' });
    }

    const turso = await getTursoClient();
    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析灵感数据
        const aiAnalysis = await analyzeInspirationData(description);
        
        // 按日期存在则更新灵感相关字段，否则插入
        const existing = await turso.execute({
          sql: 'SELECT id FROM simple_records WHERE date = ? LIMIT 1',
          args: [date]
        });
        
        if (existing.rows && existing.rows.length > 0) {
          await turso.execute({
            sql: `UPDATE simple_records SET 
              inspiration_description = ?, inspiration_theme = ?, inspiration_product = ?, inspiration_difficulty = ?, inspiration_progress = ?
             WHERE id = ?`,
            args: [description, aiAnalysis.inspiration_theme, aiAnalysis.inspiration_product, aiAnalysis.inspiration_difficulty, aiAnalysis.inspiration_progress, existing.rows[0][0]]
          });
          results.push({ id: existing.rows[0][0], date, description, ...aiAnalysis, action: 'update' });
        } else {
          await turso.execute({
            sql: `INSERT INTO simple_records (date, inspiration_description, inspiration_theme, inspiration_product, inspiration_difficulty, inspiration_progress) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            args: [date, description, aiAnalysis.inspiration_theme, aiAnalysis.inspiration_product, aiAnalysis.inspiration_difficulty, aiAnalysis.inspiration_progress]
          });
          const idResult = await turso.execute('SELECT last_insert_rowid() AS id');
          const id = idResult.rows[0][0];
          results.push({ id, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理灵感数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条灵感数据`,
      results
    });
  } catch (error) {
    console.error('批量处理灵感数据失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '批量处理灵感数据失败',
      error: error.message 
    });
  }
}
