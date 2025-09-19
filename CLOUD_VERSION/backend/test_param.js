import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function testParam() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 测试参数化查询...');
  
  // 测试不同的参数类型
  const testCases = [
    { name: '字符串 "A1"', value: 'A1' },
    { name: '字符串 A1', value: 'A1' },
    { name: '数字 1', value: 1 },
    { name: '布尔值 true', value: true },
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n测试: ${testCase.name}`);
      const result = await turso.execute('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', [testCase.value]);
      console.log(`结果: ${result.rows[0].count} 条记录`);
    } catch (error) {
      console.log(`错误: ${error.message}`);
    }
  }
  
  // 测试LIKE查询
  console.log('\n测试LIKE查询:');
  const likeResult = await turso.execute('SELECT COUNT(*) as count FROM notes WHERE notebook_id LIKE ?', ['A1']);
  console.log(`LIKE查询结果: ${likeResult.rows[0].count} 条记录`);
  
  // 测试IN查询
  console.log('\n测试IN查询:');
  const inResult = await turso.execute('SELECT COUNT(*) as count FROM notes WHERE notebook_id IN (?)', ['A1']);
  console.log(`IN查询结果: ${inResult.rows[0].count} 条记录`);
}

testParam().catch(console.error);
