import { createClient } from '@libsql/client';

// 获取Turso客户端
async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw';
  return createClient({ url, authToken });
}

async function fixAiDataTable() {
  try {
    const turso = await getTursoClient();
    console.log('开始修复ai_data表结构...');
    
    // 检查ai_data表结构
    const tableInfo = await turso.execute({
      sql: "PRAGMA table_info(ai_data)"
    });
    
    console.log('当前ai_data表结构:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row[1]} (${row[2]})`);
    });
    
    // 检查是否存在created_at列
    const hasCreatedAt = tableInfo.rows.some(row => row[1] === 'created_at');
    
    if (!hasCreatedAt) {
      console.log('添加created_at列...');
      await turso.execute({
        sql: 'ALTER TABLE ai_data ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP'
      });
      console.log('✅ created_at列添加成功');
    } else {
      console.log('✅ created_at列已存在');
    }
    
    // 验证修复结果
    const newTableInfo = await turso.execute({
      sql: "PRAGMA table_info(ai_data)"
    });
    
    console.log('\n修复后的ai_data表结构:');
    newTableInfo.rows.forEach(row => {
      console.log(`  ${row[1]} (${row[2]})`);
    });
    
    console.log('\n🎉 ai_data表结构修复完成！');
    
  } catch (error) {
    console.error('修复ai_data表失败:', error);
  }
}

// 运行修复
fixAiDataTable();
