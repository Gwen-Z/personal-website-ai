import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

console.log('🔍 开始调试...');
console.log('环境变量检查:');
console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '已设置' : '未设置');
console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '已设置' : '未设置');

async function simpleDebug() {
  try {
    console.log('\n📡 连接数据库...');
    
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('✅ 数据库连接成功');

    // 检查notes表
    console.log('\n📝 检查notes表...');
    const notesResult = await turso.execute('SELECT COUNT(*) as count FROM notes');
    console.log('notes表记录数:', notesResult.rows[0].count);

    // 检查notebooks表
    console.log('\n📚 检查notebooks表...');
    const notebooksResult = await turso.execute('SELECT COUNT(*) as count FROM notebooks');
    console.log('notebooks表记录数:', notebooksResult.rows[0].count);

    // 获取所有笔记
    console.log('\n📋 所有笔记详情:');
    const allNotesResult = await turso.execute('SELECT id, title, notebook_id, note_id FROM notes ORDER BY created_at DESC');
    console.log('笔记总数:', allNotesResult.rows.length);
    
    for (const note of allNotesResult.rows) {
      console.log(`- ID: ${note.id}, Title: ${note.title}, notebook_id: ${note.notebook_id}, note_id: ${note.note_id}`);
    }

    // 获取所有笔记本
    console.log('\n📖 所有笔记本详情:');
    const allNotebooksResult = await turso.execute('SELECT id, name, note_count FROM notebooks ORDER BY created_at DESC');
    console.log('笔记本总数:', allNotebooksResult.rows.length);
    
    for (const notebook of allNotebooksResult.rows) {
      console.log(`- ID: ${notebook.id}, Name: ${notebook.name}, note_count: ${notebook.note_count}`);
    }

    // 检查A1笔记本的笔记
    console.log('\n🔍 检查A1笔记本的笔记:');
    const a1NotesResult = await turso.execute('SELECT * FROM notes WHERE notebook_id = ?', ['A1']);
    console.log('A1笔记本的笔记数量:', a1NotesResult.rows.length);
    
    for (const note of a1NotesResult.rows) {
      console.log(`- ${note.title} (ID: ${note.id})`);
    }

  } catch (error) {
    console.error('❌ 调试失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

simpleDebug();
