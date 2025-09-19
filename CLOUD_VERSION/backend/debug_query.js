import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function debugQuery() {
  try {
    console.log('🔍 调试查询问题...');
    
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    // 1. 查询所有笔记
    console.log('\n📝 查询所有笔记:');
    const allNotesResult = await turso.execute('SELECT note_id, notebook_id, title FROM notes');
    console.log('总笔记数量:', allNotesResult.rows.length);
    
    for (let i = 0; i < allNotesResult.rows.length; i++) {
      const note = allNotesResult.rows[i];
      console.log(`笔记 ${i + 1}: note_id="${note.note_id}", notebook_id="${note.notebook_id}", title="${note.title}"`);
    }

    // 2. 查询AI笔记本的笔记 - 使用不同的查询方式
    console.log('\n📝 查询AI笔记本(A1)的笔记 - 方式1:');
    const notesResult1 = await turso.execute('SELECT * FROM notes WHERE notebook_id = ?', ['A1']);
    console.log('方式1结果数量:', notesResult1.rows.length);

    console.log('\n📝 查询AI笔记本(A1)的笔记 - 方式2:');
    const notesResult2 = await turso.execute("SELECT * FROM notes WHERE notebook_id = 'A1'");
    console.log('方式2结果数量:', notesResult2.rows.length);

    console.log('\n📝 查询AI笔记本(A1)的笔记 - 方式3:');
    const notesResult3 = await turso.execute('SELECT * FROM notes WHERE notebook_id LIKE ?', ['A1']);
    console.log('方式3结果数量:', notesResult3.rows.length);

    // 3. 检查notebook_id字段的具体值
    console.log('\n📊 检查notebook_id字段的具体值:');
    const notebookIdsResult = await turso.execute('SELECT DISTINCT notebook_id FROM notes');
    console.log('所有notebook_id值:');
    for (const row of notebookIdsResult.rows) {
      console.log(`- "${row.notebook_id}" (长度: ${row.notebook_id ? row.notebook_id.length : 0})`);
    }

    // 4. 检查是否有隐藏字符
    console.log('\n🔍 检查是否有隐藏字符:');
    const hiddenCharsResult = await turso.execute('SELECT notebook_id, LENGTH(notebook_id) as len, HEX(notebook_id) as hex FROM notes WHERE notebook_id LIKE "%A1%"');
    for (const row of hiddenCharsResult.rows) {
      console.log(`notebook_id: "${row.notebook_id}", 长度: ${row.len}, 十六进制: ${row.hex}`);
    }

  } catch (error) {
    console.error('❌ 调试失败:', error);
    console.error('错误详情:', error.message);
  }
}

debugQuery();
