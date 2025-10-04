import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkNotesColumns() {
  try {
    const turso = createClient({
      url: 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 检查notes表的列...');
    
    // 检查notes表结构
    const notesSchema = await turso.execute('PRAGMA table_info(notes)');
    console.log('📋 notes表列:');
    notesSchema.rows.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 检查是否有component_config列
    const hasComponentConfig = notesSchema.rows.some(col => col.name === 'component_config');
    console.log(`\n📋 是否有component_config列: ${hasComponentConfig ? '是' : '否'}`);
    
    // 检查note_id-1017的所有列
    console.log('\n📋 note_id-1017的所有列值:');
    const noteResult = await turso.execute('SELECT * FROM notes WHERE note_id = 1017');
    
    if (noteResult.rows.length > 0) {
      const note = noteResult.rows[0];
      Object.keys(note).forEach(key => {
        const value = note[key];
        if (value === null) {
          console.log(`  ${key}: null`);
        } else if (typeof value === 'string' && value.length > 50) {
          console.log(`  ${key}: ${value.substring(0, 50)}...`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
    } else {
      console.log('  ❌ 未找到note_id-1017');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkNotesColumns();
