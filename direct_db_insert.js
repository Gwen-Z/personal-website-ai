// 直接向SQLite数据库插入数据的脚本
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// 示例数据 - 请根据您的实际数据修改
const realData = [
  {
    date: '2025-01-15',
    mood: 8.5,
    life: 7.2,
    study: 9.0,
    work: 6.8,
    inspiration: 8.3,
    note: '今天学习了React新特性，收获很大'
  },
  {
    date: '2025-01-14',
    mood: 7.0,
    life: 8.1,
    study: 7.5,
    work: 8.2,
    inspiration: 6.9,
    note: '完成了项目的重要功能开发'
  },
  {
    date: '2025-01-13',
    mood: 6.5,
    life: 6.8,
    study: 8.2,
    work: 7.1,
    inspiration: 7.8,
    note: '深度学习算法，但有些疲惫'
  },
  {
    date: '2025-01-12',
    mood: 9.2,
    life: 8.7,
    study: 8.8,
    work: 9.1,
    inspiration: 9.5,
    note: '完美的一天，各项指标都很好'
  },
  {
    date: '2025-01-11',
    mood: 7.8,
    life: 7.5,
    study: 6.9,
    work: 7.3,
    inspiration: 8.1,
    note: '稳定发展的一天'
  },
  {
    date: '2025-01-10',
    mood: 8.0,
    life: 7.8,
    study: 8.5,
    work: 7.9,
    inspiration: 8.7,
    note: '学习新技术，灵感迸发'
  },
  {
    date: '2025-01-09',
    mood: 6.8,
    life: 7.0,
    study: 7.8,
    work: 6.5,
    inspiration: 7.2,
    note: '工作压力较大，但学习保持稳定'
  }
];

async function insertDataDirectly() {
  console.log('开始直接向数据库插入数据...');
  
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
    for (const record of realData) {
      try {
        await db.run(
          'INSERT INTO records (date, mood, life, study, work, inspiration, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [record.date, record.mood, record.life, record.study, record.work, record.inspiration, record.note]
        );
        console.log(`✅ 成功插入: ${record.date}`);
        successCount++;
      } catch (error) {
        console.error(`❌ 插入失败: ${record.date} - ${error.message}`);
        errorCount++;
      }
    }
    
    // 提交事务
    await db.run('COMMIT');
    console.log('\n📊 插入完成统计:');
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

// 执行插入
insertDataDirectly().catch(console.error);
