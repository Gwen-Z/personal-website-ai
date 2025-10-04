import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function testNotebookConfig() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('🔍 检查笔记本配置中的组件实例...');
    
    const result = await client.execute('SELECT notebook_id, name, component_config FROM notebooks');
    
    for (const notebook of result.rows) {
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
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await client.close();
  }
}

testNotebookConfig();
