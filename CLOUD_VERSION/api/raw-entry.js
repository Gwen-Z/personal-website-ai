import { insert, initializeTables } from '../lib/turso.js';
import CloudAIService from '../lib/cloud-ai-service.js';

// 解析原始文本的函数（支持语音+文本输入格式）
function parseRawText(rawText) {
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentSection = '';
  let voiceInput = {};
  let textInput = {};
  let date = '';

  for (const line of lines) {
    // 检测日期
    if (line.includes('日期：') && !currentSection) {
      date = line.replace('日期：', '').trim();
      date = standardizeDate(date);
      continue;
    }

    // 检测语音输入段落
    if (line.includes('【语音输入】')) {
      currentSection = 'voice';
      continue;
    }

    // 检测文本输入段落
    if (line.includes('【文本输入】')) {
      currentSection = 'text';
      continue;
    }

    // 解析具体内容
    if (currentSection && line.includes('：')) {
      const [key, value] = line.split('：', 2);
      const cleanKey = key.trim();
      const cleanValue = value ? value.trim() : '';

      const target = currentSection === 'voice' ? voiceInput : textInput;
      
      if (cleanKey === '日期') {
        if (cleanValue && !date) {
          date = standardizeDate(cleanValue);
        }
      } else if (['心情', '健身', '学习', '工作', '灵感'].includes(cleanKey)) {
        target[cleanKey] = cleanValue;
      }
    }
  }

  // 优先使用文本输入，语音输入作为备选
  const result = {
    date: date || new Date().toISOString().split('T')[0],
    mood_text: textInput['心情'] || voiceInput['心情'] || '',
    life_text: textInput['健身'] || voiceInput['健身'] || '',
    study_text: textInput['学习'] || voiceInput['学习'] || '',
    work_text: textInput['工作'] || voiceInput['工作'] || '',
    inspiration_text: textInput['灵感'] || voiceInput['灵感'] || ''
  };

  // 过滤空值和"没"
  Object.keys(result).forEach(key => {
    if (typeof result[key] === 'string') {
      const value = result[key].toLowerCase();
      if (value === '没' || value === '没有' || value === '无' || value === '') {
        result[key] = '';
      }
    }
  });

  return result;
}

// 标准化日期格式
function standardizeDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // 处理中文日期格式：2025年8月18日 18:05
  const chineseMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 处理标准日期格式
  const standardMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (standardMatch) {
    const [, year, month, day] = standardMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 默认返回今天
  return new Date().toISOString().split('T')[0];
}

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 确保表已初始化
    await initializeTables();

    const { raw_text } = req.body;

    if (!raw_text || !raw_text.trim()) {
      return res.status(400).json({ error: '原始文本不能为空' });
    }

    console.log('📥 收到原始数据:', raw_text);

    // 解析原始文本
    const parsedData = parseRawText(raw_text);
    console.log('🔍 解析结果:', parsedData);

    // 保存原始数据到 raw_entries
    await insert('raw_entries', {
      date: parsedData.date,
      raw_text: raw_text,
      source: 'shortcut'
    });

    // 初始化 AI 服务
    const aiService = new CloudAIService();

    // 使用 AI 处理数据
    let processedData;
    try {
      processedData = await aiService.processRawData(parsedData);
      console.log('🤖 AI 处理结果:', processedData);
    } catch (aiError) {
      console.warn('⚠️ AI 处理失败，使用基础处理:', aiError.message);
      // AI 失败时的基础处理
      processedData = {
        ...parsedData,
        mood_emoji: '😐',
        mood_description: parsedData.mood_text || '无特殊心情',
        mood_score: 0,
        mood_category: '中性'
      };
    }

    // 准备要插入的数据
    const recordData = {
      date: processedData.date || parsedData.date,
      mood_description: processedData.mood_description || parsedData.mood_text,
      life_description: parsedData.life_text,
      study_description: parsedData.study_text,
      work_description: parsedData.work_text,
      inspiration_description: parsedData.inspiration_text,
      mood_emoji: processedData.mood_emoji || '😐',
      mood_score: processedData.mood || processedData.mood_score || 0,
      mood_category: processedData.category || processedData.mood_category || '中性',
      // 其他字段使用默认值
      fitness_intensity: null,
      fitness_duration: null,
      fitness_calories: null,
      fitness_type: null,
      study_duration: null,
      study_category: null,
      work_ai_summary: null,
      work_summary: null,
      inspiration_theme: null,
      inspiration_product: null,
      work_task_type: null,
      work_priority: null,
      work_complexity: null,
      work_estimated_hours: null,
      inspiration_difficulty: null,
      inspiration_progress: null,
      overall_sentiment: null,
      energy_level: null,
      productivity_score: null,
      life_balance_score: null,
      data_quality_score: null,
      fitness_description: null
    };

    // 插入到 simple_records
    const result = await insert('simple_records', recordData);

    console.log('✅ 数据保存成功，ID:', result.lastInsertRowid);

    res.status(200).json({
      success: true,
      id: result.lastInsertRowid,
      processed_data: recordData,
      raw_data: parsedData,
      message: '数据处理和保存成功',
      source: 'turso_cloud'
    });

  } catch (error) {
    console.error('❌ 处理原始数据失败:', error);
    res.status(500).json({
      error: '数据处理失败',
      message: error.message,
      source: 'turso_cloud'
    });
  }
}
