import fs from 'fs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const file = 'backend/mood-rubric.json';

  try {
    if (req.method === 'GET') {
      const txt = fs.readFileSync(file, 'utf8');
      const json = JSON.parse(txt);
      return res.status(200).json({ success: true, rubric: json });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid JSON' });
      }
      fs.writeFileSync(file, JSON.stringify(body, null, 2), 'utf8');
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
