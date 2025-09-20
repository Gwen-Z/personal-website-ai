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
      const { notebook_id, id } = req.query;
      
      // 如果提供了id参数，返回单条笔记
      if (id) {
        const note = await db.get('SELECT * FROM notes WHERE note_id = ?', [id]);
        if (!note) {
          return res.status(404).json({ success: false, message: 'Note not found' });
        }
        
        // 获取笔记本信息
        const notebook = await db.get('SELECT * FROM notebooks WHERE notebook_id = ?', [note.notebook_id]);
        
        return res.json({
          success: true,
          note: {
            id: note.note_id,
            note_id: note.note_id,
            notebook_id: note.notebook_id,
            title: note.title,
            image_url: note.image_url,
            duration_minutes: note.duration_minutes,
            created_at: note.created_at,
            status: note.status || 'success'
          },
          notebook: notebook ? {
            notebook_id: notebook.notebook_id,
            name: notebook.name,
            note_count: notebook.note_count || 0,
            created_at: notebook.created_at,
            updated_at: notebook.updated_at
          } : null
        });
      }
      
      // 如果没有提供id，则按原来的逻辑处理notebook_id
      if (!notebook_id) {
        return res.status(400).json({ success: false, message: 'notebook_id or id is required' });
      }

      // 获取笔记本信息
      const notebook = await db.get('SELECT * FROM notebooks WHERE notebook_id = ?', [notebook_id]);
      if (!notebook) {
        return res.status(404).json({ success: false, message: 'Notebook not found' });
      }

      // 先检查笔记数量，避免查询过多数据
      let noteCount = 0;
      let notes = [];
      
      try {
        const countResult = await Promise.race([
          db.get('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', [notebook_id]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Count query timeout')), 5000))
        ]);
        noteCount = countResult.count || 0;

        if (noteCount > 0 && noteCount < 1000) {
          // 如果笔记数量合理，查询具体笔记
          notes = await Promise.race([
            db.all('SELECT note_id, notebook_id, title, created_at FROM notes WHERE notebook_id = ? ORDER BY created_at DESC LIMIT 50', [notebook_id]),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Notes query timeout')), 30000))
          ]);
        } else if (noteCount >= 1000) {
          console.log('⚠️ 笔记数量过多，跳过查询以避免超时');
        }
      } catch (error) {
        console.error('❌ 查询笔记时出错:', error.message);
        // 即使查询失败，也返回空结果而不是完全失败
        noteCount = 0;
        notes = [];
      }
      
      res.json({ 
        success: true, 
        notebook: {
          notebook_id: notebook.notebook_id,
          name: notebook.name,
          note_count: noteCount,
          created_at: notebook.created_at,
          updated_at: notebook.updated_at
        },
        notes: notes.map(note => ({
          id: note.note_id,
          note_id: note.note_id,
          notebook_id: note.notebook_id,
          title: note.title,
          content_text: note.content_text || note.content || '',
          image_url: note.image_url,
          images: note.images ? (typeof note.images === 'string' ? JSON.parse(note.images) : note.images) : [],
          image_urls: note.image_urls,
          source_url: note.source_url || '',
          original_url: note.original_url || '',
          author: note.author || '',
          upload_time: note.upload_time || '',
          duration_minutes: note.duration_minutes,
          created_at: note.created_at,
          updated_at: note.updated_at,
          status: 'success'
        }))
      });
    } else if (req.method === 'POST') {
      const { 
        notebook_id, 
        title, 
        content_text, 
        images, 
        source_url, 
        original_url, 
        author, 
        upload_time 
      } = req.body;
      
      if (!notebook_id || !title) {
        return res.status(400).json({ success: false, message: 'Notebook id and title are required' });
      }

      // 生成Turso格式的ID
      const generateTursoId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `N${timestamp}${random}`.toUpperCase();
      };

      const noteId = generateTursoId();
      
      await db.run(
        'INSERT INTO notes (note_id, notebook_id, title, content_text, images, source_url, original_url, author, upload_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          noteId, 
          notebook_id, 
          title, 
          content_text || '', 
          images ? JSON.stringify(images) : null,
          source_url || null,
          original_url || null,
          author || null,
          upload_time || null,
          new Date().toISOString(), 
          new Date().toISOString()
        ]
      );

      // 更新笔记本的笔记数量
      await db.run('UPDATE notebooks SET note_count = note_count + 1, updated_at = ? WHERE notebook_id = ?', [new Date().toISOString(), notebook_id]);

      res.status(201).json({ 
        success: true, 
        message: 'Note created successfully',
        note: {
          note_id: noteId,
          notebook_id,
          title,
          content_text: content_text || '',
          images: images || [],
          source_url: source_url || '',
          original_url: original_url || '',
          author: author || '',
          upload_time: upload_time || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in notes API:', error);
    res.status(500).json({ success: false, message: 'Failed to process request', error: error.message });
  }
}
