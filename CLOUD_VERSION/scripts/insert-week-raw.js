import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import axios from 'axios';

// Load local env for Turso
dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('Missing TURSO envs. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local');
    process.exit(1);
  }

  const turso = createClient({ url, authToken });

  // Ensure table exists
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS raw_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_text TEXT,
      fitness_text TEXT,
      study_text TEXT,
      work_text TEXT,
      inspiration_text TEXT,
      raw_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      source TEXT DEFAULT 'shortcut'
    )
  `);

  const rows = [
    ['2025-08-27','周一综合症，但想到月底冲刺就打了鸡血','早起 5 km 江边慢跑，晚上 15 min 核心','读完 Diffusion 论文最后一章，顺手做了 10 条 Anki 卡片','把模型评测脚本改成分布式，省 40 % 时间','用 GitHub Actions 自动把每日训练日志转成长图发群里'],
    ['2025-08-28','上午像被榨干，下午喝到冰美式原地复活','午休 20 min 拉伸，下班去攀岩馆刷了两条 V2','复现 LoRA 微调，把显存压到 8 G 以内','给产品同事讲清「为什么这次指标涨 3 % 就是胜利」','给 Slack 加个 bot，/mood 一下就能记录此刻心情'],
    ['2025-08-29','小雨天自带白噪音，敲代码像在拍 ASMR','在家跟 Keep 做了 30 min HIIT，汗湿整块瑜伽垫','啃完 BERT 源码，终于看懂 attention mask 那一坨','把数据集脏样本洗了七轮，F1 嗖嗖涨','做个浏览器插件，一键把 arXiv 公式复制成 Markdown'],
    ['2025-08-30','咖啡续到第四杯，指尖都在抖但大脑起飞','晚上 10 km 夜骑，耳机里放《银河护卫队》原声','写了个小脚本，把实验结果自动画成可交互 Plotly 图','跟客户开 30 min 会，把需求砍掉了 40 % 还皆大欢喜','用飞书多维表格做个人 KPI 看板，实时拉 GitHub 数据'],
    ['2025-08-31','周五的松弛感，从穿拖鞋上班开始','午饭后绕园区快走 3 km，晒了十分钟太阳补钙','重读《Clean Code》，顺手重构了祖传 utils.py','把本周实验打包成可复现 Docker，一键 run 就能复现','给 iPhone 背面 NFC 贴个小标签，手机一碰就弹出今日待办'],
    ['2025-09-01','周六懒洋洋，把闹钟全关掉睡到自然醒','下午去游泳馆刷 1000 m，回家路上抱了半个西瓜','用 Stable Diffusion 给自己画了新头像，迭代 50 版','零工作！彻底离线，把 Notion 通知全关掉','想写个「数字墓志铭」项目，把个人数据优雅封存上链'],
    ['2025-09-02','月底小复盘，既满足又焦虑，像翻书到最后一页','上午在家做 40 min 壶铃，晚上散步到江边看晚霞','整理本月博客草稿 12 篇，选出 3 篇精修待发','用 1 h 写完周报，发现 OKR 完成度 93 %，开心','把每周数据自动渲染成一张「人生仪表盘」存成壁纸'],
  ];

  // Optional: clear existing range to avoid duplicates
  await turso.execute({
    sql: `DELETE FROM raw_entries WHERE date BETWEEN ? AND ?`,
    args: ['2025-08-27','2025-09-02']
  });

  let inserted = 0;
  for (const r of rows) {
    await turso.execute({
      sql: `INSERT INTO raw_entries (date, mood_text, fitness_text, study_text, work_text, inspiration_text, source) VALUES (?,?,?,?,?,?, 'manual')`,
      args: r
    });
    inserted += 1;
  }

  const count = await turso.execute({
    sql: `SELECT COUNT(*) AS c FROM raw_entries WHERE date BETWEEN ? AND ?`,
    args: ['2025-08-27','2025-09-02']
  });
  const total = count.rows?.[0]?.[0] ?? 0;
  console.log(`✅ Inserted ${inserted} rows. Range count now: ${total}`);

  // Trigger cloud batch processing (ai_processed_data)
  const apiBase = process.env.VERCEL_API_URL || 'https://personal-website-cloud-v2.vercel.app';
  try {
    const resp = await axios.post(`${apiBase}/api/batch-doubao`, { limit: 50 }, { timeout: 15000 });
    console.log('🚀 Batch trigger response:', resp.data);
  } catch (e) {
    console.warn('⚠️ Failed to trigger batch:', e.response?.data || e.message);
  }

  console.log('🎉 Done');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
