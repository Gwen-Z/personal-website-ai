const { createClient } = require('@libsql/client');

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
async function initializeTables() {
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
        inspiration_difficulty TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建 raw_entries 表
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS raw_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
}

// 执行查询
async function query(sql, params = []) {
  try {
    const turso = getTursoClient();
    const result = await turso.execute(sql, params);
    return result.rows;
  } catch (error) {
    console.error('查询执行失败:', error);
    throw error;
  }
}

// 插入数据
async function insert(table, data) {
  try {
    const turso = getTursoClient();
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await turso.execute(sql, values);
    
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.rowsAffected
    };
  } catch (error) {
    console.error('插入数据失败:', error);
    throw error;
  }
}

// 查询所有记录
async function selectAll(table, conditions = {}, orderBy = 'id DESC') {
  try {
    const turso = getTursoClient();
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }
    
    sql += ` ORDER BY ${orderBy}`;
    
    const result = await turso.execute(sql, params);
    return result.rows;
  } catch (error) {
    console.error('查询所有记录失败:', error);
    throw error;
  }
}

// 更新数据
async function update(table, data, conditions) {
  try {
    const turso = getTursoClient();
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(conditions)];
    
    const result = await turso.execute(sql, params);
    
    return {
      changes: result.rowsAffected
    };
  } catch (error) {
    console.error('更新数据失败:', error);
    throw error;
  }
}

module.exports = {
  initializeTables,
  query,
  insert,
  selectAll,
  update,
  turso: getTursoClient
};



