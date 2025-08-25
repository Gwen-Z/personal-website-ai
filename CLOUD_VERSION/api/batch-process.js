// /api/batch-process.js

import { query, insert, turso } from '../lib/turso.js';
import CloudAIService from '../lib/cloud-ai-service.js';

export default async function handler(req, res) {
  // 安全校验：只允许来自Vercel Cron的请求或在开发环境中手动触发
  if (process.env.NODE_ENV === 'production' && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 [Cron] Starting batch processing...');

    // 1. 查询最多5条尚未处理的原始记录
    const { rows: rawEntries } = await query(
      `SELECT * FROM raw_entries WHERE processed_at IS NULL LIMIT 5`
    );

    if (rawEntries.length === 0) {
      console.log('✅ [Cron] No new entries to process.');
      return res.status(200).json({ success: true, message: 'No new entries to process.' });
    }

    console.log(`🔍 [Cron] Found ${rawEntries.length} new entries to process.`);

    const aiService = new CloudAIService();
    const client = turso();
    const tx = await client.transaction();

    try {
      for (const entry of rawEntries) {
        const rawText = entry.raw_text;
        console.log(`🤖 [Cron] Processing entry ID: ${entry.id}, Text: "${rawText.substring(0, 50)}..."`);

        // 2. 调用AI服务进行处理
        const aiResult = await aiService.processRawData({ date: entry.date, mood_text: rawText });
        
        // 3. 将AI处理后的结构化数据存入 simple_records 表
        const simpleRecord = {
          date: entry.date,
          mood_description: aiResult.mood_description,
          life_description: aiResult.life_description, // 假设AI会返回这些字段
          study_description: aiResult.study_description,
          work_description: aiResult.work_description,
          inspiration_description: aiResult.inspiration_description,
          mood_emoji: aiResult.mood_emoji,
          mood_score: aiResult.mood,
          // ... 其他AI返回的字段
        };
        await tx.execute({ 
            sql: `INSERT INTO simple_records (date, mood_description, life_description, study_description, work_description, inspiration_description, mood_emoji, mood_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            args: [simpleRecord.date, simpleRecord.mood_description, simpleRecord.life_description, simpleRecord.study_description, simpleRecord.work_description, simpleRecord.inspiration_description, simpleRecord.mood_emoji, simpleRecord.mood_score]
        });

        // 4. 更新 raw_entries 表，标记为已处理
        await tx.execute({ 
            sql: `UPDATE raw_entries SET processed_at = ? WHERE id = ?`, 
            args: [new Date().toISOString(), entry.id]
        });

        console.log(`✅ [Cron] Successfully processed and saved entry ID: ${entry.id}`);
      }

      await tx.commit();
      console.log('🎉 [Cron] Batch processing complete.');
      return res.status(200).json({ success: true, message: `Successfully processed ${rawEntries.length} entries.` });

    } catch (error) {
      await tx.rollback();
      console.error('❌ [Cron] Error during transaction, rolled back.', error);
      throw error; // 抛出错误以便外层捕获
    }

  } catch (error) {
    console.error('❌ [Cron] Batch processing failed:', error);
    return res.status(500).json({
      error: 'Batch processing failed',
      message: error.message
    });
  }
}
