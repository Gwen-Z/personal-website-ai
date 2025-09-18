import { createClient } from '@libsql/client';

async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

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
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    const turso = await getTursoClient();
    
    // Get note details
    const noteRes = await turso.execute({ 
      sql: `SELECT * FROM notes WHERE note_id = ?`, 
      args: [id] 
    });
    
    if (noteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = {};
    noteRes.columns.forEach((col, i) => {
      note[col] = noteRes.rows[0][i];
    });

    // Get note details (rich content)
    const detailRes = await turso.execute({ 
      sql: `SELECT * FROM note_details WHERE note_id = ? ORDER BY created_at DESC LIMIT 1`, 
      args: [id] 
    });
    
    let detail = null;
    if (detailRes.rows.length > 0) {
      detail = {};
      detailRes.columns.forEach((col, i) => {
        detail[col] = detailRes.rows[0][i];
      });
    }

    // Get notebook information
    const notebookRes = await turso.execute({
      sql: `SELECT * FROM notebooks WHERE id = ?`,
      args: [note.notebook_id]
    });

    let notebook = null;
    if (notebookRes.rows.length > 0) {
      notebook = {};
      notebookRes.columns.forEach((col, i) => {
        notebook[col] = notebookRes.rows[0][i];
      });
    }

    // Merge note data with detail data
    const enrichedNote = {
      ...note,
      content_text: detail?.content_text || note.content_text || note.content,
      images: detail?.images_json ? JSON.parse(detail.images_json) : (note.images ? JSON.parse(note.images) : []),
      image_urls: note.image_urls || null, // 确保image_urls字段被包含
      source_url: detail?.source_url || note.source_url || '',
      source: detail?.source || note.source || '',
      original_url: detail?.original_url || note.original_url || '',
      author: detail?.author || note.author || '',
      upload_time: detail?.upload_time || note.upload_time || ''
    };

    res.status(200).json({
      success: true,
      note: enrichedNote,
      notebook: notebook
    });

  } catch (error) {
    console.error('Error fetching note detail:', error);
    res.status(500).json({ error: 'Failed to fetch note detail' });
  }
}
