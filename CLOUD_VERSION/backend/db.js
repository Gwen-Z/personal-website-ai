import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

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
  `;
  await dbClient.exec(schema);
}

export { initDB };
export default () => db;
