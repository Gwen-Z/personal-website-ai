import { createClient } from '@libsql/client';

async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('Missing Turso environment variables');
  return createClient({ url, authToken });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { notebook_id, title, content_text, images, source_url, source, original_url, author, upload_time } = req.body || {};
  if (!notebook_id || (!title && !content_text && (!images || images.length === 0))) {
    return res.status(400).json({ success: false, error: 'notebook_id and some content are required' });
  }

  try {
    const turso = await getTursoClient();

    // Ensure detail table exists to store rich content
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS note_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER,
        content_text TEXT,
        images_json TEXT,
        source_url TEXT,
        source TEXT,
        original_url TEXT,
        author TEXT,
        upload_time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Discover columns of notes table to insert safely
    const colsRes = await turso.execute(`PRAGMA table_info(notes);`);
    const columns = colsRes.rows.map((r) => String(r[1] || r.name));

    const nowTitle = (title && String(title).trim()) || '新建笔记';
    const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
    const safeInsert = [];
    const args = [];

    const tryPut = (col, value) => {
      if (columns.includes(col)) { safeInsert.push(col); args.push(value); }
    };

    tryPut('notebook_id', Number(notebook_id));
    tryPut('title', nowTitle);
    tryPut('image_url', firstImage);
    tryPut('duration_minutes', 0);
    tryPut('status', 'success');
    if (columns.includes('source_url')) tryPut('source_url', source_url || null);
    if (columns.includes('source')) tryPut('source', source || null);
    if (columns.includes('original_url')) tryPut('original_url', original_url || null);
    if (columns.includes('author')) tryPut('author', author || null);
    if (columns.includes('upload_time')) tryPut('upload_time', upload_time || null);

    let noteId = null;
    if (safeInsert.length > 0) {
      const placeholders = safeInsert.map(() => '?').join(',');
      const sql = `INSERT INTO notes (${safeInsert.join(',')}) VALUES (${placeholders});`;
      await turso.execute({ sql, args });
      const idRow = await turso.execute(`SELECT last_insert_rowid() AS id;`);
      const idx = idRow.columns ? idRow.columns.indexOf('id') : 0;
      noteId = idx >= 0 ? idRow.rows[0][idx] : idRow.rows[0][0];
    }

    // Insert details regardless (noteId may be null if notes table is different)
    await turso.execute({
      sql: `INSERT INTO note_details (note_id, content_text, images_json, source_url, source, original_url, author, upload_time) VALUES (?,?,?,?,?,?,?,?)`,
      args: [noteId, content_text || '', JSON.stringify(images || []), source_url || null, source || null, original_url || null, author || null, upload_time || null]
    });

    return res.status(200).json({ success: true, note_id: noteId });
  } catch (error) {
    console.error('❌ Error creating note:', error);
    return res.status(500).json({ success: false, error: 'Failed to create note', details: error.message });
  }
}


