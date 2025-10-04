import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkColumnConstraints() {
  try {
    const turso = createClient({
      url: 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查列约束和权限...');
    
    // 检查表结构详细信息
    console.log('\n📋 检查notes表结构...');
    const schemaResult = await turso.execute('PRAGMA table_info(notes)');
    schemaResult.rows.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // 检查是否有触发器
    console.log('\n📋 检查触发器...');
    const triggersResult = await turso.execute('SELECT name, sql FROM sqlite_master WHERE type = "trigger" AND tbl_name = "notes"');
    if (triggersResult.rows.length > 0) {
      triggersResult.rows.forEach(trigger => {
        console.log(`  触发器: ${trigger.name}`);
        console.log(`  SQL: ${trigger.sql}`);
      });
    } else {
      console.log('  无触发器');
    }
    
    // 尝试直接插入测试数据
    console.log('\n📋 尝试直接插入测试数据...');
    try {
      // 先删除测试记录
      await turso.execute('DELETE FROM notes WHERE note_id = 9999');
      
      // 插入新记录
      const insertResult = await turso.execute(`
        INSERT INTO notes (note_id, notebook_id, title, component_instances) 
        VALUES (9999, 'TEST', '测试笔记', ?)
      `, [JSON.stringify({test: "data"})]);
      
      console.log(`✅ 插入成功: ${insertResult.rowsAffected} 行受影响`);
      
      // 验证插入
      const verifyResult = await turso.execute('SELECT component_instances FROM notes WHERE note_id = 9999');
      if (verifyResult.rows.length > 0) {
        const data = verifyResult.rows[0].component_instances;
        console.log(`📋 插入的component_instances: ${data ? '存在' : 'null'}`);
        if (data) {
          console.log(`📋 内容: ${data}`);
        }
      }
      
      // 清理测试数据
      await turso.execute('DELETE FROM notes WHERE note_id = 9999');
      console.log('🧹 测试数据已清理');
      
    } catch (error) {
      console.log(`❌ 插入测试失败: ${error.message}`);
    }
    
    // 尝试更新现有记录的不同列
    console.log('\n📋 尝试更新其他列...');
    try {
      const updateResult = await turso.execute('UPDATE notes SET content_text = "测试内容" WHERE note_id = 1017');
      console.log(`✅ content_text更新成功: ${updateResult.rowsAffected} 行受影响`);
      
      // 验证更新
      const verifyResult = await turso.execute('SELECT content_text FROM notes WHERE note_id = 1017');
      if (verifyResult.rows.length > 0) {
        const content = verifyResult.rows[0].content_text;
        console.log(`📋 更新后的content_text: ${content}`);
      }
    } catch (error) {
      console.log(`❌ content_text更新失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkColumnConstraints();
