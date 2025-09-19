import { createClient } from '@libsql/client';

// 获取Turso客户端
async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw';
  return createClient({ url, authToken });
}

// 一周的原始数据
const weekData = [
  {
    date: '2025-09-13',
    mood_text: '早上去喝了咖啡，心情平静',
    fitness_text: '慢跑 3 公里',
    study_text: '读了几页《生成式 AI 的应用》',
    work_text: '整理简历细节',
    inspiration_text: '想做一个关于"咖啡因与效率"的小笔记'
  },
  {
    date: '2025-09-14',
    mood_text: '阴天有点犯困，但很适合写东西',
    fitness_text: '无',
    study_text: '练习了英语口语 20 分钟',
    work_text: '规划了周一要发的公众号文章',
    inspiration_text: '做一个"雨天书单"的推送'
  },
  {
    date: '2025-09-15',
    mood_text: '有点焦虑，面试前的小紧张',
    fitness_text: '晚上游泳 800 米',
    study_text: '复习产品面试题',
    work_text: '准备面试回答，写了几个 STAR 案例',
    inspiration_text: '想到可以做一个"面试情绪管理"的小技巧合集'
  },
  {
    date: '2025-09-16',
    mood_text: '买的针线到了，可以开始绣一些小图案，很开心',
    fitness_text: '晚上跳绳和散步去',
    study_text: '无',
    work_text: '收到了一个面试',
    inspiration_text: '我想刺绣一个恶搞之家 family guy 的图案'
  },
  {
    date: '2025-09-17',
    mood_text: '今天有点累，但吃到好吃的甜品缓解了不少',
    fitness_text: '散步 5 公里',
    study_text: '看了一个 AI 插画教程',
    work_text: '面试了一场，发挥中等',
    inspiration_text: '做一个"甜品心情曲线"的插画'
  },
  {
    date: '2025-09-18',
    mood_text: '早起精神不错，阳光很好',
    fitness_text: '晨练瑜伽 15 分钟',
    study_text: '写了 5 条 Anki 卡片',
    work_text: '写完了一篇文章初稿',
    inspiration_text: '做一张"早晨唤醒流程"的插画流程图'
  },
  {
    date: '2025-09-19',
    mood_text: '晚上有点低落，但和朋友聊了会天感觉好多了',
    fitness_text: '无',
    study_text: '看了半小时的翻译资料',
    work_text: '更新了作品集',
    inspiration_text: '做一个"聊天解压小工具"的脑洞'
  }
];

async function insertWeekData() {
  try {
    const turso = await getTursoClient();
    console.log('开始插入一周数据...');
    
    for (const data of weekData) {
      // 检查是否已存在该日期的数据
      const existing = await turso.execute({
        sql: 'SELECT id FROM raw_entries WHERE date = ?',
        args: [data.date]
      });
      
      if (existing.rows && existing.rows.length > 0) {
        console.log(`日期 ${data.date} 的数据已存在，跳过插入`);
        continue;
      }
      
      // 插入原始数据
      await turso.execute({
        sql: `INSERT INTO raw_entries (date, mood_text, fitness_text, study_text, work_text, inspiration_text, raw_text, source, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.date,
          data.mood_text,
          data.fitness_text,
          data.study_text,
          data.work_text,
          data.inspiration_text,
          `心情：${data.mood_text}\n健身：${data.fitness_text}\n学习：${data.study_text}\n工作：${data.work_text}\n灵感：${data.inspiration_text}`,
          'manual_input',
          new Date().toISOString()
        ]
      });
      
      console.log(`✅ 已插入日期 ${data.date} 的数据`);
    }
    
    console.log('🎉 一周数据插入完成！');
    
    // 显示插入的数据统计
    const count = await turso.execute({
      sql: 'SELECT COUNT(*) as count FROM raw_entries WHERE date >= ? AND date <= ?',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`📊 本周共插入 ${count.rows[0][0]} 条原始数据`);
    
  } catch (error) {
    console.error('插入数据失败:', error);
  }
}

// 运行插入
insertWeekData();
