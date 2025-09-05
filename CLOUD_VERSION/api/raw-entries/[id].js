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
      // 更新记录
      const {
        date,
        mood_text,
        fitness_text,
        study_text,
        work_text,
        inspiration_text
      } = req.body;

      const updateSql = `
        UPDATE raw_entries 
        SET 
          date = ?,
          mood_text = ?,
          fitness_text = ?,
          study_text = ?,
          work_text = ?,
          inspiration_text = ?
        WHERE id = ?
      `;

      const params = [
        date,
        mood_text || null,
        fitness_text || null,
        study_text || null,
        work_text || null,
        inspiration_text || null,
        id
      ];

      await query(updateSql, params);
      
      // 同步 simple_records（按日期）
      if (date) {
        await query(
          `UPDATE simple_records SET 
            mood_description = COALESCE(?, mood_description),
            life_description = COALESCE(?, life_description),
            study_description = COALESCE(?, study_description),
            work_description = COALESCE(?, work_description),
            inspiration_description = COALESCE(?, inspiration_description)
           WHERE date = ?`,
          [mood_text || null, fitness_text || null, study_text || null, work_text || null, inspiration_text || null, date]
        );
      }

      console.log(`✅ 更新原始记录 ID: ${id}（含 simple_records 同步）`);
      
      return res.status(200).json({ 
        success: true, 
        message: '原始记录更新成功',
        id: parseInt(id)
      });

    } else if (req.method === 'DELETE') {
      // 删除前取出日期
      const sel = await query('SELECT date FROM raw_entries WHERE id = ?', [id]);
      let recDate = null;
      if (sel.rows && sel.rows[0]) {
        const columns = sel.columns; const row = sel.rows[0];
        const obj = {}; columns.forEach((c, i) => obj[c] = row[i]);
        recDate = obj.date || null;
      }
      // 删除 raw_entries
      await query('DELETE FROM raw_entries WHERE id = ?', [id]);
      // 同步删除 simple_records（按日期）
      if (recDate) {
        await query('DELETE FROM simple_records WHERE date = ?', [recDate]);
      }
      console.log(`✅ 删除原始记录 ID: ${id}，并同步删除 simple_records 日期=${recDate || 'N/A'}`);
      
      return res.status(200).json({ 
        success: true, 
        message: '原始记录删除成功',
        id: parseInt(id)
      });

    } else if (req.method === 'GET') {
      // 获取单个记录
      const selectSql = 'SELECT * FROM raw_entries WHERE id = ?';
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
    console.error(`❌ 操作原始记录失败 (ID: ${id}):`, error);
    return res.status(500).json({
      error: '操作失败',
      message: error.message
    });
  }
}
