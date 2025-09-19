import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function fixNotebookId() {
  try {
    console.log('🔧 修复notebooks表的字段名...');
    
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    // 1. 先查看当前notebooks表的数据
    console.log('\n📚 当前notebooks表数据:');
    const currentNotebooks = await turso.execute('SELECT * FROM notebooks');
    console.log('notebooks表记录数:', currentNotebooks.rows.length);
    for (const notebook of currentNotebooks.rows) {
      console.log(`- ID: ${notebook.id}, Name: ${notebook.name}`);
    }

    // 2. 创建新的notebooks表，使用notebook_id字段
    console.log('\n🔨 创建新的notebooks表结构...');
    await turso.execute(`
      CREATE TABLE notebooks_new (
        notebook_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        note_count INTEGER DEFAULT 0
      )
    `);

    // 3. 将数据从旧表复制到新表
    console.log('\n📋 复制数据到新表...');
    for (const notebook of currentNotebooks.rows) {
      await turso.execute(`
        INSERT INTO notebooks_new (notebook_id, name, created_at, updated_at, note_count)
        VALUES (?, ?, ?, ?, ?)
      `, [
        notebook.id,
        notebook.name,
        notebook.created_at,
        notebook.updated_at,
        notebook.note_count || 0
      ]);
    }

    // 4. 删除旧表
    console.log('\n🗑️ 删除旧表...');
    await turso.execute('DROP TABLE notebooks');

    // 5. 重命名新表
    console.log('\n🔄 重命名新表...');
    await turso.execute('ALTER TABLE notebooks_new RENAME TO notebooks');

    // 6. 验证修改结果
    console.log('\n✅ 验证修改结果...');
    const newNotebooks = await turso.execute('SELECT * FROM notebooks');
    console.log('修改后的notebooks表记录数:', newNotebooks.rows.length);
    for (const notebook of newNotebooks.rows) {
      console.log(`- notebook_id: ${notebook.notebook_id}, Name: ${notebook.name}`);
    }

    // 7. 检查notes表的外键关系
    console.log('\n🔗 检查notes表的外键关系...');
    const notesWithNotebooks = await turso.execute(`
      SELECT n.note_id, n.title, n.notebook_id, nb.name as notebook_name
      FROM notes n
      LEFT JOIN notebooks nb ON n.notebook_id = nb.notebook_id
      LIMIT 5
    `);
    console.log('notes与notebooks的关联查询结果:');
    for (const note of notesWithNotebooks.rows) {
      console.log(`- Note: ${note.title} -> Notebook: ${note.notebook_name} (${note.notebook_id})`);
    }

    console.log('\n🎉 修复完成！notebooks表的id字段已成功重命名为notebook_id');

  } catch (error) {
    console.error('❌ 修复失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

fixNotebookId();
