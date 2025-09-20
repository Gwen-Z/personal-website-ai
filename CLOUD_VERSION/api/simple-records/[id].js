import { initDB } from '../../backend/db.js';
import AIService from '../../backend/ai-service.js';

let db;
const aiService = new AIService();

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (!db) {
      db = await initDB();
    }

    const { id } = req.query;

    if (req.method === 'PUT') {
      const { date, mood_description, life_description, study_description, work_description, inspiration_description, regenerateAI } = req.body || {};

      // 动态组装更新字段，避免覆盖未提供的字段
      const setParts = [];
      const values = [];

      if (date !== undefined) { setParts.push('date = ?'); values.push(date); }
      if (mood_description !== undefined) { setParts.push('mood_description = ?'); values.push(mood_description); }
      if (life_description !== undefined) { setParts.push('life_description = ?'); values.push(life_description); }
      if (study_description !== undefined) { setParts.push('study_description = ?'); values.push(study_description); }
      if (work_description !== undefined) { setParts.push('work_description = ?'); values.push(work_description); }
      if (inspiration_description !== undefined) { setParts.push('inspiration_description = ?'); values.push(inspiration_description); }

      // 如果需要重新生成AI，仅根据对应的描述字段追加AI结果
      if (regenerateAI) {
        if (mood_description !== undefined) {
          const moodSummary = mood_description && mood_description.trim() !== '' 
            ? await aiService.analyzeMoodData(mood_description)
            : { mood_emoji: '😐', mood_event: '无特别事件', mood_score: 0, mood_category: '中性' };
          setParts.push('mood_emoji = ?'); values.push(moodSummary.mood_emoji);
          setParts.push('mood_event = ?'); values.push(moodSummary.mood_event);
          setParts.push('mood_score = ?'); values.push(moodSummary.mood_score);
          setParts.push('mood_category = ?'); values.push(moodSummary.mood_category);
        }
        if (life_description !== undefined) {
          const fitnessSummary = await generateFitnessSummary(life_description);
          setParts.push('fitness_intensity = ?'); values.push(fitnessSummary.intensity);
          setParts.push('fitness_duration = ?'); values.push(fitnessSummary.duration);
          setParts.push('fitness_calories = ?'); values.push(fitnessSummary.calories);
          setParts.push('fitness_type = ?'); values.push(fitnessSummary.type);
        }
      }

      if (setParts.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      values.push(id);
      await db.run(`UPDATE simple_records SET ${setParts.join(', ')} WHERE id = ?`, values);

      res.json({ message: 'Record updated successfully' });
    } else if (req.method === 'DELETE') {
      await db.run('DELETE FROM simple_records WHERE id = ?', [id]);
      res.json({ message: 'Record deleted successfully' });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in simple-records/[id] API:', error);
    res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
}

// AI处理函数：生成健身相关总结
async function generateFitnessSummary(fitnessText) {
  if (!fitnessText || fitnessText.trim() === '' || fitnessText.trim() === '没有' || fitnessText.trim() === '没') {
    return { 
      intensity: '无', 
      duration: '0分钟', 
      calories: '0卡', 
      type: '无运动' 
    };
  }
  
  // 使用规则生成默认值
  return {
    intensity: generateDefaultFitnessIntensity(fitnessText),
    duration: generateDefaultFitnessDuration(fitnessText),
    calories: generateDefaultFitnessCalories(fitnessText),
    type: generateDefaultFitnessType(fitnessText)
  };
}

function generateDefaultFitnessIntensity(fitnessText) {
  if (!fitnessText) return '低强度';
  const s = fitnessText.toLowerCase();
  if (/跑步|快跑|冲刺|HIIT|高强度/.test(s)) return '高强度';
  if (/健身房|举重|力量|快走|游泳/.test(s)) return '中强度';
  if (/散步|瑜伽|拉伸|慢走/.test(s)) return '低强度';
  return '中强度';
}

function generateDefaultFitnessDuration(fitnessText) {
  if (!fitnessText) return '30分钟';
  const durationMatch = fitnessText.match(/(\d+)\s*分钟|(\d+)\s*小时/);
  if (durationMatch) {
    if (durationMatch[1]) return durationMatch[1] + '分钟';
    if (durationMatch[2]) return (parseInt(durationMatch[2]) * 60) + '分钟';
  }
  if (/短|少|快/.test(fitnessText)) return '15分钟';
  if (/长|久|多/.test(fitnessText)) return '60分钟';
  return '30分钟';
}

function generateDefaultFitnessCalories(fitnessText) {
  if (!fitnessText) return '150卡';
  const s = fitnessText.toLowerCase();
  if (/跑步|快跑/.test(s)) return '300卡';
  if (/健身房|举重|力量/.test(s)) return '250卡';
  if (/游泳/.test(s)) return '350卡';
  if (/瑜伽|拉伸/.test(s)) return '120卡';
  if (/散步|慢走/.test(s)) return '150卡';
  return '200卡';
}

function generateDefaultFitnessType(fitnessText) {
  if (!fitnessText) return '轻量运动';
  const s = fitnessText.toLowerCase();
  if (/跑步|快跑|骑行|游泳/.test(s)) return '有氧运动';
  if (/健身房|举重|力量|哑铃/.test(s)) return '力量训练';
  if (/瑜伽|拉伸|伸展/.test(s)) return '柔韧性训练';
  if (/散步|慢走/.test(s)) return '低强度有氧';
  return '综合训练';
}
