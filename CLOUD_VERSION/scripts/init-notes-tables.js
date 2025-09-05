import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('❌ Missing TURSO envs. Please set them in .env.local');
    process.exit(1);
  }

  const turso = createClient({ url, authToken });
  console.log('🚀 Connecting to Turso...');

  // 1. Create notebooks table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ `notebooks` table ensured.');

  // 2. Create notes table
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notebook_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      image_url TEXT,
      duration_minutes INTEGER,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id)
    )
  `);
  console.log('✅ `notes` table ensured.');

  // 3. Add a default notebook if none exists
  let notebookResult = await turso.execute({sql: "SELECT * FROM notebooks WHERE name = ?", args: ['默认笔记本']});
  let defaultNotebookId;

  if (notebookResult.rows.length === 0) {
    const insertResult = await turso.execute({
      sql: "INSERT INTO notebooks (name) VALUES (?)",
      args: ['默认笔记本']
    });
    defaultNotebookId = insertResult.lastInsertRowid;
    console.log('✅ Added `默认笔记本`.');
  } else {
    const row = notebookResult.rows[0];
    defaultNotebookId = typeof row === 'object' ? row.id : row[0];
    console.log('ℹ️ `默认笔记本` already exists.');
  }

  // 4. Add a sample note if the notebook is empty
  const noteCountResult = await turso.execute({
    sql: "SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?",
    args: [defaultNotebookId]
  });

  const noteCountRow = noteCountResult.rows[0];
  const noteCount = (typeof noteCountRow === 'object' ? noteCountRow.count : noteCountRow[0]) || 0;

  if (noteCount === 0) {
    await turso.execute({
      sql: `INSERT INTO notes (notebook_id, title, image_url, duration_minutes, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [
        defaultNotebookId,
        '冥想背后的科学机制——点都不玄，无非是利用了一个人体BUG',
        'https://i.ytimg.com/vi/5qAP5a6L6h8/maxresdefault.jpg', // Placeholder image from a relevant video
        14,
        '2025-09-05 12:12:14'
      ]
    });
    console.log('✅ Added a sample note to `默认笔记本`.');
  } else {
    console.log('ℹ️ `默认笔记本` already contains notes.');
  }

  console.log('🎉 Notes schema initialization complete!');
}

main().catch(err => {
  console.error('❌ Error during schema initialization:', err);
  process.exit(1);
});