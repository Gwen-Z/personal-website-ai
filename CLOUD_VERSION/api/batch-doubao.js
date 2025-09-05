import { createClient } from '@libsql/client';
import fs from 'fs';

// 简化的批处理 - 直接调用豆包 API

function loadRubric() {
  try {
    const txt = fs.readFileSync('backend/mood-rubric.json', 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return {
      scoreScale: [0,1,2,3,4,5],
      emojiByScore: {"0":"😐","1":"🙂","2":"😊","3":"😄","4":"🤩","5":"🎉"},
      categoryByScore: {"0":"中性","1":"偏正","2":"正向","3":"很正","4":"高正","5":"极正"},
      keywordWeights: { positive: [["开心",1],["兴奋",2],["满足",1],["顺利",1],["放松",1]], negative: [["焦虑",-2],["难过",-2],["压力",-1],["疲惫",-1],["沮丧",-2]] }
    };
  }
}

function scoreByRubric(text = '', rubric) {
  const pos = rubric.keywordWeights?.positive || [];
  const neg = rubric.keywordWeights?.negative || [];
  let s = 0;
  pos.forEach(([w, v]) => { if (text.includes(w)) s += Number(v||0); });
  neg.forEach(([w, v]) => { if (text.includes(w)) s += Number(v||0); });
  const min = rubric.scoreScale?.[0] ?? 0; const max = rubric.scoreScale?.at?.(-1) ?? 5;
  s = Math.max(min, Math.min(max, s));
  const emoji = rubric.emojiByScore?.[String(s)] || '😐';
  const category = rubric.categoryByScore?.[String(s)] || '中性';
  return { score: s, emoji, category };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { limit = 2 } = req.body || {};

    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      return res.status(503).json({ error: '数据库未配置', details: '请配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN' });
    }

    const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    const rubric = loadRubric();

    console.log('🚀 开始豆包批处理...');

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_processed_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_entry_id INTEGER,
        date TEXT NOT NULL,
        mood_score INTEGER,
        mood_emoji TEXT,
        mood_description TEXT,
        life_score INTEGER,
        study_score INTEGER,
        work_score INTEGER,
        inspiration_score INTEGER,
        summary TEXT,
        ai_model TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(raw_entry_id)
      )
    `);

    const rawDataResult = await turso.execute({
      sql: `
        SELECT r.* FROM raw_entries r
        LEFT JOIN ai_processed_data a ON r.id = a.raw_entry_id
        WHERE a.id IS NULL
        ORDER BY r.date DESC
        LIMIT ?
      `,
      args: [limit]
    });

    const rawDataList = rawDataResult.rows.map(row => {
      const record = {}; rawDataResult.columns.forEach((c, i) => record[c] = row[i]); return record;
    });

    if (rawDataList.length === 0) {
      return res.status(200).json({ success: true, message: '没有需要处理的数据', processed: 0 });
    }

    const results = []; let successCount = 0;

    for (const rawEntry of rawDataList) {
      try {
        console.log(`🔄 处理 ID ${rawEntry.id}`);

        const prompt = `仅输出严格 JSON（无多余文本/代码块）：\n{\n  "date": "YYYY-MM-DD",\n  "mood": 0-5,\n  "mood_emoji": "单个emoji",\n  "mood_description": "≤20字",\n  "life": 0-5,\n  "study": 0-5,\n  "work": 0-5,\n  "inspiration": 0-5,\n  "summary": "≤60字",\n  "inspiration_theme": "≤12字主题或空字符串",\n  "inspiration_product": "≤24字潜在产品形态或空字符串",\n  "inspiration_difficulty": "高|中|低 或空字符串"\n}\n心情评分与emoji按以下规则执行（不要擅自改变）：\n- 评分区间：${JSON.stringify(rubric.scoreScale)}\n- 关键词权重：${JSON.stringify(rubric.keywordWeights)}\n- 评分计算：${rubric.scoringRule || '关键词权重和裁剪到区间'}\n- emoji映射：${JSON.stringify(rubric.emojiByScore)}\n- 分类映射：${JSON.stringify(rubric.categoryByScore)}\n\n数据:\n日期: ${rawEntry.date}\n心情: ${rawEntry.mood_text || '无'}\n生活: ${rawEntry.fitness_text || rawEntry.life_text || '无'}\n学习: ${rawEntry.study_text || '无'}\n工作: ${rawEntry.work_text || '无'}\n灵感: ${rawEntry.inspiration_text || '无'}\n\n输出:`;

        const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'doubao-lite-32k-240828', messages: [{ role: 'user', content: prompt }], max_tokens: 400, temperature: 0.7 })
        });
        if (!response.ok) { const t = await response.text(); throw new Error(`豆包 API 错误 ${response.status}: ${t}`); }
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content; if (!content) throw new Error('AI 响应为空');
        const aiResult = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());

        // 使用本地规则对心情进行强制规范化
        const local = scoreByRubric(rawEntry.mood_text || '', rubric);

        // 存储到 ai_processed_data
        await turso.execute({
          sql: `INSERT OR REPLACE INTO ai_processed_data 
                (raw_entry_id, date, mood_score, mood_emoji, mood_description, life_score, study_score, work_score, inspiration_score, summary, ai_model) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            rawEntry.id,
            aiResult.date || rawEntry.date,
            local.score, // 强制使用本地评分
            local.emoji,
            aiResult.mood_description || '',
            aiResult.life || 0,
            aiResult.study || 0,
            aiResult.work || 0,
            aiResult.inspiration || 0,
            aiResult.summary || '',
            process.env.OPENAI_MODEL || 'doubao-lite-32k-240828'
          ]
        });

        // 同步到 simple_records：心情三列 + 灵感三列
        await turso.execute({
          sql: `UPDATE simple_records SET 
                   mood_score=?, mood_emoji=?, mood_category=?, mood_description=COALESCE(?, mood_description),
                   inspiration_theme = COALESCE(?, inspiration_theme),
                   inspiration_product = COALESCE(?, inspiration_product),
                   inspiration_difficulty = COALESCE(?, inspiration_difficulty)
                 WHERE date = ?`,
          args: [
            local.score,
            local.emoji,
            scoreByRubric(rawEntry.mood_text||'', rubric).category,
            aiResult.mood_description || '',
            aiResult.inspiration_theme || '',
            aiResult.inspiration_product || '',
            aiResult.inspiration_difficulty || '',
            aiResult.date || rawEntry.date
          ]
        });

        results.push({ id: rawEntry.id, date: rawEntry.date, status: 'success', ai_result: aiResult });
        successCount++;
        console.log(`✅ 成功处理 ID ${rawEntry.id}`);
      } catch (error) {
        console.error(`❌ 处理 ID ${rawEntry.id} 失败:`, error.message);
        results.push({ id: rawEntry.id, date: rawEntry.date, status: 'error', error: error.message });
      }
    }

    return res.status(200).json({ success: true, message: '豆包批处理完成', processed: successCount, results });
  } catch (error) {
    console.error('批处理失败:', error);
    return res.status(500).json({ error: '批处理失败', message: error.message });
  }
}
