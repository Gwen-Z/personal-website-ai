import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量，优先加载 .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config(); // 如果 .env.local 不存在，则加载默认的 .env

let db;

async function initDB() {
  // 检查Turso环境变量
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('Turso environment variables (TURSO_DATABASE_URL and TURSO_AUTH_TOKEN) are required');
  }

  console.log('🔗 Connecting to Turso database...');
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
    syncUrl: process.env.TURSO_DATABASE_URL,
    syncInterval: 0, // 禁用自动同步
  });
  
  // 添加重试机制
  let retryCount = 0;
  const maxRetries = 3;
  while (retryCount < maxRetries) {
    try {
      await turso.execute('SELECT 1');
      console.log('✅ Successfully connected to Turso.');
      break;
    } catch (error) {
      retryCount++;
      console.log(`❌ Turso connection attempt ${retryCount} failed:`, error.message);
      if (retryCount >= maxRetries) {
        throw new Error(`Failed to connect to Turso after ${maxRetries} attempts: ${error.message}`);
      }
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 添加带重试的查询函数
  const executeWithRetry = async (queryFn, maxRetries = 3) => {
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        return await queryFn();
      } catch (error) {
        retryCount++;
        console.log(`❌ Database query attempt ${retryCount} failed:`, error.message);
        if (retryCount >= maxRetries) {
          throw error;
        }
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  db = {
    async execute(argOrSql, maybeArgs) {
      return executeWithRetry(async () => {
        if (typeof argOrSql === 'string') {
          return turso.execute({ sql: argOrSql, args: maybeArgs || [] });
        }
        return turso.execute(argOrSql);
      });
    },
    async run(sql, params = []) {
      return executeWithRetry(async () => {
        await turso.execute({ sql, args: params });
        return { changes: 1 };
      });
    },
    async all(sql, params = []) {
      return executeWithRetry(async () => {
        const res = await turso.execute({ sql, args: params });
        return res.rows || [];
      });
    },
    async get(sql, params = []) {
      return executeWithRetry(async () => {
        const rows = await this.all(sql, params);
        return rows[0] || null;
      });
    },
    async exec(sql) {
      return executeWithRetry(async () => {
        const statements = String(sql).split(';').map(s => s.trim()).filter(Boolean);
        for (const s of statements) {
          await turso.execute(s);
        }
      });
    }
  };

  await ensureSchema(db);
  return db;
}

async function ensureSchema(dbClient) {
  const schema = `
    -- 笔记本表
    CREATE TABLE IF NOT EXISTS notebooks (
      notebook_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      note_count INTEGER DEFAULT 0,
      component_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 笔记表
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      note_id TEXT UNIQUE,
      notebook_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      content_text TEXT,
      image_url TEXT,
      images TEXT,
      image_urls TEXT,
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
      image_files TEXT,
      duration_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      component_data TEXT,
      selected_analysis_components TEXT,
      component_instances TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (notebook_id) REFERENCES notebooks (notebook_id)
    );

    -- 笔记详情表
    CREATE TABLE IF NOT EXISTS note_details (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      detail_type TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes (note_id)
    );

    -- 原始记录表
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood INTEGER,
      mood_emoji TEXT,
      mood_description TEXT,
      life INTEGER,
      study INTEGER,
      work INTEGER,
      inspiration INTEGER,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 简化记录表
    CREATE TABLE IF NOT EXISTS simple_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_description TEXT,
      life_description TEXT,
      study_description TEXT,
      work_description TEXT,
      inspiration_description TEXT,
      mood_emoji TEXT,
      mood_event TEXT,
      mood_score INTEGER,
      mood_category TEXT,
      fitness_intensity TEXT,
      fitness_duration TEXT,
      fitness_calories TEXT,
      fitness_type TEXT,
      study_duration TEXT,
      study_category TEXT,
      work_task_type TEXT,
      work_priority TEXT,
      work_complexity TEXT,
      work_estimated_hours TEXT,
      inspiration_theme TEXT,
      inspiration_product TEXT,
      inspiration_difficulty TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 原始条目表
    CREATE TABLE IF NOT EXISTS raw_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_text TEXT,
      fitness_text TEXT,
      study_text TEXT,
      work_text TEXT,
      inspiration_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI数据表
    CREATE TABLE IF NOT EXISTS ai_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT,
      content TEXT,
      score INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI处理数据表
    CREATE TABLE IF NOT EXISTS ai_processed_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      data_type TEXT NOT NULL,
      original_content TEXT,
      processed_content TEXT,
      ai_analysis TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI增强数据表
    CREATE TABLE IF NOT EXISTS ai_enhanced_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      key_themes TEXT,
      action_items TEXT,
      insights TEXT,
      recommendations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await dbClient.exec(schema);
  
  console.log('✅ Database schema ensured with all tables');
}


export { initDB };
export default () => db;
