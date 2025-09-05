import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const rubric = JSON.parse(fs.readFileSync('backend/mood-rubric.json','utf8'));

function scoreByRubric(text=''){
  const p=rubric.keywordWeights?.positive||[]; const n=rubric.keywordWeights?.negative||[];
  let s=0; p.forEach(([w,v])=> text.includes(w) && (s+=Number(v||0)) ); n.forEach(([w,v])=> text.includes(w) && (s+=Number(v||0)) );
  const min = rubric.scoreScale?.[0] ?? 0; const max = rubric.scoreScale?.at?.(-1) ?? 5;
  s = Math.max(min, Math.min(max, s));
  const emoji = rubric.emojiByScore?.[String(s)] || '😐';
  const category = rubric.categoryByScore?.[String(s)] || '中性';
  return { s, emoji, category };
}

(async()=>{
  const url = process.env.TURSO_DATABASE_URL; const authToken = process.env.TURSO_AUTH_TOKEN;
  if(!url || !authToken){ console.error('Missing TURSO envs'); process.exit(1); }
  const turso = createClient({ url, authToken });

  const from = process.env.RECOMP_FROM || '2025-01-01';
  const to = process.env.RECOMP_TO || '2099-12-31';

  const r = await turso.execute({ sql:`SELECT id, date, mood_description FROM simple_records WHERE date BETWEEN ? AND ?`, args:[from,to] });
  const rows = (r.rows||[]).map(row => Array.isArray(row) ? { id:row[0], date:row[1], md:row[2] } : { id:row.id, date:row.date, md:row.mood_description });

  let updated=0;
  for(const x of rows){
    const { s, emoji, category } = scoreByRubric(x.md || '');
    await turso.execute({ sql:`UPDATE simple_records SET mood_score=?, mood_emoji=?, mood_category=? WHERE id=?`, args:[s, emoji, category, x.id] });
    updated++;
  }
  console.log('recomputed:', updated);
})();
