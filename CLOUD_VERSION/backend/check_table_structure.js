import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkTableStructure() {
  try {
    const turso = createClient({
      url: 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查表结构...');
    
    // 检查notebook表结构
    console.log('\n📋 notebook表结构:');
    const notebookSchema = await turso.execute('PRAGMA table_info(notebooks)');
    notebookSchema.rows.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 检查notes表结构
    console.log('\n📋 notes表结构:');
    const notesSchema = await turso.execute('PRAGMA table_info(notes)');
    notesSchema.rows.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 检查notebook表中的数据
    console.log('\n📋 notebook表数据:');
    const notebookData = await turso.execute('SELECT * FROM notebooks WHERE notebook_id = "AMG0D4V059U2TT"');
    
    if (notebookData.rows.length > 0) {
      const notebook = notebookData.rows[0];
      console.log('  找到笔记本数据:');
      Object.keys(notebook).forEach(key => {
        const value = notebook[key];
        if (typeof value === 'string' && value.length > 100) {
          console.log(`    ${key}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`    ${key}: ${value}`);
        }
      });
    } else {
      console.log('  ❌ 未找到笔记本数据');
    }
    
    // 检查notes表中的数据
    console.log('\n📋 notes表数据:');
    const notesData = await turso.execute('SELECT * FROM notes WHERE note_id = 1017');
    
    if (notesData.rows.length > 0) {
      const note = notesData.rows[0];
      console.log('  找到笔记数据:');
      Object.keys(note).forEach(key => {
        const value = note[key];
        if (typeof value === 'string' && value.length > 100) {
          console.log(`    ${key}: ${value.substring(0, 100)}...`);
        } else {
          console.log(`    ${key}: ${value}`);
        }
      });
    } else {
      console.log('  ❌ 未找到笔记数据');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkTableStructure();