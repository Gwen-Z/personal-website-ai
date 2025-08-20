import { createClient } from '@libsql/client';
import axios from 'axios';

// 初始化 Turso 客户端
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 豆包 AI 服务
class DoubaoAIService {
  constructor() {
    this.baseUrl = process.env.OPENAI_BASE_URL;
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'doubao-lite-4k';
  }

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
健身: ${rawData.fitness_text || '无'}
学习: ${rawData.study_text || '无'}
工作: ${rawData.work_text || '无'}
灵感: ${rawData.inspiration_text || '无'}

输出:`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('AI 处理失败:', error.message);
      // 返回默认值
      return {
        date: rawData.date,
        mood: 3,
        mood_emoji: '😐',
        mood_description: rawData.mood_text || '无特殊心情',
        life: 3,
        study: 3,
        work: 3,
        inspiration: 3,
        summary: '数据处理中遇到问题，使用默认评分'
      };
    }
  }
}

// 解析原始文本
function parseRawText(rawText) {
  if (!rawText) return {};
  
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
  let result = {};
  
  for (const line of lines) {
    if (line.includes('：')) {
      const [key, value] = line.split('：', 2);
      const cleanKey = key.trim();
      const cleanValue = value ? value.trim() : '';
      
      if (['心情', '健身', '学习', '工作', '灵感'].includes(cleanKey)) {
        const fieldMap = {
          '心情': 'mood_text',
          '健身': 'fitness_text', 
          '学习': 'study_text',
          '工作': 'work_text',
          '灵感': 'inspiration_text'
        };
        result[fieldMap[cleanKey]] = cleanValue;
      }
    }
  }
  
  return result;
}

// 主处理函数
async function batchProcessRawData() {
  console.log('🚀 开始批处理原始数据...');
  
  try {
    // 1. 创建 AI 数据表（如果不存在）
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_processed_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_entry_id INTEGER,
        date TEXT NOT NULL,
        mood_score INTEGER,
        mood_emoji TEXT,
        mood_description TEXT,
        life_score INTEGER,
        study_score INTEGER,
        work_score INTEGER,
        inspiration_score INTEGER,
        summary TEXT,
        ai_model TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (raw_entry_id) REFERENCES raw_entries(id)
      )
    `);

    // 2. 获取所有未处理的原始数据
    const rawDataResult = await turso.execute(`
      SELECT r.* FROM raw_entries r
      LEFT JOIN ai_processed_data a ON r.id = a.raw_entry_id
      WHERE a.id IS NULL
      ORDER BY r.date DESC
    `);

    const rawDataList = rawDataResult.rows.map(row => {
      const record = {};
      rawDataResult.columns.forEach((column, index) => {
        record[column] = row[index];
      });
      return record;
    });

    console.log(`📊 找到 ${rawDataList.length} 条未处理的原始数据`);

    if (rawDataList.length === 0) {
      console.log('✅ 所有数据已处理完成！');
      return;
    }

    // 3. 初始化 AI 服务
    const aiService = new DoubaoAIService();
    let successCount = 0;
    let errorCount = 0;

    // 4. 批量处理（每次处理一条，避免 API 限流）
    for (const rawEntry of rawDataList) {
      try {
        console.log(`🔄 处理第 ${successCount + errorCount + 1}/${rawDataList.length} 条: ID ${rawEntry.id}, 日期 ${rawEntry.date}`);

        // 解析原始文本
        const parsedText = parseRawText(rawEntry.raw_text);
        
        // 准备 AI 处理的数据
        const dataToProcess = {
          date: rawEntry.date,
          mood_text: parsedText.mood_text || '',
          fitness_text: parsedText.fitness_text || '',
          study_text: parsedText.study_text || '',
          work_text: parsedText.work_text || '',
          inspiration_text: parsedText.inspiration_text || ''
        };

        // AI 处理
        const aiResult = await aiService.processRawData(dataToProcess);
        console.log(`🤖 AI 分析结果:`, aiResult);

        // 存储 AI 处理结果
        await turso.execute({
          sql: `INSERT INTO ai_processed_data 
                (raw_entry_id, date, mood_score, mood_emoji, mood_description, 
                 life_score, study_score, work_score, inspiration_score, 
                 summary, ai_model) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            rawEntry.id,
            aiResult.date,
            aiResult.mood || 0,
            aiResult.mood_emoji || '😐',
            aiResult.mood_description || '',
            aiResult.life || 0,
            aiResult.study || 0,
            aiResult.work || 0,
            aiResult.inspiration || 0,
            aiResult.summary || '',
            'doubao-lite-4k'
          ]
        });

        successCount++;
        console.log(`✅ 成功处理 ID ${rawEntry.id}`);

        // 添加延迟避免 API 限流
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errorCount++;
        console.error(`❌ 处理 ID ${rawEntry.id} 失败:`, error.message);
      }
    }

    console.log(`\n📈 批处理完成！`);
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${errorCount} 条`);
    console.log(`📊 总计: ${rawDataList.length} 条`);

  } catch (error) {
    console.error('❌ 批处理失败:', error);
  }
}

// 执行批处理
if (import.meta.url === `file://${process.argv[1]}`) {
  batchProcessRawData();
}

export { batchProcessRawData };
