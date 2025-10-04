import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function testComponentSync() {
  try {
    console.log('🔍 测试组件同步逻辑...\n');
    
    // 1. 检查笔记本配置结构
    console.log('📋 1. 检查笔记本配置结构:');
    const notebooksResult = await turso.execute('SELECT notebook_id, name, component_config FROM notebooks WHERE component_config IS NOT NULL LIMIT 3');
    
    for (const notebook of notebooksResult.rows) {
      console.log(`\n笔记本: ${notebook.name} (${notebook.notebook_id})`);
      try {
        const config = JSON.parse(notebook.component_config);
        console.log('  配置结构:');
        console.log(`    - recordComponents: ${config.recordComponents ? config.recordComponents.length : 0} 个`);
        console.log(`    - analysisComponents: ${config.analysisComponents ? config.analysisComponents.length : 0} 个`);
        console.log(`    - componentInstances: ${config.componentInstances ? config.componentInstances.length : 0} 个`);
        
        if (config.componentInstances && config.componentInstances.length > 0) {
          console.log('  组件实例详情:');
          config.componentInstances.forEach((inst, i) => {
            console.log(`    ${i + 1}. ${inst.title} (${inst.type})`);
          });
        }
      } catch (e) {
        console.log(`  ❌ 配置解析失败: ${e.message}`);
      }
    }
    
    // 2. 检查笔记的组件实例
    console.log('\n📝 2. 检查笔记的组件实例:');
    const notesResult = await turso.execute('SELECT note_id, title, component_instances FROM notes WHERE component_instances IS NOT NULL LIMIT 3');
    
    for (const note of notesResult.rows) {
      console.log(`\n笔记: ${note.title} (${note.note_id})`);
      try {
        let componentInstances = JSON.parse(note.component_instances);
        
        // 检查是否被双重编码
        if (typeof componentInstances === 'string') {
          componentInstances = JSON.parse(componentInstances);
        }
        
        if (Array.isArray(componentInstances)) {
          console.log(`  组件实例数量: ${componentInstances.length}`);
          componentInstances.forEach((inst, i) => {
            console.log(`    ${i + 1}. ${inst.title} (${inst.type})`);
          });
        } else {
          console.log('  ❌ 组件实例不是数组格式');
        }
      } catch (e) {
        console.log(`  ❌ 组件实例解析失败: ${e.message}`);
      }
    }
    
    // 3. 检查特定笔记本的笔记
    console.log('\n🔗 3. 检查特定笔记本的笔记:');
    if (notebooksResult.rows.length > 0) {
      const testNotebookId = notebooksResult.rows[0].notebook_id;
      const testNotebookConfig = JSON.parse(notebooksResult.rows[0].component_config);
      
      console.log(`测试笔记本: ${testNotebookId}`);
      console.log(`笔记本组件实例数量: ${testNotebookConfig.componentInstances ? testNotebookConfig.componentInstances.length : 0}`);
      
      const notesInNotebook = await turso.execute('SELECT note_id, title, component_instances FROM notes WHERE notebook_id = ?', [testNotebookId]);
      console.log(`该笔记本下的笔记数量: ${notesInNotebook.rows.length}`);
      
      for (const note of notesInNotebook.rows) {
        console.log(`\n  笔记: ${note.title} (${note.note_id})`);
        if (note.component_instances) {
          try {
            let noteInstances = JSON.parse(note.component_instances);
            if (typeof noteInstances === 'string') {
              noteInstances = JSON.parse(noteInstances);
            }
            console.log(`    笔记组件实例数量: ${Array.isArray(noteInstances) ? noteInstances.length : '非数组'}`);
            
            // 比较组件实例数量
            const notebookInstanceCount = testNotebookConfig.componentInstances ? testNotebookConfig.componentInstances.length : 0;
            const noteInstanceCount = Array.isArray(noteInstances) ? noteInstances.length : 0;
            
            if (notebookInstanceCount === noteInstanceCount) {
              console.log(`    ✅ 组件实例数量一致: ${noteInstanceCount}`);
            } else {
              console.log(`    ❌ 组件实例数量不一致: 笔记本(${notebookInstanceCount}) vs 笔记(${noteInstanceCount})`);
            }
          } catch (e) {
            console.log(`    ❌ 笔记组件实例解析失败: ${e.message}`);
          }
        } else {
          console.log('    ⚠️ 笔记没有组件实例');
        }
      }
    }
    
    console.log('\n✅ 组件同步测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testComponentSync();
