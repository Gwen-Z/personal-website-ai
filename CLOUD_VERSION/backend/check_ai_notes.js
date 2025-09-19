import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function checkAINotes() {
  try {
    console.log('🔍 检查AI笔记本的笔记...');
    
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    // 查询AI笔记本的笔记
    console.log('\n📝 查询AI笔记本(A1)的笔记:');
    const notesResult = await turso.execute('SELECT * FROM notes WHERE notebook_id = ?', ['A1']);
    console.log('AI笔记本笔记数量:', notesResult.rows.length);
    
    for (let i = 0; i < notesResult.rows.length; i++) {
      const note = notesResult.rows[i];
      console.log(`\n笔记 ${i + 1}:`);
      console.log(`- note_id: "${note.note_id}"`);
      console.log(`- notebook_id: "${note.notebook_id}"`);
      console.log(`- title: "${note.title}"`);
      console.log(`- content_text: "${note.content_text ? note.content_text.substring(0, 100) + '...' : 'null'}"`);
      console.log(`- created_at: "${note.created_at}"`);
    }

    // 检查所有笔记的notebook_id分布
    console.log('\n📊 所有笔记的notebook_id分布:');
    const allNotesResult = await turso.execute('SELECT notebook_id, COUNT(*) as count FROM notes GROUP BY notebook_id');
    for (const row of allNotesResult.rows) {
      console.log(`- notebook_id: "${row.notebook_id}", 数量: ${row.count}`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    console.error('错误详情:', error.message);
  }
}

checkAINotes();
