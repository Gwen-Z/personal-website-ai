import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function debugAINotebook() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 调试AI笔记本笔记...');
  
  // 1. 检查AI笔记本的所有笔记
  console.log('\n1. 查询AI笔记本的所有笔记:');
  const allNotes = await turso.execute(`SELECT * FROM notes WHERE notebook_id = 'A1' ORDER BY created_at DESC`);
  console.log(`找到 ${allNotes.rows.length} 个笔记`);
  
  allNotes.rows.forEach((note, index) => {
    console.log(`\n笔记 ${index + 1}:`);
    console.log(`  - id: ${note.id}`);
    console.log(`  - note_id: ${note.note_id}`);
    console.log(`  - title: ${note.title}`);
    console.log(`  - notebook_id: ${note.notebook_id}`);
    console.log(`  - created_at: ${note.created_at}`);
    console.log(`  - status: ${note.status}`);
  });
  
  // 2. 检查notebooks表中AI笔记本的note_count
  console.log('\n2. 查询notebooks表中AI笔记本信息:');
  const notebookInfo = await turso.execute(`SELECT * FROM notebooks WHERE id = 'A1'`);
  console.log('AI笔记本信息:', notebookInfo.rows[0]);
  
  // 3. 对比金融笔记本
  console.log('\n3. 对比金融笔记本:');
  const financeNotes = await turso.execute(`SELECT * FROM notes WHERE notebook_id = 'A2' ORDER BY created_at DESC LIMIT 3`);
  console.log(`金融笔记本有 ${financeNotes.rows.length} 个笔记`);
  
  // 4. 检查是否有其他notebook_id为A1的笔记
  console.log('\n4. 检查所有包含A1的笔记:');
  const allA1Notes = await turso.execute(`SELECT * FROM notes WHERE notebook_id LIKE '%A1%'`);
  console.log(`包含A1的笔记数量: ${allA1Notes.rows.length}`);
  
  // 5. 检查notes表结构
  console.log('\n5. 检查notes表结构:');
  const tableInfo = await turso.execute(`PRAGMA table_info(notes)`);
  console.log('notes表结构:');
  tableInfo.rows.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });
}

debugAINotebook().catch(console.error);
