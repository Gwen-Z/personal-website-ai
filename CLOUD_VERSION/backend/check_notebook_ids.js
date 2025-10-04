import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkNotebookIds() {
  try {
    const turso = createClient({
      url: 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查所有笔记本ID...');
    
    const notebooks = await turso.execute('SELECT notebook_id, name FROM notebooks');
    
    console.log(`📋 找到 ${notebooks.rows.length} 个笔记本:`);
    notebooks.rows.forEach((notebook, i) => {
      console.log(`  ${i + 1}. ${notebook.name} (${notebook.notebook_id})`);
    });
    
    // 查找包含mood的笔记本
    console.log('\n🔍 查找包含mood组件的笔记本...');
    for (const notebook of notebooks.rows) {
      const configResult = await turso.execute(
        'SELECT component_config FROM notebooks WHERE notebook_id = ?',
        [notebook.notebook_id]
      );
      
      if (configResult.rows.length > 0 && configResult.rows[0].component_config) {
        try {
          const config = JSON.parse(configResult.rows[0].component_config);
          const moodComponents = config.componentInstances?.filter(inst => 
            inst.type === 'mood' || inst.title === '测试标题修改'
          ) || [];
          
          if (moodComponents.length > 0) {
            console.log(`  🚨 ${notebook.name} (${notebook.notebook_id}) 包含mood组件:`);
            moodComponents.forEach(comp => {
              console.log(`    - ${comp.title} (${comp.type})`);
            });
          }
        } catch (error) {
          console.log(`  ❌ ${notebook.name} 配置解析失败: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkNotebookIds();
