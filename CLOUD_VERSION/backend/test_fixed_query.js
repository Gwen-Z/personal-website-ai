import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function testFixedQuery() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 测试修复后的查询...');
  
  // 测试字符串查询（修复后的方式）
  const result = await turso.execute(`SELECT COUNT(*) as count FROM notes WHERE notebook_id = 'A1'`);
  console.log('字符串查询结果:', result.rows[0].count);
  
  // 测试获取具体笔记
  const notesResult = await turso.execute(`SELECT * FROM notes WHERE notebook_id = 'A1' ORDER BY created_at DESC LIMIT 50`);
  console.log('笔记数量:', notesResult.rows.length);
  
  notesResult.rows.forEach((note, index) => {
    console.log(`笔记 ${index + 1}:`);
    console.log(`  - note_id: ${note.note_id}`);
    console.log(`  - title: ${note.title}`);
    console.log(`  - notebook_id: ${note.notebook_id}`);
  });
}

testFixedQuery().catch(console.error);
