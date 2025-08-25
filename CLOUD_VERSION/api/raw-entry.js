// /api/raw-entry.js

// 导入数据库插入函数
import { insert } from '../lib/turso.js';

export default async function handler(req, res) {
  // 设置 CORS 头以允许来自任何源的请求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理浏览器的 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    // 兼容 rawText 和 raw_text 两种字段名
    const rawText = body.rawText || body.raw_text;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: '原始文本不能为空', hint: '请在快捷指令中提供 rawText 字段' });
    }

    console.log('📥 [API] Received raw data entry:', rawText);

    // 准备要存入数据库的数据
    const entry = {
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      raw_text: rawText,
      source: 'shortcut' // 标记数据来源为快捷指令
    };

    // 插入数据到 raw_entries 表
    await insert('raw_entries', entry);

    console.log('✅ [API] Raw data saved successfully.');

    // 立即返回成功响应，不再等待AI处理
    return res.status(200).json({
      success: true,
      message: 'Data received successfully and queued for processing.'
    });

  } catch (error) {
    console.error('❌ [API] Error processing raw entry:', error);

    // 检查是否是数据库配置问题
    if (error.code === 'MISSING_DB_ENV') {
        return res.status(500).json({
            error: 'Database not configured',
            message: error.message
        });
    }

    return res.status(500).json({
      error: 'Failed to process entry',
      message: error.message
    });
  }
}
