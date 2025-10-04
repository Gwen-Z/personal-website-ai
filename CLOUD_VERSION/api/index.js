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
