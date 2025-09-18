import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
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

function isSelect(sql) {
  return /^\s*select/i.test(sql || '');
}

async function initDB() {
  const useTurso = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

  if (useTurso) {
    console.log('Turso environment variables found. Connecting to Turso...');
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    await turso.execute('SELECT 1');
    console.log('✅ Successfully connected to Turso.');

    db = {
      async execute(argOrSql, maybeArgs) {
        if (typeof argOrSql === 'string') {
          return turso.execute({ sql: argOrSql, args: maybeArgs || [] });
        }
        return turso.execute(argOrSql);
      },
      async run(sql, params = []) {
        await turso.execute({ sql, args: params });
        return { changes: 1 };
      },
      async all(sql, params = []) {
        const res = await turso.execute({ sql, args: params });
        return res.rows || [];
      },
      async get(sql, params = []) {
        const rows = await this.all(sql, params);
        return rows[0] || null;
      },
      async exec(sql) {
        const statements = String(sql).split(';').map(s => s.trim()).filter(Boolean);
        for (const s of statements) {
          await turso.execute(s);
        }
      }
    };

    await ensureSchema(db);
    return db;
  }

  console.log('Turso environment variables not found. Using local SQLite database.');
  const sqlite = await open({
    filename: 'records.db',
    driver: sqlite3.Database
  });

  db = {
    async execute(argOrSql, maybeArgs) {
      if (typeof argOrSql === 'string') {
        const sql = argOrSql;
        const args = maybeArgs || [];
        if (isSelect(sql)) {
          const rows = await sqlite.all(sql, args);
          return { rows };
        }
        await sqlite.run(sql, args);
        return { rows: [] };
      }
      const { sql, args = [] } = argOrSql || {};
      if (isSelect(sql)) {
        const rows = await sqlite.all(sql, args);
        return { rows };
      }
      await sqlite.run(sql, args);
      return { rows: [] };
    },
    async run(sql, params = []) {
      return sqlite.run(sql, params);
    },
    async all(sql, params = []) {
      return sqlite.all(sql, params);
    },
    async get(sql, params = []) {
      return sqlite.get(sql, params);
    },
    async exec(sql) {
      return sqlite.exec(sql);
    }
  };

  await ensureSchema(db);
  return db;
}

async function ensureSchema(dbClient) {
  const schema = `
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
      mood_score REAL,
      mood_category TEXT,
      fitness_description TEXT,
      fitness_intensity TEXT,
      fitness_duration TEXT,
      fitness_calories TEXT,
      fitness_type TEXT,
      inspiration_theme TEXT,
      inspiration_product TEXT,
      inspiration_difficulty TEXT,
      inspiration_progress TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS raw_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_text TEXT,
      life_text TEXT,
      study_text TEXT,
      work_text TEXT,
      inspiration_text TEXT,
      fitness_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT,
      content TEXT,
      score REAL
    );

    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      note_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      duration_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notebook_id) REFERENCES notebooks (id)
    );
  `;
  await dbClient.exec(schema);
  
  // 检查并添加缺失的列
  await addMissingColumns(dbClient);
  
  // 插入示例数据
  await insertSampleData(dbClient);
}

async function addMissingColumns(dbClient) {
  try {
    // 检查notebooks表是否有note_count列
    const columns = await dbClient.all("PRAGMA table_info(notebooks)");
    const hasNoteCount = columns.some(col => col.name === 'note_count');
    
    if (!hasNoteCount) {
      console.log('Adding note_count column to notebooks table...');
      await dbClient.run('ALTER TABLE notebooks ADD COLUMN note_count INTEGER DEFAULT 0');
      console.log('✅ Added note_count column to notebooks table');
    }
  } catch (error) {
    console.error('Error adding missing columns:', error);
  }
}

// 生成Turso格式的ID
function generateTursoId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `A${timestamp}${random}`.toUpperCase();
}

async function insertSampleData(dbClient) {
  try {
    // 检查是否已有数据
    const existingNotebooks = await dbClient.all('SELECT COUNT(*) as count FROM notebooks');
    if (existingNotebooks[0].count > 0) {
      console.log('Sample data already exists, skipping insertion');
      return;
    }

    // 生成示例笔记本ID
    const notebook1Id = generateTursoId();
    const notebook2Id = generateTursoId();
    const notebook3Id = generateTursoId();

    // 插入示例笔记本
    await dbClient.run(
      'INSERT INTO notebooks (id, name, note_count) VALUES (?, ?, ?)',
      [notebook1Id, '学习笔记', 3]
    );
    
    await dbClient.run(
      'INSERT INTO notebooks (id, name, note_count) VALUES (?, ?, ?)',
      [notebook2Id, '工作记录', 2]
    );

    await dbClient.run(
      'INSERT INTO notebooks (id, name, note_count) VALUES (?, ?, ?)',
      [notebook3Id, '生活感悟', 1]
    );

    // 插入示例笔记
    const note1Id = generateTursoId();
    const note2Id = generateTursoId();
    const note3Id = generateTursoId();
    const note4Id = generateTursoId();
    const note5Id = generateTursoId();
    const note6Id = generateTursoId();

    await dbClient.run(
      'INSERT INTO notes (id, note_id, notebook_id, title, content_text, image_url, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [note1Id, note1Id, notebook1Id, 'React学习笔记', 'React是一个用于构建用户界面的JavaScript库。它使用组件化的开发模式，让代码更加模块化和可维护。', 'https://via.placeholder.com/300x200?text=React+Notes', 45, 'success']
    );

    await dbClient.run(
      'INSERT INTO notes (id, note_id, notebook_id, title, content_text, image_url, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [note2Id, note2Id, notebook1Id, 'JavaScript基础', 'JavaScript是一种动态类型的编程语言，支持面向对象、命令式和函数式编程风格。', 'https://via.placeholder.com/300x200?text=JavaScript', 60, 'success']
    );

    await dbClient.run(
      'INSERT INTO notes (id, note_id, notebook_id, title, content_text, image_url, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [note3Id, note3Id, notebook1Id, 'TypeScript进阶', 'TypeScript是JavaScript的超集，添加了静态类型检查，提高了代码的可维护性和开发效率。', 'https://via.placeholder.com/300x200?text=TypeScript', 90, 'success']
    );

    await dbClient.run(
      'INSERT INTO notes (id, note_id, notebook_id, title, content_text, image_url, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [note4Id, note4Id, notebook2Id, '项目会议记录', '今天的项目会议讨论了新功能的开发计划和资源分配问题。', 'https://via.placeholder.com/300x200?text=Meeting', 30, 'success']
    );

    await dbClient.run(
      'INSERT INTO notes (id, note_id, notebook_id, title, content_text, image_url, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [note5Id, note5Id, notebook2Id, '代码审查', '完成了用户认证模块的代码审查，发现了一些性能优化点。', 'https://via.placeholder.com/300x200?text=Code+Review', 25, 'success']
    );

    await dbClient.run(
      'INSERT INTO notes (id, note_id, notebook_id, title, content_text, image_url, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [note6Id, note6Id, notebook3Id, '今日感悟', '今天学到了很多新知识，感觉自己在不断进步。', 'https://via.placeholder.com/300x200?text=Life+Thoughts', 15, 'success']
    );

    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

export { initDB };
export default () => db;
