export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const hasDbUrl = !!(process.env.DATABASE_URL || process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL);
  const hasDbToken = !!(process.env.DATABASE_TOKEN || process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN);
  const hasAI = !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: hasDbUrl && hasDbToken ? 'configured' : 'not_configured',
    ai: hasAI ? 'configured' : 'not_configured',
    ai_provider: process.env.AI_PROVIDER || 'openai',
    ai_model: process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || 'not_set',
    envHints: {
      database: !hasDbUrl || !hasDbToken ? ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'] : [],
      ai: !hasAI ? ['OPENAI_API_KEY 或 ANTHROPIC_API_KEY'] : []
    }
  });
}


