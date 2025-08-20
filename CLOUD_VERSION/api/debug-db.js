// 调试数据库连接的API
export default async function handler(req, res) {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 检查环境变量
    const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_TOKEN || process.env.TURSO_TOKEN;
    
    console.log('环境变量检查:');
    console.log('TURSO_DATABASE_URL:', dbUrl ? '✅ 存在' : '❌ 缺失');
    console.log('TURSO_AUTH_TOKEN:', authToken ? '✅ 存在' : '❌ 缺失');
    
    if (!dbUrl || !authToken) {
      return res.status(500).json({
        error: '环境变量缺失',
        missing: {
          dbUrl: !dbUrl,
          authToken: !authToken
        },
        available_vars: Object.keys(process.env).filter(key => 
          key.includes('TURSO') || key.includes('DATABASE')
        )
      });
    }

    // 尝试导入和使用 libsql
    const { createClient } = await import('@libsql/client');
    
    console.log('创建数据库客户端...');
    const client = createClient({
      url: dbUrl,
      authToken: authToken
    });

    console.log('测试数据库连接...');
    
    // 简单的测试查询
    const result = await client.execute('SELECT 1 as test');
    
    console.log('数据库连接成功！');
    
    // 检查表是否存在
    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const tables = tablesResult.rows.map(row => row.name);
    
    return res.status(200).json({
      success: true,
      message: '数据库连接正常',
      test_query: result.rows,
      tables: tables,
      db_info: {
        url_length: dbUrl.length,
        token_length: authToken.length
      }
    });

  } catch (error) {
    console.error('数据库调试失败:', error);
    
    return res.status(500).json({
      error: '数据库连接失败',
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
  }
}
