import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL || 'doubao-lite-32k-240828';

  if (!url || !authToken || !apiKey || !baseUrl) {
    console.error('Missing envs, need TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, OPENAI_API_KEY, OPENAI_BASE_URL');
    process.exit(1);
  }

  const turso = createClient({ url, authToken });
  const from = process.env.BACKFILL_FROM || '2025-08-27';
  const to = process.env.BACKFILL_TO || '2025-09-02';

  const res = await turso.execute({
    sql: `SELECT date, inspiration_description FROM simple_records WHERE date BETWEEN ? AND ? ORDER BY date`,
    args: [from, to]
  });

  let items = [];
  if (res.rows?.length) {
    if (Array.isArray(res.rows[0])) {
      const [colDate, colDesc] = [res.columns.indexOf('date'), res.columns.indexOf('inspiration_description')];
      items = res.rows.map(r => ({ date: r[colDate], desc: r[colDesc] || '' }));
    } else {
      items = res.rows.map(r => ({ date: r.date, desc: r.inspiration_description || '' }));
    }
  }

  console.log(`Found ${items.length} records to enrich`);

  let updated = 0;
  for (const it of items) {
    if (!it.desc || !it.desc.trim()) continue;

    const prompt = `仅输出JSON，无额外文字：\n{\n  "inspiration_theme": "≤12字主题或空",\n  "inspiration_product": "≤24字产品形态或空",\n  "inspiration_difficulty": "高|中|低 或空"\n}\n文本：${it.desc}`;

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 150, temperature: 0.7 })
    });
    if (!resp.ok) { console.warn('AI error for', it.date, await resp.text()); continue; }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    let parsed = {};
    try { parsed = JSON.parse(clean); } catch { console.warn('parse fail for', it.date, clean); continue; }

    await turso.execute({
      sql: `UPDATE simple_records SET 
             inspiration_theme = COALESCE(?, inspiration_theme),
             inspiration_product = COALESCE(?, inspiration_product),
             inspiration_difficulty = COALESCE(?, inspiration_difficulty)
           WHERE date = ?`,
      args: [parsed.inspiration_theme || '', parsed.inspiration_product || '', parsed.inspiration_difficulty || '', it.date]
    });
    updated++;
  }

  console.log(`✅ Updated ${updated} rows with inspiration fields.`);
}

main().catch(e => { console.error(e); process.exit(1); });
