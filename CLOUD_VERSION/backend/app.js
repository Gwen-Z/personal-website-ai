import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import AIService from './ai-service.js';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量，优先加载 .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config(); // 如果 .env.local 不存在，则加载默认的 .env

const app = express();
app.use(cors());
app.use(express.json());

let db;
const aiService = new AIService();

// 确保使用Turso数据库
console.log('🔧 强制使用Turso数据库');
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io';
process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw';

// 添加记录（支持可选的 mood_emoji、mood_description）
app.post('/api/record', async (req, res) => {
  try {
    const { date, mood, life, study, work, inspiration, note = '', mood_emoji = '😊', mood_description = null } = req.body;
    if (!date || mood === undefined || life === undefined || study === undefined || work === undefined || inspiration === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // 确保所有数值字段都不为null
    const safeLife = life !== null && life !== undefined ? life : 0;
    const safeMood = mood !== null && mood !== undefined ? mood : 0;
    const safeStudy = study !== null && study !== undefined ? study : 0;
    const safeWork = work !== null && work !== undefined ? work : 0;
    const safeInspiration = inspiration !== null && inspiration !== undefined ? inspiration : 0;
    
    await db.run('INSERT INTO records (date, mood, mood_emoji, mood_description, life, study, work, inspiration, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [date, safeMood, mood_emoji, mood_description, safeLife, safeStudy, safeWork, safeInspiration, note]);
    res.status(201).json({ message: 'Record added successfully' });
  } catch (error) {
    console.error('Error adding record:', error);
    res.status(500).json({ message: 'Failed to add record', error: error.message });
  }
});

// 重置数据库（开发用）
app.post('/api/reset-database', async (req, res) => {
  try {
    // 清空所有心情相关记录
    await db.run('DELETE FROM simple_records WHERE mood_description IS NOT NULL');
    res.json({ message: '数据库已重置' });
  } catch (error) {
    console.error('重置数据库失败:', error);
    res.status(500).json({ message: '重置数据库失败', error: error.message });
  }
});

// 添加心情数据并进行AI分析
app.post('/api/mood-data', async (req, res) => {
  try {
    const { date, mood_description } = req.body;
    
    if (!date || !mood_description) {
      return res.status(400).json({ message: '缺少必要字段：date 和 mood_description' });
    }

    // 使用AI分析心情数据
    const aiAnalysis = await aiService.analyzeMoodData(mood_description);
    
    // 保存到数据库
    const result = await db.run(`
      INSERT INTO simple_records (
        date, mood_description, mood_emoji, mood_event, mood_score, mood_category
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      date, 
      mood_description, 
      aiAnalysis.mood_emoji, 
      aiAnalysis.mood_event, 
      aiAnalysis.mood_score, 
      aiAnalysis.mood_category
    ]);

    res.status(201).json({ 
      message: '心情数据添加成功',
      id: result.lastID,
      ...aiAnalysis
    });
  } catch (error) {
    console.error('添加心情数据失败:', error);
    res.status(500).json({ message: '添加心情数据失败', error: error.message });
  }
});

// 批量添加心情数据
app.post('/api/mood-data/batch', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: '需要提供心情数据数组' });
    }

    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析心情数据
        const aiAnalysis = await aiService.analyzeMoodData(description);
        
        // 按日期存在则更新心情相关字段，否则插入
        const existing = await db.get('SELECT id FROM simple_records WHERE date = ? LIMIT 1', [date]);
        if (existing) {
          await db.run(
            `UPDATE simple_records SET 
              mood_description = ?, mood_emoji = ?, mood_event = ?, mood_score = ?, mood_category = ?
             WHERE id = ?`,
            [description, aiAnalysis.mood_emoji, aiAnalysis.mood_event, aiAnalysis.mood_score, aiAnalysis.mood_category, existing.id]
          );
          results.push({ id: existing.id, date, description, ...aiAnalysis, action: 'update' });
        } else {
          const ins = await db.run(
            `INSERT INTO simple_records (date, mood_description, mood_emoji, mood_event, mood_score, mood_category) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [date, description, aiAnalysis.mood_emoji, aiAnalysis.mood_event, aiAnalysis.mood_score, aiAnalysis.mood_category]
          );
          results.push({ id: ins.lastID, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理心情数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条心情数据`,
      results
    });
  } catch (error) {
    console.error('批量添加心情数据失败:', error);
    res.status(500).json({ message: '批量添加心情数据失败', error: error.message });
  }
});

// 健身数据API
app.post('/api/life-data/batch', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: '需要提供健身数据数组' });
    }

    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析健身数据
        const aiAnalysis = await aiService.analyzeFitnessData(description);
        
        // 按日期存在则更新健身相关字段，否则插入
        const existing = await db.get('SELECT id FROM simple_records WHERE date = ? LIMIT 1', [date]);
        if (existing) {
          await db.run(
            `UPDATE simple_records SET 
              life_description = ?, fitness_intensity = ?, fitness_duration = ?, fitness_calories = ?, fitness_type = ?
             WHERE id = ?`,
            [description, aiAnalysis.fitness_intensity, aiAnalysis.fitness_duration, aiAnalysis.fitness_calories, aiAnalysis.fitness_type, existing.id]
          );
          results.push({ id: existing.id, date, description, ...aiAnalysis, action: 'update' });
        } else {
          const ins = await db.run(
            `INSERT INTO simple_records (date, life_description, fitness_intensity, fitness_duration, fitness_calories, fitness_type) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [date, description, aiAnalysis.fitness_intensity, aiAnalysis.fitness_duration, aiAnalysis.fitness_calories, aiAnalysis.fitness_type]
          );
          results.push({ id: ins.lastID, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理健身数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条健身数据`,
      results
    });
  } catch (error) {
    console.error('批量添加健身数据失败:', error);
    res.status(500).json({ message: '批量添加健身数据失败', error: error.message });
  }
});

// 学习数据API
app.post('/api/study-data/batch', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: '需要提供学习数据数组' });
    }

    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析学习数据
        const aiAnalysis = await aiService.analyzeStudyData(description);
        
        // 按日期存在则更新学习相关字段，否则插入
        const existing = await db.get('SELECT id FROM simple_records WHERE date = ? LIMIT 1', [date]);
        if (existing) {
          await db.run(
            `UPDATE simple_records SET 
              study_description = ?, study_duration = ?, study_category = ?
             WHERE id = ?`,
            [description, aiAnalysis.study_duration, aiAnalysis.study_category, existing.id]
          );
          results.push({ id: existing.id, date, description, ...aiAnalysis, action: 'update' });
        } else {
          const ins = await db.run(
            `INSERT INTO simple_records (date, study_description, study_duration, study_category) 
             VALUES (?, ?, ?, ?)`,
            [date, description, aiAnalysis.study_duration, aiAnalysis.study_category]
          );
          results.push({ id: ins.lastID, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理学习数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条学习数据`,
      results
    });
  } catch (error) {
    console.error('批量添加学习数据失败:', error);
    res.status(500).json({ message: '批量添加学习数据失败', error: error.message });
  }
});

// 工作数据API
app.post('/api/work-data/batch', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: '需要提供工作数据数组' });
    }

    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析工作数据
        const aiAnalysis = await aiService.analyzeWorkData(description);
        
        // 按日期存在则更新工作相关字段，否则插入
        const existing = await db.get('SELECT id FROM simple_records WHERE date = ? LIMIT 1', [date]);
        if (existing) {
          await db.run(
            `UPDATE simple_records SET 
              work_description = ?, work_task_type = ?, work_priority = ?, work_complexity = ?, work_estimated_hours = ?
             WHERE id = ?`,
            [description, aiAnalysis.work_task_type, aiAnalysis.work_priority, aiAnalysis.work_complexity, aiAnalysis.work_estimated_hours, existing.id]
          );
          results.push({ id: existing.id, date, description, ...aiAnalysis, action: 'update' });
        } else {
          const ins = await db.run(
            `INSERT INTO simple_records (date, work_description, work_task_type, work_priority, work_complexity, work_estimated_hours) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [date, description, aiAnalysis.work_task_type, aiAnalysis.work_priority, aiAnalysis.work_complexity, aiAnalysis.work_estimated_hours]
          );
          results.push({ id: ins.lastID, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理工作数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条工作数据`,
      results
    });
  } catch (error) {
    console.error('批量添加工作数据失败:', error);
    res.status(500).json({ message: '批量添加工作数据失败', error: error.message });
  }
});

// 灵感数据API
app.post('/api/inspiration-data/batch', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: '需要提供灵感数据数组' });
    }

    const results = [];
    
    for (const item of data) {
      const { date, description } = item;
      
      if (!date || !description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析灵感数据
        const aiAnalysis = await aiService.analyzeInspirationData(description);
        
        // 按日期存在则更新灵感相关字段，否则插入
        const existing = await db.get('SELECT id FROM simple_records WHERE date = ? LIMIT 1', [date]);
        if (existing) {
          await db.run(
            `UPDATE simple_records SET 
              inspiration_description = ?, inspiration_theme = ?, inspiration_product = ?, inspiration_difficulty = ?
             WHERE id = ?`,
            [description, aiAnalysis.inspiration_theme, aiAnalysis.inspiration_product, aiAnalysis.inspiration_difficulty, existing.id]
          );
          results.push({ id: existing.id, date, description, ...aiAnalysis, action: 'update' });
        } else {
          const ins = await db.run(
            `INSERT INTO simple_records (date, inspiration_description, inspiration_theme, inspiration_product, inspiration_difficulty) 
             VALUES (?, ?, ?, ?, ?)`,
            [date, description, aiAnalysis.inspiration_theme, aiAnalysis.inspiration_product, aiAnalysis.inspiration_difficulty]
          );
          results.push({ id: ins.lastID, date, description, ...aiAnalysis, action: 'insert' });
        }
      } catch (error) {
        console.error(`处理灵感数据失败 (${date}):`, error);
        continue;
      }
    }

    res.status(201).json({ 
      success: true,
      message: `成功处理了 ${results.length} 条灵感数据`,
      results
    });
  } catch (error) {
    console.error('批量添加灵感数据失败:', error);
    res.status(500).json({ message: '批量添加灵感数据失败', error: error.message });
  }
});

// 继续原有心情数据处理
app.post('/api/mood-data/batch_old', async (req, res) => {
  try {
    const { moodDataList } = req.body;
    
    if (!Array.isArray(moodDataList) || moodDataList.length === 0) {
      return res.status(400).json({ message: '需要提供心情数据数组' });
    }

    const results = [];
    
    for (const moodData of moodDataList) {
      const { date, mood_description } = moodData;
      
      if (!date || !mood_description) {
        continue; // 跳过无效数据
      }

      try {
        // 使用AI分析心情数据
        const aiAnalysis = await aiService.analyzeMoodData(mood_description);
        
        // 保存到数据库
        const result = await db.run(`
          INSERT OR REPLACE INTO simple_records (
            date, mood_description, mood_emoji, mood_event, mood_score, mood_category
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          date, 
          mood_description, 
          aiAnalysis.mood_emoji, 
          aiAnalysis.mood_event, 
          aiAnalysis.mood_score, 
          aiAnalysis.mood_category
        ]);

        results.push({
          date,
          id: result.lastID,
          ...aiAnalysis
        });
      } catch (error) {
        console.error(`处理日期 ${date} 的心情数据失败:`, error);
        results.push({
          date,
          error: error.message
        });
      }
    }

    res.status(200).json({ 
      message: `批量处理完成，成功处理 ${results.filter(r => !r.error).length} 条数据`,
      results
    });
  } catch (error) {
    console.error('批量添加心情数据失败:', error);
    res.status(500).json({ message: '批量添加心情数据失败', error: error.message });
  }
});

// 获取简化记录（只有文本描述，无评分）
app.get('/api/simple-records', async (req, res) => {
  try {
    const { from, to, category } = req.query;
    const filters = [];
    const params = [];
    
    if (from) { filters.push('date >= ?'); params.push(from); }
    if (to) { filters.push('date <= ?'); params.push(to); }
    
    const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
    const orderBy = 'ORDER BY date DESC';
    
    const records = await db.all(`SELECT * FROM simple_records ${whereClause} ${orderBy}`, params);
    
    // 如果指定了类别，只返回该类别的数据
    // Always wrap the response in an object with a 'records' key, as the frontend expects this structure.
    if (category && ['mood', 'life', 'study', 'work', 'inspiration'].includes(category)) {
      const categoryKey = category + '_description';
      const filteredRecords = records.map(record => ({
        id: record.id,
        date: record.date,
        [categoryKey]: record[categoryKey],
        created_at: record.created_at
      }));
      res.json({ records: filteredRecords });
    } else {
      res.json({ records: records });
    }
  } catch (error) {
    console.error('Error fetching simple records:', error);
    res.status(500).json({ message: 'Failed to fetch records', error: error.message });
  }
});

// 获取所有记录（保留旧API用于兼容）
app.get('/api/records', async (req, res) => {
  const { from, to, type } = req.query;
  const filters = [];
  const params = [];
  if (from) { filters.push('date >= ?'); params.push(from); }
  if (to) { filters.push('date <= ?'); params.push(to); }
  if (type && ['mood','life','study','work','inspiration'].includes(String(type))) {
    // 这里保留按列筛选的意义：若需要仅返回某列非空/非零记录
    filters.push(`${type} IS NOT NULL`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await db.all(`SELECT * FROM records ${where} ORDER BY date DESC`, params);
  res.json(rows);
});

// 获取记录统计
app.get('/api/stats', async (req, res) => {
  const { period = 'all' } = req.query;
  let whereClause = '';
  
  if (period === 'week') {
    whereClause = "WHERE date >= date('now', '-7 days')";
  } else if (period === 'month') {
    whereClause = "WHERE date >= date('now', '-30 days')";
  } else if (period === 'quarter') {
    whereClause = "WHERE date >= date('now', '-90 days')";
  } else if (period === 'year') {
    whereClause = "WHERE date >= date('now', '-365 days')";
  }
  
  const rows = await db.all(`SELECT * FROM records ${whereClause} ORDER BY date DESC`);
  
  // 计算平均值
  const stats = {
    mood: { avg: 0, count: 0 },
    life: { avg: 0, count: 0 },
    study: { avg: 0, count: 0 },
    work: { avg: 0, count: 0 },
    inspiration: { avg: 0, count: 0 }
  };
  
  rows.forEach(row => {
    stats.mood.count++;
    stats.life.count++;
    stats.study.count++;
    stats.work.count++;
    stats.inspiration.count++;
    
    stats.mood.avg += row.mood;
    stats.life.avg += row.life;
    stats.study.avg += row.study;
    stats.work.avg += row.work;
    stats.inspiration.avg += row.inspiration;
  });
  
  Object.keys(stats).forEach(key => {
    if (stats[key].count > 0) {
      stats[key].avg = (stats[key].avg / stats[key].count).toFixed(2);
    }
  });
  
  res.json({ records: rows, stats });
});

// 云AI分析接口（支持 from/to 自定义区间；否则使用 period 兜底）
app.get('/api/ai-analysis', async (req, res) => {
  try {
    const { period = 'all', from, to } = req.query || {};

    let whereClause = '';
    const params = [];

    if (from && to) {
      // 优先使用 from/to 自定义区间
      whereClause = 'WHERE date >= ? AND date <= ?';
      params.push(String(from), String(to));
    } else {
      // 兼容旧的 period 参数
      if (period === 'week') {
        whereClause = "WHERE date >= date('now', '-7 days')";
      } else if (period === 'month') {
        whereClause = "WHERE date >= date('now', '-30 days')";
      } else if (period === 'quarter') {
        whereClause = "WHERE date >= date('now', '-90 days')";
      } else if (period === 'year') {
        whereClause = "WHERE date >= date('now', '-365 days')";
      } else {
        whereClause = '';
      }
    }

    const rows = await db.all(`SELECT * FROM records ${whereClause} ORDER BY date DESC`, params);

    const usedPeriod = from && to ? 'custom' : period;
    const analysis = await aiService.generateAnalysis(rows, usedPeriod);
    res.json(analysis);
  } catch (error) {
    console.error('AI分析失败:', error);
    res.status(500).json({
      error: 'AI分析服务暂时不可用',
      fallback: aiService.getFallbackAnalysis()
    });
  }
});

// 获取AI服务状态
app.get('/api/ai-status', (req, res) => {
  const status = {
    openai: !!aiService.openaiApiKey,
    anthropic: !!aiService.anthropicApiKey,
    available: !!(aiService.openaiApiKey || aiService.anthropicApiKey)
  };
  res.json(status);
});

// 原始数据：单条增删改查
app.get('/api/records/:id', async (req, res) => {
  const row = await db.get('SELECT * FROM records WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json(row);
});

app.put('/api/records/:id', async (req, res) => {
  const { date, mood, life, study, work, inspiration, note = '', mood_emoji = undefined, mood_description = undefined } = req.body || {};

  // 允许部分字段更新
  const fields = [];
  const values = [];
  if (date !== undefined) { fields.push('date = ?'); values.push(date); }
  if (mood !== undefined) { fields.push('mood = ?'); values.push(mood); }
  if (mood_emoji !== undefined) { fields.push('mood_emoji = ?'); values.push(mood_emoji); }
  if (mood_description !== undefined) { fields.push('mood_description = ?'); values.push(mood_description); }
  if (life !== undefined) { fields.push('life = ?'); values.push(life); }
  if (study !== undefined) { fields.push('study = ?'); values.push(study); }
  if (work !== undefined) { fields.push('work = ?'); values.push(work); }
  if (inspiration !== undefined) { fields.push('inspiration = ?'); values.push(inspiration); }
  if (note !== undefined) { fields.push('note = ?'); values.push(note); }

  if (!fields.length) return res.status(400).json({ message: 'No fields to update' });

  values.push(req.params.id);
  await db.run(
    `UPDATE records SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  res.json({ message: 'Record updated' });
});

// 编辑简化记录
app.put('/api/simple-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
  } catch (error) {
    console.error('Error updating simple record:', error);
    res.status(500).json({ message: 'Failed to update record', error: error.message });
  }
});

// 删除简化记录
app.delete('/api/simple-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM simple_records WHERE id = ?', [id]);
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting simple record:', error);
    res.status(500).json({ message: 'Failed to delete record', error: error.message });
  }
});

// 批量删除简化记录
app.delete('/api/simple-records/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid ids array' });
    }
    
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM simple_records WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} records deleted successfully` });
  } catch (error) {
    console.error('Error batch deleting simple records:', error);
    res.status(500).json({ message: 'Failed to delete records', error: error.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  await db.run('DELETE FROM records WHERE id = ?', [req.params.id]);
  res.json({ message: 'Record deleted' });
});

// AI 数据：列表与 CRUD
app.get('/api/ai-data', async (req, res) => {
  const { from, to, category } = req.query;
  const filters = [];
  const params = [];
  if (from) { filters.push('date >= ?'); params.push(from); }
  if (to) { filters.push('date <= ?'); params.push(to); }
  if (category) { filters.push('category = ?'); params.push(String(category)); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await db.all(`SELECT * FROM ai_data ${where} ORDER BY date DESC, id DESC`, params);
  res.json(rows);
});

app.post('/api/ai-data', async (req, res) => {
  const { date, category, title = '', content = '', score = null } = req.body || {};
  if (!date || !category) return res.status(400).json({ message: 'date & category required' });
  const result = await db.run(
    'INSERT INTO ai_data (date, category, title, content, score) VALUES (?, ?, ?, ?, ?)',
    [date, category, title, content, score]
  );
  res.status(201).json({ id: result.lastID, message: 'AI data created' });
});

app.get('/api/ai-data/:id', async (req, res) => {
  const row = await db.get('SELECT * FROM ai_data WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Not found' });
  res.json(row);
});

app.put('/api/ai-data/:id', async (req, res) => {
  const { date, category, title = '', content = '', score = null } = req.body || {};
  await db.run(
    'UPDATE ai_data SET date = ?, category = ?, title = ?, content = ?, score = ? WHERE id = ?',
    [date, category, title, content, score, req.params.id]
  );
  res.json({ message: 'AI data updated' });
});

app.delete('/api/ai-data/:id', async (req, res) => {
  await db.run('DELETE FROM ai_data WHERE id = ?', [req.params.id]);
  res.json({ message: 'AI data deleted' });
});

// 获取AI增强数据（主题、行动项等）
app.get('/api/ai-enhanced-data', async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const filters = [];
    const params = [];
    if (from) { filters.push('date >= ?'); params.push(String(from)); }
    if (to) { filters.push('date <= ?'); params.push(String(to)); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await db.all(`SELECT * FROM ai_enhanced_data ${where} ORDER BY date DESC, id DESC`, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching ai_enhanced_data:', error);
    res.status(500).json({ message: 'Failed to fetch ai_enhanced_data' });
  }
});

// 仪表盘聚合数据（供前端图表与卡片使用）
app.get('/api/dashboard', async (req, res) => {
  try {
    const { from, to, limit = 30 } = req.query || {};
    const filters = [];
    const params = [];
    if (from) { filters.push('date >= ?'); params.push(String(from)); }
    if (to) { filters.push('date <= ?'); params.push(String(to)); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // 简化记录（包含主要AI列）
    const simple = await db.all(`SELECT * FROM simple_records ${where} ORDER BY date ASC LIMIT ?`, [...params, Number(limit)]);
    // 增强数据
    const enhanced = await db.all(`SELECT * FROM ai_enhanced_data ${where} ORDER BY date ASC`, params);

    // 情绪趋势
    const moodTrend = simple.map(r => ({
      date: r.date,
      score: typeof r.mood_score === 'number' ? r.mood_score : 0,
      emoji: r.mood_emoji || '😐',
      event: r.mood_event || ''
    }));

    // 生活/健身
    const lifeFitness = simple.map(r => ({
      date: r.date,
      intensity: r.fitness_intensity || '',
      duration: r.fitness_duration || '',
      calories: r.fitness_calories || '',
      type: r.fitness_type || ''
    }));

    // 学习
    const study = simple.map(r => ({
      date: r.date,
      duration: r.study_duration || '',
      category: r.study_category || ''
    }));

    // 工作
    const work = simple.map(r => ({
      date: r.date,
      task_type: r.work_task_type || '',
      priority: r.work_priority || ''
    }));

    // 灵感
    const inspiration = simple.map(r => ({
      date: r.date,
      theme: r.inspiration_theme || '',
      difficulty: r.inspiration_difficulty || ''
    }));

    // 最新一条供卡片展示
    const latest = simple.length ? simple[simple.length - 1] : null;

    // 关键主题、行动项聚合（来自 ai_enhanced_data）
    const aggregateList = (arr) => Object.entries(arr.reduce((acc, cur) => {
      const list = [];
      try {
        const parsed = JSON.parse(cur || '[]');
        if (Array.isArray(parsed)) list.push(...parsed);
      } catch {}
      list.forEach(item => { acc[item] = (acc[item] || 0) + 1; });
      return acc;
    }, {})).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));

    const themesAgg = aggregateList(enhanced.map(e => e.key_themes));
    const actionsAgg = aggregateList(enhanced.map(e => e.action_items));

    res.json({
      moodTrend,
      lifeFitness,
      study,
      work,
      inspiration,
      latest,
      themesAgg,
      actionsAgg
    });
  } catch (error) {
    console.error('Error building dashboard data:', error);
    res.status(500).json({ message: 'Failed to build dashboard data' });
  }
});

// AI 聊天（Ollama 本地）
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, context = '' } = req.body || {};
    if (!prompt) return res.status(400).json({ message: 'prompt is required' });

    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

    const { data } = await axios.post('http://localhost:11434/api/generate', {
      model: OLLAMA_MODEL,
      prompt: context ? `上下文：${context}\n\n用户问题：${prompt}` : prompt,
      stream: false
    });

    res.json({ reply: data.response || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'AI 调用失败' });
  }
});

// AI聊天接口（前端弹窗专用）
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, context, history } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 构建对话上下文
    let systemPrompt = `你是一个专业的AI个人助手，专门帮助用户分析个人数据和提供生活建议。你的回答应该：
1. 专业、准确、有针对性
2. 结合用户的个人历史数据
3. 提供实用的建议和指导
4. 语言简洁明了，易于理解

当前用户所在页面：${context || '个人数据分析页面'}`;

    // 构建对话历史
    let conversationHistory = '';
    if (history && Array.isArray(history)) {
      conversationHistory = history.map(msg => 
        `${msg.type === 'user' ? '用户' : 'AI'}：${msg.content}`
      ).join('\n');
    }

    const fullPrompt = `${systemPrompt}

${conversationHistory ? `历史对话：\n${conversationHistory}\n` : ''}
用户问题：${message}

请提供专业的回答：`;

    // 优先使用 Ollama 本地模型
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
    const USE_OLLAMA = process.env.USE_OLLAMA === '1' || true; // 默认优先使用 Ollama
    
    let reply = '';
    try {
      if (USE_OLLAMA) {
        // 优先使用 Ollama
        try {
          const { data } = await axios.post('http://localhost:11434/api/generate', {
            model: OLLAMA_MODEL,
            prompt: fullPrompt,
            stream: false
          });
          reply = data.response || '';
        } catch (ollamaError) {
          console.error('Ollama error:', ollamaError);
          // Ollama 失败，尝试云 AI 服务
          if (aiService && (aiService.openaiApiKey || aiService.anthropicApiKey)) {
            reply = await aiService.chat(fullPrompt);
          } else {
            reply = generateMockReply(message, context);
          }
        }
      } else {
        // 使用云 AI 服务
        if (aiService && (aiService.openaiApiKey || aiService.anthropicApiKey)) {
          reply = await aiService.chat(fullPrompt);
        } else {
          // 回退到 Ollama
          const { data } = await axios.post('http://localhost:11434/api/generate', {
            model: OLLAMA_MODEL,
            prompt: fullPrompt,
            stream: false
          });
          reply = data.response || '';
        }
      }
    } catch (aiError) {
      console.error('AI service error:', aiError);
      reply = generateMockReply(message, context);
    }
    
    res.json({ 
      reply: reply || '抱歉，我现在无法回答这个问题，请稍后再试。',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'AI服务暂时不可用',
      reply: '抱歉，AI服务暂时不可用，请稍后再试。'
    });
  }
});

// 模拟AI回复函数
function generateMockReply(message, context) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('简历') || lowerMessage.includes('resume')) {
    return '关于简历优化，建议你：\n1. 突出与目标岗位相关的技能和经验\n2. 使用具体的数据和成果来展示能力\n3. 保持格式简洁清晰，控制在1-2页内\n4. 根据不同公司和岗位调整重点内容';
  }
  
  if (lowerMessage.includes('面试') || lowerMessage.includes('interview')) {
    return '面试准备建议：\n1. 深入了解目标公司和岗位要求\n2. 准备常见问题的回答，如自我介绍、优缺点等\n3. 准备几个能体现你能力的具体案例\n4. 提前准备几个想问面试官的问题';
  }
  
  if (lowerMessage.includes('实习') || lowerMessage.includes('internship')) {
    return '实习的好处包括：\n1. 获得实际工作经验，了解行业运作\n2. 建立职场人脉，为未来求职铺路\n3. 验证职业兴趣，明确发展方向\n4. 提升简历竞争力，增加求职成功率';
  }
  
  if (lowerMessage.includes('美术') || lowerMessage.includes('设计') || lowerMessage.includes('art')) {
    return '美术教育专业可以考虑的工作方向：\n1. 教育行业：美术老师、培训机构讲师\n2. 设计行业：平面设计师、UI/UX设计师\n3. 文化创意：插画师、动画师、游戏美术\n4. 媒体行业：广告创意、影视后期制作';
  }
  
  return `感谢你的问题！作为AI校招助手，我建议你：\n1. 明确自己的职业目标和兴趣方向\n2. 持续提升专业技能和综合素质\n3. 积极参与实习和项目实践\n4. 建立良好的人际网络和求职渠道\n\n如果你有更具体的问题，欢迎继续咨询！`;
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
  
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
  const prompt = `请根据以下健身描述，分析运动强度、时间、消耗和类型：

健身描述：${fitnessText}

请按以下JSON格式返回，只返回JSON，不要其他文字：
{
  "intensity": "低强度/中强度/高强度",
  "duration": "X分钟",
  "calories": "X卡",
  "type": "运动类型"
}

分析要求：
- intensity: 根据运动描述判断强度（如跑步是中-高强度，散步是低强度）
- duration: 从描述中提取或估算运动时间
- calories: 根据运动类型和时间估算消耗（散步30分钟约150卡，跑步30分钟约300卡）
- type: 提取主要运动类型（如有氧运动、力量训练、柔韧性训练等）`;

  try {
    const { data } = await axios.post('http://localhost:11434/api/generate', {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });

    const aiResponse = data.response || '';
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intensity: parsed.intensity || generateDefaultFitnessIntensity(fitnessText),
        duration: parsed.duration || generateDefaultFitnessDuration(fitnessText),
        calories: parsed.calories || generateDefaultFitnessCalories(fitnessText),
        type: parsed.type || generateDefaultFitnessType(fitnessText)
      };
    }
  } catch (error) {
    console.error('健身AI处理失败:', error);
  }
  
  // 失败时使用规则生成
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

// 原始数据提交接口（保存文本并生成AI总结）
const logToFile = (message) => {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync('debug.log', logMessage);
};

app.post('/api/raw-entry', async (req, res) => {
  logToFile('--- Received request for /api/raw-entry ---');
  try {
    logToFile(`Request body: ${JSON.stringify(req.body, null, 2)}`);
    const { date, mood_text, life_text, study_text, work_text, inspiration_text } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // 验证至少有一个内容字段不为空
    if (!mood_text?.trim() && !life_text?.trim() && !study_text?.trim() && !work_text?.trim() && !inspiration_text?.trim()) {
      return res.status(400).json({ message: 'At least one content field must not be empty' });
    }

    // 为心情描述生成AI总结
    const moodSummary = mood_text && mood_text.trim() !== '' 
      ? await aiService.analyzeMoodData(mood_text)
      : { mood_emoji: '😐', mood_event: '无特别事件', mood_score: 0, mood_category: '中性' };
    
    // 为健身描述生成AI总结
    const fitnessSummary = await generateFitnessSummary(life_text);

    // 保存到简化记录表，包含AI总结（使用 db.run + 位置占位符）
    const result = await db.run(
      'INSERT INTO simple_records (date, mood_description, life_description, study_description, work_description, inspiration_description, mood_emoji, mood_event, mood_score, mood_category, fitness_intensity, fitness_duration, fitness_calories, fitness_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        date,
        mood_text || '',
        life_text || '',
        study_text || '',
        work_text || '',
        inspiration_text || '',
        moodSummary.mood_emoji,
        moodSummary.mood_event,
        Number(moodSummary.mood_score) || 0,
        moodSummary.mood_category || '中性',
        fitnessSummary.intensity || '',
        fitnessSummary.duration || '',
        fitnessSummary.calories || '',
        fitnessSummary.type || ''
      ]
    );

    // 同时保存到 raw_entries（备份）
    await db.run(
      'INSERT INTO raw_entries (date, mood_text, life_text, study_text, work_text, inspiration_text) VALUES (?, ?, ?, ?, ?, ?)',
      [
        date,
        mood_text || '',
        life_text || '',
        study_text || '',
        work_text || '',
        inspiration_text || ''
      ]
    );

    res.status(201).json({
      message: 'Data saved successfully with AI summary',
      record_id: result.lastID,
      data: {
        date,
        mood_description: mood_text || '',
        life_description: life_text || '',
        study_description: study_text || '',
        work_description: work_text || '',
        inspiration_description: inspiration_text || '',
        mood_emoji: moodSummary.mood_emoji,
        mood_event: moodSummary.mood_event,
        mood_score: moodSummary.mood_score,
        mood_category: moodSummary.mood_category,
        fitness_intensity: fitnessSummary.intensity,
        fitness_duration: fitnessSummary.duration,
        fitness_calories: fitnessSummary.calories,
        fitness_type: fitnessSummary.type
      }
    });
  } catch (error) {
    logToFile(`--- ERROR in /api/raw-entry: ${error.message} ---\n${error.stack}`);
    console.error('Error saving entry:', error);
    res.status(500).json({ message: 'Failed to save entry', error: error.message });
  }
});

// AI数据处理函数
async function processRawDataWithAI(rawData) {
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
  
  const prompt = `请分析以下个人日记数据，为每个维度打分（1-5分，5分最高），并为心情生成合适的emoji：

日期: ${rawData.date}
心情: ${rawData.mood_text}
生活: ${rawData.life_text}
学习: ${rawData.study_text}
工作: ${rawData.work_text}
灵感: ${rawData.inspiration_text}

请按以下JSON格式返回评分结果，只返回JSON，不要其他文字：
{
  "date": "${rawData.date}",
  "mood": 数字评分,
  "mood_emoji": "表情符号",
  "mood_description": "心情简短描述",
  "life": 数字评分,
  "study": 数字评分,
  "work": 数字评分,
  "inspiration": 数字评分,
  "summary": "简短总结"
}

评分标准：
- 心情：根据情绪表达的积极程度，并生成对应emoji（如😊😔😤😴🤔等）
- 生活：根据生活质量、健康状况、活动丰富度
- 学习：根据新知识获取、学习成果、技能提升
- 工作：根据工作进展、机会、成就感
- 灵感：根据创意想法、洞察、启发的丰富度`;

  try {
    const { data } = await axios.post('http://localhost:11434/api/generate', {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });

    // 尝试解析AI返回的JSON
    const aiResponse = data.response || '';
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      return {
        date: parsedData.date || rawData.date,
        mood: Math.max(1, Math.min(5, parsedData.mood || 3)),
        mood_emoji: parsedData.mood_emoji || '😊',
        mood_description: parsedData.mood_description || '心情不错',
        life: Math.max(1, Math.min(5, parsedData.life || 3)),
        study: Math.max(1, Math.min(5, parsedData.study || 3)),
        work: Math.max(1, Math.min(5, parsedData.work || 3)),
        inspiration: Math.max(1, Math.min(5, parsedData.inspiration || 3)),
        summary: parsedData.summary || '数据已处理'
      };
    } else {
      throw new Error('AI返回格式不正确');
    }
  } catch (error) {
    console.error('AI processing error:', error);
    // 返回默认评分
    return {
      date: rawData.date,
      mood: 3,
      mood_emoji: '😐',
      mood_description: '心情一般',
      life: 3,
      study: 3,
      work: 3,
      inspiration: 3,
      summary: '自动处理失败，使用默认评分'
    };
  }
}

// 获取原始数据列表
app.get('/api/raw-entries', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filters = [];
    const params = [];
    
    if (from) { filters.push('date >= ?'); params.push(from); }
    if (to) { filters.push('date <= ?'); params.push(to); }
    
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const rows = await db.all(`SELECT * FROM raw_entries ${where} ORDER BY date DESC`, params);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching raw entries:', error);
    res.status(500).json({ message: 'Failed to fetch raw entries' });
  }
});

// 获取单条原始数据
app.get('/api/raw-entries/:id', async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM raw_entries WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.status(404).json({ message: 'Raw entry not found' });
    }
    res.json(row);
  } catch (error) {
    console.error('Error fetching raw entry:', error);
    res.status(500).json({ message: 'Failed to fetch raw entry' });
  }
});

// 编辑原始数据
app.put('/api/raw-entries/:id', async (req, res) => {
  try {
    const { date, mood_text, fitness_text, study_text, work_text, inspiration_text } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    // 更新原始数据
    const result = await db.run(
      'UPDATE raw_entries SET date = ?, mood_text = ?, fitness_text = ?, study_text = ?, work_text = ?, inspiration_text = ? WHERE id = ?',
      [date, mood_text || '', fitness_text || '', study_text || '', work_text || '', inspiration_text || '', req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Raw entry not found' });
    }

    // 可选：重新处理AI分析
    const reprocess = req.body.reprocess === true;
    if (reprocess) {
      try {
        const processedData = await processRawDataWithAI({
          date,
          mood_text,
          fitness_text,
          study_text,
          work_text,
          inspiration_text
        });

        // 查找对应的处理后数据并更新
        const existingRecord = await db.get('SELECT id FROM records WHERE date = ?', [date]);
        if (existingRecord) {
          await db.run(
            'UPDATE records SET mood = ?, life = ?, study = ?, work = ?, inspiration = ?, note = ? WHERE date = ?',
            [
              processedData.mood,
              processedData.life,
              processedData.study,
              processedData.work,
              processedData.inspiration,
              processedData.summary || '',
              date
            ]
          );
        } else {
          await db.run(
            'INSERT INTO records (date, mood, life, study, work, inspiration, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              processedData.date,
              processedData.mood,
              processedData.life,
              processedData.study,
              processedData.work,
              processedData.inspiration,
              processedData.summary || ''
            ]
          );
        }

        res.json({ 
          message: 'Raw entry updated and reprocessed successfully',
          processed_data: processedData
        });
      } catch (aiError) {
        console.error('AI reprocessing failed:', aiError);
        res.json({ 
          message: 'Raw entry updated, but AI reprocessing failed',
          note: 'AI processing will be retried later'
        });
      }
    } else {
      res.json({ message: 'Raw entry updated successfully' });
    }
  } catch (error) {
    console.error('Error updating raw entry:', error);
    res.status(500).json({ message: 'Failed to update raw entry', error: error.message });
  }
});

// 删除原始数据
app.delete('/api/raw-entries/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM raw_entries WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Raw entry not found' });
    }
    
    res.json({ message: 'Raw entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting raw entry:', error);
    res.status(500).json({ message: 'Failed to delete raw entry' });
  }
});

// 批量删除记录
app.delete('/api/records/batch', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(`DELETE FROM records WHERE id IN (${placeholders})`, ids);
    
    res.json({ 
      message: `Successfully deleted ${result.changes} records`,
      deleted_count: result.changes 
    });
  } catch (error) {
    console.error('Error batch deleting records:', error);
    res.status(500).json({ message: 'Failed to batch delete records' });
  }
});

// 批量更新记录
app.put('/api/records/batch', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ message: 'Updates object is required' });
    }

    const validFields = ['mood', 'mood_emoji', 'mood_description', 'life', 'study', 'work', 'inspiration', 'note'];
    const updateFields = Object.keys(updates).filter(key => validFields.includes(key));
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const placeholders = ids.map(() => '?').join(',');
    const values = [...updateFields.map(field => updates[field]), ...ids];

    const result = await db.run(
      `UPDATE records SET ${setClause} WHERE id IN (${placeholders})`,
      values
    );
    
    res.json({ 
      message: `Successfully updated ${result.changes} records`,
      updated_count: result.changes 
    });
  } catch (error) {
    console.error('Error batch updating records:', error);
    res.status(500).json({ message: 'Failed to batch update records' });
  }
});

// 原始文本解析API - 接收完整文本并解析为结构化数据
app.post('/api/parse-raw-text', async (req, res) => {
  try {
    const { raw_text } = req.body;
    
    if (!raw_text || !raw_text.trim()) {
      return res.status(400).json({ message: '需要提供原始文本数据' });
    }

    console.log('接收到原始文本:', raw_text);
    console.log('原始文本长度:', raw_text.length);
    console.log('原始文本字符编码:', JSON.stringify(raw_text));

    // 解析原始文本
    const parsedData = parseRawTextData(raw_text);
    console.log('解析结果:', parsedData);

    if (!parsedData.date) {
      return res.status(400).json({ message: '无法从文本中提取有效日期' });
    }

    // 为心情描述生成AI总结
    const moodSummary = parsedData.mood_text && parsedData.mood_text.trim() !== '' 
      ? await aiService.analyzeMoodData(parsedData.mood_text)
      : { mood_emoji: '😐', mood_event: '无特别事件', mood_score: 0, mood_category: '中性' };
    
    // 为健身描述生成AI总结
    const fitnessSummary = await generateFitnessSummary(parsedData.fitness_text);

    // 保存到简化记录表，包含AI总结 - 使用fitness_description字段
    const result = await db.run(
      'INSERT INTO simple_records (date, mood_description, fitness_description, study_description, work_description, inspiration_description, mood_emoji, mood_event, mood_score, mood_category, fitness_intensity, fitness_duration, fitness_calories, fitness_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        parsedData.date, 
        parsedData.mood_text || '', 
        parsedData.fitness_text || '', 
        parsedData.study_text || '', 
        parsedData.work_text || '', 
        parsedData.inspiration_text || '', 
        moodSummary.mood_emoji, 
        moodSummary.mood_event, 
        moodSummary.mood_score, 
        moodSummary.mood_category, 
        fitnessSummary.intensity, 
        fitnessSummary.duration, 
        fitnessSummary.calories, 
        fitnessSummary.type
      ]
    );

    // 同时保存原始数据到raw_entries表（备份） - 使用fitness_text字段
    await db.run(
      'INSERT INTO raw_entries (date, mood_text, fitness_text, study_text, work_text, inspiration_text) VALUES (?, ?, ?, ?, ?, ?)',
      [parsedData.date, parsedData.mood_text || '', parsedData.fitness_text || '', parsedData.study_text || '', parsedData.work_text || '', parsedData.inspiration_text || '']
    );

    // 同步到ai_data表供前端AI数据页面显示
    if (parsedData.mood_text || parsedData.fitness_text || parsedData.study_text || parsedData.work_text || parsedData.inspiration_text) {
      // 只有当有实际内容时才创建AI数据记录
      const aiEntries = [];
      
      if (parsedData.mood_text && parsedData.mood_text.trim() !== '') {
        aiEntries.push({
          category: '心情分析',
          title: `${moodSummary.mood_emoji} ${moodSummary.mood_category}`,
          content: `${parsedData.mood_text} - ${moodSummary.mood_event}`,
          score: moodSummary.mood_score
        });
      }
      
      if (parsedData.fitness_text && parsedData.fitness_text.trim() !== '') {
        aiEntries.push({
          category: '健身记录',
          title: `${fitnessSummary.type} - ${fitnessSummary.intensity}`,
          content: `${parsedData.fitness_text} (${fitnessSummary.duration}, ${fitnessSummary.calories})`,
          score: null
        });
      }
      
      if (parsedData.study_text && parsedData.study_text.trim() !== '') {
        aiEntries.push({
          category: '学习记录',
          title: '学习活动',
          content: parsedData.study_text,
          score: null
        });
      }
      
      if (parsedData.work_text && parsedData.work_text.trim() !== '') {
        aiEntries.push({
          category: '工作记录',
          title: '工作活动',
          content: parsedData.work_text,
          score: null
        });
      }
      
      if (parsedData.inspiration_text && parsedData.inspiration_text.trim() !== '') {
        aiEntries.push({
          category: '灵感记录',
          title: '创意想法',
          content: parsedData.inspiration_text,
          score: null
        });
      }
      
      // 批量插入ai_data表
      for (const entry of aiEntries) {
        await db.run(
          'INSERT INTO ai_data (date, category, title, content, score) VALUES (?, ?, ?, ?, ?)',
          [parsedData.date, entry.category, entry.title, entry.content, entry.score]
        );
      }
    }

    res.status(201).json({
      message: 'Data saved successfully with AI summary',
      record_id: result.lastID,
      parsed_data: parsedData,
      ai_analysis: {
        mood_emoji: moodSummary.mood_emoji,
        mood_event: moodSummary.mood_event,
        mood_score: moodSummary.mood_score,
        mood_category: moodSummary.mood_category,
        fitness_intensity: fitnessSummary.intensity,
        fitness_duration: fitnessSummary.duration,
        fitness_calories: fitnessSummary.calories,
        fitness_type: fitnessSummary.type
      }
    });
  } catch (error) {
    console.error('Error parsing raw text:', error);
    res.status(500).json({ message: 'Failed to parse and save text', error: error.message });
  }
});

// 原始文本解析函数
function parseRawTextData(rawText) {
  const result = {
    date: '',
    mood_text: '',
    fitness_text: '',  // 改为 fitness_text
    study_text: '',
    work_text: '',
    inspiration_text: ''
  };

  // 解析日期 - 支持多种格式
  const datePatterns = [
    /日期：(\d{4})年(\d{1,2})月(\d{1,2})日/,      // 日期：2025年8月18日
    /日期:(\d{4})年(\d{1,2})月(\d{1,2})日/,       // 日期:2025年8月18日 (英文冒号)
    /日期：(\d{4})-(\d{1,2})-(\d{1,2})/,         // 日期：2025-8-18
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,           // 2025年8月18日
    /(\d{4})-(\d{1,2})-(\d{1,2})/                // 2025-8-18
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = rawText.match(pattern);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      result.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      break;
    }
  }

  // 解析各个字段 - 支持两种格式：冒号和是：
  // 心情字段
  const moodPatterns = [/心情是：([^\n\r]*?)(?=\n|$)/g, /心情：([^\n\r]*?)(?=\n|$)/g];
  for (const pattern of moodPatterns) {
    const matches = rawText.match(pattern);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const content = lastMatch.replace(/心情[是：]：?/, '').trim();
      if (content && content !== '' && content !== '没有' && content !== '没') {
        result.mood_text = content;
        break;
      }
    }
  }

  // 健身字段
  const fitnessPatterns = [/健身是：([^\n\r]*?)(?=\n|$)/g, /健身：([^\n\r]*?)(?=\n|$)/g];
  for (const pattern of fitnessPatterns) {
    const matches = rawText.match(pattern);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const content = lastMatch.replace(/健身[是：]：?/, '').trim();
      if (content && content !== '' && content !== '没有' && content !== '没') {
        result.fitness_text = content;
        break;
      }
    }
  }

  // 学习字段
  const studyPatterns = [/学习是：([^\n\r]*?)(?=\n|$)/g, /学习：([^\n\r]*?)(?=\n|$)/g];
  for (const pattern of studyPatterns) {
    const matches = rawText.match(pattern);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const content = lastMatch.replace(/学习[是：]：?/, '').trim();
      if (content && content !== '' && content !== '没有' && content !== '没' && !content.includes('没有没有')) {
        result.study_text = content;
        break;
      }
    }
  }

  // 工作字段
  const workPatterns = [/工作是：([^\n\r]*?)(?=\n|$)/g, /工作：([^\n\r]*?)(?=\n|$)/g];
  for (const pattern of workPatterns) {
    const matches = rawText.match(pattern);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const content = lastMatch.replace(/工作[是：]：?/, '').trim();
      if (content && content !== '' && content !== '没有' && content !== '没' && !content.includes('没有有没有')) {
        result.work_text = content;
        break;
      }
    }
  }

  // 灵感字段
  const inspirationPatterns = [/灵感是：([^\n\r]*?)(?=\n|$)/g, /灵感：([^\n\r]*?)(?=\n|$)/g];
  for (const pattern of inspirationPatterns) {
    const matches = rawText.match(pattern);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const content = lastMatch.replace(/灵感[是：]：?/, '').trim();
      if (content && content !== '' && content !== '没有' && content !== '没') {
        result.inspiration_text = content;
        break;
      }
    }
  }

  return result;
}

// 笔记本相关API
app.get('/api/notebooks', async (req, res) => {
  try {
    const notebooks = await db.all('SELECT * FROM notebooks ORDER BY created_at DESC');
    
    // 获取每个笔记本的笔记数量
    const notebooksWithCount = [];
    for (let notebook of notebooks) {
      try {
        console.log(`🔍 查询笔记本 ${notebook.notebook_id} 的笔记数量...`);
        const countResult = await db.all(
          'SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?',
          [notebook.notebook_id]
        );
        console.log(`📊 笔记本 ${notebook.notebook_id} 的笔记数量查询结果:`, countResult);
        const noteCount = countResult[0]?.count || 0;
        console.log(`✅ 设置笔记本 ${notebook.notebook_id} 的笔记数量为: ${noteCount}`);
        
        notebooksWithCount.push({
          ...notebook,
          note_count: noteCount
        });
      } catch (error) {
        console.error(`❌ 查询笔记本 ${notebook.notebook_id} 笔记数量时出错:`, error);
        notebooksWithCount.push({
          ...notebook,
          note_count: 0
        });
      }
    }
    
    res.json({ 
      success: true, 
      notebooks: notebooksWithCount.map(notebook => ({
        notebook_id: notebook.notebook_id,
        name: notebook.name,
        note_count: notebook.note_count || 0,
        created_at: notebook.created_at,
        updated_at: notebook.updated_at
      }))
    });
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notebooks' });
  }
});

// 创建笔记本
app.post('/api/notebooks', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Notebook name is required' });
    }

    // 生成Turso格式的ID
    const generateTursoId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `A${timestamp}${random}`.toUpperCase();
    };

    const id = generateTursoId();
    
    await db.run(
      'INSERT INTO notebooks (notebook_id, name, note_count) VALUES (?, ?, ?)',
      [id, name, 0]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Notebook created successfully',
      notebook: {
        notebook_id: id,
        name,
        note_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ success: false, message: 'Failed to create notebook' });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const { notebook_id, id } = req.query;
    
    // 如果提供了id参数，返回单条笔记
    if (id) {
      const note = await db.get('SELECT * FROM notes WHERE note_id = ?', [id]);
      if (!note) {
        return res.status(404).json({ success: false, message: 'Note not found' });
      }
      
      // 获取笔记本信息
      const notebook = await db.get('SELECT * FROM notebooks WHERE notebook_id = ?', [note.notebook_id]);
      
      return res.json({
        success: true,
        note: {
          id: note.note_id,
          note_id: note.note_id,
          notebook_id: note.notebook_id,
          title: note.title,
          image_url: note.image_url,
          duration_minutes: note.duration_minutes,
          created_at: note.created_at,
          status: note.status || 'success'
        },
        notebook: notebook ? {
          notebook_id: notebook.notebook_id,
          name: notebook.name,
          note_count: notebook.note_count || 0,
          created_at: notebook.created_at,
          updated_at: notebook.updated_at
        } : null
      });
    }
    
    // 如果没有提供id，则按原来的逻辑处理notebook_id
    if (!notebook_id) {
      return res.status(400).json({ success: false, message: 'notebook_id or id is required' });
    }

    console.log('📝 获取笔记请求:', { notebook_id });

    // 获取笔记本信息
    const notebook = await db.get('SELECT * FROM notebooks WHERE notebook_id = ?', [notebook_id]);
    if (!notebook) {
      return res.status(404).json({ success: false, message: 'Notebook not found' });
    }

    console.log('📚 找到笔记本:', notebook.name);

    // 先检查笔记数量，避免查询过多数据
    let noteCount = 0;
    let notes = [];
    
    try {
      console.log('📝 查询笔记数量...');
      const countResult = await Promise.race([
        db.get('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', [notebook_id]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Count query timeout')), 5000))
      ]);
      noteCount = countResult.count || 0;
      console.log('📝 笔记数量:', noteCount);

      if (noteCount > 0 && noteCount < 1000) {
        // 如果笔记数量合理，查询具体笔记
        console.log('📝 查询笔记详情...');
        notes = await Promise.race([
          db.all('SELECT note_id, notebook_id, title, created_at FROM notes WHERE notebook_id = ? ORDER BY created_at DESC LIMIT 50', [notebook_id]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Notes query timeout')), 30000))
        ]);
        console.log('✅ 成功查询到笔记:', notes.length);
      } else if (noteCount >= 1000) {
        console.log('⚠️ 笔记数量过多，跳过查询以避免超时');
      }
    } catch (error) {
      console.error('❌ 查询笔记时出错:', error.message);
      // 即使查询失败，也返回空结果而不是完全失败
      noteCount = 0;
      notes = [];
    }
    
    res.json({ 
      success: true, 
      notebook: {
        notebook_id: notebook.notebook_id,
        name: notebook.name,
        note_count: noteCount,
        created_at: notebook.created_at,
        updated_at: notebook.updated_at
      },
      notes: notes.map(note => ({
        id: note.note_id,
        note_id: note.note_id,
        notebook_id: note.notebook_id,
        title: note.title,
        content_text: note.content_text || note.content || '',
        image_url: note.image_url,
        images: note.images ? (typeof note.images === 'string' ? JSON.parse(note.images) : note.images) : [],
        image_urls: note.image_urls,
        source_url: note.source_url || '',
        original_url: note.original_url || '',
        author: note.author || '',
        upload_time: note.upload_time || '',
        duration_minutes: note.duration_minutes,
        created_at: note.created_at,
        updated_at: note.updated_at,
        status: 'success'
      }))
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notes', error: error.message });
  }
});

// 重命名笔记本
app.post('/api/notebook-rename', async (req, res) => {
  try {
    const { id, name } = req.body;
    
    if (!id || !name) {
      return res.status(400).json({ success: false, message: 'Notebook id and name are required' });
    }

    await db.run('UPDATE notebooks SET name = ?, updated_at = ? WHERE notebook_id = ?', [name, new Date().toISOString(), id]);

    res.json({ 
      success: true, 
      message: 'Notebook renamed successfully'
    });
  } catch (error) {
    console.error('Error renaming notebook:', error);
    res.status(500).json({ success: false, message: 'Failed to rename notebook' });
  }
});

// 删除笔记本
app.post('/api/notebook-delete', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'Notebook id is required' });
    }

    // 先删除笔记本下的所有笔记
    await db.run('DELETE FROM notes WHERE notebook_id = ?', [id]);
    
    // 再删除笔记本
    await db.run('DELETE FROM notebooks WHERE notebook_id = ?', [id]);

    res.json({ 
      success: true, 
      message: 'Notebook and all its notes deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notebook' });
  }
});

// 创建笔记
app.post('/api/notes', async (req, res) => {
  try {
    const { 
      notebook_id, 
      title, 
      content_text, 
      images, 
      source_url, 
      original_url, 
      author, 
      upload_time 
    } = req.body;
    
    if (!notebook_id || !title) {
      return res.status(400).json({ success: false, message: 'Notebook id and title are required' });
    }

    // 生成Turso格式的ID
    const generateTursoId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `N${timestamp}${random}`.toUpperCase();
    };

    const noteId = generateTursoId();
    
    await db.run(
      'INSERT INTO notes (note_id, notebook_id, title, content_text, images, source_url, original_url, author, upload_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        noteId, 
        notebook_id, 
        title, 
        content_text || '', 
        images ? JSON.stringify(images) : null,
        source_url || null,
        original_url || null,
        author || null,
        upload_time || null,
        new Date().toISOString(), 
        new Date().toISOString()
      ]
    );

    // 更新笔记本的笔记数量
    await db.run('UPDATE notebooks SET note_count = note_count + 1, updated_at = ? WHERE notebook_id = ?', [new Date().toISOString(), notebook_id]);

    res.status(201).json({ 
      success: true, 
      message: 'Note created successfully',
      note: {
        id: noteId,
        note_id: noteId,
        notebook_id,
        title,
        content_text: content_text || '',
        images: images || [],
        source_url: source_url || '',
        original_url: original_url || '',
        author: author || '',
        upload_time: upload_time || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
});

// 重命名笔记
app.post('/api/note-rename', async (req, res) => {
  try {
    const { id, title } = req.body;
    
    if (!id || !title) {
      return res.status(400).json({ success: false, message: 'Note id and title are required' });
    }

    await db.run('UPDATE notes SET title = ?, updated_at = ? WHERE note_id = ?', [title, new Date().toISOString(), id]);

    res.json({ 
      success: true, 
      message: 'Note renamed successfully'
    });
  } catch (error) {
    console.error('Error renaming note:', error);
    res.status(500).json({ success: false, message: 'Failed to rename note' });
  }
});

// 移动笔记
app.post('/api/note-move', async (req, res) => {
  try {
    const { note_id, target_notebook_id } = req.body;
    
    if (!note_id || !target_notebook_id) {
      return res.status(400).json({ success: false, message: 'Note id and target notebook id are required' });
    }

    // 获取笔记的当前笔记本ID
    const note = await db.get('SELECT notebook_id FROM notes WHERE note_id = ?', [note_id]);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const oldNotebookId = note.notebook_id;

    // 移动笔记
    await db.run('UPDATE notes SET notebook_id = ?, updated_at = ? WHERE note_id = ?', [target_notebook_id, new Date().toISOString(), note_id]);

    // 更新原笔记本的笔记数量
    await db.run('UPDATE notebooks SET note_count = note_count - 1, updated_at = ? WHERE notebook_id = ?', [new Date().toISOString(), oldNotebookId]);

    // 更新目标笔记本的笔记数量
    await db.run('UPDATE notebooks SET note_count = note_count + 1, updated_at = ? WHERE notebook_id = ?', [new Date().toISOString(), target_notebook_id]);

    res.json({ 
      success: true, 
      message: 'Note moved successfully'
    });
  } catch (error) {
    console.error('Error moving note:', error);
    res.status(500).json({ success: false, message: 'Failed to move note' });
  }
});

// 删除笔记
app.post('/api/note-delete', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'Note id is required' });
    }

    // 获取笔记的笔记本ID
    const note = await db.get('SELECT notebook_id FROM notes WHERE note_id = ?', [id]);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    // 删除笔记
    await db.run('DELETE FROM notes WHERE note_id = ?', [id]);

    // 更新笔记本的笔记数量
    await db.run('UPDATE notebooks SET note_count = note_count - 1, updated_at = ? WHERE notebook_id = ?', [new Date().toISOString(), note.notebook_id]);

    res.json({ 
      success: true, 
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
});

// 获取笔记详情数据
app.get('/api/note-detail-data', async (req, res) => {
  try {
    console.log('🔍 note-detail-data endpoint called with id:', req.query.id);
    const { id } = req.query;
    
    if (!id) {
      console.log('❌ Missing id parameter');
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    // 获取笔记详情
    console.log('📝 Querying note with id:', id);
    const note = await db.get('SELECT * FROM notes WHERE note_id = ?', [id]);
    console.log('📝 Note query result:', note ? 'found' : 'not found');
    
    if (!note) {
      console.log('❌ Note not found');
      return res.status(404).json({ error: 'Note not found' });
    }

    // 获取笔记本信息
    console.log('📚 Querying notebook with id:', note.notebook_id);
    const notebook = await db.get('SELECT * FROM notebooks WHERE notebook_id = ?', [note.notebook_id]);
    console.log('📚 Notebook query result:', notebook ? 'found' : 'not found');

    // 处理笔记数据
    let parsedImages = [];
    if (note.images) {
      try {
        // 尝试解析JSON格式的images
        if (typeof note.images === 'string') {
          parsedImages = JSON.parse(note.images);
        } else if (Array.isArray(note.images)) {
          parsedImages = note.images;
        }
      } catch (e) {
        console.error('解析图片数据失败:', e);
        parsedImages = [];
      }
    }

    const enrichedNote = {
      ...note,
      content_text: note.content_text || note.content || '',
      images: parsedImages,
      image_urls: note.image_urls || null,
      source_url: note.source_url || '',
      core_points: note.core_points || '',
      keywords: note.keywords || '',
      knowledge_extension: note.knowledge_extension || '',
      learning_path: note.learning_path || '',
      ai_chat_summary: note.ai_chat_summary || ''
    };

    console.log(`✅ 成功获取笔记详情: ${enrichedNote.title}`);
    
    res.json({
      success: true,
      note: enrichedNote,
      notebook: notebook
    });

  } catch (error) {
    console.error('获取笔记详情失败:', error);
    res.status(500).json({ error: '获取笔记详情失败', details: error.message });
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ai_service: !!(aiService.openaiApiKey || aiService.anthropicApiKey)
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ai_service: !!(aiService.openaiApiKey || aiService.anthropicApiKey)
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  db = await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
    console.log(`AI Service Status: ${aiService.openaiApiKey ? 'OpenAI' : aiService.anthropicApiKey ? 'Anthropic' : 'Mock Mode'}`);
  });
}

startServer();