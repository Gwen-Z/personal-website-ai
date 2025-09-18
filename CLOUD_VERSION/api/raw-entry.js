import { createClient } from '@libsql/client';

async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('Missing Turso environment variables');
  return createClient({ url, authToken });
}

// 生成Turso格式的ID
function generateTursoId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `A${timestamp}${random}`.toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { date, description, category, duration, intensity, mood, notes } = req.body;
    
    if (!date || !description) {
      return res.status(400).json({ success: false, error: '日期和描述不能为空' });
    }

    const turso = await getTursoClient();
    const entryId = generateTursoId();

    // 插入原始数据条目
    await turso.execute({
      sql: `INSERT INTO raw_entries (id, date, description, category, duration, intensity, mood, notes, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entryId,
        date,
        description,
        category || null,
        duration || null,
        intensity || null,
        mood || null,
        notes || null,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    });

    res.status(201).json({ 
      success: true, 
      message: '数据上传成功',
      entry: {
        id: entryId,
        date,
        description,
        category,
        duration,
        intensity,
        mood,
        notes
      }
    });
  } catch (error) {
    console.error('上传原始数据失败:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      success: false, 
      error: '上传数据失败',
      details: error.message,
      code: error.code
    });
  }
}
