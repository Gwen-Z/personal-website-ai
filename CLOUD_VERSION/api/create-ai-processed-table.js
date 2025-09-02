import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查环境变量
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      return res.status(503).json({
        error: '数据库未配置',
        details: '请配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN'
      });
    }

    console.log('🔗 连接到 Turso 数据库...');
    
    // 创建 Turso 客户端
    const turso = createClient({
      url: dbUrl,
      authToken: dbToken,
    });

    // 测试连接
    await turso.execute('SELECT 1');
    console.log('✅ 数据库连接成功');

    // 创建 ai_processed_data 表
    console.log('📝 创建 ai_processed_data 表...');
    
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_processed_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_entry_id INTEGER,
        date TEXT NOT NULL,
        mood_score INTEGER,
        mood_emoji TEXT,
        mood_description TEXT,
        life_score INTEGER,
        study_score INTEGER,
        work_score INTEGER,
        inspiration_score INTEGER,
        summary TEXT,
        ai_model TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(raw_entry_id)
      )
    `);

    console.log('✅ ai_processed_data 表创建成功');

    // 验证表结构
    console.log('🔍 验证表结构...');
    const tableInfo = await turso.execute('PRAGMA table_info(ai_processed_data)');
    
    let tableStructure = [];
    if (tableInfo.rows && tableInfo.rows.length > 0) {
      tableStructure = tableInfo.rows.map(row => ({
        column: row[1],
        type: row[2],
        notNull: row[3] === 1,
        defaultValue: row[4]
      }));
    }

    // 检查现有数据
    const countResult = await turso.execute('SELECT COUNT(*) as count FROM ai_processed_data');
    const count = countResult.rows[0][0];

    console.log('🎉 ai_processed_data 表创建完成！');

    return res.status(200).json({
      success: true,
      message: 'ai_processed_data 表创建成功',
      tableStructure,
      recordCount: count
    });

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    return res.status(500).json({
      error: '创建表失败',
      message: error.message
    });
  }
}
