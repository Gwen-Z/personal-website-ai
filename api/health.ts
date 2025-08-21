import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 添加 CORS 头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // 检查环境变量是否配置
    const hasDatabase = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
    
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Personal Website AI API',
      database: hasDatabase ? 'configured' : 'not configured',
      version: '1.0.0',
      endpoints: [
        'GET /api/health',
        'POST /api/raw-entry',
        'GET /api/simple-records',
        'GET /api/dashboard'
      ]
    });

  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
