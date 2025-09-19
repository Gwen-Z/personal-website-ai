import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config();

async function debugLibsql() {
  const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log('🔍 调试libsql查询...');
  console.log('数据库URL:', process.env.TURSO_DATABASE_URL);
  
  // 1. 测试基本连接
  try {
    const testResult = await turso.execute('SELECT 1 as test');
    console.log('✅ 数据库连接正常:', testResult.rows[0].test);
  } catch (error) {
    console.log('❌ 数据库连接失败:', error.message);
    return;
  }
  
  // 2. 测试不同的查询方式
  console.log('\n📝 测试查询方式:');
  
  // 方式1: 使用execute方法
  try {
    const result1 = await turso.execute('SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', ['A1']);
    console.log('execute方法 - 参数化查询:', result1.rows[0].count);
  } catch (error) {
    console.log('execute方法错误:', error.message);
  }
  
  // 方式2: 使用execute方法 - 字符串查询
  try {
    const result2 = await turso.execute("SELECT COUNT(*) as count FROM notes WHERE notebook_id = 'A1'");
    console.log('execute方法 - 字符串查询:', result2.rows[0].count);
  } catch (error) {
    console.log('execute方法字符串查询错误:', error.message);
  }
  
  // 方式3: 使用batch方法
  try {
    const batch = await turso.batch([
      { sql: 'SELECT COUNT(*) as count FROM notes WHERE notebook_id = ?', args: ['A1'] }
    ]);
    console.log('batch方法 - 参数化查询:', batch[0].rows[0].count);
  } catch (error) {
    console.log('batch方法错误:', error.message);
  }
  
  // 方式4: 检查数据类型
  try {
    const typeResult = await turso.execute('SELECT notebook_id, TYPEOF(notebook_id) as type FROM notes LIMIT 1');
    console.log('数据类型检查:', typeResult.rows[0]);
  } catch (error) {
    console.log('数据类型检查错误:', error.message);
  }
}

debugLibsql().catch(console.error);
