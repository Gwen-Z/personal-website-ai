import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function checkSchema() {
  try {
    console.log('🔍 检查数据库表结构...');
    
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    // 检查notes表结构
    console.log('\n📝 notes表结构:');
    const notesSchemaResult = await turso.execute('PRAGMA table_info(notes)');
    console.log('notes表字段:');
    for (const column of notesSchemaResult.rows) {
      console.log(`- ${column.name}: ${column.type} (nullable: ${column.notnull === 0})`);
    }

    // 检查notebooks表结构
    console.log('\n📚 notebooks表结构:');
    const notebooksSchemaResult = await turso.execute('PRAGMA table_info(notebooks)');
    console.log('notebooks表字段:');
    for (const column of notebooksSchemaResult.rows) {
      console.log(`- ${column.name}: ${column.type} (nullable: ${column.notnull === 0})`);
    }

    // 检查notes表的所有数据（不指定字段名）
    console.log('\n📋 notes表所有数据:');
    const allNotesResult = await turso.execute('SELECT * FROM notes LIMIT 5');
    console.log('notes表记录数:', allNotesResult.rows.length);
    if (allNotesResult.rows.length > 0) {
      console.log('第一条记录:', allNotesResult.rows[0]);
    }

    // 检查notebooks表的所有数据
    console.log('\n📖 notebooks表所有数据:');
    const allNotebooksResult = await turso.execute('SELECT * FROM notebooks');
    console.log('notebooks表记录数:', allNotebooksResult.rows.length);
    for (const notebook of allNotebooksResult.rows) {
      console.log(`- ${JSON.stringify(notebook)}`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error('错误详情:', error.message);
  }
}

checkSchema();
