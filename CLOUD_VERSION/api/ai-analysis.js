import { selectAll, initializeTables } from '../lib/turso.js';
import CloudAIService from '../lib/cloud-ai-service.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 确保表已初始化
    await initializeTables();

    const { period = 'all', from, to } = req.query;

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

    // 获取数据记录
    const records = await selectAll('simple_records', whereClause, params);

    console.log(`📊 开始分析 ${records.length} 条记录，时间范围: ${period}`);

    // 初始化 AI 服务
    const aiService = new CloudAIService();

    // 生成 AI 分析
    let analysis;
    try {
      const usedPeriod = from && to ? 'custom' : period;
      analysis = await aiService.generateAnalysis(records, usedPeriod);
      console.log('🤖 AI分析完成');
    } catch (aiError) {
      console.warn('⚠️ AI分析失败，使用降级分析:', aiError.message);
      analysis = {
        summary: `分析了 ${records.length} 条记录`,
        mood_trend: '数据显示心情变化正常',
        life_quality: '生活质量保持稳定',
        productivity: '学习工作状态良好',
        recommendations: ['继续保持良好习惯', '适当关注心情变化', '保持数据记录的连续性'],
        fallback: true
      };
    }

    // 添加基础统计信息
    const stats = {
      total_records: records.length,
      date_range: {
        start: records.length > 0 ? records[records.length - 1]?.date : null,
        end: records.length > 0 ? records[0]?.date : null
      },
      period: from && to ? 'custom' : period
    };

    // 计算心情统计
    if (records.length > 0) {
      const moodScores = records.filter(r => r.mood_score !== null && r.mood_score !== undefined);
      if (moodScores.length > 0) {
        stats.mood_stats = {
          average: Math.round(moodScores.reduce((sum, r) => sum + r.mood_score, 0) / moodScores.length * 100) / 100,
          highest: Math.max(...moodScores.map(r => r.mood_score)),
          lowest: Math.min(...moodScores.map(r => r.mood_score)),
          count: moodScores.length
        };
      }
    }

    const response = {
      ...analysis,
      stats,
      source: 'cloud_ai',
      generated_at: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ AI分析失败:', error);
    res.status(500).json({
      error: 'AI分析服务失败',
      message: error.message,
      fallback: {
        summary: 'AI分析服务暂时不可用',
        mood_trend: '无法获取心情趋势',
        life_quality: '无法评估生活质量',
        productivity: '无法分析工作学习状态',
        recommendations: ['请稍后重试', '检查网络连接', '联系技术支持']
      },
      source: 'cloud_ai'
    });
  }
}
