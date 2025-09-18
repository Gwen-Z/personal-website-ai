import { createClient } from '@libsql/client';
import { analyzeWorkData } from '../backend/ai-service.js';

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
      return res.status(400).json({ message: '需要提供工作数据数组' });
    }

    const turso = await getTursoClient();
    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析工作数据
        const aiAnalysis = await analyzeWorkData(description);
        
        // 按日期存在则更新工作相关字段，否则插入
        const existing = await turso.execute({
          sql: 'SELECT id FROM simple_records WHERE date = ? LIMIT 1',
          args: [date]
        });
        
        if (existing.rows && existing.rows.length > 0) {
          await turso.execute({
            sql: `UPDATE simple_records SET 
              work_description = ?, work_ai_summary = ?, work_summary = ?, work_task_type = ?, work_priority = ?, work_complexity = ?, work_estimated_hours = ?
             WHERE id = ?`,
            args: [description, aiAnalysis.work_ai_summary, aiAnalysis.work_summary, aiAnalysis.work_task_type, aiAnalysis.work_priority, aiAnalysis.work_complexity, aiAnalysis.work_estimated_hours, existing.rows[0][0]]
          });
          results.push({ id: existing.rows[0][0], date, description, ...aiAnalysis, action: 'update' });
        } else {
          await turso.execute({
            sql: `INSERT INTO simple_records (date, work_description, work_ai_summary, work_summary, work_task_type, work_priority, work_complexity, work_estimated_hours) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [date, description, aiAnalysis.work_ai_summary, aiAnalysis.work_summary, aiAnalysis.work_task_type, aiAnalysis.work_priority, aiAnalysis.work_complexity, aiAnalysis.work_estimated_hours]
          });
          const idResult = await turso.execute('SELECT last_insert_rowid() AS id');
          const id = idResult.rows[0][0];
          results.push({ id, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理工作数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条工作数据`,
      results
    });
  } catch (error) {
    console.error('批量处理工作数据失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '批量处理工作数据失败',
      error: error.message 
    });
  }
}
