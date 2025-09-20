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
      const notebooks = await db.all('SELECT * FROM notebooks ORDER BY created_at DESC');
      
      // 获取每个笔记本的笔记数量
      const notebooksWithCount = [];
      for (let notebook of notebooks) {
        try {
          const countResult = await db.all(
            'SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?',
            [notebook.notebook_id]
          );
          const noteCount = countResult[0]?.count || 0;
          
          notebooksWithCount.push({
            ...notebook,
            note_count: noteCount
          });
        } catch (error) {
          console.error(`查询笔记本 ${notebook.notebook_id} 笔记数量时出错:`, error);
          notebooksWithCount.push({
            ...notebook,
            note_count: 0
          });
        }
      }
      
      res.json({ 
        success: true, 
        notebooks: notebooksWithCount.map(notebook => ({
          notebook_id: notebook.notebook_id,
          name: notebook.name,
          note_count: notebook.note_count || 0,
          created_at: notebook.created_at,
          updated_at: notebook.updated_at
        }))
      });
    } else if (req.method === 'POST') {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, message: 'Notebook name is required' });
      }

      // 生成Turso格式的ID
      const generateTursoId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `A${timestamp}${random}`.toUpperCase();
      };

      const id = generateTursoId();
      
      await db.run(
        'INSERT INTO notebooks (notebook_id, name, note_count) VALUES (?, ?, ?)',
        [id, name, 0]
      );

      res.status(201).json({ 
        success: true, 
        message: 'Notebook created successfully',
        notebook: {
          notebook_id: id,
          name,
          note_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in notebooks API:', error);
    res.status(500).json({ success: false, message: 'Failed to process request', error: error.message });
  }
}
