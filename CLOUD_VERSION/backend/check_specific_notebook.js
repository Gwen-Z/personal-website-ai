import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkSpecificNotebook() {
  try {
    const turso = createClient({
      url: 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查特定笔记本...');
    
    // 先检查所有笔记本
    const allNotebooks = await turso.execute('SELECT notebook_id, name FROM notebooks');
    console.log('所有笔记本:');
    allNotebooks.rows.forEach((notebook, i) => {
      console.log(`  ${i + 1}. ${notebook.name} (${notebook.notebook_id})`);
    });
    
    // 查找包含"旅游"的笔记本
    console.log('\n查找包含"旅游"的笔记本:');
    const travelNotebooks = await turso.execute("SELECT notebook_id, name FROM notebooks WHERE name LIKE '%旅游%'");
    console.log(`找到 ${travelNotebooks.rows.length} 个旅游相关笔记本:`);
    travelNotebooks.rows.forEach((notebook, i) => {
      console.log(`  ${i + 1}. ${notebook.name} (${notebook.notebook_id})`);
    });
    
    // 查找包含"日记"的笔记本
    console.log('\n查找包含"日记"的笔记本:');
    const diaryNotebooks = await turso.execute("SELECT notebook_id, name FROM notebooks WHERE name LIKE '%日记%'");
    console.log(`找到 ${diaryNotebooks.rows.length} 个日记相关笔记本:`);
    diaryNotebooks.rows.forEach((notebook, i) => {
      console.log(`  ${i + 1}. ${notebook.name} (${notebook.notebook_id})`);
    });
    
    // 查找包含mood组件的笔记本
    console.log('\n查找包含mood组件的笔记本:');
    const allNotebooksWithConfig = await turso.execute('SELECT notebook_id, name, component_config FROM notebooks WHERE component_config IS NOT NULL');
    
    for (const notebook of allNotebooksWithConfig.rows) {
      try {
        const config = JSON.parse(notebook.component_config);
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
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkSpecificNotebook();
