import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function checkChars() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 检查notebook_id字段的字符...');
  
  // 获取所有笔记的notebook_id
  const result = await turso.execute('SELECT note_id, notebook_id, LENGTH(notebook_id) as len FROM notes');
  
  console.log('所有笔记的notebook_id:');
  result.rows.forEach((row, index) => {
    console.log(`${index + 1}. note_id: ${row.note_id}`);
    console.log(`   notebook_id: "${row.notebook_id}"`);
    console.log(`   长度: ${row.len}`);
    console.log(`   字符码: ${Array.from(row.notebook_id).map(c => c.charCodeAt(0)).join(', ')}`);
    console.log(`   十六进制: ${Array.from(row.notebook_id).map(c => c.charCodeAt(0).toString(16)).join(' ')}`);
    console.log('');
  });
}

checkChars().catch(console.error);
