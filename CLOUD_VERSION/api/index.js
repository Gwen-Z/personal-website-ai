const { initializeTables, query, insert, selectAll, update, turso as getTursoClient } = require('../lib/turso-cjs.js');

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
      // 获取所有笔记本
      const notebooks = await query(`
        SELECT 
          notebook_id,
          name,
          (SELECT COUNT(*) FROM notes WHERE notebook_id = notebooks.notebook_id) as note_count,
          created_at,
          updated_at
        FROM notebooks 
        ORDER BY created_at DESC
      `);
      
      return sendSuccess(res, { notebooks }, '笔记本列表获取成功');

    } else if (path === '/api/notebooks' && method === 'POST') {
      // 创建新笔记本
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'NAME_REQUIRED', message: '笔记本名称不能为空' });
      }
      
      const result = await insert('notebooks', {
        notebook_id: `notebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return sendSuccess(res, { id: result.lastInsertRowid }, '笔记本创建成功');

    } else if (path === '/api/notebook-rename' && method === 'POST') {
      // 重命名笔记本
      const { id, name } = req.body;
      
      if (!id || !name || !name.trim()) {
        return res.status(400).json({ error: 'INVALID_PARAMS', message: '参数无效' });
      }
      
      await update('notebooks', { name: name.trim(), updated_at: new Date().toISOString() }, { notebook_id: id });
      
      return sendSuccess(res, {}, '笔记本重命名成功');

    } else if (path === '/api/notebook-delete' && method === 'POST') {
      // 删除笔记本
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID_REQUIRED', message: '笔记本ID不能为空' });
      }
      
      // 先删除笔记本下的所有笔记
      await query('DELETE FROM notes WHERE notebook_id = ?', [id]);
      // 再删除笔记本
      await query('DELETE FROM notebooks WHERE notebook_id = ?', [id]);
      
      return sendSuccess(res, {}, '笔记本删除成功');

    } else if (path === '/api/notes' && method === 'GET') {
      // 获取指定笔记本的笔记列表
      const { notebook_id } = req.query;
      
      if (!notebook_id) {
        return res.status(400).json({ error: 'NOTEBOOK_ID_REQUIRED', message: '笔记本ID不能为空' });
      }
      
      // 获取笔记本信息
      const notebook = await query(`
        SELECT 
          notebook_id,
          name,
          description,
          created_at,
          updated_at,
          component_config
        FROM notebooks 
        WHERE notebook_id = ?
      `, [notebook_id]);
      
      if (notebook.length === 0) {
        return res.status(404).json({ error: 'NOTEBOOK_NOT_FOUND', message: '笔记本不存在' });
      }
      
      // 获取笔记列表
      const notes = await query(`
        SELECT 
          note_id,
          title,
          content,
          created_at,
          updated_at,
          source_url
        FROM notes 
        WHERE notebook_id = ? 
        ORDER BY updated_at DESC
      `, [notebook_id]);
      
      // 计算笔记数量
      const noteCount = notes.length;
      const notebookWithCount = {
        ...notebook[0],
        note_count: noteCount
      };
      
      return sendSuccess(res, { notebook: notebookWithCount, notes }, '笔记列表获取成功');

    } else if (path === '/api/notes' && method === 'POST') {
      // 创建新笔记
      const { notebook_id, title, content, source_url } = req.body;
      
      if (!notebook_id || !title || !content) {
        return res.status(400).json({ error: 'REQUIRED_FIELDS_MISSING', message: '必填字段不能为空' });
      }
      
      const result = await insert('notes', {
        note_id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        notebook_id,
        title: title.trim(),
        content: content.trim(),
        source_url: source_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return sendSuccess(res, { id: result.lastInsertRowid }, '笔记创建成功');

    } else if (path === '/api/note' && method === 'GET') {
      // 获取单个笔记详情
      const { note_id } = req.query;
      
      if (!note_id) {
        return res.status(400).json({ error: 'NOTE_ID_REQUIRED', message: '笔记ID不能为空' });
      }
      
      const notes = await query(`
        SELECT 
          note_id,
          notebook_id,
          title,
          content,
          created_at,
          updated_at,
          source_url
        FROM notes 
        WHERE note_id = ?
      `, [note_id]);
      
      if (notes.length === 0) {
        return res.status(404).json({ error: 'NOTE_NOT_FOUND', message: '笔记不存在' });
      }
      
      return sendSuccess(res, { note: notes[0] }, '笔记详情获取成功');

    } else if (path === '/api/note' && method === 'PUT') {
      // 更新笔记
      const { note_id, title, content, source_url } = req.body;
      
      if (!note_id || !title || !content) {
        return res.status(400).json({ error: 'REQUIRED_FIELDS_MISSING', message: '必填字段不能为空' });
      }
      
      await update('notes', { 
        title: title.trim(), 
        content: content.trim(),
        source_url: source_url || null,
        updated_at: new Date().toISOString() 
      }, { note_id });
      
      return sendSuccess(res, {}, '笔记更新成功');

    } else if (path === '/api/note-delete' && method === 'POST') {
      // 删除笔记
      const { note_id } = req.body;
      
      if (!note_id) {
        return res.status(400).json({ error: 'NOTE_ID_REQUIRED', message: '笔记ID不能为空' });
      }
      
      await query('DELETE FROM notes WHERE note_id = ?', [note_id]);
      
      return sendSuccess(res, {}, '笔记删除成功');

    } else if (path === '/api/note-move' && method === 'POST') {
      // 移动笔记到其他笔记本
      const { note_id, target_notebook_id } = req.body;
      
      if (!note_id || !target_notebook_id) {
        return res.status(400).json({ error: 'REQUIRED_FIELDS_MISSING', message: '必填字段不能为空' });
      }
      
      await update('notes', { 
        notebook_id: target_notebook_id,
        updated_at: new Date().toISOString() 
      }, { note_id });
      
      return sendSuccess(res, {}, '笔记移动成功');

    } else if (path === '/api/health' && method === 'GET') {
      // 健康检查端点
      return sendSuccess(res, { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected'
      }, '服务健康检查通过');

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
