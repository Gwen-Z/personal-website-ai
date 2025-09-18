import express from 'express';
import path from 'path';
import cors from 'cors';
import { initializeTables, query, insert, selectAll, update, turso as getTursoClient } from './lib/turso.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// 启用CORS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 静态文件服务 - 提供构建好的前端文件
app.use(express.static(path.join(process.cwd(), 'build'), {
  setHeaders: (res, path) => {
    // 对于HTML文件，禁用缓存
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// SPA路由支持 - 所有非API请求返回index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});


// 初始化数据库
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initializeTables();
      dbInitialized = true;
      console.log('✅ 数据库初始化完成');
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }
}

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running with Turso database' });
});

// 添加列到 note_details 表
app.post('/api/add-columns', async (req, res) => {
  try {
    await ensureDbInitialized();
    const turso = getTursoClient();
    
    // 检查表是否存在
    const tableCheck = await turso.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='note_details'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('创建 note_details 表...');
      await turso.execute(`
        CREATE TABLE note_details (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          note_id INTEGER NOT NULL,
          content_text TEXT,
          images_json TEXT,
          source_url TEXT,
          source TEXT,
          original_url TEXT,
          author TEXT,
          upload_time TEXT,
          core_points TEXT,
          keywords TEXT,
          knowledge_extension TEXT,
          learning_path TEXT,
          ai_chat_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (note_id) REFERENCES notes (id)
        )
      `);
      console.log('✅ note_details 表创建成功');
    } else {
      console.log('note_details 表已存在，检查列...');
      
      // 检查现有列
      const columns = await turso.execute(`PRAGMA table_info(note_details)`);
      const existingColumns = columns.rows.map(row => row[1]);
      console.log('现有列:', existingColumns);
      
      // 添加缺失的列
      const newColumns = [
        { name: 'source', type: 'TEXT' },
        { name: 'original_url', type: 'TEXT' },
        { name: 'author', type: 'TEXT' },
        { name: 'upload_time', type: 'TEXT' },
        { name: 'core_points', type: 'TEXT' },
        { name: 'keywords', type: 'TEXT' },
        { name: 'knowledge_extension', type: 'TEXT' },
        { name: 'learning_path', type: 'TEXT' },
        { name: 'ai_chat_summary', type: 'TEXT' }
      ];
      
      for (const col of newColumns) {
        if (!existingColumns.includes(col.name)) {
          console.log(`添加列: ${col.name}`);
          await turso.execute(`ALTER TABLE note_details ADD COLUMN ${col.name} ${col.type}`);
        } else {
          console.log(`列 ${col.name} 已存在`);
        }
      }
    }
    
    // 检查并更新 notes 表
    const notesColumns = await turso.execute(`PRAGMA table_info(notes)`);
    const existingNotesColumns = notesColumns.rows.map(row => row[1]);
    console.log('notes 表现有列:', existingNotesColumns);
    
    if (!existingNotesColumns.includes('updated_at')) {
      console.log('添加 updated_at 列到 notes 表');
      await turso.execute(`ALTER TABLE notes ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    } else {
      console.log('notes 表的 updated_at 列已存在');
    }
    
    res.json({ success: true, message: '数据库结构更新完成' });
  } catch (error) {
    console.error('❌ 更新失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 检查和修复表结构
app.get('/api/fix-tables', async (req, res) => {
  try {
    await ensureDbInitialized();
    
    // 检查 notes 表结构
    const tableInfo = await query('PRAGMA table_info(notes)');
    console.log('当前 notes 表结构:', tableInfo);
    
    // 检查是否存在 content_text 列
    const hasContentText = tableInfo.rows.some(col => col.name === 'content_text');
    
    if (!hasContentText) {
      console.log('添加缺失的 content_text 列...');
      await query('ALTER TABLE notes ADD COLUMN content_text TEXT');
      console.log('✅ 已添加 content_text 列');
    }
    
    // 检查是否存在 images 列
    const hasImages = tableInfo.rows.some(col => col.name === 'images');
    if (!hasImages) {
      console.log('添加缺失的 images 列...');
      await query('ALTER TABLE notes ADD COLUMN images TEXT');
      console.log('✅ 已添加 images 列');
    }
    
    // 检查是否存在 image_urls 列
    const hasImageUrls = tableInfo.rows.some(col => col.name === 'image_urls');
    if (!hasImageUrls) {
      console.log('添加缺失的 image_urls 列...');
      await query('ALTER TABLE notes ADD COLUMN image_urls TEXT');
      console.log('✅ 已添加 image_urls 列');
    }
    
    // 检查是否存在 source_url 列
    const hasSourceUrl = tableInfo.rows.some(col => col.name === 'source_url');
    if (!hasSourceUrl) {
      console.log('添加缺失的 source_url 列...');
      await query('ALTER TABLE notes ADD COLUMN source_url TEXT');
      console.log('✅ 已添加 source_url 列');
    }
    
    res.json({ 
      success: true, 
      message: '表结构检查和修复完成',
      tableInfo: tableInfo.rows
    });
  } catch (error) {
    console.error('修复表结构失败:', error);
    res.status(500).json({ error: '修复表结构失败', details: error.message });
  }
});

// 获取简单记录
app.get('/api/simple-records', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { from, to } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (from && to) {
      whereClause = 'WHERE date BETWEEN ? AND ?';
      params = [from, to];
    } else if (from) {
      whereClause = 'WHERE date >= ?';
      params = [from];
    } else if (to) {
      whereClause = 'WHERE date <= ?';
      params = [to];
    }
    
    const records = await selectAll('simple_records', whereClause, params);
    res.json({
      records: records,
      stats: {
        total: records.length,
        source: 'turso'
      }
    });
  } catch (error) {
    console.error('获取简单记录失败:', error);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// 更新简单记录
app.put('/api/simple-records/:id', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.params;
    const recordId = parseInt(id);
    const updates = req.body;
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), recordId];
    
    await query(`UPDATE simple_records SET ${setClause} WHERE id = ?`, values);
    
    res.json({ success: true, message: '记录更新成功' });
  } catch (error) {
    console.error('更新记录失败:', error);
    res.status(500).json({ error: '更新记录失败' });
  }
});

// 删除简单记录
app.delete('/api/simple-records/:id', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.params;
    const recordId = parseInt(id);
    
    await query('DELETE FROM simple_records WHERE id = ?', [recordId]);
    
    res.json({ success: true, message: '记录删除成功' });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ error: '删除记录失败' });
  }
});

// 批量删除简单记录
app.delete('/api/simple-records/batch', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '无效的ID列表' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    await query(`DELETE FROM simple_records WHERE id IN (${placeholders})`, ids);
    
    res.json({ success: true, message: `成功删除 ${ids.length} 条记录` });
  } catch (error) {
    console.error('批量删除记录失败:', error);
    res.status(500).json({ error: '批量删除记录失败' });
  }
});

// 批量创建记录
app.post('/api/:category-data/batch', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { category } = req.params;
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: '无效的数据列表' });
    }
    
    const tableName = category === 'simple' ? 'simple_records' : 'raw_entries';
    let successCount = 0;
    let errorCount = 0;
    
    for (const record of data) {
      try {
        // 确保有日期字段
        if (!record.date) {
          record.date = new Date().toISOString().split('T')[0];
        }
        if (!record.created_at) {
          record.created_at = new Date().toISOString();
        }
        
        await insert(tableName, record);
        successCount++;
      } catch (error) {
        console.error(`插入记录失败:`, error);
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: `批量创建完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`,
      successCount,
      errorCount
    });
  } catch (error) {
    console.error('批量创建记录失败:', error);
    res.status(500).json({ error: '批量创建记录失败' });
  }
});

// 获取笔记本列表
app.get('/api/notebooks', async (req, res) => {
  try {
    await ensureDbInitialized();
    const turso = getTursoClient();
    
    // 先检查notebooks表是否存在
    const tableCheck = await turso.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='notebooks'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('notebooks表不存在，创建表...');
      await turso.execute(`
        CREATE TABLE IF NOT EXISTS notebooks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          note_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // 检查并添加 note_count 列（如果不存在）
      try {
        await turso.execute(`
          ALTER TABLE notebooks ADD COLUMN note_count INTEGER DEFAULT 0
        `);
        console.log('已添加 note_count 列');
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('note_count 列已存在');
        } else {
          console.error('添加 note_count 列失败:', error.message);
        }
      }
      
      // 创建默认笔记本
      await turso.execute(`
        INSERT INTO notebooks (id, name, note_count) VALUES ('A1', '默认笔记本', 0)
      `);
    }
    
    // 实时计算每个笔记本的笔记数量
    const result = await turso.execute(`
      SELECT 
        n.id, 
        n.name, 
        n.created_at, 
        n.updated_at, 
        COUNT(no.note_id) as note_count
      FROM notebooks n
      LEFT JOIN notes no ON n.id = no.notebook_id
      GROUP BY n.id
      ORDER BY n.created_at ASC
    `);

    const notebooks = result.rows.map(row => {
      const record = {};
      result.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return record;
    });

    res.json({
      success: true,
      notebooks: notebooks
    });
  } catch (error) {
    console.error('获取笔记本失败:', error);
    res.status(500).json({ error: '获取笔记本失败', details: error.message });
  }
});

// 确保有默认笔记本
async function ensureDefaultNotebook() {
  try {
    const notebooks = await selectAll('notebooks');
    if (notebooks.length === 0) {
      console.log('📚 创建默认笔记本...');
      const defaultNotebook = {
        name: '默认笔记本',
        created_at: new Date().toISOString()
      };
      await insert('notebooks', defaultNotebook);
      console.log('✅ 默认笔记本创建成功');
    }
    
    // 检查是否有笔记没有关联到笔记本
    const orphanNotes = await query('SELECT COUNT(*) as count FROM notes WHERE notebook_id IS NULL');
    if (orphanNotes.rows[0].count > 0) {
      console.log('📝 发现未关联的笔记，正在关联到默认笔记本...');
      const defaultNotebook = await selectAll('notebooks', 'LIMIT 1');
      if (defaultNotebook.length > 0) {
        await query('UPDATE notes SET notebook_id = ? WHERE notebook_id IS NULL', [defaultNotebook[0].id]);
        console.log('✅ 已将所有笔记关联到默认笔记本');
      }
    }
  } catch (error) {
    console.error('❌ 确保默认笔记本失败:', error);
  }
}

// 获取笔记列表
app.get('/api/notes', async (req, res) => {
  try {
    console.log('📝 获取笔记请求:', req.query);
    await ensureDbInitialized();
    await ensureDefaultNotebook();
    const { notebook_id } = req.query;
    
    // 获取笔记本信息
    let notebook = null;
    if (notebook_id) {
      try {
        console.log('📚 查询笔记本信息...');
        const notebooks = await selectAll('notebooks', 'WHERE id = ?', [notebook_id]);
        console.log('📚 找到笔记本:', notebooks.length);
        if (notebooks.length > 0) {
          notebook = {
            id: notebooks[0].id,
            name: notebooks[0].name,
            note_count: 0
          };
        }
      } catch (error) {
        console.error('❌ 查询笔记本信息失败:', error);
        // 即使查询笔记本失败，也返回基本的笔记本信息
        notebook = {
          id: parseInt(notebook_id),
          name: '笔记本',
          note_count: 0
        };
      }
    }
    
    // 尝试安全地查询笔记
    let notes = [];
    try {
      console.log('📝 尝试查询笔记...');
      
      // 如果没有提供notebook_id，查询所有笔记
      if (!notebook_id) {
        const countResult = await query('SELECT COUNT(*) as count FROM notes');
        const noteCount = countResult.rows[0].count;
        console.log('📝 笔记数量:', noteCount);
        
        if (noteCount > 0 && noteCount < 1000) {
          const notesResult = await query(
            'SELECT note_id, title, content_text, created_at, updated_at FROM notes ORDER BY created_at DESC LIMIT 50'
          );
          notes = notesResult.rows.map(row => ({
            id: row.note_id,
            title: row.title || '无标题',
            content: row.content_text || '',
            created_at: row.created_at,
            updated_at: row.updated_at
          }));
        }
      } else {
        // 首先检查笔记数量
        const countResult = await query('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', [notebook_id]);
        const noteCount = countResult.rows[0].count;
        console.log('📝 笔记数量:', noteCount);
        
        if (noteCount > 0 && noteCount < 1000) {
          // 如果笔记数量合理，查询具体笔记
          const notesResult = await query(
            'SELECT note_id, title, content_text, created_at, updated_at FROM notes WHERE notebook_id = ? ORDER BY created_at DESC LIMIT 50',
            [notebook_id]
          );
          notes = notesResult.rows.map(row => ({
            id: row.note_id,
            title: row.title || '无标题',
            content: row.content_text || '',
            created_at: row.created_at,
            updated_at: row.updated_at
          }));
          console.log('✅ 成功查询到笔记:', notes.length);
        } else if (noteCount >= 1000) {
          console.log('⚠️ 笔记数量过多，跳过查询以避免超时');
        }
        
        // 更新笔记本的笔记数量
        if (notebook) {
          notebook.note_count = noteCount;
        }
      }
      
    } catch (error) {
      console.error('❌ 查询笔记失败:', error.message);
      console.log('⚠️ 使用空笔记列表作为后备方案');
      notes = [];
    }
    
    console.log('✅ 返回数据:', { notesCount: notes.length, notebook });
    res.json({
      success: true,
      notes: notes,
      notebook: notebook
    });
  } catch (error) {
    console.error('❌ 获取笔记失败:', error);
    console.error('❌ 错误堆栈:', error.stack);
    res.status(500).json({ error: '获取笔记失败', details: error.message });
  }
});

// 创建笔记
app.post('/api/notes-create', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { notebook_id, title, content_text, images, source_url } = req.body;
    
    console.log('创建笔记请求数据:', { notebook_id, title, content_text, images, source_url });
    
    // 使用合并后的表结构，确保所有字段都有有效值
    const noteData = {
      notebook_id: notebook_id || null,
      title: title || '',
      content_text: content_text || '', // 使用 content_text 列
      images: images ? JSON.stringify(images) : null, // 使用 images 列存储JSON
      source_url: source_url || null, // 确保不是 undefined
      created_at: new Date().toISOString()
    };
    
    // 过滤掉undefined值
    Object.keys(noteData).forEach(key => {
      if (noteData[key] === undefined) {
        noteData[key] = null;
      }
    });
    
    console.log('准备插入的数据:', noteData);
    
    const result = await insert('notes', noteData);
    console.log('插入结果:', result);
    
    res.json({
      success: true,
      message: '笔记创建成功',
      note: { id: Number(result.lastInsertRowid), ...noteData }
    });
  } catch (error) {
    console.error('创建笔记失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '创建笔记失败', details: error.message });
  }
});

// 重命名笔记
app.post('/api/note-rename', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id, title } = req.body;
    
    await query('UPDATE notes SET title = ? WHERE id = ?', [title, id]);
    
    res.json({
      success: true,
      message: '笔记重命名成功'
    });
  } catch (error) {
    console.error('重命名笔记失败:', error);
    res.status(500).json({ error: '重命名笔记失败' });
  }
});

// 重命名笔记本
app.post('/api/notebook-rename', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id, name } = req.body;
    
    if (!id || !name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: '笔记本ID和名称不能为空' 
      });
    }
    
    await query('UPDATE notebooks SET name = ? WHERE id = ?', [name.trim(), id]);
    
    res.json({
      success: true,
      message: '笔记本重命名成功'
    });
  } catch (error) {
    console.error('重命名笔记本失败:', error);
    res.status(500).json({ error: '重命名笔记本失败' });
  }
});

// 移动笔记
app.post('/api/note-move', async (req, res) => {
  try {
    console.log('📝 移动笔记请求:', req.body);
    await ensureDbInitialized();
    const { note_id, target_notebook_id } = req.body;
    
    console.log('📝 准备移动笔记:', { note_id, target_notebook_id });
    
    // 使用正确的列名 note_id 而不是 id
    const result = await query('UPDATE notes SET notebook_id = ? WHERE note_id = ?', [target_notebook_id, note_id]);
    console.log('📝 移动结果:', result);
    
    res.json({
      success: true,
      message: '笔记移动成功'
    });
  } catch (error) {
    console.error('移动笔记失败:', error);
    res.status(500).json({ error: '移动笔记失败' });
  }
});

// 删除笔记
app.post('/api/note-delete', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.body;
    
    await query('DELETE FROM notes WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '笔记删除成功'
    });
  } catch (error) {
    console.error('删除笔记失败:', error);
    res.status(500).json({ error: '删除笔记失败' });
  }
});

// 创建笔记本
app.post('/api/notebooks-create', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { name } = req.body;
    
    // 生成Turso格式的ID
    const generateTursoId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `A${timestamp}${random}`.toUpperCase();
    };

    const id = generateTursoId();
    
    const notebookData = {
      id,
      name,
      note_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await insert('notebooks', notebookData);
    
    res.json({
      success: true,
      message: '笔记本创建成功',
      notebook: {
        id,
        name,
        note_count: 0,
        created_at: notebookData.created_at,
        updated_at: notebookData.updated_at
      }
    });
  } catch (error) {
    console.error('创建笔记本失败:', error);
    res.status(500).json({ error: '创建笔记本失败' });
  }
});

// 删除笔记本
app.post('/api/notebook-delete', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.body;
    
    if (id === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: '笔记本ID不能为空' 
      });
    }
    
    // 先检查笔记本是否存在
    let checkResult;
    if (id === null || id === 'null') {
      checkResult = await query('SELECT id FROM notebooks WHERE id IS NULL');
    } else {
      checkResult = await query('SELECT id FROM notebooks WHERE id = ?', [id]);
    }
    
    if (checkResult.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: '笔记本不存在' 
      });
    }
    
    // 删除该笔记本下的所有笔记
    if (id === null || id === 'null') {
      await query('DELETE FROM notes WHERE notebook_id IS NULL');
    } else {
      await query('DELETE FROM notes WHERE notebook_id = ?', [id]);
    }
    
    // 删除笔记本
    if (id === null || id === 'null') {
      await query('DELETE FROM notebooks WHERE id IS NULL');
    } else {
      await query('DELETE FROM notebooks WHERE id = ?', [id]);
    }
    
    res.json({
      success: true,
      message: '笔记本删除成功'
    });
  } catch (error) {
    console.error('删除笔记本失败:', error);
    res.status(500).json({ error: '删除笔记本失败' });
  }
});

// AI聊天端点
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context, history } = req.body;
    
    // 这里可以集成真正的AI服务
    // 目前返回模拟响应
    const response = {
      success: true,
      data: {
        message: `收到消息: ${message}`,
        timestamp: new Date().toISOString()
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('AI聊天失败:', error);
    res.status(500).json({ error: 'AI聊天失败' });
  }
});

// 通用聊天端点
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // 调用豆包聊天API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828',
        messages: [
          {
            role: 'system',
            content: '你是一个智能助手，能够帮助用户解答各种问题。'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`Doubao API error: ${response.status}`);
    }

    const data = await response.json();
    const chatResponse = data.choices[0].message.content;

    res.json({
      success: true,
      reply: chatResponse,
      conversationId: conversationId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// 获取单个笔记详情
app.get('/api/notes/:id', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: '笔记ID不能为空' });
    }

    console.log(`📝 获取笔记详情: ${id}`);
    
    // 获取笔记信息
    const noteResult = await query('SELECT * FROM notes WHERE note_id = ?', [id]);
    
    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: '笔记不存在' });
    }

    const note = {};
    noteResult.columns.forEach((col, i) => {
      note[col] = noteResult.rows[0][i];
    });

    // 获取笔记本信息
    let notebook = null;
    if (note.notebook_id) {
      const notebookResult = await query('SELECT * FROM notebooks WHERE id = ?', [note.notebook_id]);
      if (notebookResult.rows.length > 0) {
        notebook = {};
        notebookResult.columns.forEach((col, i) => {
          notebook[col] = notebookResult.rows[0][i];
        });
      }
    }

    // 处理笔记数据
    const enrichedNote = {
      ...note,
      content_text: note.content_text || note.content || '',
      images: note.images ? JSON.parse(note.images) : [],
      image_urls: note.image_urls || null,
      source_url: note.source_url || '',
      core_points: note.core_points || '',
      keywords: note.keywords || '',
      knowledge_extension: note.knowledge_extension || '',
      learning_path: note.learning_path || '',
      ai_chat_summary: note.ai_chat_summary || ''
    };

    console.log(`✅ 成功获取笔记详情: ${enrichedNote.title}`);
    
    res.json({
      success: true,
      note: enrichedNote,
      notebook: notebook
    });

  } catch (error) {
    console.error('获取笔记详情失败:', error);
    res.status(500).json({ error: '获取笔记详情失败', details: error.message });
  }
});

// 获取笔记详情数据 (JSON格式)
app.get('/api/note-detail-data', async (req, res) => {
  try {
    console.log('🔍 note-detail-data endpoint called with id:', req.query.id);
    await ensureDbInitialized();
    const { id } = req.query;
    
    if (!id) {
      console.log('❌ Missing id parameter');
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    // Get note details (now from unified notes table)
    console.log('📝 Querying note with id:', id);
    const noteRes = await query(`SELECT * FROM notes WHERE note_id = ?`, [id]);
    console.log('📝 Note query result:', noteRes.rows.length, 'rows');
    
    if (noteRes.rows.length === 0) {
      console.log('❌ Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = {};
    noteRes.columns.forEach((col, i) => {
      note[col] = noteRes.rows[0][i];
    });

    // Get notebook information
    console.log('📚 Querying notebook with id:', note.notebook_id);
    const notebookRes = await query(`SELECT * FROM notebooks WHERE id = ?`, [note.notebook_id]);
    console.log('📚 Notebook query result:', notebookRes.rows.length, 'rows');

    let notebook = null;
    if (notebookRes.rows.length > 0) {
      notebook = {};
      notebookRes.columns.forEach((col, i) => {
        notebook[col] = notebookRes.rows[0][i];
      });
    }

    // Process note data (no need to merge since everything is in one table)
    let parsedImages = [];
    if (note.images) {
      try {
        // 尝试解析JSON格式的images
        if (typeof note.images === 'string' && note.images.startsWith('[')) {
          parsedImages = JSON.parse(note.images);
        } else if (typeof note.images === 'string' && note.images.startsWith('data:image')) {
          // 如果是data:image格式，转换为数组格式
          parsedImages = [note.images];
        } else if (Array.isArray(note.images)) {
          parsedImages = note.images;
        }
      } catch (error) {
        console.log('Images parsing error, using empty array:', error.message);
        parsedImages = [];
      }
    }

    const enrichedNote = {
      ...note,
      content_text: note.content_text || note.content || '',
      images: parsedImages,
      image_urls: note.image_urls || null, // 确保image_urls字段被包含
      source_url: note.source_url || '',
      core_points: note.core_points || '',
      keywords: note.keywords || '',
      knowledge_extension: note.knowledge_extension || '',
      learning_path: note.learning_path || '',
      ai_chat_summary: note.ai_chat_summary || ''
    };

    console.log('✅ Sending response for note:', id);
    res.json({
      success: true,
      note: enrichedNote,
      notebook: notebook
    });

  } catch (error) {
    console.error('❌ Error fetching note detail:', error);
    res.status(500).json({ error: 'Failed to fetch note detail' });
  }
});

// 获取AI分析数据
app.get('/api/ai-data', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { category, analysis_type } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (category) {
      whereClause += whereClause ? ' AND category = ?' : 'WHERE category = ?';
      params.push(category);
    }
    
    if (analysis_type) {
      whereClause += whereClause ? ' AND analysis_type = ?' : 'WHERE analysis_type = ?';
      params.push(analysis_type);
    }
    
    const aiData = await selectAll('ai_data', whereClause, params);
    res.json({
      success: true,
      data: aiData
    });
  } catch (error) {
    console.error('获取AI数据失败:', error);
    res.status(500).json({ error: '获取AI数据失败' });
  }
});

// 创建AI分析数据
app.post('/api/ai-data', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { date, category, analysis_type, result, confidence_score } = req.body;
    
    const aiData = {
      date,
      category,
      analysis_type,
      result,
      confidence_score,
      created_at: new Date().toISOString()
    };
    
    await insert('ai_data', aiData);
    
    res.json({
      success: true,
      message: 'AI数据创建成功'
    });
  } catch (error) {
    console.error('创建AI数据失败:', error);
    res.status(500).json({ error: '创建AI数据失败' });
  }
});

// 获取原始数据
app.get('/api/raw-entries', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { from, to } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (from && to) {
      whereClause = 'WHERE date BETWEEN ? AND ?';
      params = [from, to];
    } else if (from) {
      whereClause = 'WHERE date >= ?';
      params = [from];
    } else if (to) {
      whereClause = 'WHERE date <= ?';
      params = [to];
    }
    
    const rawEntries = await selectAll('raw_entries', whereClause, params);
    res.json({
      success: true,
      data: rawEntries
    });
  } catch (error) {
    console.error('获取原始数据失败:', error);
    res.status(500).json({ error: '获取原始数据失败' });
  }
});

// 创建原始数据
app.post('/api/raw-entries', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { date, mood_text, fitness_text, study_text, work_text, inspiration_text, raw_text, source } = req.body;
    
    const rawData = {
      date: date || new Date().toISOString().split('T')[0],
      mood_text,
      fitness_text,
      study_text,
      work_text,
      inspiration_text,
      raw_text,
      source: source || 'shortcut',
      created_at: new Date().toISOString()
    };
    
    await insert('raw_entries', rawData);
    
    res.json({
      success: true,
      message: '原始数据创建成功'
    });
  } catch (error) {
    console.error('创建原始数据失败:', error);
    res.status(500).json({ error: '创建原始数据失败' });
  }
});

// 更新笔记
app.put('/api/notes/:id', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.params;
    const { 
      title, 
      content, 
      content_text,
      core_points, 
      keywords, 
      knowledge_extension, 
      learning_path, 
      ai_chat_summary,
      images,
      image_urls,
      source,
      original_url,
      author,
      upload_time
    } = req.body || {};
    
    if (!id) return res.status(400).json({ success: false, error: 'Note ID required' });
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Title required' });

    // Update all fields in the unified notes table
    const updateData = {
      title: String(title).trim(),
      content_text: content_text || content || null,
      core_points: core_points || null,
      keywords: keywords || null,
      knowledge_extension: knowledge_extension || null,
      learning_path: learning_path || null,
      ai_chat_summary: ai_chat_summary || null,
      images: images || null,
      image_urls: image_urls || null,
      source: source || null,
      original_url: original_url || null,
      author: author || null,
      upload_time: upload_time || null
    };

    await update('notes', updateData, `id = ?`, [Number(id)]);
    
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Update note error:', e);
    return res.status(500).json({ success: false, error: 'Update failed', details: e.message });
  }
});

// 更新笔记详情字段
app.put('/api/note-details/:id', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { id } = req.params;
    const { 
      core_points, 
      keywords, 
      knowledge_extension, 
      learning_path, 
      ai_chat_summary,
      content_text
    } = req.body || {};
    
    if (!id) return res.status(400).json({ success: false, error: 'Note ID required' });

    // Update note details directly in notes table
    const detailData = {};
    if (core_points !== undefined) detailData.core_points = core_points;
    if (keywords !== undefined) detailData.keywords = keywords;
    if (knowledge_extension !== undefined) detailData.knowledge_extension = knowledge_extension;
    if (learning_path !== undefined) detailData.learning_path = learning_path;
    if (ai_chat_summary !== undefined) detailData.ai_chat_summary = ai_chat_summary;
    if (content_text !== undefined) detailData.content_text = content_text;

    if (Object.keys(detailData).length > 0) {
      const setClause = Object.keys(detailData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(detailData);
      values.push(Number(id));
      await query(`UPDATE notes SET ${setClause} WHERE note_id = ?`, values);
    }
    
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Update note details error:', e);
    return res.status(500).json({ success: false, error: 'Update failed', details: e.message });
  }
});

// AI 分析端点
app.get('/api/ai-analysis', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { from, to } = req.query;
    
    // 获取数据进行分析
    let whereClause = '';
    let params = [];
    if (from && to) {
      whereClause = 'WHERE date BETWEEN ? AND ?';
      params = [from, to];
    } else if (from) {
      whereClause = 'WHERE date >= ?';
      params = [from];
    } else if (to) {
      whereClause = 'WHERE date <= ?';
      params = [to];
    }
    
    const records = await selectAll('simple_records', whereClause, params);
    
    // 简单的AI分析逻辑（可以后续扩展）
    const analysis = {
      total_records: records.length,
      mood_summary: records.length > 0 ? '数据正常' : '暂无数据',
      insights: records.length > 0 ? ['数据记录完整', '建议继续记录'] : ['请开始记录数据']
    };
    
    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// 原始数据条目端点
app.post('/api/raw-entry', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { date, description, category, duration, intensity, mood, notes } = req.body;
    
    if (!date || !description) {
      return res.status(400).json({ success: false, error: '日期和描述不能为空' });
    }

    // 生成Turso格式的ID
    const generateTursoId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `A${timestamp}${random}`.toUpperCase();
    };

    const entryId = generateTursoId();
    const now = new Date().toISOString();

    // 插入到 raw_entries 表
    const data = {
      id: entryId,
      date,
      description,
      category: category || null,
      duration: duration || null,
      intensity: intensity || null,
      mood: mood || null,
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    const result = await insert('raw_entries', data);
    
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
    console.error('Raw entry error:', error);
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
});

// 豆包分析端点
app.post('/api/doubao-analysis', async (req, res) => {
  try {
    const { title, content, noteId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    // 构建提示词
    const prompt = `请分析以下笔记内容，并提供以下信息：

标题：${title}

内容：${content}

请按以下格式返回JSON：
{
  "coreViewpoints": "核心观点的详细描述",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4"],
  "knowledgeExtension": "推荐相关书籍、论文或学习资源的具体建议",
  "learningPath": "如果这是某个领域的内容，请提供学习路径（基础→进阶→应用）"
}

要求：
1. 核心观点要简洁明了，突出笔记的主要价值
2. 关键词要准确反映内容主题，4-6个即可
3. 知识延伸要具体，推荐真实的书籍、论文或资源
4. 学习路径要实用，适合不同水平的学习者
5. 返回纯JSON格式，不要包含其他文字`;

    // 调用豆包API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Doubao API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    // 解析JSON响应
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // 如果解析失败，返回默认结构
      analysis = {
        coreViewpoints: "分析完成，但格式解析失败",
        keywords: ["关键词1", "关键词2"],
        knowledgeExtension: "建议查阅相关专业资料",
        learningPath: "建议从基础概念开始学习"
      };
    }

    // 保存分析结果到数据库
    if (noteId) {
      await ensureDbInitialized();
      const turso = getTursoClient();
      await turso.execute({
        sql: 'UPDATE notes SET core_points = ?, keywords = ?, knowledge_extension = ?, learning_path = ? WHERE id = ?',
        args: [analysis.coreViewpoints, JSON.stringify(analysis.keywords), analysis.knowledgeExtension, analysis.learningPath, noteId]
      });
    }

    res.json({
      success: true,
      analysis: {
        core_points: [analysis.coreViewpoints],
        keywords: analysis.keywords,
        knowledge_extension: analysis.knowledgeExtension,
        learning_path: analysis.learningPath
      }
    });
  } catch (error) {
    console.error('Doubao analysis error:', error);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

// 豆包聊天端点
app.post('/api/doubao-chat', async (req, res) => {
  try {
    const { message, noteId } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // 获取相关笔记上下文
    let context = '';
    if (noteId) {
      await ensureDbInitialized();
      const turso = getTursoClient();
      const noteResult = await turso.execute({
        sql: 'SELECT title, content_text FROM notes WHERE note_id = ?',
        args: [noteId]
      });
      
      if (noteResult.rows.length > 0) {
        const note = noteResult.rows[0];
        context = `\n\n相关笔记上下文：\n标题：${note.title}\n内容：${note.content_text}`;
      }
    }

    // 构建聊天提示词
    const prompt = `你是一个智能学习助手，专门帮助用户理解和扩展他们的学习内容。${context}

用户问题：${message}

请提供有帮助、准确且详细的回答。如果问题与笔记内容相关，请结合笔记内容进行回答。`;

    // 调用豆包API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828',
        messages: [
          {
            role: 'system',
            content: '你是一个智能学习助手，专门帮助用户理解和扩展他们的学习内容。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`Doubao API error: ${response.status}`);
    }

    const data = await response.json();
    const chatResponse = data.choices[0].message.content;

    // 保存聊天记录到数据库
    if (noteId) {
      await ensureDbInitialized();
      const turso = getTursoClient();
      // 更新笔记的AI聊天摘要
      await turso.execute({
        sql: 'UPDATE notes SET ai_chat_summary = ? WHERE id = ?',
        args: [chatResponse, noteId]
      });
    }

    res.json({
      success: true,
      reply: chatResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Doubao chat error:', error);
    res.status(500).json({ success: false, error: 'Chat failed' });
  }
});

// 豆包聊天总结端点
app.post('/api/doubao-chat-summary', async (req, res) => {
  try {
    const { messages, noteId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages are required' });
    }

    // 构建总结提示词
    const conversationText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    const prompt = `请总结以下对话内容，提取关键要点和重要信息：

${conversationText}

请提供简洁明了的总结，包括：
1. 主要讨论的话题
2. 关键要点
3. 重要结论或建议
4. 需要进一步了解的内容

总结应该简洁但全面，帮助用户回顾对话内容。`;

    // 调用豆包API
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的对话总结助手，能够准确提取对话中的关键信息并提供简洁的总结。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Doubao API error: ${response.status}`);
    }

    const data = await response.json();
    const summaryText = data.choices[0].message.content;

    // 保存总结到数据库
    if (noteId) {
      await ensureDbInitialized();
      const turso = getTursoClient();
      // 更新笔记的AI聊天摘要
      await turso.execute({
        sql: 'UPDATE notes SET ai_chat_summary = ? WHERE id = ?',
        args: [summaryText, noteId]
      });
    }

    res.json({
      success: true,
      summary: summaryText,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Doubao chat summary error:', error);
    res.status(500).json({ success: false, error: 'Summary failed' });
  }
});

// 笔记搜索端点
app.get('/api/notes/search', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: '搜索关键词不能为空' });
    }
    
    console.log(`🔍 搜索请求: "${q}"`);
    
    const turso = getTursoClient();
    
    // 在标题和内容中搜索关键词
    const query = `
      SELECT note_id, notebook_id, title, content_text, images, source_url, core_points, keywords, knowledge_extension, learning_path, ai_chat_summary, created_at, updated_at, image_urls, image_files, source, original_url, author, upload_time FROM notes 
      WHERE title LIKE ? OR content_text LIKE ? 
      ORDER BY updated_at DESC
    `;
    
    const searchTerm = `%${q}%`;
    const result = await turso.execute({
      sql: query,
      args: [searchTerm, searchTerm]
    });
    const notes = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content_text,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    console.log(`✅ 找到 ${notes.length} 条匹配的笔记`);
    
    res.json({
      success: true,
      notes: notes,
      query: q,
      count: notes.length
    });
  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ success: false, error: '搜索失败' });
  }
});

// 调试端点 - 测试搜索
app.get('/api/debug/search', async (req, res) => {
  try {
    await ensureDbInitialized();
    const turso = getTursoClient();
    
    // 测试简单的搜索
    const result = await turso.execute(`
      SELECT note_id, title FROM notes 
      WHERE title LIKE '%测试%'
    `);
    
    res.json({
      success: true,
      notes: result.rows.map(row => ({
        id: row.id,
        title: row.title
      }))
    });
  } catch (error) {
    console.error('调试搜索错误:', error);
    res.status(500).json({ success: false, error: '搜索失败' });
  }
});

// 调试端点 - 测试简单查询
app.get('/api/debug/simple', async (req, res) => {
  try {
    await ensureDbInitialized();
    const turso = getTursoClient();
    
    const result = await turso.execute(`SELECT COUNT(*) as count FROM notes`);
    
    res.json({
      success: true,
      count: result.rows[0].count
    });
  } catch (error) {
    console.error('简单查询错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

// 调试端点 - 测试参数化搜索
app.get('/api/debug/search-param', async (req, res) => {
  try {
    await ensureDbInitialized();
    const turso = getTursoClient();
    const { q } = req.query;
    
    console.log(`🔍 调试搜索参数: "${q}"`);
    
    const searchTerm = `%${q}%`;
    console.log(`🔍 搜索词: "${searchTerm}"`);
    
    // 测试不同的查询方式
    const result1 = await turso.execute(`
      SELECT note_id, title FROM notes 
      WHERE title LIKE ? OR content_text LIKE ?
    `, [searchTerm, searchTerm]);
    
    const result2 = await turso.execute({
      sql: `SELECT note_id, title FROM notes WHERE title LIKE ? OR content_text LIKE ?`,
      args: [searchTerm, searchTerm]
    });
    
    console.log(`✅ 调试找到 ${result1.rows.length} 条匹配的笔记 (方式1)`);
    console.log(`✅ 调试找到 ${result2.rows.length} 条匹配的笔记 (方式2)`);
    
    res.json({
      success: true,
      notes1: result1.rows.map(row => ({
        id: row.id,
        title: row.title
      })),
      notes2: result2.rows.map(row => ({
        id: row.id,
        title: row.title
      })),
      query: q,
      searchTerm: searchTerm,
      count1: result1.rows.length,
      count2: result2.rows.length
    });
  } catch (error) {
    console.error('调试参数化搜索错误:', error);
    res.status(500).json({ success: false, error: '搜索失败' });
  }
});

// 调试端点 - 查看原始数据
app.get('/api/debug/notes', async (req, res) => {
  try {
    await ensureDbInitialized();
    const turso = getTursoClient();
    
    const result = await turso.execute(`
      SELECT note_id, title, content_text, LENGTH(content_text) as content_length FROM notes 
      ORDER BY note_id DESC
    `);
    
    res.json({
      success: true,
      notes: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content_text: row.content_text,
        content_length: row.content_length
      }))
    });
  } catch (error) {
    console.error('调试查询错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

// 笔记统计端点
app.get('/api/notes/stats', async (req, res) => {
  try {
    await ensureDbInitialized();
    
    const turso = getTursoClient();
    
    // 获取总笔记数
    const totalResult = await turso.execute('SELECT COUNT(*) as count FROM notes');
    const totalNotes = totalResult.rows[0].count;
    
    // 获取最近7天的笔记数
    const recentResult = await turso.execute(`
      SELECT COUNT(*) as count FROM notes 
      WHERE created_at >= datetime('now', '-7 days')
    `);
    const recentNotes = recentResult.rows[0].count;
    
    // 获取最长的笔记
    const longestResult = await turso.execute(`
      SELECT title, LENGTH(content_text) as length FROM notes 
      ORDER BY LENGTH(content_text) DESC LIMIT 1
    `);
    
    const longestNote = longestResult.rows.length > 0 ? {
      title: longestResult.rows[0].title,
      length: longestResult.rows[0].length
    } : null;
    
    res.json({
      success: true,
      stats: {
        totalNotes,
        recentNotes,
        longestNote
      }
    });
  } catch (error) {
    console.error('统计错误:', error);
    res.status(500).json({ success: false, error: '统计失败' });
  }
});

// 数据同步端点
app.post('/api/sync-data', async (req, res) => {
  try {
    await ensureDbInitialized();
    const { data, type } = req.body;
    
    console.log(`🔄 开始数据同步: ${type}`);
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ 
        success: false, 
        error: '数据格式无效，需要数组格式' 
      });
    }
    
    const turso = getTursoClient();
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // 根据数据类型进行同步
    switch (type) {
      case 'notes':
        for (const note of data) {
          try {
            // 检查笔记是否已存在
            const existingNote = await turso.execute({
              sql: 'SELECT note_id FROM notes WHERE note_id = ?',
              args: [note.id]
            });
            
            if (existingNote.rows.length > 0) {
              // 更新现有笔记
              await turso.execute({
                sql: `UPDATE notes SET 
                  title = ?, 
                  content_text = ?, 
                  images = ?, 
                  source_url = ?, 
                  core_points = ?, 
                  keywords = ?, 
                  knowledge_extension = ?, 
                  learning_path = ?, 
                  ai_chat_summary = ?,
                  updated_at = CURRENT_TIMESTAMP
                  WHERE note_id = ?`,
                args: [
                  note.title || '',
                  note.content_text || note.content || '',
                  note.images ? JSON.stringify(note.images) : null,
                  note.source_url || null,
                  note.core_points || null,
                  note.keywords || null,
                  note.knowledge_extension || null,
                  note.learning_path || null,
                  note.ai_chat_summary || null,
                  note.id
                ]
              });
            } else {
              // 插入新笔记
              await turso.execute({
                sql: `INSERT INTO notes (
                  note_id, title, content_text, images, source_url, 
                  core_points, keywords, knowledge_extension, 
                  learning_path, ai_chat_summary, notebook_id, 
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  note.id,
                  note.title || '',
                  note.content_text || note.content || '',
                  note.images ? JSON.stringify(note.images) : null,
                  note.source_url || null,
                  note.core_points || null,
                  note.keywords || null,
                  note.knowledge_extension || null,
                  note.learning_path || null,
                  note.ai_chat_summary || null,
                  note.notebook_id || 1, // 默认关联到第一个笔记本
                  note.created_at || new Date().toISOString(),
                  note.updated_at || new Date().toISOString()
                ]
              });
            }
            successCount++;
          } catch (error) {
            console.error(`同步笔记失败 (ID: ${note.id}):`, error);
            errorCount++;
            errors.push({ id: note.id, error: error.message });
          }
        }
        break;
        
      case 'notebooks':
        for (const notebook of data) {
          try {
            // 检查笔记本是否已存在
            const existingNotebook = await turso.execute({
              sql: 'SELECT id FROM notebooks WHERE id = ?',
              args: [notebook.id]
            });
            
            if (existingNotebook.rows.length > 0) {
              // 更新现有笔记本
              await turso.execute({
                sql: 'UPDATE notebooks SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                args: [notebook.name, notebook.id]
              });
            } else {
              // 插入新笔记本
              await turso.execute({
                sql: 'INSERT INTO notebooks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
                args: [
                  notebook.id,
                  notebook.name,
                  notebook.created_at || new Date().toISOString(),
                  notebook.updated_at || new Date().toISOString()
                ]
              });
            }
            successCount++;
          } catch (error) {
            console.error(`同步笔记本失败 (ID: ${notebook.id}):`, error);
            errorCount++;
            errors.push({ id: notebook.id, error: error.message });
          }
        }
        break;
        
      case 'simple_records':
        for (const record of data) {
          try {
            // 检查记录是否已存在
            const existingRecord = await turso.execute({
              sql: 'SELECT id FROM simple_records WHERE id = ?',
              args: [record.id]
            });
            
            if (existingRecord.rows.length > 0) {
              // 更新现有记录
              await turso.execute({
                sql: `UPDATE simple_records SET 
                  date = ?, mood_text = ?, fitness_text = ?, study_text = ?, 
                  work_text = ?, inspiration_text = ?, raw_text = ?, 
                  source = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
                args: [
                  record.date,
                  record.mood_text || null,
                  record.fitness_text || null,
                  record.study_text || null,
                  record.work_text || null,
                  record.inspiration_text || null,
                  record.raw_text || null,
                  record.source || 'sync',
                  record.id
                ]
              });
            } else {
              // 插入新记录
              await turso.execute({
                sql: `INSERT INTO simple_records (
                  id, date, mood_text, fitness_text, study_text, 
                  work_text, inspiration_text, raw_text, source, 
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  record.id,
                  record.date,
                  record.mood_text || null,
                  record.fitness_text || null,
                  record.study_text || null,
                  record.work_text || null,
                  record.inspiration_text || null,
                  record.raw_text || null,
                  record.source || 'sync',
                  record.created_at || new Date().toISOString(),
                  record.updated_at || new Date().toISOString()
                ]
              });
            }
            successCount++;
          } catch (error) {
            console.error(`同步记录失败 (ID: ${record.id}):`, error);
            errorCount++;
            errors.push({ id: record.id, error: error.message });
          }
        }
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: `不支持的数据类型: ${type}` 
        });
    }
    
    console.log(`✅ 数据同步完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`);
    
    res.json({
      success: true,
      message: `数据同步完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`,
      stats: {
        total: data.length,
        success: successCount,
        failed: errorCount,
        type: type
      },
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ 数据同步失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '数据同步失败', 
      details: error.message 
    });
  }
});

// 处理前端路由 - 所有非API请求都返回index.html
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 使用Turso数据库`);
  console.log(`🌐 健康检查: http://localhost:${PORT}/api/health`);
});
