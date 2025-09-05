// /api/raw-entry.js

// 导入数据库插入函数
import { insert } from '../lib/turso.js';

function analyzeMood(text = '') {
  const positive = ['开心','高兴','愉快','满足','兴奋','顺利','喜欢','舒适','轻松','松弛','收获','进展','快乐','满意'];
  const negative = ['焦虑','难过','疲惫','压力','担心','紧张','挫败','生气','低落','沮丧','不爽','烦躁'];
  let score = 0;
  const pHits = positive.filter(w => text.includes(w)).length;
  const nHits = negative.filter(w => text.includes(w)).length;
  score = Math.max(-3, Math.min(3, pHits - nHits));
  const category = score > 1 ? '积极' : score < -1 ? '消极' : '中性';
  const emoji = score >= 2 ? '😄' : score === 1 ? '🙂' : score === 0 ? '😐' : score === -1 ? '😣' : '😫';
  // 简单事件抽取：取句首逗号/顿号/空格前的短语
  const event = (text.split(/[，。,.\s]/)[0] || '日常心情').slice(0, 12) || '日常心情';
  return { mood_score: score, mood_category: category, mood_emoji: emoji, mood_event: event };
}

function analyzeFitness(text = '') {
  if (!text) return { fitness_intensity: '', fitness_duration: '', fitness_calories: '', fitness_type: '' };
  const typeMatch = text.match(/(跑步|散步|快走|骑行|游泳|健身|瑜伽|力量|壶铃|有氧)/);
  const minMatch = text.match(/(\d+\s*(分钟|min|min))/i);
  const kmMatch = text.match(/(\d+(?:\.\d+)?\s*km)/i);
  const duration = minMatch ? minMatch[1].replace(/\s*/g,'') : (kmMatch ? kmMatch[1] : '');
  const type = typeMatch ? typeMatch[1] : (kmMatch ? '有氧' : '');
  // 简单强度判断
  const intensity = /快|强|高强度|爬坡/.test(text) ? '高强度' : /慢|散步|拉伸/.test(text) ? '低强度' : (text ? '中等强度' : '');
  // 粗略卡路里估算：每分钟5卡或每公里60卡
  let calories = '';
  const minNum = (text.match(/(\d+)\s*(分钟|min|min)/i) || [])[1];
  const kmNum = (text.match(/(\d+(?:\.\d+)?)(?=\s*km)/i) || [])[1];
  if (minNum) calories = String(Math.round(Number(minNum) * 5));
  else if (kmNum) calories = String(Math.round(Number(kmNum) * 60));
  return { fitness_intensity: intensity, fitness_duration: duration, fitness_calories: calories, fitness_type: type };
}

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

  // 添加调试日志
  console.log('🔍 [API] Environment check:');
  console.log('🔍 [API] TURSO_DATABASE_URL exists:', !!process.env.TURSO_DATABASE_URL);
  console.log('🔍 [API] TURSO_AUTH_TOKEN exists:', !!process.env.TURSO_AUTH_TOKEN);
  console.log('🔍 [API] NODE_ENV:', process.env.NODE_ENV);

  try {
    const body = req.body || {};
    console.log('🔍 [API] Request body received:', JSON.stringify(body, null, 2));
    
    // 检查是否是新的结构化数据格式（来自前端）
    if (body.date && (body.mood_text || body.life_text || body.study_text || body.work_text || body.inspiration_text)) {
      console.log('📥 [API] Received structured data from frontend:', body);
      
      // 验证至少有一个内容字段不为空
      if (!body.mood_text?.trim() && !body.life_text?.trim() && !body.study_text?.trim() && !body.work_text?.trim() && !body.inspiration_text?.trim()) {
        console.log('❌ [API] Validation failed: all content fields are empty');
        return res.status(400).json({ error: 'At least one content field must not be empty' });
      }

      // 原始记录
      const rawEntry = {
        date: body.date,
        mood_text: body.mood_text || '',
        fitness_text: body.life_text || '',
        study_text: body.study_text || '',
        work_text: body.work_text || '',
        inspiration_text: body.inspiration_text || '',
        source: 'frontend'
      };

      console.log('💾 [API] Attempting to insert raw_entries:', rawEntry);
      const rawResult = await insert('raw_entries', rawEntry);

      // 规则引擎分析
      const mood = analyzeMood(body.mood_text || '');
      const fitness = analyzeFitness(body.life_text || '');

      // simple_records
      const simpleRecord = {
        date: body.date,
        mood_description: body.mood_text || '',
        life_description: body.life_text || '',
        study_description: body.study_text || '',
        work_description: body.work_text || '',
        inspiration_description: body.inspiration_text || '',
        mood_emoji: mood.mood_emoji,
        mood_event: mood.mood_event,
        mood_score: mood.mood_score,
        mood_category: mood.mood_category,
        fitness_intensity: fitness.fitness_intensity,
        fitness_duration: fitness.fitness_duration,
        fitness_calories: fitness.fitness_calories,
        fitness_type: fitness.fitness_type
      };
      console.log('💾 [API] Attempting to insert simple_records:', simpleRecord);
      const simpleResult = await insert('simple_records', simpleRecord);

      console.log('✅ [API] Data saved. raw_entries:', rawResult, ' simple_records:', simpleResult);
      
      return res.status(200).json({
        success: true,
        message: 'Data saved successfully',
        data: { rawEntry, simpleRecord },
        result: { rawResult, simpleResult }
      });
    }
    
    // 兼容旧的 rawText 格式（来自快捷指令）
    const rawText = body.rawText || body.raw_text;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      console.log('❌ [API] Validation failed: rawText is empty or invalid');
      return res.status(400).json({ error: '原始文本不能为空', hint: '请在快捷指令中提供 rawText 字段，或在前端提供结构化数据' });
    }

    console.log('📥 [API] Received raw data entry:', rawText);

    const today = new Date().toISOString().slice(0, 10);

    // 存 raw_entries
    const rawEntry = {
      date: today,
      raw_text: rawText,
      source: 'shortcut'
    };
    console.log('💾 [API] Attempting to insert raw data:', rawEntry);
    const rawResult = await insert('raw_entries', rawEntry);

    // simple_records（将整段文本作为 inspiration_description）
    const mood = analyzeMood(rawText);
    const simpleRecord = {
      date: today,
      mood_description: '',
      life_description: '',
      study_description: '',
      work_description: '',
      inspiration_description: rawText,
      mood_emoji: mood.mood_emoji,
      mood_event: mood.mood_event,
      mood_score: mood.mood_score,
      mood_category: mood.mood_category,
      fitness_intensity: '',
      fitness_duration: '',
      fitness_calories: '',
      fitness_type: ''
    };
    console.log('💾 [API] Attempting to insert simple_records:', simpleRecord);
    const simpleResult = await insert('simple_records', simpleRecord);

    console.log('✅ [API] Raw data saved successfully.');

    return res.status(200).json({
      success: true,
      message: 'Data received successfully and queued for processing.',
      result: { rawResult, simpleResult }
    });

  } catch (error) {
    console.error('❌ [API] Error processing raw entry:', error);
    console.error('❌ [API] Error stack:', error.stack);

    if (error.code === 'MISSING_DB_ENV') {
      return res.status(500).json({
        error: 'Database not configured',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to process entry',
      message: error.message,
      details: error.stack
    });
  }
}
