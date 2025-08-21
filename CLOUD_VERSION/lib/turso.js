import { createClient } from '@libsql/client';

// 惰性创建 Turso 客户端，并在缺少环境变量时给出清晰错误
function getTursoClient() {
  const url = process.env.DATABASE_URL || process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_TOKEN || process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    const missing = [];
    if (!url) missing.push('TURSO_DATABASE_URL|TURSO_DB_URL|DATABASE_URL');
    if (!authToken) missing.push('TURSO_AUTH_TOKEN|TURSO_TOKEN|DATABASE_TOKEN');
    const err = new Error(`Missing Turso environment variables: ${missing.join(', ')}`);
    err.code = 'MISSING_DB_ENV';
    throw err;
  }

  return createClient({ url, authToken });
}

// 数据库初始化 - 创建表结构
export async function initializeTables() {
  try {
    const turso = getTursoClient();
    // 创建 simple_records 表
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS simple_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood_description TEXT,
        life_description TEXT,
        study_description TEXT,
        work_description TEXT,
        inspiration_description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        mood_emoji TEXT,
        mood_event TEXT,
        fitness_intensity TEXT,
        fitness_duration TEXT,
        fitness_calories TEXT,
        fitness_type TEXT,
        study_duration TEXT,
        study_category TEXT,
        work_ai_summary TEXT,
        work_summary TEXT,
        inspiration_theme TEXT,
        inspiration_product TEXT,
        mood_score INTEGER DEFAULT 0,
        mood_category TEXT,
        work_task_type TEXT,
        work_priority TEXT,
        work_complexity TEXT,
        work_estimated_hours INTEGER,
        inspiration_difficulty TEXT,
        inspiration_progress TEXT,
        overall_sentiment TEXT,
        energy_level INTEGER,
        productivity_score INTEGER,
        life_balance_score INTEGER,
        data_quality_score INTEGER,
        fitness_description TEXT
      )
    `);

    // 创建 raw_entries 表（包含页面/接口使用到的列）
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS raw_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood_text TEXT,
        fitness_text TEXT,
        study_text TEXT,
        work_text TEXT,
        inspiration_text TEXT,
        raw_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        source TEXT DEFAULT 'shortcut'
      )
    `);

    // 兼容已有旧表结构：补齐缺失的列
    try {
      const info = await turso.execute(`PRAGMA table_info(raw_entries)`);
      const existingCols = new Set((info.rows || []).map(r => r[1]));
      const ensureColumn = async (col, type) => {
        if (!existingCols.has(col)) {
          try { await turso.execute(`ALTER TABLE raw_entries ADD COLUMN ${col} ${type}`); } catch (e) { /* ignore */ }
        }
      };
      await ensureColumn('mood_text', 'TEXT');
      await ensureColumn('fitness_text', 'TEXT');
      await ensureColumn('study_text', 'TEXT');
      await ensureColumn('work_text', 'TEXT');
      await ensureColumn('inspiration_text', 'TEXT');
      await ensureColumn('raw_text', 'TEXT');
      await ensureColumn('created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
      await ensureColumn('processed_at', 'DATETIME');
      await ensureColumn('source', "TEXT DEFAULT 'shortcut'");
    } catch (e) {
      console.warn('检查/补齐 raw_entries 列失败（可忽略）:', e?.message || e);
    }

    // 创建 ai_data 表
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        result TEXT NOT NULL,
        confidence_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Turso 数据库表初始化完成');
  } catch (error) {
    console.error('❌ Turso 数据库初始化失败:', error);
    throw error;
  }
}

// 通用查询函数
export async function query(sql, params = []) {
  try {
    const turso = getTursoClient();
    const result = await turso.execute({
      sql,
      args: params
    });
    return result;
  } catch (error) {
    console.error('数据库查询失败:', error);
    throw error;
  }
}

// 插入数据
export async function insert(table, data) {
  try {
    const turso = getTursoClient();
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await turso.execute({
      sql,
      args: values
    });
    
    return result;
  } catch (error) {
    console.error(`插入数据到 ${table} 失败:`, error);
    throw error;
  }
}

// 查询所有记录
export async function selectAll(table, whereClause = '', params = []) {
  try {
    const sql = `SELECT * FROM ${table} ${whereClause} ORDER BY date DESC`;
    const result = await query(sql, params);
    if (result && result.columns && result.rows) {
      const columns = result.columns;
      return result.rows.map(row => {
        const record = {};
        columns.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      });
    }
    if (Array.isArray(result)) return result;
    return [];
  } catch (error) {
    console.error(`查询 ${table} 失败:`, error);
    throw error;
  }
}

// 工具导出：仅在需要时创建客户端
export { getTursoClient as turso };

// 默认导出初始化函数
export default initializeTables;
