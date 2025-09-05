import { createClient } from '@libsql/client';

async function getTursoClient() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
        throw new Error('Missing Turso environment variables');
    }
    return createClient({ url, authToken });
}

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

    try {
        const turso = await getTursoClient();
        const result = await turso.execute(`
            SELECT 
                n.id, 
                n.name, 
                n.created_at, 
                n.updated_at, 
                COUNT(no.id) as note_count
            FROM notebooks n
            LEFT JOIN notes no ON n.id = no.notebook_id
            GROUP BY n.id
            ORDER BY n.created_at ASC
        `);

        const notebooks = result.rows.map(row => {
            const record = {};
            result.columns.forEach((column, index) => {
                record[column] = row[index];
            });
            return record;
        });

        return res.status(200).json({ success: true, notebooks });
    } catch (error) {
        console.error('❌ Error fetching notebooks:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch notebooks', details: error.message });
    }
}
