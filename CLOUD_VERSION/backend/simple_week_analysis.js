import { createClient } from '@libsql/client';

// 获取Turso客户端
async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw';
  return createClient({ url, authToken });
}

// 简单的心情分析（基于关键词）
function analyzeMoodSimple(moodText) {
  const text = moodText.toLowerCase();
  
  // 积极词汇
  const positiveWords = ['开心', '高兴', '很好', '不错', '精神', '阳光', '好多了', '缓解', '成功', '获奖'];
  // 消极词汇
  const negativeWords = ['低落', '焦虑', '紧张', '累', '疲惫', '犯困', '失望', '伤心', '难过', '生气'];
  // 中性词汇
  const neutralWords = ['平静', '一般', '还行', '没什么', '日常'];
  
  let score = 0;
  let emoji = '😐';
  let category = '中性';
  let event = '日常心情';
  
  // 计算分数
  for (const word of positiveWords) {
    if (text.includes(word)) {
      score += 1;
    }
  }
  
  for (const word of negativeWords) {
    if (text.includes(word)) {
      score -= 1;
    }
  }
  
  // 确定表情和分类
  if (score >= 2) {
    emoji = '😊';
    category = '积极高';
    event = '心情很好';
  } else if (score >= 1) {
    emoji = '🙂';
    category = '积极';
    event = '心情不错';
  } else if (score <= -2) {
    emoji = '😔';
    category = '消极';
    event = '心情低落';
  } else if (score <= -1) {
    emoji = '😕';
    category = '轻度消极';
    event = '心情一般';
  } else {
    emoji = '😐';
    category = '中性';
    event = '日常心情';
  }
  
  return { emoji, event, score, category };
}

// 简单的活动分析
function analyzeActivity(activityText) {
  if (!activityText || activityText === '无') {
    return { intensity: '无', duration: '0', type: '休息' };
  }
  
  const text = activityText.toLowerCase();
  
  // 运动类型分析
  let type = '其他';
  let intensity = '中等';
  let duration = '30分钟';
  
  if (text.includes('慢跑') || text.includes('跑步')) {
    type = '跑步';
    intensity = '中等';
  } else if (text.includes('游泳')) {
    type = '游泳';
    intensity = '中等';
  } else if (text.includes('瑜伽')) {
    type = '瑜伽';
    intensity = '低';
  } else if (text.includes('跳绳')) {
    type = '跳绳';
    intensity = '高';
  } else if (text.includes('散步')) {
    type = '散步';
    intensity = '低';
  }
  
  // 提取时长
  const durationMatch = text.match(/(\d+)\s*(分钟|小时|公里|米)/);
  if (durationMatch) {
    duration = durationMatch[0];
  }
  
  return { intensity, duration, type };
}

// 简单的学习分析
function analyzeStudy(studyText) {
  if (!studyText || studyText === '无') {
    return { duration: '0', category: '无' };
  }
  
  const text = studyText.toLowerCase();
  
  let category = '其他';
  let duration = '30分钟';
  
  if (text.includes('英语') || text.includes('口语')) {
    category = '语言学习';
  } else if (text.includes('面试') || text.includes('复习')) {
    category = '考试准备';
  } else if (text.includes('ai') || text.includes('教程')) {
    category = '技能学习';
  } else if (text.includes('anki') || text.includes('卡片')) {
    category = '记忆训练';
  } else if (text.includes('翻译')) {
    category = '翻译练习';
  }
  
  // 提取时长
  const durationMatch = text.match(/(\d+)\s*(分钟|小时)/);
  if (durationMatch) {
    duration = durationMatch[0];
  }
  
  return { duration, category };
}

// 简单的工作分析
function analyzeWork(workText) {
  if (!workText || workText === '无') {
    return { task_type: '无', priority: '低', complexity: '简单' };
  }
  
  const text = workText.toLowerCase();
  
  let task_type = '其他';
  let priority = '中';
  let complexity = '中等';
  
  if (text.includes('面试') || text.includes('准备')) {
    task_type = '面试准备';
    priority = '高';
    complexity = '高';
  } else if (text.includes('简历') || text.includes('作品集')) {
    task_type = '简历优化';
    priority = '高';
    complexity = '中等';
  } else if (text.includes('文章') || text.includes('公众号')) {
    task_type = '内容创作';
    priority = '中';
    complexity = '中等';
  } else if (text.includes('规划') || text.includes('计划')) {
    task_type = '规划制定';
    priority = '中';
    complexity = '中等';
  }
  
  return { task_type, priority, complexity };
}

// 简单的灵感分析
function analyzeInspiration(inspirationText) {
  if (!inspirationText || inspirationText === '无') {
    return { theme: '无', product: '无', difficulty: '简单' };
  }
  
  const text = inspirationText.toLowerCase();
  
  let theme = '其他';
  let product = '想法';
  let difficulty = '简单';
  
  if (text.includes('咖啡') || text.includes('效率')) {
    theme = '效率工具';
    product = '笔记';
  } else if (text.includes('书单') || text.includes('推送')) {
    theme = '内容推荐';
    product = '推送';
  } else if (text.includes('面试') || text.includes('情绪')) {
    theme = '职场技能';
    product = '技巧合集';
  } else if (text.includes('刺绣') || text.includes('图案')) {
    theme = '手工创作';
    product = '刺绣作品';
  } else if (text.includes('插画') || text.includes('流程图')) {
    theme = '视觉设计';
    product = '插画';
  } else if (text.includes('聊天') || text.includes('解压')) {
    theme = '社交工具';
    product = '小工具';
  }
  
  return { theme, product, difficulty };
}

async function processWeekDataSimple() {
  try {
    const turso = await getTursoClient();
    console.log('开始简单分析一周数据...');
    
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
        fitness_text: row[12], // fitness_text (索引12)
        study_text: row[3], // study_text
        work_text: row[4], // work_text
        inspiration_text: row[5] // inspiration_text (索引5)
      };
      
      console.log(`\n🔄 处理日期 ${rawData.date} 的数据...`);
      
      try {
        // 1. 心情分析
        const moodAnalysis = analyzeMoodSimple(rawData.mood_text);
        console.log(`  ✅ 心情分析: ${moodAnalysis.emoji} ${moodAnalysis.event} (${moodAnalysis.score}分)`);
        
        // 2. 健身分析
        const fitnessAnalysis = analyzeActivity(rawData.fitness_text);
        console.log(`  ✅ 健身分析: ${fitnessAnalysis.type} ${fitnessAnalysis.duration}`);
        
        // 3. 学习分析
        const studyAnalysis = analyzeStudy(rawData.study_text);
        console.log(`  ✅ 学习分析: ${studyAnalysis.category} ${studyAnalysis.duration}`);
        
        // 4. 工作分析
        const workAnalysis = analyzeWork(rawData.work_text);
        console.log(`  ✅ 工作分析: ${workAnalysis.task_type} (${workAnalysis.priority}优先级)`);
        
        // 5. 灵感分析
        const inspirationAnalysis = analyzeInspiration(rawData.inspiration_text);
        console.log(`  ✅ 灵感分析: ${inspirationAnalysis.theme} - ${inspirationAnalysis.product}`);
        
        // 6. 检查是否已存在simple_records
        const existing = await turso.execute({
          sql: 'SELECT id FROM simple_records WHERE date = ?',
          args: [rawData.date]
        });
        
        if (existing.rows && existing.rows.length > 0) {
          // 更新现有记录
          await turso.execute({
            sql: `UPDATE simple_records SET 
              mood_description = ?, mood_emoji = ?, mood_score = ?, mood_category = ?, mood_event = ?,
              fitness_description = ?, fitness_type = ?, fitness_duration = ?, fitness_intensity = ?,
              study_description = ?, study_category = ?, study_duration = ?,
              work_description = ?, work_task_type = ?, work_priority = ?, work_complexity = ?,
              inspiration_description = ?, inspiration_theme = ?, inspiration_product = ?, inspiration_difficulty = ?,
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
              fitnessAnalysis.type,
              fitnessAnalysis.duration,
              fitnessAnalysis.intensity,
              rawData.study_text,
              studyAnalysis.category,
              studyAnalysis.duration,
              rawData.work_text,
              workAnalysis.task_type,
              workAnalysis.priority,
              workAnalysis.complexity,
              rawData.inspiration_text,
              inspirationAnalysis.theme,
              inspirationAnalysis.product,
              inspirationAnalysis.difficulty,
              moodAnalysis.score >= 1 ? 'positive' : moodAnalysis.score <= -1 ? 'negative' : 'neutral',
              Math.max(1, Math.min(5, moodAnalysis.score + 3)),
              Math.max(1, Math.min(5, 3)),
              Math.max(1, Math.min(5, 3)),
              Math.max(1, Math.min(5, 4)),
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
              fitness_description, fitness_type, fitness_duration, fitness_intensity,
              study_description, study_category, study_duration,
              work_description, work_task_type, work_priority, work_complexity,
              inspiration_description, inspiration_theme, inspiration_product, inspiration_difficulty,
              overall_sentiment, energy_level, productivity_score, life_balance_score, data_quality_score, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              rawData.date,
              rawData.mood_text,
              moodAnalysis.emoji,
              moodAnalysis.score,
              moodAnalysis.category,
              moodAnalysis.event,
              rawData.fitness_text,
              fitnessAnalysis.type,
              fitnessAnalysis.duration,
              fitnessAnalysis.intensity,
              rawData.study_text,
              studyAnalysis.category,
              studyAnalysis.duration,
              rawData.work_text,
              workAnalysis.task_type,
              workAnalysis.priority,
              workAnalysis.complexity,
              rawData.inspiration_text,
              inspirationAnalysis.theme,
              inspirationAnalysis.product,
              inspirationAnalysis.difficulty,
              moodAnalysis.score >= 1 ? 'positive' : moodAnalysis.score <= -1 ? 'negative' : 'neutral',
              Math.max(1, Math.min(5, moodAnalysis.score + 3)),
              Math.max(1, Math.min(5, 3)),
              Math.max(1, Math.min(5, 3)),
              Math.max(1, Math.min(5, 4)),
              new Date().toISOString()
            ]
          });
          console.log(`  ✅ 插入了日期 ${rawData.date} 的新记录`);
        }
        
        // 7. 记录AI分析历史（简化版，不依赖created_at列）
        try {
          await turso.execute({
            sql: 'INSERT INTO ai_data (date, category, title, content, score) VALUES (?, ?, ?, ?, ?)',
            args: [
              rawData.date,
              'mood_analysis',
              '心情分析',
              `简单分析结果: ${moodAnalysis.emoji} ${moodAnalysis.event} (${moodAnalysis.score}分, ${moodAnalysis.category})`,
              0.8
            ]
          });
          
          await turso.execute({
            sql: 'INSERT INTO ai_data (date, category, title, content, score) VALUES (?, ?, ?, ?, ?)',
            args: [
              rawData.date,
              'activity_analysis',
              '活动分析',
              `健身: ${fitnessAnalysis.type}, 学习: ${studyAnalysis.category}, 工作: ${workAnalysis.task_type}`,
              0.7
            ]
          });
        } catch (aiError) {
          console.log(`  ⚠️ AI历史记录插入失败（可忽略）: ${aiError.message}`);
        }
        
      } catch (error) {
        console.error(`  ❌ 处理日期 ${rawData.date} 失败:`, error.message);
      }
    }
    
    console.log('\n🎉 一周数据简单分析完成！');
    
    // 显示处理结果统计
    const processedCount = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM simple_records WHERE date >= ? AND date <= ?',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`📊 本周共处理 ${processedCount.rows[0][0]} 条记录`);
    
  } catch (error) {
    console.error('简单分析失败:', error);
  }
}

// 运行简单分析
processWeekDataSimple();
