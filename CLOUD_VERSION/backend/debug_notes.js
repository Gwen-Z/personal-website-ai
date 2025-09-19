import { initDB } from './db.js';

async function debugNotes() {
  const db = await initDB();
  
  try {
    console.log('🔍 调试笔记数据...');
    
    // 查询A1笔记本的所有笔记
    console.log('\n📝 查询A1笔记本的笔记:');
    const notes = await db.all('SELECT * FROM notes WHERE notebook_id = ?', ['A1']);
    console.log(`找到 ${notes.length} 条笔记:`);
    notes.forEach((note, index) => {
      console.log(`${index + 1}. ID: ${note.note_id}, 标题: ${note.title}, 创建时间: ${note.created_at}`);
    });
    
    // 查询所有笔记的notebook_id
    console.log('\n📚 查询所有笔记的notebook_id:');
    const allNotes = await db.all('SELECT note_id, notebook_id, title FROM notes ORDER BY created_at DESC LIMIT 10');
    allNotes.forEach((note, index) => {
      console.log(`${index + 1}. ID: ${note.note_id}, 笔记本ID: ${note.notebook_id}, 标题: ${note.title}`);
    });
    
    // 查询notebooks表
    console.log('\n📖 查询notebooks表:');
    const notebooks = await db.all('SELECT notebook_id, name, note_count FROM notebooks');
    notebooks.forEach((notebook, index) => {
      console.log(`${index + 1}. ID: ${notebook.notebook_id}, 名称: ${notebook.name}, 笔记数量: ${notebook.note_count}`);
    });
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
  } finally {
    if (db && typeof db.close === 'function') {
      await db.close();
    }
  }
}

debugNotes();