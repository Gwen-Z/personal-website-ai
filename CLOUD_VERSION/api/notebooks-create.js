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
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '笔记本名称不能为空' });
    }

    const turso = await getTursoClient();
    const notebookId = generateTursoId();

    // 插入新笔记本
    await turso.execute({
      sql: 'INSERT INTO notebooks (id, name, note_count) VALUES (?, ?, ?)',
      args: [notebookId, name.trim(), 0]
    });

    res.status(201).json({ 
      success: true, 
      message: '笔记本创建成功',
      notebook: {
        id: notebookId,
        name: name.trim(),
        note_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('创建笔记本失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '创建笔记本失败',
      details: error.message 
    });
  }
}
