import axios from 'axios';

class CloudAIService {
  constructor() {
    // 多重 AI 服务配置
    this.services = {
      primary: {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-sonnet-20240229'
      },
      secondary: {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4'
      }
    };
  }

  // 智能路由：选择可用的 AI 服务
  async callWithFallback(prompt, type = 'analysis') {
    const services = [this.services.primary, this.services.secondary];
    
    for (const service of services) {
      try {
        if (!service.apiKey) continue;
        
        console.log(`尝试使用 ${service.name} 进行 ${type}`);
        const result = await this.callAIService(service, prompt);
        console.log(`✅ ${service.name} 调用成功`);
        return result;
      } catch (error) {
        console.warn(`⚠️ ${service.name} 调用失败:`, error.message);
        continue;
      }
    }
    
    // 所有服务都失败，返回降级响应
    console.error('❌ 所有 AI 服务都不可用，使用降级响应');
    return this.getFallbackResponse(type);
  }

  // 调用具体的 AI 服务
  async callAIService(service, prompt) {
    if (service.name === 'anthropic') {
      return await this.callAnthropic(service, prompt);
    } else if (service.name === 'openai') {
      return await this.callOpenAI(service, prompt);
    }
    throw new Error(`未知的 AI 服务: ${service.name}`);
  }

  // Anthropic Claude API 调用
  async callAnthropic(service, prompt) {
    const response = await axios.post(
      `${service.baseUrl}/messages`,
      {
        model: service.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${service.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    return response.data.content[0].text;
  }

  // OpenAI GPT API 调用
  async callOpenAI(service, prompt) {
    const response = await axios.post(
      `${service.baseUrl}/chat/completions`,
      {
        model: service.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${service.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }

  // 心情分析
  async analyzeMood(moodDescription) {
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
      const response = await this.callWithFallback(prompt, 'mood');
      return this.parseMoodResponse(response);
    } catch (error) {
      console.error('心情分析失败:', error);
      return this.getFallbackMoodAnalysis(moodDescription);
    }
  }

  // 数据综合分析
  async generateAnalysis(records, period = 'all') {
    const prompt = `请分析以下个人数据记录，生成综合分析报告：

数据时间范围: ${period}
记录数量: ${records.length}

数据摘要:
${this.prepareDataSummary(records)}

请提供以下分析：
1. 整体趋势分析
2. 心情变化模式
3. 生活质量评估
4. 学习和工作状态
5. 改进建议

请以JSON格式返回：
{
  "summary": "整体摘要",
  "mood_trend": "心情趋势分析",
  "life_quality": "生活质量评估",
  "productivity": "学习工作分析",
  "recommendations": ["建议1", "建议2", "建议3"]
}`;

    try {
      const response = await this.callWithFallback(prompt, 'analysis');
      return this.parseAnalysisResponse(response);
    } catch (error) {
      console.error('数据分析失败:', error);
      return this.getFallbackAnalysis();
    }
  }

  // AI 聊天对话
  async chatResponse(message, context = '', history = []) {
    const systemPrompt = `你是一个专业的AI个人助手，专门帮助用户分析个人数据和提供生活建议。`;
    
    const historyText = history.map(msg => 
      `${msg.type === 'user' ? '用户' : 'AI'}：${msg.content}`
    ).join('\n');

    const prompt = `${systemPrompt}

${context ? `当前页面：${context}` : ''}
${historyText ? `历史对话：\n${historyText}` : ''}

用户问题：${message}

请提供专业、实用的回答：`;

    try {
      const response = await this.callWithFallback(prompt, 'chat');
      return { reply: response };
    } catch (error) {
      console.error('AI聊天失败:', error);
      return { 
        reply: '抱歉，AI服务暂时不可用。请稍后再试。',
        error: true 
      };
    }
  }

  // 原始数据处理
  async processRawData(rawData) {
    const prompt = `请分析以下个人日记数据，为每个维度打分（1-5分，5分最高），并为心情生成合适的emoji：

日期: ${rawData.date}
心情: ${rawData.mood_text || '无'}
生活: ${rawData.life_text || '无'}
学习: ${rawData.study_text || '无'}
工作: ${rawData.work_text || '无'}
灵感: ${rawData.inspiration_text || '无'}

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
- 心情：根据情绪表达的积极程度，并生成对应emoji
- 生活：根据生活质量、健康状况、活动丰富度
- 学习：根据新知识获取、学习成果、技能提升
- 工作：根据工作进展、机会、成就感
- 灵感：根据创意想法、洞察、启发的丰富度`;

    try {
      const response = await this.callWithFallback(prompt, 'processing');
      return this.parseProcessingResponse(response);
    } catch (error) {
      console.error('原始数据处理失败:', error);
      return this.getFallbackProcessing(rawData);
    }
  }

  // 解析响应的辅助函数
  parseMoodResponse(response) {
    try {
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('解析心情分析响应失败:', error);
      return { emoji: '😐', event: '日常心情', score: 0, category: '中性' };
    }
  }

  parseAnalysisResponse(response) {
    try {
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('解析分析响应失败:', error);
      return this.getFallbackAnalysis();
    }
  }

  parseProcessingResponse(response) {
    try {
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('解析处理响应失败:', error);
      return this.getFallbackProcessing();
    }
  }

  // 降级响应
  getFallbackResponse(type) {
    const fallbacks = {
      mood: { emoji: '😐', event: '日常心情', score: 0, category: '中性' },
      analysis: this.getFallbackAnalysis(),
      chat: { reply: '抱歉，AI服务暂时不可用，请稍后再试。', error: true },
      processing: this.getFallbackProcessing()
    };
    return fallbacks[type] || { error: 'AI服务不可用' };
  }

  getFallbackAnalysis() {
    return {
      summary: '数据分析服务暂时不可用',
      mood_trend: '无法获取心情趋势',
      life_quality: '无法评估生活质量',
      productivity: '无法分析工作学习状态',
      recommendations: ['请稍后重试', '检查网络连接', '联系技术支持']
    };
  }

  getFallbackMoodAnalysis(description) {
    return {
      emoji: '😐',
      event: '日常心情',
      score: 0,
      category: '中性'
    };
  }

  getFallbackProcessing(rawData = {}) {
    return {
      date: rawData.date || new Date().toISOString().split('T')[0],
      mood: 3,
      mood_emoji: '😐',
      mood_description: '数据处理服务暂时不可用',
      life: 3,
      study: 3,
      work: 3,
      inspiration: 3,
      summary: 'AI处理服务暂时不可用，使用默认评分'
    };
  }

  // 准备数据摘要
  prepareDataSummary(records) {
    if (!records || records.length === 0) return '无数据';
    
    const recentRecords = records.slice(0, 5);
    return recentRecords.map(record => 
      `${record.date}: 心情-${record.mood_description || '无'}, 生活-${record.life_description || '无'}`
    ).join('\n');
  }
}

export default CloudAIService;
