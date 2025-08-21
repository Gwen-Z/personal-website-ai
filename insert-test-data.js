const { createClient } = require('@libsql/client');
require('dotenv').config();

// 测试数据
const testData = [
  {
    date: "2024-08-19",
    raw_text: `心情：今天心情特别好！完成了一个重要的项目里程碑，感觉很有成就感，整个人都充满了正能量。
健身：晨跑了45分钟，跑了大约6公里，出了很多汗，感觉身体状态很棒，消耗了大概400卡路里。
学习：学习React新特性，花了2小时研究Server Components，做了几个小demo，对这个技术有了更深的理解。
工作：完成了用户认证模块的开发，修复了3个关键bug，代码review通过，准备明天部署到测试环境。
灵感：想到了一个AI辅助编程的创意，可以根据用户的编程习惯自动生成代码模板，这个想法很有商业价值。`
  },
  {
    date: "2024-08-18",
    raw_text: `心情：有点紧张和焦虑，明天要做项目演示，担心准备不充分，但同时也有点兴奋期待。
健身：去健身房做了1小时力量训练，主要练胸肌和三头肌，举重感觉不错，估计消耗了350卡路里。
学习：看了1.5小时的TypeScript进阶教程，学习了泛型和装饰器的高级用法，感觉收获很大。
工作：准备明天的项目演示PPT，整理了项目的核心功能和技术亮点，加班到比较晚。
灵感：思考了一个在线协作工具的想法，可以让远程团队更高效地协作，类似Figma但专注于文档协作。`
  },
  {
    date: "2024-08-17",
    raw_text: `心情：今天心情比较平静，工作很顺利，没有什么特别的波动，整体感觉还不错。
健身：下午做了30分钟瑜伽，主要是拉伸和放松，感觉身心都得到了很好的调节，消耗约150卡路里。
学习：阅读了一本关于用户体验设计的书，花了1小时，学到了很多关于用户心理学的知识。
工作：优化了数据库查询性能，重构了几个关键接口，代码质量有了明显提升，团队反馈很好。
灵感：想到可以做一个智能日程管理应用，结合AI来预测用户的时间安排和优化工作效率。`
  },
  {
    date: "2024-08-16",
    raw_text: `心情：今天有些疲惫和压力，项目进度有点紧，需要加快开发速度，但还是保持乐观。
健身：傍晚游泳了40分钟，游了大约1500米，水中运动让我感觉很放松，消耗了大概300卡路里。
学习：学习了Node.js的性能优化技巧，花了2.5小时深入研究了事件循环和内存管理，很有收获。
工作：开发了新的API接口，完成了前后端联调，解决了几个跨域问题，进度基本按计划进行。
灵感：想到了一个健康管理平台的创意，可以整合运动、饮食、睡眠数据，提供个性化健康建议。`
  },
  {
    date: "2024-08-15",
    raw_text: `心情：今天心情很愉快，和朋友聚餐聊天很开心，工作上也有不错的进展，感觉生活很充实。
健身：和朋友一起打了1小时羽毛球，运动量很大，出了很多汗，估计消耗了450卡路里，很久没这么痛快地运动了。
学习：学习了Python数据分析，用pandas处理了一些实际数据，花了1.5小时，对数据科学有了更深的认识。
工作：参加了技术分享会，了解了最新的前端框架发展趋势，和同事讨论了很多技术问题，很有启发。
灵感：想到了一个社交学习平台的想法，让用户可以分享学习笔记和经验，形成学习社区。`
  },
  {
    date: "2024-08-14",
    raw_text: `心情：今天情绪有些低落，遇到了一些技术难题，感觉有点挫败，但还是要坚持解决问题。
健身：只做了20分钟简单的拉伸运动，身体有点疲惫，没有进行高强度训练，消耗约100卡路里。
学习：研究了微服务架构，花了3小时深入学习Docker和Kubernetes，虽然复杂但很有价值。
工作：遇到了复杂的并发问题，调试了一整天，虽然还没完全解决，但找到了一些线索。
灵感：思考了一个开发者工具的想法，可以自动检测和修复常见的代码问题，提高开发效率。`
  },
  {
    date: "2024-08-13",
    raw_text: `心情：今天心情不错，解决了昨天的技术难题，很有成就感，对自己的能力更有信心了。
健身：早上跑步35分钟，配速保持得很好，跑了约5公里，感觉体能有所提升，消耗了320卡路里。
学习：学习了机器学习基础，花了2小时了解了监督学习和无监督学习的区别，做了一些练习。
工作：成功解决了并发问题，优化了系统性能，团队对解决方案很满意，项目进度回到正轨。
灵感：想到了一个AI代码审查工具的创意，可以自动发现代码中的潜在问题和安全漏洞。`
  }
];

// 解析原始文本的函数
function parseRawText(rawText) {
  const result = {
    mood_text: '',
    fitness_text: '',
    study_text: '',
    work_text: '',
    inspiration_text: ''
  };

  if (!rawText) return result;

  // 按行分割并解析
  const lines = rawText.split('\n').map(line => line.trim()).filter(Boolean);
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // 心情相关关键词
    if (lowerLine.includes('心情') || lowerLine.includes('情绪') || lowerLine.includes('感觉')) {
      result.mood_text = line.replace(/^心情[：:]\s*/, '');
    }
    // 健身/运动相关关键词
    else if (lowerLine.includes('健身') || lowerLine.includes('运动') || lowerLine.includes('跑步') ||
             lowerLine.includes('游泳') || lowerLine.includes('瑜伽') || lowerLine.includes('锻炼')) {
      result.fitness_text = line.replace(/^健身[：:]\s*/, '');
    }
    // 学习相关关键词
    else if (lowerLine.includes('学习') || lowerLine.includes('学会') || lowerLine.includes('课程') ||
             lowerLine.includes('阅读') || lowerLine.includes('书') || lowerLine.includes('研究')) {
      result.study_text = line.replace(/^学习[：:]\s*/, '');
    }
    // 工作相关关键词
    else if (lowerLine.includes('工作') || lowerLine.includes('项目') || lowerLine.includes('任务') ||
             lowerLine.includes('开发') || lowerLine.includes('代码') || lowerLine.includes('bug')) {
      result.work_text = line.replace(/^工作[：:]\s*/, '');
    }
    // 灵感相关关键词
    else if (lowerLine.includes('灵感') || lowerLine.includes('想法') || lowerLine.includes('创意') ||
             lowerLine.includes('点子') || lowerLine.includes('想到')) {
      result.inspiration_text = line.replace(/^灵感[：:]\s*/, '');
    }
  }

  return result;
}

async function insertTestData() {
  try {
    console.log('🚀 开始插入测试数据到Turso数据库...');
    
    // 检查环境变量
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!dbUrl || !dbToken) {
      throw new Error('请设置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN 环境变量');
    }
    
    // 初始化数据库客户端
    const turso = createClient({
      url: dbUrl,
      authToken: dbToken,
    });
    
    console.log('📊 连接数据库成功');
    
    // 创建raw_entries表（如果不存在）
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS raw_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood_text TEXT,
        fitness_text TEXT,
        study_text TEXT,
        work_text TEXT,
        inspiration_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('📋 数据表检查完成');
    
    // 清空现有的测试数据（可选）
    await turso.execute(`DELETE FROM raw_entries WHERE date BETWEEN '2024-08-13' AND '2024-08-19'`);
    console.log('🧹 清理旧的测试数据');
    
    let insertCount = 0;
    
    // 插入测试数据
    for (const item of testData) {
      try {
        console.log(`📝 处理日期 ${item.date} 的数据...`);
        
        // 解析原始文本
        const parsedData = parseRawText(item.raw_text);
        
        // 插入到数据库
        await turso.execute({
          sql: `INSERT INTO raw_entries 
                (date, mood_text, fitness_text, study_text, work_text, inspiration_text, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [
            item.date,
            parsedData.mood_text || '',
            parsedData.fitness_text || '',
            parsedData.study_text || '',
            parsedData.work_text || '',
            parsedData.inspiration_text || ''
          ]
        });
        
        insertCount++;
        console.log(`✅ 成功插入 ${item.date} 的数据`);
        
      } catch (error) {
        console.error(`❌ 插入 ${item.date} 数据失败:`, error.message);
      }
    }
    
    console.log(`\n🎉 数据插入完成！成功插入 ${insertCount}/${testData.length} 条记录`);
    
    // 验证插入的数据
    const result = await turso.execute(`
      SELECT date, mood_text, fitness_text, study_text, work_text, inspiration_text 
      FROM raw_entries 
      WHERE date BETWEEN '2024-08-13' AND '2024-08-19' 
      ORDER BY date DESC
    `);
    
    console.log('\n📊 插入的数据验证:');
    result.rows.forEach((row, index) => {
      const record = {};
      result.columns.forEach((column, colIndex) => {
        record[column] = row[colIndex];
      });
      console.log(`${index + 1}. ${record.date}: 心情[${record.mood_text?.substring(0, 20)}...] 健身[${record.fitness_text?.substring(0, 20)}...] 学习[${record.study_text?.substring(0, 20)}...] 工作[${record.work_text?.substring(0, 20)}...] 灵感[${record.inspiration_text?.substring(0, 20)}...]`);
    });
    
  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    throw error;
  }
}

// 运行脚本
if (require.main === module) {
  insertTestData().catch(console.error);
}

module.exports = { insertTestData, testData };
