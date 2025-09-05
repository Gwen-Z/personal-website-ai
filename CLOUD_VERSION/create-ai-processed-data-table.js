import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// 加载 .env.local 文件
dotenv.config({ path: '.env.local' });

async function createAiProcessedDataTable() {
  try {
    // 检查环境变量
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      console.error('❌ 缺少环境变量:');
      console.error('   TURSO_DATABASE_URL:', dbUrl ? '✅ 已设置' : '❌ 未设置');
      console.error('   TURSO_AUTH_TOKEN:', dbToken ? '✅ 已设置' : '❌ 未设置');
      process.exit(1);
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
    
    if (tableInfo.rows && tableInfo.rows.length > 0) {
      console.log('📋 表结构:');
      tableInfo.rows.forEach(row => {
        console.log(`   ${row[1]} (${row[2]}) ${row[3] ? 'NOT NULL' : ''} ${row[4] ? `DEFAULT ${row[4]}` : ''}`);
      });
    }

    // 检查现有数据
    const countResult = await turso.execute('SELECT COUNT(*) as count FROM ai_processed_data');
    const count = countResult.rows[0][0];
    console.log(`📊 表中现有记录数: ${count}`);

    console.log('🎉 ai_processed_data 表创建完成！');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    process.exit(1);
  }
}

// 运行脚本
createAiProcessedDataTable();
