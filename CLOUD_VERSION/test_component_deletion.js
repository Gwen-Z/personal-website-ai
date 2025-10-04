const { createClient } = require('./lib/turso-cjs.js');

// 创建数据库连接
const client = createClient({
  url: process.env.DATABASE_URL || 'file:local.db',
  authToken: process.env.DATABASE_AUTH_TOKEN
});

async function testComponentDeletion() {
  try {
    console.log('🔍 检查笔记本配置中的组件实例...');
    
    // 获取所有笔记本
    const notebooks = await client.execute('SELECT notebook_id, name, component_config FROM notebooks');
    
    for (const notebook of notebooks.rows) {
      const { notebook_id, name, component_config } = notebook;
      console.log(`\n📚 笔记本: ${name} (${notebook_id})`);
      
      if (component_config) {
        try {
          const config = JSON.parse(component_config);
          if (config.componentInstances) {
            console.log(`  组件实例数量: ${config.componentInstances.length}`);
            config.componentInstances.forEach((inst, index) => {
              console.log(`    ${index + 1}. ${inst.type} - ${inst.title} (ID: ${inst.id})`);
            });
          } else {
            console.log('  没有组件实例');
          }
        } catch (e) {
          console.log('  配置解析失败:', e.message);
        }
      } else {
        console.log('  没有组件配置');
      }
    }
    
    // 检查特定笔记本的配置
    const testNotebookId = 'notebook_1015'; // 替换为实际的笔记本ID
    console.log(`\n🔍 检查特定笔记本 ${testNotebookId} 的配置...`);
    
    const testNotebook = await client.execute(
      'SELECT notebook_id, name, component_config FROM notebooks WHERE notebook_id = ?',
      [testNotebookId]
    );
    
    if (testNotebook.rows.length > 0) {
      const notebook = testNotebook.rows[0];
      console.log(`📚 笔记本: ${notebook.name} (${notebook.notebook_id})`);
      
      if (notebook.component_config) {
        const config = JSON.parse(notebook.component_config);
        if (config.componentInstances) {
          console.log(`  组件实例数量: ${config.componentInstances.length}`);
          config.componentInstances.forEach((inst, index) => {
            console.log(`    ${index + 1}. ${inst.type} - ${inst.title} (ID: ${inst.id})`);
          });
        }
      }
    } else {
      console.log('  笔记本不存在');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await client.close();
  }
}

testComponentDeletion();
