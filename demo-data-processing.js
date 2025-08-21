import SmartDataProcessor from './backend/smart-data-processor.js';

// 演示数据处理功能
async function demoDataProcessing() {
  console.log('🎯 智能数据处理演示\n');
  
  const processor = new SmartDataProcessor();
  
  // 示例原始数据（包含错别字）
  const sampleData = `日期：2025年8月11日 23:48  
心情是：今天心情有点duang～因为下午突然停！电！代码没存差点挂  
生活是：中午去楼下吃了碗酸汤面，味道还将就；晚上停电就点了个蜡烛听播课  
学习是：今天把《流畅的Python》第5章看了一大半，顺手写了50来行小练手  
工作是：上午开了一个需求评审会，老板说明天要看第一版demo（可能？）  
灵感是：突然想用WebRTC搞个小小的在线画板，大概吧……`;

  try {
    console.log('📥 原始数据:');
    console.log(sampleData);
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 解析数据
    console.log('🔧 1. 解析原始数据...');
    const entries = processor.parseRawEntries(sampleData);
    console.log(`解析到 ${entries.length} 条记录`);
    
    if (entries.length > 0) {
      const entry = entries[0];
      
      // 纠正错别字
      console.log('\n🔧 2. 纠正错别字...');
      console.log('原始心情:', entry.mood);
      const corrected = processor.correctTypos(entry);
      console.log('纠正后心情:', corrected.mood);
      
      // 展示AI分析结果
      console.log('\n🤖 3. AI分析结果预览:');
      
      // 心情分析示例（使用AI服务的备用分析）
      const moodExample = processor.aiService.getFallbackMoodAnalysis(corrected.mood);
      console.log('心情分析:', {
        emoji: moodExample.mood_emoji,
        event: moodExample.mood_event,
        score: moodExample.mood_score,
        category: moodExample.mood_category
      });
      
      // 数据质量评分
      const qualityScore = processor.calculateDataQuality(corrected);
      console.log('数据质量评分:', `${qualityScore}/100`);
      
      // 增强字段示例
      const enhanced = processor.getDefaultEnhancedFields();
      console.log('AI增强字段:', {
        sentiment: enhanced.overall_sentiment,
        energy: enhanced.energy_level,
        productivity: enhanced.productivity_score,
        balance: enhanced.life_balance_score
      });
    }
    
    console.log('\n✅ 处理演示完成！');
    
  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 展示数据库表结构
function showDatabaseSchema() {
  console.log('\n📊 数据库表结构 (5张表):');
  
  const tables = {
    '1. raw_entries': {
      description: '原始输入数据（未经AI处理）',
      fields: ['date', 'mood_text', 'life_text', 'study_text', 'work_text', 'inspiration_text']
    },
    '2. simple_records': {
      description: '主记录表（包含所有AI分析字段）',
      fields: [
        '基础字段: date, mood_description, life_description...',
        '心情AI: mood_emoji, mood_event, mood_score, mood_category',
        '健身AI: fitness_intensity, fitness_duration, fitness_calories, fitness_type',
        '学习AI: study_duration, study_category',
        '工作AI: work_task_type, work_priority',
        '灵感AI: inspiration_theme, inspiration_product, inspiration_difficulty',
        '增强字段: overall_sentiment, energy_level, productivity_score...'
      ]
    },
    '3. ai_data': {
      description: 'AI分析结果（分类存储）',
      fields: ['date', 'category', 'title', 'content', 'score']
    },
    '4. ai_enhanced_data': {
      description: 'AI增强数据（主题、行动项等）',
      fields: ['date', 'growth_indicators', 'key_themes', 'action_items', 'emotional_tags']
    },
    '5. processing_summaries': {
      description: '数据处理摘要',
      fields: ['batch_date', 'total_entries', 'average_quality_score', 'sentiment_distribution', 'top_themes']
    }
  };
  
  Object.entries(tables).forEach(([name, info]) => {
    console.log(`\n${name}: ${info.description}`);
    info.fields.forEach(field => console.log(`  - ${field}`));
  });
}

// 展示图表更新方案
function showVisualizationPlan() {
  console.log('\n📈 图表和卡片更新方案:');
  
  const visualizations = [
    {
      name: '心情趋势图',
      data: 'mood_score, mood_category, overall_sentiment',
      enhancement: '新增情感强度柱状图、心情事件词云'
    },
    {
      name: '生活健康图',
      data: 'fitness数据, energy_level, life_balance_score',
      enhancement: '新增运动类型饼图、卡路里趋势线'
    },
    {
      name: '学习进度图',
      data: 'study_duration, study_category, productivity_score',
      enhancement: '新增学习类别分布、学习时长累积图'
    },
    {
      name: '工作效率图',
      data: 'work_task_type, work_priority, productivity_score',
      enhancement: '新增任务优先级分布、工作类型时间轴'
    },
    {
      name: '灵感创意图',
      data: 'inspiration_theme, inspiration_difficulty, key_themes',
      enhancement: '新增创意主题网络图、难度vs产出散点图'
    }
  ];
  
  visualizations.forEach((viz, index) => {
    console.log(`\n${index + 1}. ${viz.name}`);
    console.log(`   数据源: ${viz.data}`);
    console.log(`   增强功能: ${viz.enhancement}`);
  });
  
  console.log('\n🎨 新增智能卡片:');
  const cards = [
    '今日情感指数卡片（整合所有情感数据）',
    '生产力评分卡片（工作+学习综合评分）',
    '生活平衡卡片（各维度平衡度可视化）',
    'AI洞察卡片（智能生成的个人分析）',
    '成长轨迹卡片（基于growth_indicators）'
  ];
  
  cards.forEach((card, index) => {
    console.log(`   ${index + 1}. ${card}`);
  });
}

// 运行演示
async function runFullDemo() {
  await demoDataProcessing();
  showDatabaseSchema();
  showVisualizationPlan();
  
  console.log('\n🎯 总结:');
  console.log('✅ 智能数据处理器: 错别字纠正 + AI分析 + 内容润色');
  console.log('✅ 5张表结构: 原始→主记录→分类AI→增强→摘要');
  console.log('✅ 自动化流程: 一键处理您的原始数据');
  console.log('✅ 可视化增强: 5个图表 + 5个智能卡片');
  console.log('\n🚀 使用方法:');
  console.log('   1. 运行: node test-data-pipeline.js');
  console.log('   2. 或者调用: processAndImportData(您的原始数据文本)');
}

runFullDemo();
