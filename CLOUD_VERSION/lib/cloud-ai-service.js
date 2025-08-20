// 使用原生 fetch API 替代 axios

class CloudAIService {
  constructor() {
    // 支持豆包等国内厂商的 OpenAI 兼容配置
    const provider = process.env.AI_PROVIDER || 'openai'; // 默认用 openai 路径
    
    this.services = {
      primary: {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
      },
      secondary: {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
      }
    };

    // 根据 AI_PROVIDER 调整优先级
    if (provider === 'anthropic') {
      [this.services.primary, this.services.secondary] = [this.services.secondary, this.services.primary];
    }
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
    const response = await fetch(`${service.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${service.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: service.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API 错误: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // OpenAI GPT API 调用
  async callOpenAI(service, prompt) {
    const response = await fetch(`${service.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${service.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: service.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API 错误 ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // 心情分析
  async analyzeMood(moodDescription) {
    const prompt = `仅输出严格 JSON（无多余文本/代码块）：
{"emoji":"😐","event":"≤10字","score":-3~3整数,"category":"积极/中性/消极"}

规则：
- score: 3=很开心/获奖, 2=开心, 1=还行, 0=平静, -1=小烦恼, -2=压力/累, -3=难过/生气
- category: score>0="积极", score=0="中性", score<0="消极"
- 不确定时用 0/"中性"

心情描述: "${moodDescription}"

输出:`;

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
    const prompt = `输入为多天记录摘要。仅输出 JSON：
{
  "summary":"≤80字",
  "mood_trend":"≤60字",
  "life_quality":"≤60字",
  "productivity":"≤60字",
  "recommendations":["短句1","短句2","短句3"]
}

用中文、可执行、避免空话。

数据时间范围: ${period}
记录数量: ${records.length}

数据摘要:
${this.prepareDataSummary(records)}

输出:`;

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
    const prompt = `仅输出严格 JSON（无多余文本/代码块）：
{
  "date": "YYYY-MM-DD",
  "mood": 整数0-5,
  "mood_emoji": "单个emoji",
  "mood_description": "≤20字",
  "life": 0-5,
  "study": 0-5,
  "work": 0-5,
  "inspiration": 0-5,
  "summary": "≤60字"
}

评分：0=无内容, 1=很差, 2=一般, 3=还行, 4=不错, 5=很好
缺失信息置 0 或空字符串，禁止编造；保持中文。

数据:
日期: ${rawData.date}
心情: ${rawData.mood_text || '无'}
生活: ${rawData.life_text || '无'}
学习: ${rawData.study_text || '无'}
工作: ${rawData.work_text || '无'}
灵感: ${rawData.inspiration_text || '无'}

输出:`;

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
