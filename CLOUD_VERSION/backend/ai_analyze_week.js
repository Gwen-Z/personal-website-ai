import { createClient } from '@libsql/client';
import axios from 'axios';

// 获取Turso客户端
async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw';
  return createClient({ url, authToken });
}

// AI数据处理函数（从app.js复制）
async function processRawDataWithAI(rawData) {
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
  
  const prompt = `请分析以下个人日记数据，为每个维度打分（1-5分，5分最高），并为心情生成合适的emoji：

日期: ${rawData.date}
心情: ${rawData.mood_text}
生活: ${rawData.life_text || '无'}
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

// 心情数据分析函数
async function analyzeMoodData(moodDescription) {
  const prompt = `你是一个情绪分析专家。请严格按照以下规则分析心情描述：

心情描述: "${moodDescription}"

情绪分值规则（严格按照）：
- 开心、非常开心、获奖、比赛获奖 = 3分
- 平静、平稳、中立、没什么起伏 = 0分  
- 震惊、朋友分手、意外消息 = 1分
- 无语、被踩脚、小失望 = -1分
- 烦、搬家、工作压力 = -2分
- 疲惫、累、加班 = -2分
- 伤心、难过、离别 = -3分
- 生气、错过飞机、愤怒 = -3分

心情事件总结规则
概括描述中的相关事项
比如今天做饭特别成功，给自己点个赞=厨艺相关
身体有点不舒服，心情也跟着低落=身体不适
工作上遇到难题，心情也跟着低落=工作压力
朋友分手，心情也跟着低落=朋友关系
意外消息，心情也跟着低落=意外消息
搬家，心情也跟着低落=搬家
加班，心情也跟着低落=加班
无语，心情也跟着低落=无语
被踩脚，心情也跟着低落=被踩脚

情绪分类规则：
- 3分 = "积极高"
- 0分 = "中性"  
- 1分 = "特殊情"
- -1分 = "轻度消"
- -2分 = "中度消" 
- -3分 = "高强度"

请返回标准JSON格式：
{
  "emoji": "准确的emoji符号",
  "event": "核心事件简述（不超过10字）",
  "score": 数值分值,
  "category": "情绪分类"
}

只返回JSON，无其他内容。`;

  try {
    const { data } = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3.1:latest',
      prompt: prompt,
      stream: false
    });

    const aiResponse = data.response || '';
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('AI返回格式不正确');
    }
  } catch (error) {
    console.error('心情分析失败:', error);
    return { emoji: '😐', event: '日常心情', score: 0, category: '中性' };
  }
}

async function processWeekData() {
  try {
    const turso = await getTursoClient();
    console.log('开始AI分析一周数据...');
    
    // 获取本周的原始数据
    const rawEntries = await turso.execute({
      sql: 'SELECT * FROM raw_entries WHERE date >= ? AND date <= ? ORDER BY date',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`📊 找到 ${rawEntries.rows.length} 条原始数据需要处理`);
    
    for (const row of rawEntries.rows) {
      const rawData = {
        date: row[1], // date
        mood_text: row[2], // mood_text
        fitness_text: row[3], // fitness_text
        study_text: row[4], // study_text
        work_text: row[5], // work_text
        inspiration_text: row[6] // inspiration_text
      };
      
      console.log(`\n🔄 处理日期 ${rawData.date} 的数据...`);
      
      try {
        // 1. 进行AI分析
        const aiAnalysis = await processRawDataWithAI(rawData);
        console.log(`  ✅ AI分析完成: 心情${aiAnalysis.mood}分, 学习${aiAnalysis.study}分, 工作${aiAnalysis.work}分`);
        
        // 2. 心情数据分析
        const moodAnalysis = await analyzeMoodData(rawData.mood_text);
        console.log(`  ✅ 心情分析完成: ${moodAnalysis.emoji} ${moodAnalysis.event} (${moodAnalysis.score}分)`);
        
        // 3. 检查是否已存在simple_records
        const existing = await turso.execute({
          sql: 'SELECT id FROM simple_records WHERE date = ?',
          args: [rawData.date]
        });
        
        if (existing.rows && existing.rows.length > 0) {
          // 更新现有记录
          await turso.execute({
            sql: `UPDATE simple_records SET 
              mood_description = ?, mood_emoji = ?, mood_score = ?, mood_category = ?, mood_event = ?,
              fitness_description = ?, study_description = ?, work_description = ?, inspiration_description = ?,
              overall_sentiment = ?, energy_level = ?, productivity_score = ?, life_balance_score = ?,
              data_quality_score = ?, created_at = ?
              WHERE date = ?`,
            args: [
              rawData.mood_text,
              moodAnalysis.emoji,
              moodAnalysis.score,
              moodAnalysis.category,
              moodAnalysis.event,
              rawData.fitness_text,
              rawData.study_text,
              rawData.work_text,
              rawData.inspiration_text,
              aiAnalysis.mood >= 3 ? 'positive' : aiAnalysis.mood <= 1 ? 'negative' : 'neutral',
              Math.max(1, Math.min(5, aiAnalysis.mood + 1)),
              Math.max(1, Math.min(5, (aiAnalysis.study + aiAnalysis.work) / 2)),
              Math.max(1, Math.min(5, (aiAnalysis.life + aiAnalysis.mood) / 2)),
              Math.max(1, Math.min(5, (aiAnalysis.study + aiAnalysis.work + aiAnalysis.inspiration) / 3)),
              new Date().toISOString(),
              rawData.date
            ]
          });
          console.log(`  ✅ 更新了日期 ${rawData.date} 的记录`);
        } else {
          // 插入新记录
          await turso.execute({
            sql: `INSERT INTO simple_records (
              date, mood_description, mood_emoji, mood_score, mood_category, mood_event,
              fitness_description, study_description, work_description, inspiration_description,
              overall_sentiment, energy_level, productivity_score, life_balance_score, data_quality_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              rawData.date,
              rawData.mood_text,
              moodAnalysis.emoji,
              moodAnalysis.score,
              moodAnalysis.category,
              moodAnalysis.event,
              rawData.fitness_text,
              rawData.study_text,
              rawData.work_text,
              rawData.inspiration_text,
              aiAnalysis.mood >= 3 ? 'positive' : aiAnalysis.mood <= 1 ? 'negative' : 'neutral',
              Math.max(1, Math.min(5, aiAnalysis.mood + 1)),
              Math.max(1, Math.min(5, (aiAnalysis.study + aiAnalysis.work) / 2)),
              Math.max(1, Math.min(5, (aiAnalysis.life + aiAnalysis.mood) / 2)),
              Math.max(1, Math.min(5, (aiAnalysis.study + aiAnalysis.work + aiAnalysis.inspiration) / 3)),
              new Date().toISOString()
            ]
          });
          console.log(`  ✅ 插入了日期 ${rawData.date} 的新记录`);
        }
        
        // 4. 记录AI分析历史
        await turso.execute({
          sql: 'INSERT INTO ai_data (date, category, title, content, score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          args: [
            rawData.date,
            'mood_analysis',
            '心情分析',
            `AI分析结果: ${moodAnalysis.emoji} ${moodAnalysis.event} (${moodAnalysis.score}分, ${moodAnalysis.category})`,
            0.9,
            new Date().toISOString()
          ]
        });
        
        await turso.execute({
          sql: 'INSERT INTO ai_data (date, category, title, content, score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          args: [
            rawData.date,
            'general_analysis',
            '综合分析',
            `学习${aiAnalysis.study}分, 工作${aiAnalysis.work}分, 灵感${aiAnalysis.inspiration}分 - ${aiAnalysis.summary}`,
            0.8,
            new Date().toISOString()
          ]
        });
        
      } catch (error) {
        console.error(`  ❌ 处理日期 ${rawData.date} 失败:`, error.message);
      }
    }
    
    console.log('\n🎉 一周数据AI分析完成！');
    
    // 显示处理结果统计
    const processedCount = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM simple_records WHERE date >= ? AND date <= ?',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`📊 本周共处理 ${processedCount.rows[0][0]} 条记录`);
    
  } catch (error) {
    console.error('AI分析失败:', error);
  }
}

// 运行AI分析
processWeekData();
