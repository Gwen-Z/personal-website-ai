import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

// Load Turso creds from local env
dotenv.config({ path: '.env.local' });

function analyzeMood(text = '') {
  const positive = ['开心','高兴','愉快','满足','兴奋','顺利','喜欢','舒适','轻松','松弛','收获','进展','快乐','满意','开心'];
  const negative = ['焦虑','难过','疲惫','压力','担心','紧张','挫败','生气','低落','沮丧','不爽','烦躁'];
  const pHits = positive.filter(w => text.includes(w)).length;
  const nHits = negative.filter(w => text.includes(w)).length;
  const score = Math.max(-3, Math.min(3, pHits - nHits));
  const category = score > 1 ? '积极' : score < -1 ? '消极' : '中性';
  const emoji = score >= 2 ? '😄' : score === 1 ? '🙂' : score === 0 ? '😐' : score === -1 ? '😣' : '😫';
  const event = (text.split(/[，。,.,\s]/)[0] || '日常心情').slice(0, 12) || '日常心情';
  return { mood_score: score, mood_category: category, mood_emoji: emoji, mood_event: event };
}

function analyzeFitness(text = '') {
  if (!text) return { fitness_intensity: '', fitness_duration: '', fitness_calories: '', fitness_type: '' };
  const typeMatch = text.match(/(跑步|散步|快走|骑行|游泳|健身|瑜伽|力量|壶铃|有氧|攀岩|HIIT)/);
  const minMatch = text.match(/(\d+\s*(分钟|min))/i);
  const kmMatch = text.match(/(\d+(?:\.\d+)?\s*km)/i);
  const duration = minMatch ? minMatch[1].replace(/\s*/g,'') : (kmMatch ? kmMatch[1] : '');
  const type = typeMatch ? typeMatch[1] : (kmMatch ? '有氧' : '');
  const intensity = /快|强|高强度|爬坡|HIIT/.test(text) ? '高强度' : /慢|散步|拉伸/.test(text) ? '低强度' : (text ? '中等强度' : '');
  let calories = '';
  const minNum = (text.match(/(\d+)\s*(分钟|min)/i) || [])[1];
  const kmNum = (text.match(/(\d+(?:\.\d+)?)(?=\s*km)/i) || [])[1];
  if (minNum) calories = String(Math.round(Number(minNum) * 5));
  else if (kmNum) calories = String(Math.round(Number(kmNum) * 60));
  return { fitness_intensity: intensity, fitness_duration: duration, fitness_calories: calories, fitness_type: type };
}

async function ensureSimpleRecordsSchema(turbo) {
  await turbo.execute(`
    CREATE TABLE IF NOT EXISTS simple_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL
    )
  `);
  const info = await turbo.execute(`PRAGMA table_info(simple_records)`);
  const existing = new Set((info.rows || []).map(r => r[1]));
  const add = async (name, type) => {
    if (!existing.has(name)) {
      try { await turbo.execute(`ALTER TABLE simple_records ADD COLUMN ${name} ${type}`); existing.add(name); } catch {}
    }
  };
  await add('mood_description', 'TEXT');
  await add('life_description', 'TEXT');
  await add('study_description', 'TEXT');
  await add('work_description', 'TEXT');
  await add('inspiration_description', 'TEXT');
  await add('created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');
  await add('mood_emoji', 'TEXT');
  await add('mood_event', 'TEXT');
  await add('mood_score', 'INTEGER DEFAULT 0');
  await add('mood_category', 'TEXT');
  await add('fitness_intensity', 'TEXT');
  await add('fitness_duration', 'TEXT');
  await add('fitness_calories', 'TEXT');
  await add('fitness_type', 'TEXT');
}

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) { console.error('Missing TURSO envs'); process.exit(1); }
  const turso = createClient({ url, authToken });

  const from = process.env.BACKFILL_FROM || '2025-08-27';
  const to = process.env.BACKFILL_TO || '2025-09-02';

  await ensureSimpleRecordsSchema(turso);

  const res = await turso.execute({
    sql: `SELECT id,date,mood_text,fitness_text,study_text,work_text,inspiration_text FROM raw_entries WHERE date BETWEEN ? AND ? ORDER BY date`,
    args: [from, to]
  });

  let records = [];
  if (res && Array.isArray(res.rows) && res.rows.length > 0) {
    if (Array.isArray(res.rows[0])) {
      const cols = res.columns || ['id','date','mood_text','fitness_text','study_text','work_text','inspiration_text'];
      records = res.rows.map(row => Object.fromEntries(row.map((v,i)=>[cols[i], v])));
    } else {
      records = res.rows;
    }
  }
  console.log(`Found ${records.length} raw_entries to backfill`);

  let writes = 0;
  for (const r of records) {
    const mood = analyzeMood(r.mood_text || '');
    const fitness = analyzeFitness(r.fitness_text || '');

    // First try UPDATE by date
    await turso.execute({
      sql: `UPDATE simple_records SET 
              mood_description=?,
              life_description=?,
              study_description=?,
              work_description=?,
              inspiration_description=?,
              mood_emoji=?,
              mood_event=?,
              mood_score=?,
              mood_category=?,
              fitness_intensity=?,
              fitness_duration=?,
              fitness_calories=?,
              fitness_type=?
            WHERE date=?`,
      args: [
        r.mood_text || '',
        r.fitness_text || '',
        r.study_text || '',
        r.work_text || '',
        r.inspiration_text || '',
        mood.mood_emoji,
        mood.mood_event,
        mood.mood_score,
        mood.mood_category,
        fitness.fitness_intensity,
        fitness.fitness_duration,
        fitness.fitness_calories,
        fitness.fitness_type,
        r.date
      ]
    });

    // Then conditional INSERT if not exists
    await turso.execute({
      sql: `INSERT INTO simple_records (date, mood_description, life_description, study_description, work_description, inspiration_description, mood_emoji, mood_event, mood_score, mood_category, fitness_intensity, fitness_duration, fitness_calories, fitness_type)
            SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?
            WHERE NOT EXISTS (SELECT 1 FROM simple_records WHERE date = ?)`,
      args: [
        r.date,
        r.mood_text || '',
        r.fitness_text || '',
        r.study_text || '',
        r.work_text || '',
        r.inspiration_text || '',
        mood.mood_emoji,
        mood.mood_event,
        mood.mood_score,
        mood.mood_category,
        fitness.fitness_intensity,
        fitness.fitness_duration,
        fitness.fitness_calories,
        fitness.fitness_type,
        r.date
      ]
    });
    writes += 1;
  }

  const check = await turso.execute({
    sql: `SELECT COUNT(*) AS c FROM simple_records WHERE date BETWEEN ? AND ?`,
    args: [from, to]
  });
  const count = (check.rows && check.rows[0] && (check.rows[0].c || check.rows[0][0])) || 0;
  console.log(`✅ Backfilled ${writes} rows processed. simple_records range count: ${count}`);
}

main().catch(err => { console.error(err); process.exit(1); });
