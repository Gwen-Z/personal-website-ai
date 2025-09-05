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

    const { notebook_id } = req.query;

    if (!notebook_id) {
        return res.status(400).json({ error: 'notebook_id is required' });
    }

    try {
        const turso = await getTursoClient();
        
        // First, get notebook details, including the note count
        const notebookResult = await turso.execute({
            sql: `
                SELECT 
                    n.id, 
                    n.name, 
                    n.created_at, 
                    n.updated_at,
                    (SELECT COUNT(*) FROM notes WHERE notebook_id = n.id) as note_count
                FROM notebooks n 
                WHERE n.id = ?
            `,
            args: [notebook_id]
        });

        if (notebookResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notebook not found' });
        }
        
        const notebook = {};
        notebookResult.columns.forEach((col, i) => notebook[col] = notebookResult.rows[0][i]);

        // Then, get notes for that notebook
        const notesResult = await turso.execute({
            sql: "SELECT * FROM notes WHERE notebook_id = ? ORDER BY created_at DESC",
            args: [notebook_id]
        });

        const notes = notesResult.rows.map(row => {
            const record = {};
            notesResult.columns.forEach((column, index) => {
                record[column] = row[index];
            });
            return record;
        });

        return res.status(200).json({ success: true, notebook, notes });
    } catch (error) {
        console.error(`❌ Error fetching notes for notebook ${notebook_id}:`, error);
        return res.status(500).json({ success: false, error: 'Failed to fetch notes', details: error.message });
    }
}
