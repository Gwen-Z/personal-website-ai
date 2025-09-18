import { createClient } from '@libsql/client';
import { analyzeStudyData } from '../backend/ai-service.js';

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
      return res.status(400).json({ message: '需要提供学习数据数组' });
    }

    const turso = await getTursoClient();
    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析学习数据
        const aiAnalysis = await analyzeStudyData(description);
        
        // 按日期存在则更新学习相关字段，否则插入
        const existing = await turso.execute({
          sql: 'SELECT id FROM simple_records WHERE date = ? LIMIT 1',
          args: [date]
        });
        
        if (existing.rows && existing.rows.length > 0) {
          await turso.execute({
            sql: `UPDATE simple_records SET 
              study_description = ?, study_duration = ?, study_category = ?
             WHERE id = ?`,
            args: [description, aiAnalysis.study_duration, aiAnalysis.study_category, existing.rows[0][0]]
          });
          results.push({ id: existing.rows[0][0], date, description, ...aiAnalysis, action: 'update' });
        } else {
          await turso.execute({
            sql: `INSERT INTO simple_records (date, study_description, study_duration, study_category) 
             VALUES (?, ?, ?, ?)`,
            args: [date, description, aiAnalysis.study_duration, aiAnalysis.study_category]
          });
          const idResult = await turso.execute('SELECT last_insert_rowid() AS id');
          const id = idResult.rows[0][0];
          results.push({ id, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理学习数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条学习数据`,
      results
    });
  } catch (error) {
    console.error('批量处理学习数据失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '批量处理学习数据失败',
      error: error.message 
    });
  }
}
