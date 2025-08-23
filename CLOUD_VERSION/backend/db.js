import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

async function initDB() {
  db = await open({
    filename: 'records.db',
    driver: sqlite3.Database
  });
  
  // 新的简化记录表：只保留文本描述，不要评分
  await db.exec(`
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
      fitness_intensity TEXT,
      fitness_duration TEXT,
      fitness_calories TEXT,
      fitness_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, mood_description, life_description, study_description, work_description, inspiration_description)
    )
  `);

  // 保留旧表以备迁移使用
  await db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood REAL NOT NULL,
      mood_emoji TEXT DEFAULT '😊',
      mood_description TEXT,
      life REAL NOT NULL,
      study REAL NOT NULL,
      work REAL NOT NULL,
      inspiration REAL NOT NULL,
      note TEXT
    )
  `);

  // 迁移：为老表补充新列（mood_emoji、mood_description）
  try {
    const columns = await db.all(`PRAGMA table_info(records)`);
    const hasEmoji = columns.some(c => c.name === 'mood_emoji');
    const hasDesc = columns.some(c => c.name === 'mood_description');
    if (!hasEmoji) {
      await db.exec(`ALTER TABLE records ADD COLUMN mood_emoji TEXT DEFAULT '😊'`);
    }
    if (!hasDesc) {
      await db.exec(`ALTER TABLE records ADD COLUMN mood_description TEXT`);
    }
  } catch (e) {
    // 忽略迁移错误（如并发执行时的重复添加）
  }

  // 迁移：为simple_records表补充AI总结字段
  try {
    const simpleColumns = await db.all(`PRAGMA table_info(simple_records)`);
    const hasMoodEmoji = simpleColumns.some(c => c.name === 'mood_emoji');
    const hasMoodEvent = simpleColumns.some(c => c.name === 'mood_event');
    const hasMoodScore = simpleColumns.some(c => c.name === 'mood_score');
    const hasMoodCategory = simpleColumns.some(c => c.name === 'mood_category');
    const hasFitnessDescription = simpleColumns.some(c => c.name === 'fitness_description');
    const hasFitnessIntensity = simpleColumns.some(c => c.name === 'fitness_intensity');
    const hasFitnessDuration = simpleColumns.some(c => c.name === 'fitness_duration');
    const hasFitnessCalories = simpleColumns.some(c => c.name === 'fitness_calories');
    const hasFitnessType = simpleColumns.some(c => c.name === 'fitness_type');
    const hasInspirationTheme = simpleColumns.some(c => c.name === 'inspiration_theme');
    const hasInspirationProduct = simpleColumns.some(c => c.name === 'inspiration_product');
    const hasInspirationDifficulty = simpleColumns.some(c => c.name === 'inspiration_difficulty');
    const hasInspirationProgress = simpleColumns.some(c => c.name === 'inspiration_progress');
    
    if (!hasMoodEmoji) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN mood_emoji TEXT`);
    }
    if (!hasMoodEvent) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN mood_event TEXT`);
    }
    if (!hasMoodScore) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN mood_score REAL`);
    }
    if (!hasMoodCategory) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN mood_category TEXT`);
    }
    if (!hasFitnessDescription) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN fitness_description TEXT`);
    }
    if (!hasFitnessIntensity) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN fitness_intensity TEXT`);
    }
    if (!hasFitnessDuration) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN fitness_duration TEXT`);
    }
    if (!hasFitnessCalories) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN fitness_calories TEXT`);
    }
    if (!hasFitnessType) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN fitness_type TEXT`);
    }
    if (!hasInspirationTheme) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN inspiration_theme TEXT`);
    }
    if (!hasInspirationProduct) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN inspiration_product TEXT`);
    }
    if (!hasInspirationDifficulty) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN inspiration_difficulty TEXT`);
    }
    if (!hasInspirationProgress) {
      await db.exec(`ALTER TABLE simple_records ADD COLUMN inspiration_progress TEXT`);
    }
  } catch (e) {
    // 忽略迁移错误
  }

  // 迁移：为raw_entries表添加fitness_text字段
  try {
    const rawColumns = await db.all(`PRAGMA table_info(raw_entries)`);
    const hasFitnessText = rawColumns.some(c => c.name === 'fitness_text');
    
    if (!hasFitnessText) {
      await db.exec(`ALTER TABLE raw_entries ADD COLUMN fitness_text TEXT`);
    }
  } catch (e) {
    // 忽略迁移错误
  }
  
  // 存储 AI 数据（按日期与类别的结构化结果/摘要）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT,
      content TEXT,
      score REAL
    )
  `);
  
  // 存储原始输入数据（用户语音/文本输入，未经AI处理）
  await db.exec(`
    CREATE TABLE IF NOT EXISTS raw_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_text TEXT,
      life_text TEXT,
      study_text TEXT,
      work_text TEXT,
      inspiration_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  return db;
}

export { initDB };
export default () => db;