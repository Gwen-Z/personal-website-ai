import { query } from '../../lib/turso.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的ID列表' });
    }

    // 构建删除SQL
    const placeholders = ids.map(() => '?').join(',');
    const deleteSql = `DELETE FROM simple_records WHERE id IN (${placeholders})`;
    
    await query(deleteSql, ids);
    console.log(`✅ 批量删除 ${ids.length} 条记录:`, ids);
    
    return res.status(200).json({ 
      success: true, 
      message: `成功删除 ${ids.length} 条记录`,
      deleted_count: ids.length,
      deleted_ids: ids
    });

  } catch (error) {
    console.error('❌ 批量删除失败:', error);
    return res.status(500).json({
      error: '批量删除失败',
      message: error.message
    });
  }
}
