const { initializeTables, query, insert, selectAll, update, turso } = require('../lib/turso-cjs.js');
const getTursoClient = turso;

// 初始化数据库
let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return;
  
  try {
    await initializeTables();
    dbInitialized = true;
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 处理CORS
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// 处理OPTIONS请求
function handleOptions(res) {
  setCorsHeaders(res);
  res.status(200).end();
}

// 错误处理
function handleError(res, error, message = '服务器错误') {
  console.error(message, error);
  setCorsHeaders(res);
  res.status(500).json({ 
    error: 'SERVER_ERROR', 
    message: message,
    details: error.message 
  });
}

// 成功响应
function sendSuccess(res, data, message = '操作成功') {
  setCorsHeaders(res);
  res.status(200).json({ 
    success: true, 
    message, 
    data 
  });
}

module.exports = async (req, res) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    // 初始化数据库
    await initializeDatabase();

    const { method, url } = req;
    const path = url.split('?')[0];

    // 路由处理
    if (path === '/api/simple-records' && method === 'GET') {
      // 获取处理后的数据记录
      const { startDate, endDate } = req.query;
      
      let sql = `
        SELECT 
          id,
          date,
          mood_score,
          mood_emoji,
          mood_description,
          exercise_type,
          exercise_duration,
          exercise_calories,
          study_category,
          study_duration,
          work_tasks,
          work_priority,
          inspiration_content,
          inspiration_theme,
          inspiration_difficulty,
          created_at,
          updated_at
        FROM simple_records 
        WHERE 1=1
      `;
      
      const params = [];
      
      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }
      
      sql += ' ORDER BY date DESC';
      
      const records = await query(sql, params);
      
      return sendSuccess(res, records, '数据记录获取成功');

    } else if (path === '/api/raw-entry' && method === 'POST') {
      // 原始数据录入
      const { content, date } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'CONTENT_REQUIRED', message: '内容不能为空' });
      }
      
      const insertDate = date || new Date().toISOString().split('T')[0];
      
      const result = await insert('raw_entries', {
        content,
        date: insertDate,
        created_at: new Date().toISOString()
      });
      
      return sendSuccess(res, { id: result.lastInsertRowid }, '原始数据录入成功');

    } else if (path === '/api/batch-process' && method === 'POST') {
      // AI批处理
      const { startDate, endDate } = req.body;
      
      let sql = 'SELECT * FROM raw_entries WHERE 1=1';
      const params = [];
      
      if (startDate) {
        sql += ' AND date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        sql += ' AND date <= ?';
        params.push(endDate);
      }
      
      sql += ' ORDER BY date ASC';
      
      const rawEntries = await query(sql, params);
      
      if (rawEntries.length === 0) {
        return sendSuccess(res, [], '没有找到需要处理的数据');
      }
      
      // 这里可以添加AI处理逻辑
      const processedData = rawEntries.map(entry => ({
        date: entry.date,
        content: entry.content,
        processed: true
      }));
      
      return sendSuccess(res, processedData, '批处理完成');

    } else if (path === '/api/insert-simple-record' && method === 'POST') {
      // 直接插入处理数据
      const recordData = req.body;
      
      const result = await insert('simple_records', {
        ...recordData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return sendSuccess(res, { id: result.lastInsertRowid }, '记录插入成功');

    } else if (path === '/api/ai-analysis' && method === 'POST') {
      // AI分析服务
      const { content, type } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'CONTENT_REQUIRED', message: '内容不能为空' });
      }
      
      // 这里可以添加AI分析逻辑
      const analysis = {
        type: type || 'general',
        content: content,
        analysis: 'AI分析结果（示例）',
        timestamp: new Date().toISOString()
      };
      
      return sendSuccess(res, analysis, 'AI分析完成');

    } else if (path === '/api/ai-chat' && method === 'POST') {
      // AI对话功能
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'MESSAGE_REQUIRED', message: '消息不能为空' });
      }
      
      // 这里可以添加AI对话逻辑
      const response = {
        message: message,
        reply: 'AI回复（示例）',
        timestamp: new Date().toISOString()
      };
      
      return sendSuccess(res, response, 'AI对话完成');

    } else if (path === '/api/dashboard' && method === 'GET') {
      // 仪表板数据
      const { startDate, endDate } = req.query;
      
      // 获取统计数据
      const stats = await query(`
        SELECT 
          COUNT(*) as total_records,
          AVG(mood_score) as avg_mood,
          SUM(exercise_duration) as total_exercise,
          SUM(study_duration) as total_study
        FROM simple_records 
        WHERE date BETWEEN ? AND ?
      `, [startDate || '2025-01-01', endDate || '2025-12-31']);
      
      return sendSuccess(res, stats[0] || {}, '仪表板数据获取成功');

    } else if (path === '/api/notebooks' && method === 'GET') {
      // 获取笔记本列表
      const notebooks = await query('SELECT * FROM notebooks ORDER BY created_at DESC');
      
      // 获取每个笔记本的笔记数量
      const notebooksWithCount = [];
      for (let notebook of notebooks) {
        const countResult = await query('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', [notebook.notebook_id]);
        const noteCount = countResult[0]?.count || 0;
        
        notebooksWithCount.push({
          notebook_id: notebook.notebook_id,
          name: notebook.name,
          description: notebook.description,
          note_count: noteCount,
          component_config: notebook.component_config ? JSON.parse(notebook.component_config) : null,
          created_at: notebook.created_at,
          updated_at: notebook.updated_at
        });
      }
      
      return sendSuccess(res, notebooksWithCount, '笔记本列表获取成功');

    } else if (path === '/api/notebooks' && method === 'POST') {
      // 创建笔记本
      const { name, description, component_config } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'NAME_REQUIRED', message: '笔记本名称不能为空' });
      }
      
      const result = await insert('notebooks', {
        name,
        description: description || '',
        component_config: component_config ? JSON.stringify(component_config) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return sendSuccess(res, { id: result.lastInsertRowid }, '笔记本创建成功');

    } else if (path === '/api/notes' && method === 'GET') {
      // 获取笔记列表
      const { notebook_id, id } = req.query;
      
      if (id) {
        // 获取单个笔记
        const noteId = parseInt(id, 10);
        if (isNaN(noteId) || noteId <= 0) {
          return res.status(400).json({ error: 'INVALID_ID', message: '无效的笔记ID' });
        }
        
        const notes = await query('SELECT * FROM notes WHERE note_id = ?', [noteId]);
        if (notes.length === 0) {
          return res.status(404).json({ error: 'NOTE_NOT_FOUND', message: '笔记不存在' });
        }
        
        const note = notes[0];
        const notebooks = await query('SELECT * FROM notebooks WHERE notebook_id = ?', [note.notebook_id]);
        const notebook = notebooks[0] || null;
        
        return sendSuccess(res, {
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
            description: notebook.description,
            component_config: notebook.component_config ? JSON.parse(notebook.component_config) : null,
            created_at: notebook.created_at,
            updated_at: notebook.updated_at
          } : null
        }, '笔记获取成功');
      }
      
      if (!notebook_id) {
        return res.status(400).json({ error: 'NOTEBOOK_ID_REQUIRED', message: '需要提供notebook_id或id参数' });
      }
      
      // 获取笔记本信息
      const notebooks = await query('SELECT * FROM notebooks WHERE notebook_id = ?', [notebook_id]);
      if (notebooks.length === 0) {
        return res.status(404).json({ error: 'NOTEBOOK_NOT_FOUND', message: '笔记本不存在' });
      }
      
      const notebook = notebooks[0];
      
      // 获取笔记列表
      const notes = await query('SELECT * FROM notes WHERE notebook_id = ? ORDER BY created_at DESC', [notebook_id]);
      
      return sendSuccess(res, {
        notes: notes.map(note => ({
          id: note.note_id,
          note_id: note.note_id,
          notebook_id: note.notebook_id,
          title: note.title,
          image_url: note.image_url,
          duration_minutes: note.duration_minutes,
          created_at: note.created_at,
          status: note.status || 'success'
        })),
        notebook: {
          notebook_id: notebook.notebook_id,
          name: notebook.name,
          description: notebook.description,
          note_count: notes.length,
          component_config: notebook.component_config ? JSON.parse(notebook.component_config) : null,
          created_at: notebook.created_at,
          updated_at: notebook.updated_at
        }
      }, '笔记列表获取成功');

    } else if (path === '/api/notes' && method === 'POST') {
      // 创建笔记
      const { 
        notebook_id, 
        title, 
        content_text, 
        images, 
        source_url, 
        original_url, 
        author, 
        upload_time,
        component_data,
        selected_analysis_components,
        component_instances
      } = req.body;
      
      if (!notebook_id || !title) {
        return res.status(400).json({ error: 'REQUIRED_FIELDS', message: '笔记本ID和标题不能为空' });
      }
      
      // 检查笔记本是否存在
      const notebooks = await query('SELECT * FROM notebooks WHERE notebook_id = ?', [notebook_id]);
      if (notebooks.length === 0) {
        return res.status(404).json({ error: 'NOTEBOOK_NOT_FOUND', message: '笔记本不存在' });
      }
      
      // 生成笔记ID
      const maxIdResult = await query('SELECT MAX(note_id) as max_id FROM notes');
      const maxId = maxIdResult[0]?.max_id || 1000;
      const noteId = maxId + 1;
      
      const result = await insert('notes', {
        note_id: noteId,
        notebook_id,
        title,
        content_text: content_text || '',
        images: images ? JSON.stringify(images) : null,
        source_url: source_url || null,
        original_url: original_url || null,
        author: author || null,
        upload_time: upload_time || new Date().toISOString(),
        component_data: component_data ? JSON.stringify(component_data) : null,
        selected_analysis_components: selected_analysis_components ? JSON.stringify(selected_analysis_components) : null,
        component_instances: component_instances ? JSON.stringify(component_instances) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return sendSuccess(res, { id: noteId }, '笔记创建成功');

    } else if (path === '/api/notes' && method === 'PUT') {
      // 更新笔记
      const { id, title, content_text, images, component_data, component_instances } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID_REQUIRED', message: '笔记ID不能为空' });
      }
      
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (title !== undefined) updateData.title = title;
      if (content_text !== undefined) updateData.content_text = content_text;
      if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null;
      if (component_data !== undefined) updateData.component_data = component_data ? JSON.stringify(component_data) : null;
      if (component_instances !== undefined) updateData.component_instances = component_instances ? JSON.stringify(component_instances) : null;
      
      const result = await update('notes', updateData, { note_id: id });
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'NOTE_NOT_FOUND', message: '笔记不存在' });
      }
      
      return sendSuccess(res, { id }, '笔记更新成功');

    } else if (path === '/api/notes' && method === 'DELETE') {
      // 删除笔记
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'ID_REQUIRED', message: '笔记ID不能为空' });
      }
      
      const result = await query('DELETE FROM notes WHERE note_id = ?', [id]);
      
      return sendSuccess(res, { id }, '笔记删除成功');

    } else {
      // 404 - 未找到路由
      setCorsHeaders(res);
      return res.status(404).json({ 
        error: 'NOT_FOUND', 
        message: 'API端点不存在' 
      });
    }

  } catch (error) {
    return handleError(res, error, '服务器内部错误');
  }
};
