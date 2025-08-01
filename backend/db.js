import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

async function initDB() {
  db = await open({
    filename: 'records.db',
    driver: sqlite3.Database
  });
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL
    )
  `);
  
  return db;
}

export { initDB };
export default () => db; 