import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查环境变量
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      return res.status(503).json({
        error: '数据库未配置',
        details: '请配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN'
      });
    }

    console.log('获取仪表板数据...');

    // 初始化数据库
    const turso = createClient({
      url: dbUrl,
      authToken: dbToken,
    });

    // 获取原始数据
    const rawDataResult = await turso.execute(`
      SELECT * FROM raw_entries 
      ORDER BY date DESC 
      LIMIT 30
    `);

    const rawData = rawDataResult.rows.map(row => {
      const record = {};
      rawDataResult.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return record;
    });

    // 获取 AI 处理数据 (如果存在)
    let aiData = [];
    try {
      const aiDataResult = await turso.execute(`
        SELECT * FROM ai_processed_data 
        ORDER BY date DESC 
        LIMIT 30
      `);

      aiData = aiDataResult.rows.map(row => {
        const record = {};
        aiDataResult.columns.forEach((column, index) => {
          record[column] = row[index];
        });
        return record;
      });
    } catch (aiError) {
      console.log('AI 处理数据表不存在或为空:', aiError.message);
    }

    // 生成图表数据
    const chartData = rawData.slice(0, 7).reverse().map(item => ({
      date: item.date,
      // 从 AI 数据中找对应的评分，如果没有就用默认值
      mood: aiData.find(ai => ai.date === item.date)?.mood_score || 3,
      life: aiData.find(ai => ai.date === item.date)?.life_score || 3,
      study: aiData.find(ai => ai.date === item.date)?.study_score || 3,
      work: aiData.find(ai => ai.date === item.date)?.work_score || 3,
      inspiration: aiData.find(ai => ai.date === item.date)?.inspiration_score || 3,
    }));

    // 统计信息
    const stats = {
      totalRecords: rawData.length,
      aiProcessedRecords: aiData.length,
      dateRange: rawData.length > 0 ? {
        start: rawData[rawData.length - 1]?.date,
        end: rawData[0]?.date
      } : null,
      averageScores: chartData.length > 0 ? {
        mood: Math.round(chartData.reduce((sum, item) => sum + item.mood, 0) / chartData.length * 10) / 10,
        life: Math.round(chartData.reduce((sum, item) => sum + item.life, 0) / chartData.length * 10) / 10,
        study: Math.round(chartData.reduce((sum, item) => sum + item.study, 0) / chartData.length * 10) / 10,
        work: Math.round(chartData.reduce((sum, item) => sum + item.work, 0) / chartData.length * 10) / 10,
        inspiration: Math.round(chartData.reduce((sum, item) => sum + item.inspiration, 0) / chartData.length * 10) / 10,
      } : null
    };

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        rawData: rawData,
        aiData: aiData,
        chartData: chartData,
        stats: stats
      }
    });

  } catch (error) {
    console.error('❌ 获取仪表板数据失败:', error);
    return res.status(500).json({
      error: '获取数据失败',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
  }
}
