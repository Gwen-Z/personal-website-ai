import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkNote1017Status() {
  try {
    const turso = createClient({
      url: 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查note_id-1017的状态...');
    
    // 检查notebook表中的数据
    console.log('\n📋 检查notebook表:');
    const notebookResult = await turso.execute('SELECT notebook_id, name, component_data FROM notebooks WHERE notebook_id = "AMG0D4V059U2TT"');
    
    if (notebookResult.rows.length > 0) {
      const notebook = notebookResult.rows[0];
      console.log(`  笔记本ID: ${notebook.notebook_id}`);
      console.log(`  笔记本名称: ${notebook.name}`);
      console.log(`  component_data: ${notebook.component_data ? '存在' : 'null'}`);
      
      if (notebook.component_data) {
        try {
          const componentData = JSON.parse(notebook.component_data);
          console.log('  component_data内容:');
          Object.keys(componentData).forEach(key => {
            const comp = componentData[key];
            console.log(`    ${key}: ${comp.title} (${comp.type}) = "${comp.value}"`);
          });
        } catch (error) {
          console.log(`  ❌ component_data解析失败: ${error.message}`);
        }
      }
    } else {
      console.log('  ❌ 在notebook表中未找到该笔记本');
    }
    
    // 检查notes表中的数据
    console.log('\n📋 检查notes表:');
    const notesResult = await turso.execute('SELECT note_id, notebook_id, component_config FROM notes WHERE note_id = 1017');
    
    if (notesResult.rows.length > 0) {
      const note = notesResult.rows[0];
      console.log(`  笔记ID: ${note.note_id}`);
      console.log(`  笔记本ID: ${note.notebook_id}`);
      console.log(`  component_config: ${note.component_config ? '存在' : 'null'}`);
      
      if (note.component_config) {
        try {
          const componentConfig = JSON.parse(note.component_config);
          console.log('  component_config内容:');
          console.log(`    componentInstances数量: ${componentConfig.componentInstances?.length || 0}`);
          if (componentConfig.componentInstances) {
            componentConfig.componentInstances.forEach((inst, i) => {
              console.log(`      ${i + 1}. ${inst.title} (${inst.type}) = "${inst.content}"`);
            });
          }
        } catch (error) {
          console.log(`  ❌ component_config解析失败: ${error.message}`);
        }
      }
    } else {
      console.log('  ❌ 在notes表中未找到该笔记');
    }
    
    // 检查是否有其他相关笔记
    console.log('\n📋 检查同一笔记本的其他笔记:');
    const allNotesResult = await turso.execute('SELECT note_id, component_config FROM notes WHERE notebook_id = "AMG0D4V059U2TT" ORDER BY note_id');
    
    console.log(`  找到 ${allNotesResult.rows.length} 个笔记:`);
    allNotesResult.rows.forEach(note => {
      console.log(`    笔记${note.note_id}: component_config ${note.component_config ? '存在' : 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkNote1017Status();
