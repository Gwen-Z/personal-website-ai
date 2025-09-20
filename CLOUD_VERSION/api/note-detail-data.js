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
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing id parameter' });
      }

      // 获取笔记详情
      const note = await db.get('SELECT * FROM notes WHERE note_id = ?', [id]);
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // 获取笔记本信息
      const notebook = await db.get('SELECT * FROM notebooks WHERE notebook_id = ?', [note.notebook_id]);

      // 处理笔记数据
      let parsedImages = [];
      if (note.images) {
        try {
          // 尝试解析JSON格式的images
          if (typeof note.images === 'string') {
            parsedImages = JSON.parse(note.images);
          } else if (Array.isArray(note.images)) {
            parsedImages = note.images;
          }
        } catch (e) {
          console.error('解析图片数据失败:', e);
          parsedImages = [];
        }
      }

      const enrichedNote = {
        ...note,
        content_text: note.content_text || note.content || '',
        images: parsedImages,
        image_urls: note.image_urls || null,
        source_url: note.source_url || '',
        core_points: note.core_points || '',
        keywords: note.keywords || '',
        knowledge_extension: note.knowledge_extension || '',
        learning_path: note.learning_path || '',
        ai_chat_summary: note.ai_chat_summary || ''
      };
      
      res.json({
        success: true,
        note: enrichedNote,
        notebook: notebook
      });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('获取笔记详情失败:', error);
    res.status(500).json({ error: '获取笔记详情失败', details: error.message });
  }
}