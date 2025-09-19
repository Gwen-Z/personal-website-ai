import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function simpleTest() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 简单测试查询...');
  
  // 测试1: 直接查询
  const result1 = await turso.execute('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', ['A1']);
  console.log('测试1 - 参数化查询结果:', result1.rows[0].count);
  
  // 测试2: 字符串查询
  const result2 = await turso.execute("SELECT COUNT(*) as count FROM notes WHERE notebook_id = 'A1'");
  console.log('测试2 - 字符串查询结果:', result2.rows[0].count);
  
  // 测试3: 查看实际数据
  const result3 = await turso.execute('SELECT note_id, notebook_id FROM notes WHERE notebook_id = ?', ['A1']);
  console.log('测试3 - 实际数据:', result3.rows.length, '条记录');
  result3.rows.forEach(row => {
    console.log(`  - note_id: ${row.note_id}, notebook_id: "${row.notebook_id}"`);
  });
}

simpleTest().catch(console.error);
