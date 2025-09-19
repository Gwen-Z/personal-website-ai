import { initDB } from './db.js';

async function fixNoteCount() {
  const db = await initDB();
  
  try {
    console.log('🔧 开始修复笔记本笔记数量...');
    
    // 获取所有笔记本
    const notebooks = await db.all('SELECT notebook_id, name FROM notebooks');
    console.log(`📚 找到 ${notebooks.length} 个笔记本`);
    
    for (const notebook of notebooks) {
      // 查询每个笔记本的实际笔记数量
      const countResult = await db.get(
        'SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?',
        [notebook.notebook_id]
      );
      
      const actualCount = countResult.count || 0;
      console.log(`📝 笔记本 ${notebook.name} (${notebook.notebook_id}) 实际笔记数量: ${actualCount}`);
      
      // 更新笔记本的note_count字段
      await db.run(
        'UPDATE notebooks SET note_count = ?, updated_at = ? WHERE notebook_id = ?',
        [actualCount, new Date().toISOString(), notebook.notebook_id]
      );
      
      console.log(`✅ 已更新笔记本 ${notebook.name} 的笔记数量为 ${actualCount}`);
    }
    
    console.log('🎉 所有笔记本的笔记数量已修复完成！');
    
    // 验证修复结果
    console.log('\n📊 验证修复结果:');
    const updatedNotebooks = await db.all('SELECT notebook_id, name, note_count FROM notebooks ORDER BY created_at DESC');
    for (const notebook of updatedNotebooks) {
      console.log(`📚 ${notebook.name} (${notebook.notebook_id}): ${notebook.note_count} 条笔记`);
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  } finally {
    // 关闭数据库连接
    if (db && typeof db.close === 'function') {
      await db.close();
    }
  }
}

fixNoteCount();
