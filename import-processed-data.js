import { initDB } from './backend/db.js';
import SmartDataProcessor from './backend/smart-data-processor.js';

class ProcessedDataImporter {
  constructor() {
    this.processor = new SmartDataProcessor();
    this.db = null;
  }

  async initialize() {
    this.db = await initDB();
    console.log('数据库初始化完成');
  }

  // 主导入函数
  async importProcessedData(processedEntries) {
    try {
      console.log(`开始导入 ${processedEntries.length} 条处理后的数据...`);
      
      for (const entry of processedEntries) {
        await this.importSingleEntry(entry);
      }
      
      // 生成并保存摘要
      const summary = this.processor.generateSummary(processedEntries);
      await this.saveSummary(summary);
      
      console.log('数据导入完成！');
      return true;
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    }
  }

  // 导入单条记录到5张表
  async importSingleEntry(entry) {
    try {
      console.log(`导入记录: ${entry.date}`);
      
      // 1. 导入原始数据到 raw_entries 表
      await this.insertRawEntry(entry);
      
      // 2. 导入主记录到 simple_records 表 
      await this.insertSimpleRecord(entry);
      
      // 3. 导入AI分析数据到 ai_data 表
      await this.insertAIData(entry);
      
      // 4. 导入AI增强数据到 ai_enhanced_data 表
      await this.insertEnhancedData(entry);
      
      console.log(`✓ 记录 ${entry.date} 导入完成`);
    } catch (error) {
      console.error(`记录 ${entry.date} 导入失败:`, error);
      throw error;
    }
  }

  // 1. 插入原始数据
  async insertRawEntry(entry) {
    const sql = `
      INSERT OR REPLACE INTO raw_entries (
        date, mood_text, life_text, study_text, work_text, inspiration_text
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      entry.date,
      entry.mood || '',
      entry.life || '',
      entry.study || '',
      entry.work || '',
      entry.inspiration || ''
    ]);
  }

  // 2. 插入主记录（包含所有AI分析字段）
  async insertSimpleRecord(entry) {
    const sql = `
      INSERT OR REPLACE INTO simple_records (
        date, mood_description, life_description, study_description, 
        work_description, inspiration_description,
        mood_emoji, mood_event, mood_score, mood_category,
        fitness_intensity, fitness_duration, fitness_calories, fitness_type,
        study_duration, study_category,
        work_task_type, work_priority,
        inspiration_theme, inspiration_product, inspiration_difficulty,
        overall_sentiment, energy_level, productivity_score, 
        life_balance_score, data_quality_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      entry.date,
      entry.mood || '',
      entry.life || '',
      entry.study || '',
      entry.work || '',
      entry.inspiration || '',
      entry.mood_emoji || '😐',
      entry.mood_event || '日常心情',
      entry.mood_score || 0,
      entry.mood_category || '中性',
      entry.fitness_intensity || null,
      entry.fitness_duration || null,
      entry.fitness_calories || null,
      entry.fitness_type || null,
      entry.study_duration || null,
      entry.study_category || null,
      entry.work_task_type || null,
      entry.work_priority || null,
      entry.inspiration_theme || null,
      entry.inspiration_product || null,
      entry.inspiration_difficulty || null,
      entry.overall_sentiment || 'neutral',
      entry.energy_level || 'medium',
      entry.productivity_score || 5,
      entry.life_balance_score || 5,
      entry.data_quality_score || 0
    ]);
  }

  // 3. 插入AI分析数据（分类存储）
  async insertAIData(entry) {
    const categories = ['mood', 'life', 'study', 'work', 'inspiration'];
    
    for (const category of categories) {
      if (entry[category]) {
        await this.insertCategoryAIData(entry.date, category, entry);
      }
    }
  }

  // 插入分类AI数据
  async insertCategoryAIData(date, category, entry) {
    let title = '';
    let content = '';
    let score = 0;
    
    switch (category) {
      case 'mood':
        title = `心情分析 - ${entry.mood_event || '日常心情'}`;
        content = JSON.stringify({
          description: entry.mood,
          emoji: entry.mood_emoji,
          event: entry.mood_event,
          category: entry.mood_category,
          sentiment: entry.overall_sentiment
        });
        score = entry.mood_score || 0;
        break;
        
      case 'life':
        title = `生活分析`;
        content = JSON.stringify({
          description: entry.life,
          fitness: {
            intensity: entry.fitness_intensity,
            duration: entry.fitness_duration,
            calories: entry.fitness_calories,
            type: entry.fitness_type
          },
          energy_level: entry.energy_level
        });
        score = entry.life_balance_score || 5;
        break;
        
      case 'study':
        title = `学习分析`;
        content = JSON.stringify({
          description: entry.study,
          duration: entry.study_duration,
          category: entry.study_category
        });
        score = 7; // 默认学习评分
        break;
        
      case 'work':
        title = `工作分析`;
        content = JSON.stringify({
          description: entry.work,
          task_type: entry.work_task_type,
          priority: entry.work_priority
        });
        score = entry.productivity_score || 5;
        break;
        
      case 'inspiration':
        title = `灵感分析`;
        content = JSON.stringify({
          description: entry.inspiration,
          theme: entry.inspiration_theme,
          product: entry.inspiration_product,
          difficulty: entry.inspiration_difficulty
        });
        score = 6; // 默认灵感评分
        break;
    }
    
    const sql = `
      INSERT OR REPLACE INTO ai_data (date, category, title, content, score)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [date, category, title, content, score]);
  }

  // 4. 插入AI增强数据
  async insertEnhancedData(entry) {
    const sql = `
      INSERT OR REPLACE INTO ai_enhanced_data (
        date, growth_indicators, key_themes, action_items, emotional_tags
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      entry.date,
      JSON.stringify(entry.growth_indicators || []),
      JSON.stringify(entry.key_themes || []),
      JSON.stringify(entry.action_items || []),
      JSON.stringify(entry.emotional_tags || [])
    ]);
  }

  // 5. 保存处理摘要
  async saveSummary(summary) {
    const sql = `
      INSERT OR REPLACE INTO processing_summaries (
        batch_date, total_entries, average_quality_score, 
        sentiment_distribution, top_themes
      ) VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      new Date().toISOString().split('T')[0], // 今天的日期
      summary.total_entries,
      summary.average_quality_score,
      JSON.stringify(summary.sentiment_distribution),
      JSON.stringify(summary.top_themes)
    ]);
    
    console.log('✓ 处理摘要已保存');
  }

  // 数据验证
  async validateImport() {
    try {
      const tables = [
        'raw_entries',
        'simple_records', 
        'ai_data',
        'ai_enhanced_data',
        'processing_summaries'
      ];
      
      console.log('\n=== 数据验证结果 ===');
      
      for (const table of tables) {
        const count = await this.db.get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${count.count} 条记录`);
      }
      
      // 验证最新记录
      const latestSimpleRecord = await this.db.get(
        `SELECT * FROM simple_records ORDER BY date DESC LIMIT 1`
      );
      
      if (latestSimpleRecord) {
        console.log('\n最新记录示例:');
        console.log(`日期: ${latestSimpleRecord.date}`);
        console.log(`心情: ${latestSimpleRecord.mood_description} ${latestSimpleRecord.mood_emoji}`);
        console.log(`数据质量评分: ${latestSimpleRecord.data_quality_score}`);
      }
      
    } catch (error) {
      console.error('验证失败:', error);
    }
  }

  // 关闭数据库连接
  async close() {
    if (this.db) {
      await this.db.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 主执行函数
async function processAndImportData(rawDataText) {
  const processor = new SmartDataProcessor();
  const importer = new ProcessedDataImporter();
  
  try {
    // 初始化
    await importer.initialize();
    
    // 处理原始数据
    console.log('🔄 开始处理原始数据...');
    const processedEntries = await processor.processRawData(rawDataText);
    
    // 导入到数据库
    console.log('📊 开始导入到数据库...');
    await importer.importProcessedData(processedEntries);
    
    // 验证导入结果
    console.log('✅ 验证导入结果...');
    await importer.validateImport();
    
    console.log('🎉 全部完成！');
    return processedEntries;
    
  } catch (error) {
    console.error('❌ 处理失败:', error);
    throw error;
  } finally {
    await importer.close();
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  // 示例用法
  const sampleRawData = `
日期：2025年8月11日 23:48  
心情是：今天心情有点duang～因为下午突然停！电！代码没存差点挂  
生活是：中午去楼下吃了碗酸汤面，味道还将就；晚上停电就点了个蜡烛听播课  
学习是：今天把《流畅的Python》第5章看了一大半，顺手写了50来行小练手  
工作是：上午开了一个需求评审会，老板说明天要看第一版demo（可能？）  
灵感是：突然想用WebRTC搞个小小的在线画板，大概吧……  

日期：2025年8月12日 00:15  
心情是：今天心情还行吧，因为我把个人记录的数据用AI写到网叶里了  
生活是：今天其实没出门也没健身，落枕了，脖子歪的  
学习是：今天一直用cursor，花了20块搞了15天无限？  
工作是：阿里高得HR发邮件问我要不要去面试，我嗯了一下  
灵感是：今天没啥特别的灵杆  
`;
  
  processAndImportData(sampleRawData);
}

export { ProcessedDataImporter, processAndImportData };
export default ProcessedDataImporter;
