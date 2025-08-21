// 从CSV文件导入数据到SQLite数据库
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// CSV解析函数
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    
    records.push(record);
  }
  
  return records;
}

// 创建示例CSV文件
function createSampleCSV() {
  const csvContent = `date,mood,life,study,work,inspiration,note
2025-01-15,8.5,7.2,9.0,6.8,8.3,今天学习了React新特性
2025-01-14,7.0,8.1,7.5,8.2,6.9,完成了项目重要功能
2025-01-13,6.5,6.8,8.2,7.1,7.8,深度学习但有些疲惫
2025-01-12,9.2,8.7,8.8,9.1,9.5,完美的一天
2025-01-11,7.8,7.5,6.9,7.3,8.1,稳定发展的一天
2025-01-10,8.0,7.8,8.5,7.9,8.7,学习新技术灵感迸发
2025-01-09,6.8,7.0,7.8,6.5,7.2,工作压力大但学习稳定
2025-01-08,8.3,8.0,8.1,7.8,8.9,平衡发展的好日子
2025-01-07,7.5,7.3,7.9,8.0,7.6,周末充电学习
2025-01-06,8.8,8.5,9.2,8.3,9.1,高效学习工作日`;

  fs.writeFileSync('./sample_data.csv', csvContent, 'utf8');
  console.log('✅ 已创建示例CSV文件: sample_data.csv');
  return csvContent;
}

async function importFromCSV(csvFilePath = './sample_data.csv') {
  console.log('开始从CSV文件导入数据...');
  
  // 如果文件不存在，创建示例文件
  if (!fs.existsSync(csvFilePath)) {
    console.log('CSV文件不存在，创建示例文件...');
    createSampleCSV();
  }
  
  // 读取CSV文件
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const records = parseCSV(csvContent);
  
  console.log(`📁 从CSV文件读取到 ${records.length} 条记录`);
  
  // 打开数据库连接
  const db = await open({
    filename: './backend/records.db',
    driver: sqlite3.Database
  });
  
  let successCount = 0;
  let errorCount = 0;
  
  // 开始事务
  await db.run('BEGIN TRANSACTION');
  
  try {
    for (const record of records) {
      try {
        // 转换数据类型
        const mood = parseFloat(record.mood) || 0;
        const life = parseFloat(record.life) || 0;
        const study = parseFloat(record.study) || 0;
        const work = parseFloat(record.work) || 0;
        const inspiration = parseFloat(record.inspiration) || 0;
        
        await db.run(
          'INSERT INTO records (date, mood, life, study, work, inspiration, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [record.date, mood, life, study, work, inspiration, record.note || '']
        );
        console.log(`✅ 成功导入: ${record.date}`);
        successCount++;
      } catch (error) {
        console.error(`❌ 导入失败: ${record.date} - ${error.message}`);
        errorCount++;
      }
    }
    
    // 提交事务
    await db.run('COMMIT');
    console.log('\n📊 导入完成统计:');
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${errorCount} 条`);
    
  } catch (error) {
    // 回滚事务
    await db.run('ROLLBACK');
    console.error('事务失败，已回滚:', error.message);
  } finally {
    // 关闭数据库连接
    await db.close();
  }
}

// 执行导入
importFromCSV().catch(console.error);
