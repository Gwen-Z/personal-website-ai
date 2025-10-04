import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

// 创建数据库连接
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// 组件类型映射 - 将旧类型映射到新类型
const componentTypeMapping = {
  'text': 'text-short',
  'select': 'number', // 将select映射为number
  // 其他类型保持不变
};

async function fixOldComponentTypes() {
  try {
    console.log('开始修复旧的组件类型...');
    
    // 获取所有笔记本
    const notebooks = await client.execute('SELECT notebook_id, name, component_config FROM notebooks');
    
    for (const notebook of notebooks.rows) {
      const notebookId = notebook.notebook_id;
      const name = notebook.name;
      let componentConfig = notebook.component_config;
      
      if (!componentConfig) {
        console.log(`笔记本 ${name} (${notebookId}) 没有组件配置，跳过`);
        continue;
      }
      
      let needsUpdate = false;
      
      // 解析组件配置
      if (typeof componentConfig === 'string') {
        componentConfig = JSON.parse(componentConfig);
      }
      
      // 修复componentInstances中的组件类型
      if (componentConfig.componentInstances && Array.isArray(componentConfig.componentInstances)) {
        for (const instance of componentConfig.componentInstances) {
          if (componentTypeMapping[instance.type]) {
            console.log(`修复组件类型: ${instance.type} -> ${componentTypeMapping[instance.type]}`);
            instance.type = componentTypeMapping[instance.type];
            needsUpdate = true;
          }
        }
      }
      
      // 修复recordComponents数组
      if (componentConfig.recordComponents && Array.isArray(componentConfig.recordComponents)) {
        const newRecordComponents = componentConfig.recordComponents.map(type => 
          componentTypeMapping[type] || type
        );
        if (JSON.stringify(newRecordComponents) !== JSON.stringify(componentConfig.recordComponents)) {
          console.log(`修复recordComponents: ${componentConfig.recordComponents} -> ${newRecordComponents}`);
          componentConfig.recordComponents = newRecordComponents;
          needsUpdate = true;
        }
      }
      
      // 修复analysisComponents数组
      if (componentConfig.analysisComponents && Array.isArray(componentConfig.analysisComponents)) {
        const newAnalysisComponents = componentConfig.analysisComponents.map(type => 
          componentTypeMapping[type] || type
        );
        if (JSON.stringify(newAnalysisComponents) !== JSON.stringify(componentConfig.analysisComponents)) {
          console.log(`修复analysisComponents: ${componentConfig.analysisComponents} -> ${newAnalysisComponents}`);
          componentConfig.analysisComponents = newAnalysisComponents;
          needsUpdate = true;
        }
      }
      
      // 如果需要更新，保存到数据库
      if (needsUpdate) {
        await client.execute({
          sql: 'UPDATE notebooks SET component_config = ? WHERE notebook_id = ?',
          args: [JSON.stringify(componentConfig), notebookId]
        });
        console.log(`✅ 已更新笔记本 ${name} (${notebookId}) 的组件配置`);
      } else {
        console.log(`✅ 笔记本 ${name} (${notebookId}) 的组件配置无需修复`);
      }
    }
    
    console.log('✅ 所有笔记本的组件类型修复完成！');
    
  } catch (error) {
    console.error('修复过程中发生错误:', error);
  } finally {
    await client.close();
  }
}

// 运行修复
fixOldComponentTypes();
