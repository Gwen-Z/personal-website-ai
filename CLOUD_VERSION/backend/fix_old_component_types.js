import { initDB } from './db.js';
import getDB from './db.js';

async function main() {
  // 初始化数据库连接
  await initDB();
  const client = getDB();

  // 组件类型映射 - 将旧类型映射到新类型
  const componentTypeMapping = {
    'text': 'text-short',
    'select': 'number', // 将select映射为number
    // 其他类型保持不变
  };

  console.log('🔧 开始修复旧的组件类型...');

  try {
    // 1. 获取所有包含component_instances的记录
    const checkQuery = `
      SELECT note_id, component_instances 
      FROM notes 
      WHERE component_instances IS NOT NULL 
      AND component_instances != '[]'
      AND component_instances != 'null'
    `;
    
    const checkResult = await client.execute(checkQuery);
    console.log(`📊 找到 ${checkResult.rows.length} 条包含组件实例的记录`);

    if (checkResult.rows.length === 0) {
      console.log('✅ 没有发现需要修复的组件实例记录');
      return;
    }

    // 2. 分析并修复组件类型
    let totalUpdated = 0;
    let recordsWithOldTypes = 0;
    
    for (const row of checkResult.rows) {
      const noteId = row.note_id;
      let componentInstances;
      
      try {
        componentInstances = JSON.parse(row.component_instances);
      } catch (e) {
        console.log(`⚠️  跳过记录 ${noteId}，component_instances 不是有效的JSON`);
        continue;
      }
      
      if (!Array.isArray(componentInstances)) {
        console.log(`⚠️  跳过记录 ${noteId}，component_instances 不是数组`);
        continue;
      }
      
      let hasOldTypes = false;
      let updatedInstances = componentInstances.map(instance => {
        if (instance.type && componentTypeMapping[instance.type]) {
          hasOldTypes = true;
          const newType = componentTypeMapping[instance.type];
          console.log(`🔄 记录 ${noteId}: 将组件类型从 '${instance.type}' 更新为 '${newType}'`);
          return { ...instance, type: newType };
        }
        return instance;
      });
      
      if (hasOldTypes) {
        recordsWithOldTypes++;
        const updateQuery = `
          UPDATE notes 
          SET component_instances = ? 
          WHERE note_id = ?
        `;
        
        const updateResult = await client.execute(updateQuery, [JSON.stringify(updatedInstances), noteId]);
        console.log(`✅ 成功更新了记录 ${noteId}`);
        totalUpdated++;
      }
    }

    console.log(`🎉 修复完成！总共更新了 ${totalUpdated} 条记录（共检查了 ${recordsWithOldTypes} 条包含旧类型的记录）`);

    // 3. 验证修复结果
    console.log('\n🔍 验证修复结果...');
    const verifyQuery = `
      SELECT component_instances 
      FROM notes 
      WHERE component_instances IS NOT NULL 
      AND component_instances != '[]'
      AND component_instances != 'null'
    `;
    
    const verifyResult = await client.execute(verifyQuery);
    let typeCounts = {};
    
    verifyResult.rows.forEach(row => {
      try {
        const instances = JSON.parse(row.component_instances);
        if (Array.isArray(instances)) {
          instances.forEach(instance => {
            if (instance.type) {
              typeCounts[instance.type] = (typeCounts[instance.type] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // 忽略解析错误
      }
    });
    
    console.log('📊 修复后的组件类型统计:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count} 个实例`);
    });

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    throw error;
  }
}

// 运行主函数
main().catch(console.error);