import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('Missing TURSO envs');
    process.exit(1);
  }
  const turso = createClient({ url, authToken });

  const ideas = [
    '手机整点震一下，提醒我喝水。',
    '23:30 手机自动开启飞行模式逼我睡觉。',
    '对着手机说“花了 28 块”，自动记账。',
    '电脑桌面贴一张今日三件小事的便利贴。',
    '把今日步数设成手机壁纸，随时看见。',
    '按一下空格键就开始 25 分钟倒计时。',
    '摇一摇手机，随机弹出一句今天的心情词。'
  ];

  // 最近7天（按日期倒序）
  const res = await turso.execute(`SELECT date FROM simple_records ORDER BY date DESC LIMIT 7`);
  const dates = (res.rows || []).map(row => Array.isArray(row) ? row[0] : row.date);

  let updated = 0;
  for (let i = 0; i < dates.length && i < ideas.length; i++) {
    await turso.execute({
      sql: `UPDATE simple_records 
            SET inspiration_description = ?, 
                inspiration_theme = NULL, 
                inspiration_product = NULL, 
                inspiration_difficulty = NULL
            WHERE date = ?`,
      args: [ideas[i], dates[i]]
    });
    updated++;
  }

  console.log(`✅ Replaced inspiration_description for ${updated} rows.`);
}

main().catch(err => { console.error(err); process.exit(1); });
