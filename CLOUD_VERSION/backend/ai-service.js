import axios from 'axios';

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1';
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  // 生成AI分析
  async generateAnalysis(records, period = 'all') {
    try {
      if (!records || records.length === 0) {
        return this.getEmptyAnalysis();
      }

      // 准备数据摘要
      const dataSummary = this.prepareDataSummary(records, period);
      
      // 生成AI提示
      const prompt = this.generatePrompt(dataSummary, period);
      
      // 调用AI服务
      const analysis = await this.callAI(prompt);
      
      return this.parseAnalysis(analysis);
    } catch (error) {
      console.error('AI分析生成失败:', error);
      return this.getFallbackAnalysis();
    }
  }

  // 心情数据AI分析 - 使用Ollama
  async analyzeMoodData(moodDescription) {
    try {
      const prompt = this.generateMoodAnalysisPrompt(moodDescription);
      const response = await this.callOllama(prompt);
      return this.parseMoodAnalysis(response);
    } catch (error) {
      console.error('心情数据AI分析失败:', error);
      return this.getFallbackMoodAnalysis(moodDescription);
    }
  }

  // 生成心情分析提示词
  generateMoodAnalysisPrompt(moodDescription) {
    return `你是一个情绪分析专家。请严格按照以下规则分析心情描述：

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
  }

  // 调用Ollama API
  async callOllama(prompt) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: 'llama3.1:latest', // 使用llama3.1模型
        prompt: prompt,
        stream: false
      });
      
      return response.data.response;
    } catch (error) {
      console.error('Ollama API调用失败:', error);
      throw error;
    }
  }

  // 解析心情分析结果
  parseMoodAnalysis(response) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          mood_emoji: result.emoji || '😐',
          mood_event: result.event || '日常心情',
          mood_score: typeof result.score === 'number' ? result.score : 0,
          mood_category: result.category || '中性'
        };
      }
      throw new Error('无法解析JSON格式');
    } catch (error) {
      console.error('解析心情分析结果失败:', error);
      return this.getFallbackMoodAnalysis();
    }
  }

  // 调用最佳可用的大模型
  async callBestLLM(prompt) {
    if (this.openaiApiKey || this.anthropicApiKey) {
      return await this.callAI(prompt);
    }
    return await this.callOllama(prompt);
  }

  // 健身数据AI分析
  async analyzeFitnessData(fitnessDescription) {
    try {
      const prompt = this.generateFitnessAnalysisPrompt(fitnessDescription);
      const response = await this.callBestLLM(prompt);
      return this.parseFitnessAnalysis(response);
    } catch (error) {
      console.error('健身数据AI分析失败:', error);
      return this.getFallbackFitnessAnalysis(fitnessDescription);
    }
  }

  // 学习数据AI分析
  async analyzeStudyData(studyDescription) {
    try {
      const prompt = this.generateStudyAnalysisPrompt(studyDescription);
      const response = await this.callBestLLM(prompt);
      return this.parseStudyAnalysis(response);
    } catch (error) {
      console.error('学习数据AI分析失败:', error);
      return this.getFallbackStudyAnalysis(studyDescription);
    }
  }

  // 工作数据AI分析
  async analyzeWorkData(workDescription) {
    try {
      const prompt = this.generateWorkAnalysisPrompt(workDescription);
      const response = await this.callBestLLM(prompt);
      return this.parseWorkAnalysis(response);
    } catch (error) {
      console.error('工作数据AI分析失败:', error);
      return this.getFallbackWorkAnalysis(workDescription);
    }
  }

  // 灵感数据AI分析
  async analyzeInspirationData(inspirationDescription) {
    try {
      const prompt = this.generateInspirationAnalysisPrompt(inspirationDescription);
      const response = await this.callBestLLM(prompt);
      return this.parseInspirationAnalysis(response);
    } catch (error) {
      console.error('灵感数据AI分析失败:', error);
      return this.getFallbackInspirationAnalysis(inspirationDescription);
    }
  }

  // 健身数据AI分析
  async generateFitnessSummary(fitnessDescription) {
    try {
      const prompt = this.generateFitnessAnalysisPrompt(fitnessDescription);
      const response = await this.callBestLLM(prompt);
      return this.parseFitnessAnalysis(response);
    } catch (error) {
      console.error('健身数据AI分析失败:', error);
      return this.getFallbackFitnessAnalysis(fitnessDescription);
    }
  }

  // 生成健身分析提示词
  generateFitnessAnalysisPrompt(fitnessDescription) {
    return `你是一个健身专家。请分析健身描述并返回标准JSON格式：

健身描述: "${fitnessDescription}"

运动强度规则：
- 跑步、游泳、高强度间歇训练 = "高强度"
- 力量训练、球类运动、骑行 = "中强度"  
- 瑜伽、散步、拉伸 = "低强度"

运动时长规则（从描述中提取）：
- 明确提到时间：提取具体数值
- 提到"一会"、"短时间" = "15分钟"
- 提到"较长时间" = "1小时"
- 未提及 = "30分钟"

运动消耗预估：
- 高强度运动：时长*10卡路里
- 中强度运动：时长*8卡路里
- 低强度运动：时长*5卡路里

运动种类：根据描述判断主要运动类型

请返回标准JSON格式：
{
  "intensity": "运动强度",
  "duration": "运动时长",
  "calories": "消耗预估",
  "type": "运动种类"
}

只返回JSON，无其他内容。`;
  }

  // 生成学习分析提示词
  generateStudyAnalysisPrompt(studyDescription) {
    return `你是一个学习专家。请分析学习描述并返回标准JSON格式：

学习描述: "${studyDescription}"

学习时长规则：
- 明确提到时间：提取具体数值
- 提到"一会"、"短时间" = "30分钟"
- 提到"较长时间"、"很久" = "2小时"
- 未提及 = "1小时"

学习类别规则：
- 编程、代码、开发、算法 = "编程"
- 英语、外语、语言 = "外语"
- AI、人工智能、机器学习 = "AI技术"
- 读书、阅读、书籍 = "阅读"
- 金融、投资、理财 = "金融"
- 心理学、心理 = "心理学"
- 自媒体、营销、推广 = "自媒体"
- 其他 = "其他"

请返回标准JSON格式：
{
  "duration": "学习时长",
  "category": "学习类别"
}

只返回JSON，无其他内容。`;
  }

  // 生成工作分析提示词
  generateWorkAnalysisPrompt(workDescription) {
    return `你是一个工作效率专家。请分析工作描述并返回标准JSON格式：

工作描述: "${workDescription}"

任务类型规则：
- 计划、规划、设计方案 = "规划"
- 开发、编程、写代码 = "开发"
- 界面、设计、UI = "UI/UX设计"
- 部署、上线、发布 = "部署"
- 集成、整合、联调 = "功能集成"
- 测试、调试、收尾 = "测试/收尾"

优先级规则：
- 紧急、重要、关键 = "高"
- 一般、正常 = "中"
- 不急、次要 = "低"

请返回标准JSON格式：
{
  "task_type": "任务类型",
  "priority": "优先级"
}

只返回JSON，无其他内容。`;
  }

  // 生成灵感分析提示词
  generateInspirationAnalysisPrompt(inspirationDescription) {
    return `你是一个创意专家。请分析灵感描述并返回标准JSON格式：

灵感描述: "${inspirationDescription}"

主题提炼规则：
- 从描述中提取核心关键词，不超过10字
- 如涉及技术：提取技术类型
- 如涉及产品：提取产品概念
- 如涉及服务：提取服务类型

潜在产品形态规则：
- 技术类灵感：可能的技术应用或产品
- 设计类灵感：界面、交互或视觉产品
- 商业类灵感：商业模式或服务产品
- 内容类灵感：内容产品或媒体形态

难度等级规则：
- 涉及AI、复杂算法、系统集成 = "高"
- 涉及开发、设计、数据分析 = "中"
- 涉及内容创作、简单工具 = "低"

请返回标准JSON格式：
{
  "theme": "主题提炼",
  "product": "潜在产品形态描述",
  "difficulty": "难度等级"
}

只返回JSON，无其他内容。`;
  }

  // 解析健身分析结果
  parseFitnessAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          fitness_intensity: result.intensity || '中强度',
          fitness_duration: result.duration || '30分钟',
          fitness_calories: result.calories || '200卡',
          fitness_type: result.type || '综合训练'
        };
      }
      throw new Error('无法解析JSON格式');
    } catch (error) {
      console.error('解析健身分析结果失败:', error);
      return this.getFallbackFitnessAnalysis();
    }
  }

  // 解析学习分析结果
  parseStudyAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          study_duration: result.duration || '1小时',
          study_category: result.category || '其他'
        };
      }
      throw new Error('无法解析JSON格式');
    } catch (error) {
      console.error('解析学习分析结果失败:', error);
      return this.getFallbackStudyAnalysis();
    }
  }

  // 解析工作分析结果
  parseWorkAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          work_task_type: result.task_type || '开发',
          work_priority: result.priority || '中'
        };
      }
      throw new Error('无法解析JSON格式');
    } catch (error) {
      console.error('解析工作分析结果失败:', error);
      return this.getFallbackWorkAnalysis();
    }
  }

  // 解析灵感分析结果
  parseInspirationAnalysis(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          inspiration_theme: result.theme || '创意想法',
          inspiration_product: result.product || '待进一步开发的概念',
          inspiration_difficulty: result.difficulty || '中'
        };
      }
      throw new Error('无法解析JSON格式');
    } catch (error) {
      console.error('解析灵感分析结果失败:', error);
      return this.getFallbackInspirationAnalysis();
    }
  }

  // 心情分析失败时的后备结果
  getFallbackMoodAnalysis(moodDescription = '') {
    // 按照你添加的规则进行关键词匹配
    const desc = moodDescription.toLowerCase();
    
    let score = 0;
    let emoji = '😐';
    let category = '中性';
    let event = '日常心情';
    
    // 高分情绪 (3分)
    if (/(开心|非常开心|超好|获奖|比赛获奖|成功|点个赞)/.test(desc)) {
      score = 3;
      emoji = '😄';
      category = '积极高';
      if (/做饭|厨艺/.test(desc)) event = '厨艺相关';
      else if (/获奖|比赛/.test(desc)) event = '工作成就';
      else event = '开心事件';
    }
    // 低分情绪 (-3分)
    else if (/(伤心|难过|离别|生气|错过飞机|愤怒)/.test(desc)) {
      score = -3;
      emoji = '😫';
      category = '高强度消极';
      if (/离别/.test(desc)) event = '情感分离';
      else if (/错过飞机/.test(desc)) event = '出行问题';
      else event = '负面情绪';
    }
    // 中低分情绪 (-2分)
    else if (/(烦|搬家|工作压力|疲惫|累|加班)/.test(desc)) {
      score = -2;
      emoji = '😔';
      category = '中度消极';
      if (/搬家/.test(desc)) event = '搬家';
      else if (/工作|压力/.test(desc)) event = '工作压力';
      else if (/加班/.test(desc)) event = '加班';
      else event = '身体不适';
    }
    // 轻微负面 (-1分)
    else if (/(无语|被踩脚|小失望)/.test(desc)) {
      score = -1;
      emoji = '😣';
      category = '轻度消极';
      if (/被踩脚/.test(desc)) event = '被踩脚';
      else event = '轻微不适';
    }
    // 特殊情绪 (1分)
    else if (/(震惊|朋友分手|意外消息)/.test(desc)) {
      score = 1;
      emoji = '😮';
      category = '特殊情绪';
      if (/朋友分手/.test(desc)) event = '朋友关系';
      else if (/意外消息/.test(desc)) event = '意外消息';
      else event = '意外事件';
    }
    // 中性情绪 (0分)
    else if (/(平静|平稳|中立|没什么起伏|一般|普通|正常)/.test(desc)) {
      score = 0;
      emoji = '😐';
      category = '中性';
      event = '日常状态';
    }
    // 默认处理其他积极词汇
    else if (/(好|不错|愉快|满意|舒服)/.test(desc)) {
      score = 2;
      emoji = '😊';
      category = '积极中';
      event = '积极状态';
    }
    
    return {
      mood_emoji: emoji,
      mood_event: event,
      mood_score: score,
      mood_category: category
    };
  }

  // 健身分析失败时的后备结果
  getFallbackFitnessAnalysis(fitnessDescription = '') {
    return {
      fitness_intensity: '中强度',
      fitness_duration: '30分钟',
      fitness_calories: '200卡',
      fitness_type: '综合训练'
    };
  }

  // 学习分析失败时的后备结果
  getFallbackStudyAnalysis(studyDescription = '') {
    return {
      study_duration: '1小时',
      study_category: '其他'
    };
  }

  // 工作分析失败时的后备结果
  getFallbackWorkAnalysis(workDescription = '') {
    return {
      work_task_type: '开发',
      work_priority: '中'
    };
  }

  // 灵感分析失败时的后备结果
  getFallbackInspirationAnalysis(inspirationDescription = '') {
    return {
      inspiration_theme: '创意想法',
      inspiration_product: '待进一步开发的概念',
      inspiration_difficulty: '中'
    };
  }

  // 准备数据摘要
  prepareDataSummary(records, period) {
    const totalRecords = records.length;
    const recentRecords = records.slice(0, 7); // 最近7条记录
    
    // 统计各维度的状态
    const stats = {
      mood: this.analyzeMoodTrend(records),
      life: this.analyzeLifeTrend(records),
      study: this.analyzeStudyTrend(records),
      work: this.analyzeWorkTrend(records),
      inspiration: this.analyzeInspirationTrend(records)
    };

    return {
      totalRecords,
      recentRecords,
      period,
      stats,
      latestRecord: records[0] // 最新记录
    };
  }

  // 分析心情趋势
  analyzeMoodTrend(records) {
    const moodKeywords = {
      positive: ['开心', '愉快', '兴奋', '满足', '放松', '平静', '积极'],
      negative: ['沮丧', '焦虑', '疲惫', '烦躁', '低落', '压力', '消极'],
      neutral: ['一般', '平静', '正常', '稳定']
    };

    const recentMoods = records.slice(0, 5).map(r => r.mood);
    const positiveCount = recentMoods.filter(mood => 
      moodKeywords.positive.some(keyword => mood.includes(keyword))
    ).length;
    const negativeCount = recentMoods.filter(mood => 
      moodKeywords.negative.some(keyword => mood.includes(keyword))
    ).length;

    return {
      trend: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'stable',
      recentMoods,
      positiveCount,
      negativeCount
    };
  }

  // 分析生活趋势
  analyzeLifeTrend(records) {
    const lifeKeywords = {
      active: ['充实', '规律', '健康', '运动', '社交'],
      inactive: ['混乱', '不规律', '宅', '缺乏运动'],
      balanced: ['平衡', '稳定', '正常']
    };

    const recentLife = records.slice(0, 5).map(r => r.life);
    const activeCount = recentLife.filter(life => 
      lifeKeywords.active.some(keyword => life.includes(keyword))
    ).length;

    return {
      trend: activeCount >= 3 ? 'active' : 'needs_improvement',
      recentLife,
      activeCount
    };
  }

  // 分析学习趋势
  analyzeStudyTrend(records) {
    const studyKeywords = {
      productive: ['高效', '专注', '进步', '收获', '积极'],
      struggling: ['困难', '分心', '效率低', '缺乏动力'],
      stable: ['一般', '正常', '稳定']
    };

    const recentStudy = records.slice(0, 5).map(r => r.study);
    const productiveCount = recentStudy.filter(study => 
      studyKeywords.productive.some(keyword => study.includes(keyword))
    ).length;

    return {
      trend: productiveCount >= 3 ? 'productive' : 'needs_improvement',
      recentStudy,
      productiveCount
    };
  }

  // 分析工作趋势
  analyzeWorkTrend(records) {
    const workKeywords = {
      successful: ['顺利', '高效', '满意', '进步', '积极'],
      challenging: ['困难', '压力', '疲惫', '不满意'],
      stable: ['一般', '正常', '稳定']
    };

    const recentWork = records.slice(0, 5).map(r => r.work);
    const successfulCount = recentWork.filter(work => 
      workKeywords.successful.some(keyword => work.includes(keyword))
    ).length;

    return {
      trend: successfulCount >= 3 ? 'successful' : 'needs_improvement',
      recentWork,
      successfulCount
    };
  }

  // 分析灵感趋势
  analyzeInspirationTrend(records) {
    const inspirationKeywords = {
      creative: ['丰富', '创意', '灵感', '新想法', '创新'],
      dry: ['枯竭', '缺乏', '没有想法', '平淡'],
      moderate: ['一般', '正常', '稳定']
    };

    const recentInspiration = records.slice(0, 5).map(r => r.inspiration);
    const creativeCount = recentInspiration.filter(inspiration => 
      inspirationKeywords.creative.some(keyword => inspiration.includes(keyword))
    ).length;

    return {
      trend: creativeCount >= 3 ? 'creative' : 'needs_improvement',
      recentInspiration,
      creativeCount
    };
  }

  // 生成AI提示
  generatePrompt(dataSummary, period) {
    const { totalRecords, recentRecords, stats, latestRecord } = dataSummary;
    
    return `作为一个专业的个人成长顾问，请基于以下数据为用户提供个性化的分析和建议：

数据概览：
- 记录总数：${totalRecords}条
- 分析周期：${period}
- 最新记录日期：${latestRecord.date}

最近记录摘要：
${recentRecords.map((record, index) => 
  `${index + 1}. ${record.date}: 心情(${record.mood}), 生活(${record.life}), 学习(${record.study}), 工作(${record.work}), 灵感(${record.inspiration})`
).join('\n')}

各维度趋势分析：
- 心情趋势：${stats.mood.trend === 'positive' ? '积极向上' : stats.mood.trend === 'negative' ? '需要关注' : '相对稳定'}
- 生活状态：${stats.life.trend === 'active' ? '生活充实' : '需要改善'}
- 学习状态：${stats.study.trend === 'productive' ? '学习高效' : '需要调整'}
- 工作状态：${stats.work.trend === 'successful' ? '工作顺利' : '需要优化'}
- 灵感状态：${stats.inspiration.trend === 'creative' ? '灵感丰富' : '需要激发'}

请提供以下分析：
1. 整体状态评估（100字以内）
2. 各维度具体建议（每个维度50字以内）
3. 个人成长路径建议（100字以内）
4. 下周重点关注事项（50字以内）

请用中文回答，语气要温暖、积极、实用。`;
  }

  // 调用AI服务
  async callAI(prompt) {
    // 优先使用OpenAI
    if (this.openaiApiKey) {
      return await this.callOpenAI(prompt);
    }
    // 备用使用Anthropic
    else if (this.anthropicApiKey) {
      return await this.callAnthropic(prompt);
    }
    // 如果都没有配置，返回模拟分析
    else {
      return this.getMockAnalysis();
    }
  }

  // 调用OpenAI
  async callOpenAI(prompt) {
    try {
      const response = await axios.post(
        `${this.openaiBaseUrl}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的个人成长顾问，擅长分析个人数据并提供实用的建议。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      throw error;
    }
  }

  // 调用Anthropic
  async callAnthropic(prompt) {
    try {
      const response = await axios.post(
        `${this.anthropicBaseUrl}/messages`,
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 800,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.anthropicApiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          }
        }
      );

      return response.data.content[0].text;
    } catch (error) {
      console.error('Anthropic API调用失败:', error);
      throw error;
    }
  }

  // 解析AI分析结果
  parseAnalysis(aiResponse) {
    try {
      // 如果是模拟分析，直接返回
      if (typeof aiResponse === 'object' && aiResponse.overall_assessment) {
        return aiResponse;
      }
      
      // 如果是字符串，进行解析
      if (typeof aiResponse === 'string') {
        const sections = aiResponse.split('\n\n');
        
        return {
          overall_assessment: sections[0] || '基于您的数据，整体状态良好，建议继续保持积极的生活态度。',
          mood_suggestion: this.extractSuggestion(sections, '心情') || '建议保持积极心态，多与朋友交流。',
          life_suggestion: this.extractSuggestion(sections, '生活') || '建议保持规律作息，增加运动。',
          study_suggestion: this.extractSuggestion(sections, '学习') || '建议制定学习计划，提高专注度。',
          work_suggestion: this.extractSuggestion(sections, '工作') || '建议优化工作方法，注意工作生活平衡。',
          inspiration_suggestion: this.extractSuggestion(sections, '灵感') || '建议多阅读，接触新事物。',
          growth_path: sections[sections.length - 2] || '建议持续记录，关注各维度平衡发展。',
          next_week_focus: sections[sections.length - 1] || '下周重点关注心情调节和工作效率提升。'
        };
      }
      
      // 默认返回备用分析
      return this.getFallbackAnalysis();
    } catch (error) {
      console.error('AI响应解析失败:', error);
      return this.getFallbackAnalysis();
    }
  }

  // 提取建议
  extractSuggestion(sections, keyword) {
    for (const section of sections) {
      if (section.includes(keyword)) {
        return section.replace(/^.*?：/, '').trim();
      }
    }
    return null;
  }

  // 获取空数据分析
  getEmptyAnalysis() {
    return {
      overall_assessment: '暂无数据，建议开始记录您的日常生活。',
      mood_suggestion: '开始记录心情变化，观察情绪模式。',
      life_suggestion: '记录生活状态，发现改善空间。',
      study_suggestion: '记录学习情况，找到适合自己的方法。',
      work_suggestion: '记录工作状态，提高工作效率。',
      inspiration_suggestion: '记录灵感想法，培养创造力。',
      growth_path: '持续记录，观察个人成长轨迹。',
      next_week_focus: '开始建立记录习惯。'
    };
  }

  // 获取备用分析
  getFallbackAnalysis() {
    return {
      overall_assessment: '基于您的数据，整体状态良好，建议继续保持。',
      mood_suggestion: '建议保持积极心态，多进行户外活动。',
      life_suggestion: '建议保持规律作息，增加运动锻炼。',
      study_suggestion: '建议制定学习计划，提高学习效率。',
      work_suggestion: '建议优化工作方法，注意工作生活平衡。',
      inspiration_suggestion: '建议多阅读，接触新事物，培养创造力。',
      growth_path: '建议持续记录并关注各维度的平衡发展。',
      next_week_focus: '下周重点关注心情调节和工作效率。'
    };
  }

  // 获取模拟分析（用于测试）
  getMockAnalysis() {
    return {
      overall_assessment: '基于您的数据，整体状态良好，生活规律，学习工作都有不错的表现。建议继续保持这种积极的状态。',
      mood_suggestion: '心情状态不错，建议继续保持积极心态，多与朋友交流，培养兴趣爱好。',
      life_suggestion: '生活状态良好，建议继续保持规律作息，适当增加运动，保持健康的生活方式。',
      study_suggestion: '学习状态不错，建议制定更详细的学习计划，找到适合自己的学习方法，提高学习效率。',
      work_suggestion: '工作状态良好，建议继续优化工作方法，提高工作效率，注意工作与生活的平衡。',
      inspiration_suggestion: '灵感状态不错，建议多阅读，接触新事物，培养创造力，保持开放的心态。',
      growth_path: '建议持续记录并关注各维度的平衡发展，定期回顾和调整个人目标。',
      next_week_focus: '下周重点关注学习效率提升和灵感激发，保持积极的生活态度。'
    };
  }
}

// 导出单个函数供API使用
export const analyzeMoodData = (moodDescription) => {
  const aiService = new AIService();
  return aiService.analyzeMoodData(moodDescription);
};

export const analyzeStudyData = (studyDescription) => {
  const aiService = new AIService();
  return aiService.analyzeStudyData(studyDescription);
};

export const analyzeWorkData = (workDescription) => {
  const aiService = new AIService();
  return aiService.analyzeWorkData(workDescription);
};

export const analyzeInspirationData = (inspirationDescription) => {
  const aiService = new AIService();
  return aiService.analyzeInspirationData(inspirationDescription);
};

export const generateFitnessSummary = (fitnessText) => {
  const aiService = new AIService();
  return aiService.generateFitnessSummary(fitnessText);
};

export default AIService; 