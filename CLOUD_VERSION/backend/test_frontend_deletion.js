import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function testFrontendDeletion() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log('🔍 测试前端删除功能...');
    
    // 1. 获取当前笔记本配置
    const result = await client.execute('SELECT notebook_id, name, component_config FROM notebooks WHERE notebook_id = "AMFYY6M0KBNM0E"');
    
    if (result.rows.length === 0) {
      console.log('❌ 找不到测试笔记本');
      return;
    }
    
    const notebook = result.rows[0];
    console.log(`\n📚 笔记本: ${notebook.name} (${notebook.notebook_id})`);
    
    if (!notebook.component_config) {
      console.log('❌ 笔记本没有组件配置');
      return;
    }
    
    const config = JSON.parse(notebook.component_config);
    console.log(`\n🔧 当前组件实例数量: ${config.componentInstances?.length || 0}`);
    
    if (config.componentInstances) {
      config.componentInstances.forEach((inst, index) => {
        console.log(`  ${index + 1}. ${inst.type} - ${inst.title} (ID: ${inst.id})`);
      });
    }
    
    // 2. 模拟前端删除请求 - 删除第二个组件
    if (config.componentInstances && config.componentInstances.length > 1) {
      const componentToRemove = config.componentInstances[1]; // 删除第二个组件
      console.log(`\n🗑️  模拟删除组件: ${componentToRemove.type} - ${componentToRemove.title} (ID: ${componentToRemove.id})`);
      
      // 从数组中移除指定组件
      const newInstances = config.componentInstances.filter(inst => inst.id !== componentToRemove.id);
      console.log(`\n✅ 删除后剩余组件数量: ${newInstances.length}`);
      
      // 3. 构建新的配置（模拟前端请求）
      const updatedConfig = {
        componentInstances: newInstances
      };
      
      // 4. 模拟前端API调用
      console.log('\n🌐 模拟前端API调用...');
      const configJson = JSON.stringify(updatedConfig);
      const escapedConfigJson = configJson.replace(/'/g, "''");
      const updateQuery = `UPDATE notebooks SET component_config = '${escapedConfigJson}', updated_at = '${new Date().toISOString()}' WHERE notebook_id = '${notebook.notebook_id}'`;
      
      console.log('💾 执行更新查询...');
      await client.execute(updateQuery);
      
      // 5. 验证更新结果
      const verifyResult = await client.execute('SELECT component_config FROM notebooks WHERE notebook_id = ?', [notebook.notebook_id]);
      const verifiedConfig = JSON.parse(verifyResult.rows[0].component_config);
      
      console.log(`\n✅ 验证结果 - 更新后组件实例数量: ${verifiedConfig.componentInstances?.length || 0}`);
      if (verifiedConfig.componentInstances) {
        verifiedConfig.componentInstances.forEach((inst, index) => {
          console.log(`  ${index + 1}. ${inst.type} - ${inst.title} (ID: ${inst.id})`);
        });
      }
      
      // 6. 检查是否还有被删除的组件
      const deletedComponentStillExists = verifiedConfig.componentInstances?.some(inst => inst.id === componentToRemove.id);
      if (deletedComponentStillExists) {
        console.log('❌ 错误：被删除的组件仍然存在！');
      } else {
        console.log('✅ 成功：被删除的组件已正确移除！');
      }
      
      console.log('\n🎉 前端删除功能测试完成！');
    } else {
      console.log('❌ 没有足够的组件实例进行删除测试');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await client.close();
  }
}

testFrontendDeletion();
