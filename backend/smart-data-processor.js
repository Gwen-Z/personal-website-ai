import AIService from './ai-service.js';

class SmartDataProcessor {
  constructor() {
    this.aiService = new AIService();
    
    // 常见错别字映射表
    this.typoMap = {
      'duang': '糟糕',
      '将就': '将就',
      '落枕': '落枕',
      '燕麦被': '燕麦粥',
      '健房': '健身房',
      '墨水': '墨水',
      '治遇': '治愈',
      '牛扒': '牛排',
      'lizi': '例子',
      'bgu': 'bug',
      '树霉派': '树莓派',
      '开森': '开心',
      '海蓝鸡饭': '海南鸡饭',
      '焦绿': '焦虑',
      '源玛': '源码',
      '树栋': '树洞',
      '房见': '房间',
      '小期代': '小期待',
      '朝阳': '朝阳'
    };
    
    // 情感分析关键词
    this.emotionKeywords = {
      positive: ['开心', '开森', '满足', '愉快', '兴奋', '放松', '治愈', '成功', '顺利', '不错'],
      negative: ['糟糕', 'duang', '焦虑', '焦绿', '压力', '疲惫', '累', '烦', '沮丧'],
      neutral: ['一般', '平静', '正常', '稳定', '平静']
    };
  }

  // 主处理函数：处理原始数据并生成完整的数据结构
  async processRawData(rawDataText) {
    try {
      console.log('开始处理原始数据...');
      
      // 1. 解析原始数据
      const parsedEntries = this.parseRawEntries(rawDataText);
      console.log(`解析到 ${parsedEntries.length} 条记录`);
      
      // 2. 处理每条记录
      const processedEntries = [];
      for (const entry of parsedEntries) {
        console.log(`处理日期: ${entry.date}`);
        const processedEntry = await this.processEntry(entry);
        processedEntries.push(processedEntry);
      }
      
      console.log('数据处理完成！');
      return processedEntries;
    } catch (error) {
      console.error('数据处理失败:', error);
      throw error;
    }
  }

  // 解析原始数据文本
  parseRawEntries(rawText) {
    const entries = [];
    const lines = rawText.split('\n').filter(line => line.trim());
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 检测日期行
      const dateMatch = trimmedLine.match(/日期：(\d{4}年\d{1,2}月\d{1,2}日)/);
      if (dateMatch) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        currentEntry = {
          date: this.standardizeDate(dateMatch[1]),
          mood: '',
          life: '',
          study: '',
          work: '',
          inspiration: '',
          inputType: 'mixed'
        };
        continue;
      }
      
      // 检测输入类型标记
      if (trimmedLine.includes('【语音输入】') || trimmedLine.includes('【文本输入】')) {
        continue;
      }
      
      // 解析内容行
      if (currentEntry) {
        const moodMatch = trimmedLine.match(/心情是：(.+)/);
        const lifeMatch = trimmedLine.match(/生活是：(.+)/);
        const studyMatch = trimmedLine.match(/学习是：(.+)/);
        const workMatch = trimmedLine.match(/工作是：(.+)/);
        const inspirationMatch = trimmedLine.match(/灵感是：(.+)/);
        
        if (moodMatch && moodMatch[1].trim()) {
          currentEntry.mood = moodMatch[1].trim();
        }
        if (lifeMatch && lifeMatch[1].trim()) {
          currentEntry.life = lifeMatch[1].trim();
        }
        if (studyMatch && studyMatch[1].trim()) {
          currentEntry.study = studyMatch[1].trim();
        }
        if (workMatch && workMatch[1].trim()) {
          currentEntry.work = workMatch[1].trim();
        }
        if (inspirationMatch && inspirationMatch[1].trim()) {
          currentEntry.inspiration = inspirationMatch[1].trim();
        }
      }
    }
    
    if (currentEntry) {
      entries.push(currentEntry);
    }
    
    return entries.filter(entry => 
      entry.mood || entry.life || entry.study || entry.work || entry.inspiration
    );
  }

  // 标准化日期格式
  standardizeDate(dateStr) {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  }

  // 处理单条记录
  async processEntry(entry) {
    console.log(`处理记录: ${entry.date}`);
    
    // 1. 纠正错别字和润色
    const correctedEntry = this.correctTypos(entry);
    const polishedEntry = await this.polishContent(correctedEntry);
    
    // 2. AI分析各维度数据
    const aiAnalysis = await this.generateAIAnalysis(polishedEntry);
    
    // 3. 生成AI增强字段
    const enhancedData = await this.generateEnhancedFields(polishedEntry);
    
    return {
      // 原始数据
      ...polishedEntry,
      
      // AI分析结果
      ...aiAnalysis,
      
      // AI增强字段
      ...enhancedData,
      
      // 元数据
      processed_at: new Date().toISOString(),
      data_quality_score: this.calculateDataQuality(polishedEntry)
    };
  }

  // 纠正错别字
  correctTypos(entry) {
    const corrected = { ...entry };
    
    Object.keys(corrected).forEach(key => {
      if (typeof corrected[key] === 'string') {
        let text = corrected[key];
        
        // 应用错别字映射
        Object.entries(this.typoMap).forEach(([typo, correct]) => {
          const regex = new RegExp(typo, 'g');
          text = text.replace(regex, correct);
        });
        
        corrected[key] = text;
      }
    });
    
    return corrected;
  }

  // AI内容润色
  async polishContent(entry) {
    try {
      const polishPrompt = `你是一个文本润色专家。请对以下个人记录进行润色，保持原意的同时使表达更加流畅自然。只需要输出润色后的内容，保持原有的分类结构。

原始记录：
心情：${entry.mood}
生活：${entry.life}
学习：${entry.study}
工作：${entry.work}
灵感：${entry.inspiration}

要求：
1. 保持原意不变
2. 纠正语法错误和不当表达
3. 使表达更加流畅
4. 保持个人化的语言风格
5. 按原格式输出

请按以下格式输出：
心情：[润色后内容]
生活：[润色后内容]
学习：[润色后内容]
工作：[润色后内容]
灵感：[润色后内容]`;

      const response = await this.aiService.callBestLLM(polishPrompt);
      return this.parsePolishedContent(response, entry);
    } catch (error) {
      console.error('内容润色失败:', error);
      return entry; // 返回原始内容
    }
  }

  // 解析润色后的内容
  parsePolishedContent(response, originalEntry) {
    try {
      const lines = response.split('\n').filter(line => line.trim());
      const polished = { ...originalEntry };
      
      lines.forEach(line => {
        const moodMatch = line.match(/心情：(.+)/);
        const lifeMatch = line.match(/生活：(.+)/);
        const studyMatch = line.match(/学习：(.+)/);
        const workMatch = line.match(/工作：(.+)/);
        const inspirationMatch = line.match(/灵感：(.+)/);
        
        if (moodMatch) polished.mood = moodMatch[1].trim();
        if (lifeMatch) polished.life = lifeMatch[1].trim();
        if (studyMatch) polished.study = studyMatch[1].trim();
        if (workMatch) polished.work = workMatch[1].trim();
        if (inspirationMatch) polished.inspiration = inspirationMatch[1].trim();
      });
      
      return polished;
    } catch (error) {
      console.error('解析润色内容失败:', error);
      return originalEntry;
    }
  }

  // 生成AI分析数据
  async generateAIAnalysis(entry) {
    try {
      const analysis = {};
      
      // 心情分析
      if (entry.mood) {
        const moodAnalysis = await this.aiService.analyzeMoodData(entry.mood);
        Object.assign(analysis, moodAnalysis);
      }
      
      // 生活/健身分析（如果生活内容包含运动）
      if (entry.life && this.containsFitnessInfo(entry.life)) {
        const fitnessAnalysis = await this.aiService.analyzeFitnessData(entry.life);
        Object.assign(analysis, fitnessAnalysis);
      }
      
      // 学习分析
      if (entry.study) {
        const studyAnalysis = await this.aiService.analyzeStudyData(entry.study);
        Object.assign(analysis, studyAnalysis);
      }
      
      // 工作分析
      if (entry.work) {
        const workAnalysis = await this.aiService.analyzeWorkData(entry.work);
        Object.assign(analysis, workAnalysis);
      }
      
      // 灵感分析
      if (entry.inspiration) {
        const inspirationAnalysis = await this.aiService.analyzeInspirationData(entry.inspiration);
        Object.assign(analysis, inspirationAnalysis);
      }
      
      return analysis;
    } catch (error) {
      console.error('AI分析失败:', error);
      return {};
    }
  }

  // 检查是否包含健身信息
  containsFitnessInfo(text) {
    const fitnessKeywords = ['跑步', '健身房', '运动', '锻炼', '跑了', '练了', '游泳', '羽毛球', '公里', 'km'];
    return fitnessKeywords.some(keyword => text.includes(keyword));
  }

  // 生成AI增强字段
  async generateEnhancedFields(entry) {
    try {
      const enhancedPrompt = `作为数据分析专家，请为以下个人记录生成增强字段数据。请严格按照JSON格式返回：

记录内容：
日期：${entry.date}
心情：${entry.mood}
生活：${entry.life}
学习：${entry.study}
工作：${entry.work}
灵感：${entry.inspiration}

请生成以下字段：
1. overall_sentiment: 整体情感倾向（positive/neutral/negative）
2. energy_level: 能量水平（high/medium/low）
3. productivity_score: 生产力评分（1-10）
4. life_balance_score: 生活平衡评分（1-10）
5. growth_indicators: 成长指标列表（数组）
6. key_themes: 关键主题列表（数组）
7. action_items: 建议行动项列表（数组）
8. emotional_tags: 情感标签列表（数组）

请返回标准JSON格式：
{
  "overall_sentiment": "情感倾向",
  "energy_level": "能量水平",
  "productivity_score": 评分数字,
  "life_balance_score": 评分数字,
  "growth_indicators": ["指标1", "指标2"],
  "key_themes": ["主题1", "主题2"],
  "action_items": ["行动项1", "行动项2"],
  "emotional_tags": ["标签1", "标签2"]
}

只返回JSON，无其他内容。`;

      const response = await this.aiService.callBestLLM(enhancedPrompt);
      return this.parseEnhancedFields(response);
    } catch (error) {
      console.error('生成增强字段失败:', error);
      return this.getDefaultEnhancedFields();
    }
  }

  // 解析增强字段
  parseEnhancedFields(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overall_sentiment: parsed.overall_sentiment || 'neutral',
          energy_level: parsed.energy_level || 'medium',
          productivity_score: parsed.productivity_score || 5,
          life_balance_score: parsed.life_balance_score || 5,
          growth_indicators: Array.isArray(parsed.growth_indicators) ? parsed.growth_indicators : [],
          key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes : [],
          action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
          emotional_tags: Array.isArray(parsed.emotional_tags) ? parsed.emotional_tags : []
        };
      }
      throw new Error('无法解析JSON');
    } catch (error) {
      console.error('解析增强字段失败:', error);
      return this.getDefaultEnhancedFields();
    }
  }

  // 获取默认增强字段
  getDefaultEnhancedFields() {
    return {
      overall_sentiment: 'neutral',
      energy_level: 'medium',
      productivity_score: 5,
      life_balance_score: 5,
      growth_indicators: ['保持记录习惯'],
      key_themes: ['日常生活'],
      action_items: ['继续保持记录'],
      emotional_tags: ['中性']
    };
  }

  // 计算数据质量评分
  calculateDataQuality(entry) {
    let score = 0;
    const fields = ['mood', 'life', 'study', 'work', 'inspiration'];
    
    fields.forEach(field => {
      if (entry[field] && entry[field].trim().length > 5) {
        score += 20; // 每个字段满分20分
      } else if (entry[field] && entry[field].trim().length > 0) {
        score += 10; // 有内容但较短
      }
    });
    
    return score;
  }

  // 生成数据摘要
  generateSummary(processedEntries) {
    const summary = {
      total_entries: processedEntries.length,
      date_range: {
        start: processedEntries[processedEntries.length - 1]?.date,
        end: processedEntries[0]?.date
      },
      average_quality_score: processedEntries.reduce((sum, entry) => 
        sum + (entry.data_quality_score || 0), 0) / processedEntries.length,
      sentiment_distribution: {
        positive: processedEntries.filter(e => e.overall_sentiment === 'positive').length,
        neutral: processedEntries.filter(e => e.overall_sentiment === 'neutral').length,
        negative: processedEntries.filter(e => e.overall_sentiment === 'negative').length
      },
      top_themes: this.getTopThemes(processedEntries),
      processing_timestamp: new Date().toISOString()
    };
    
    return summary;
  }

  // 获取热门主题
  getTopThemes(entries) {
    const themeCount = {};
    
    entries.forEach(entry => {
      if (entry.key_themes) {
        entry.key_themes.forEach(theme => {
          themeCount[theme] = (themeCount[theme] || 0) + 1;
        });
      }
    });
    
    return Object.entries(themeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));
  }
}

export default SmartDataProcessor;
