import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function syncTursoNotes() {
  try {
    // 连接Turso数据库
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查Turso数据库中的笔记本和笔记数据...\n');

    // 获取所有笔记本
    const notebooksResult = await turso.execute('SELECT * FROM notebooks ORDER BY created_at DESC');
    const notebooks = notebooksResult.rows || [];
    
    console.log('📚 笔记本列表:');
    for (const notebook of notebooks) {
      console.log(`- ${notebook.name} (ID: ${notebook.id}, note_count: ${notebook.note_count})`);
    }

    console.log('\n📝 检查每个笔记本的笔记数量...\n');

    // 为每个笔记本更新note_count
    for (const notebook of notebooks) {
      // 获取该笔记本的实际笔记数量
      const notesResult = await turso.execute(
        'SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?',
        [notebook.id]
      );
      const actualCount = notesResult.rows[0].count;

      console.log(`📖 ${notebook.name} (${notebook.id}):`);
      console.log(`   - 记录的note_count: ${notebook.note_count}`);
      console.log(`   - 实际笔记数量: ${actualCount}`);

      // 如果数量不匹配，更新note_count
      if (notebook.note_count !== actualCount) {
        console.log(`   🔄 更新note_count从 ${notebook.note_count} 到 ${actualCount}`);
        await turso.execute(
          'UPDATE notebooks SET note_count = ?, updated_at = ? WHERE id = ?',
          [actualCount, new Date().toISOString(), notebook.id]
        );
        console.log(`   ✅ 已更新`);
      } else {
        console.log(`   ✅ 数量匹配，无需更新`);
      }

      // 显示该笔记本的笔记详情
      if (actualCount > 0) {
        const notesResult = await turso.execute(
          'SELECT id, note_id, title, created_at FROM notes WHERE notebook_id = ? ORDER BY created_at DESC',
          [notebook.id]
        );
        const notes = notesResult.rows || [];
        console.log(`   📄 笔记列表:`);
        for (const note of notes) {
          console.log(`     - ${note.title} (ID: ${note.note_id || note.id})`);
        }
      } else {
        console.log(`   📄 无笔记`);
      }
      console.log('');
    }

    console.log('🎉 同步完成！');

  } catch (error) {
    console.error('❌ 同步失败:', error);
  }
}

syncTursoNotes();
