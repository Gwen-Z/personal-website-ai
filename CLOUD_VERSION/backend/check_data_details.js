import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function checkDataDetails() {
  try {
    console.log('🔍 检查notebooks表数据详情...');
    
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    // 检查notebooks表的详细数据
    console.log('\n📚 notebooks表详细数据:');
    const notebooksResult = await turso.execute('SELECT * FROM notebooks');
    console.log('notebooks表记录数:', notebooksResult.rows.length);
    
    for (let i = 0; i < notebooksResult.rows.length; i++) {
      const notebook = notebooksResult.rows[i];
      console.log(`\n记录 ${i + 1}:`);
      console.log(`- id: "${notebook.id}" (类型: ${typeof notebook.id})`);
      console.log(`- name: "${notebook.name}" (类型: ${typeof notebook.name})`);
      console.log(`- created_at: "${notebook.created_at}" (类型: ${typeof notebook.created_at})`);
      console.log(`- updated_at: "${notebook.updated_at}" (类型: ${typeof notebook.updated_at})`);
      console.log(`- note_count: ${notebook.note_count} (类型: ${typeof notebook.note_count})`);
      
      // 检查是否有null值
      if (notebook.name === null || notebook.name === undefined) {
        console.log('⚠️  发现name字段为null!');
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error('错误详情:', error.message);
  }
}

checkDataDetails();
