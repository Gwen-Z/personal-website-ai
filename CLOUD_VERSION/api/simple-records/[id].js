import { query } from '../../lib/turso.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      const {
        date,
        mood_description,
        life_description,
        study_description,
        work_description,
        inspiration_description
      } = req.body;

      const updateSql = `
        UPDATE simple_records 
        SET 
          date = ?,
          mood_description = ?,
          life_description = ?,
          study_description = ?,
          work_description = ?,
          inspiration_description = ?
        WHERE id = ?
      `;

      const params = [
        date,
        mood_description || null,
        life_description || null,
        study_description || null,
        work_description || null,
        inspiration_description || null,
        id
      ];

      await query(updateSql, params);
      
      // 同步 raw_entries（按日期）
      if (date) {
        await query(
          `UPDATE raw_entries SET 
            mood_text = COALESCE(?, mood_text),
            life_text = COALESCE(?, life_text),
            study_text = COALESCE(?, study_text),
            work_text = COALESCE(?, work_text),
            inspiration_text = COALESCE(?, inspiration_text)
           WHERE date = ?`,
          [mood_description || null, life_description || null, study_description || null, work_description || null, inspiration_description || null, date]
        );
      }

      console.log(`✅ 更新记录 ID: ${id}（含 raw_entries 同步）`);
      
      return res.status(200).json({ 
        success: true, 
        message: '记录更新成功',
        id: parseInt(id)
      });

    } else if (req.method === 'DELETE') {
      // 先取出日期
      const sel = await query('SELECT date FROM simple_records WHERE id = ?', [id]);
      let recDate = null;
      if (sel.rows && sel.rows[0]) {
        const columns = sel.columns; const row = sel.rows[0];
        const obj = {}; columns.forEach((c, i) => obj[c] = row[i]);
        recDate = obj.date || null;
      }

      await query('DELETE FROM simple_records WHERE id = ?', [id]);
      if (recDate) {
        await query('DELETE FROM raw_entries WHERE date = ?', [recDate]);
      }
      console.log(`✅ 删除记录 ID: ${id}，并同步删除 raw_entries 日期=${recDate || 'N/A'}`);
      
      return res.status(200).json({ 
        success: true, 
        message: '记录删除成功',
        id: parseInt(id)
      });

    } else if (req.method === 'GET') {
      const selectSql = 'SELECT * FROM simple_records WHERE id = ?';
      const result = await query(selectSql, [id]);
      
      if (result.rows && result.rows.length > 0) {
        const columns = result.columns;
        const record = {};
        columns.forEach((col, index) => {
          record[col] = result.rows[0][index];
        });
        
        return res.status(200).json(record);
      } else {
        return res.status(404).json({ error: '记录不存在' });
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error(`❌ 操作记录失败 (ID: ${id}):`, error);
    return res.status(500).json({
      error: '操作失败',
      message: error.message
    });
  }
}
