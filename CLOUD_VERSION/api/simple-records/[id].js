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
      console.log(`✅ 更新记录 ID: ${id}`);
      
      return res.status(200).json({ 
        success: true, 
        message: '记录更新成功',
        id: parseInt(id)
      });

    } else if (req.method === 'DELETE') {
      // 删除记录
      const deleteSql = 'DELETE FROM simple_records WHERE id = ?';
      await query(deleteSql, [id]);
      console.log(`✅ 删除记录 ID: ${id}`);
      
      return res.status(200).json({ 
        success: true, 
        message: '记录删除成功',
        id: parseInt(id)
      });

    } else if (req.method === 'GET') {
      // 获取单个记录
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
