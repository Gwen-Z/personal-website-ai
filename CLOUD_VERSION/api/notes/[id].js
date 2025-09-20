import { initDB } from '../../backend/db.js';

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

    const { id } = req.query;

    if (req.method === 'PUT') {
      const { 
        title, 
        content, 
        content_text, 
        source, 
        original_url, 
        author, 
        upload_time,
        image_urls,
        images
      } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'Note id is required' });
      }

      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
      }
      if (content_text !== undefined) {
        updateFields.push('content_text = ?');
        updateValues.push(content_text);
      }
      if (source !== undefined) {
        updateFields.push('source = ?');
        updateValues.push(source);
      }
      if (original_url !== undefined) {
        updateFields.push('original_url = ?');
        updateValues.push(original_url);
      }
      if (author !== undefined) {
        updateFields.push('author = ?');
        updateValues.push(author);
      }
      if (upload_time !== undefined) {
        updateFields.push('upload_time = ?');
        updateValues.push(upload_time);
      }
      if (image_urls !== undefined) {
        updateFields.push('image_urls = ?');
        updateValues.push(image_urls);
      }
      if (images !== undefined) {
        updateFields.push('images = ?');
        updateValues.push(images);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }
      
      // 添加更新时间
      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());
      
      // 添加WHERE条件的id
      updateValues.push(id);
      
      const sql = `UPDATE notes SET ${updateFields.join(', ')} WHERE note_id = ?`;
      await db.run(sql, updateValues);

      res.json({ 
        success: true, 
        message: 'Note updated successfully'
      });
    } else if (req.method === 'DELETE') {
      if (!id) {
        return res.status(400).json({ success: false, message: 'Note id is required' });
      }

      // 获取笔记的笔记本ID
      const note = await db.get('SELECT notebook_id FROM notes WHERE note_id = ?', [id]);
      if (!note) {
        return res.status(404).json({ success: false, message: 'Note not found' });
      }

      // 删除笔记
      await db.run('DELETE FROM notes WHERE note_id = ?', [id]);

      // 更新笔记本的笔记数量
      await db.run('UPDATE notebooks SET note_count = note_count - 1, updated_at = ? WHERE notebook_id = ?', [new Date().toISOString(), note.notebook_id]);

      res.json({ 
        success: true, 
        message: 'Note deleted successfully'
      });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in notes/[id] API:', error);
    res.status(500).json({ success: false, message: 'Failed to process request', error: error.message });
  }
}
