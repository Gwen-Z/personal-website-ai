import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dbUrl = process.env.TURSO_DATABASE_URL;
    const dbToken = process.env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      return res.status(500).json({
        error: '数据库环境变量未配置',
        hasUrl: !!dbUrl,
        hasToken: !!dbToken
      });
    }

    console.log('数据库连接测试...');
    console.log('URL:', dbUrl.substring(0, 30) + '...');
    console.log('Token:', dbToken.substring(0, 10) + '...');

    const turso = createClient({
      url: dbUrl,
      authToken: dbToken,
    });

    // 测试连接
    const testResult = await turso.execute('SELECT 1 as test');
    console.log('连接测试成功:', testResult);

    // 检查表结构
    const tablesResult = await turso.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%entries%'
    `);
    
    const tables = tablesResult.rows.map(row => row[0]);
    console.log('找到的表:', tables);

    // 如果有 raw_entries 表，查看数据
    let rawEntriesData = [];
    let rawEntriesCount = 0;
    if (tables.includes('raw_entries')) {
      const countResult = await turso.execute('SELECT COUNT(*) as count FROM raw_entries');
      rawEntriesCount = countResult.rows[0][0];
      
      if (rawEntriesCount > 0) {
        const dataResult = await turso.execute('SELECT * FROM raw_entries LIMIT 3');
        rawEntriesData = dataResult.rows.map(row => {
          const record = {};
          dataResult.columns.forEach((column, index) => {
            record[column] = row[index];
          });
          return record;
        });
      }
    }

    return res.status(200).json({
      success: true,
      connection: 'ok',
      tables: tables,
      raw_entries_count: rawEntriesCount,
      sample_data: rawEntriesData,
      config: {
        hasUrl: !!dbUrl,
        hasToken: !!dbToken,
        urlPrefix: dbUrl.substring(0, 30) + '...',
        tokenPrefix: dbToken.substring(0, 10) + '...'
      }
    });

  } catch (error) {
    console.error('数据库测试失败:', error);
    return res.status(500).json({
      error: '数据库测试失败',
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
  }
}
