import { initDB } from './db.js';

async function checkNote1015() {
  try {
    const db = await initDB();
    console.log('🔍 检查笔记1015的详细信息...\n');
    
    // 1. 检查笔记基本信息
    const noteRows = await db.all('SELECT note_id, title, component_instances, component_data FROM notes WHERE note_id = ?', ['1015']);
    if (noteRows.length === 0) {
      console.log('❌ 笔记1015不存在');
      return;
    }
    
    const note = noteRows[0];
    console.log('📝 笔记基本信息:');
    console.log('  - ID:', note.note_id);
    console.log('  - 标题:', note.title);
    console.log('  - component_instances:', note.component_instances);
    console.log('  - component_data:', note.component_data);
    console.log('');
    
    // 2. 检查笔记本配置
    const notebookRows = await db.all('SELECT notebook_id, name, component_config FROM notebooks WHERE notebook_id = (SELECT notebook_id FROM notes WHERE note_id = ?)', ['1015']);
    if (notebookRows.length > 0) {
      const notebook = notebookRows[0];
      console.log('📚 笔记本配置:');
      console.log('  - ID:', notebook.notebook_id);
      console.log('  - 名称:', notebook.name);
      console.log('  - component_config:', notebook.component_config);
      console.log('');
      
      // 解析笔记本配置
      if (notebook.component_config) {
        try {
          const config = JSON.parse(notebook.component_config);
          console.log('📋 解析后的笔记本配置:');
          console.log('  - componentInstances:', JSON.stringify(config.componentInstances, null, 2));
          console.log('  - analysisComponents:', JSON.stringify(config.analysisComponents, null, 2));
          console.log('');
        } catch (e) {
          console.log('❌ 解析笔记本配置失败:', e.message);
        }
      }
    }
    
    // 3. 解析笔记的组件实例
    if (note.component_instances) {
      try {
        const instances = JSON.parse(note.component_instances);
        console.log('🔧 笔记组件实例:');
        console.log('  - 数量:', instances.length);
        instances.forEach((instance, index) => {
          console.log(`  - [${index}] ${instance.type}: ${instance.title} (ID: ${instance.id})`);
        });
        console.log('');
        
        // 统计组件类型
        const typeCount = {};
        instances.forEach(instance => {
          typeCount[instance.type] = (typeCount[instance.type] || 0) + 1;
        });
        console.log('📊 组件类型统计:');
        Object.entries(typeCount).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count}个`);
        });
        console.log('');
        
      } catch (e) {
        console.log('❌ 解析笔记组件实例失败:', e.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  }
}

checkNote1015();
