const { createClient } = require('@libsql/client');
require('dotenv').config();

async function scanAllNotesForIssues() {
  try {
    const turso = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw',
    });

    console.log('🔍 扫描所有笔记的组件数据问题...');
    
    const notesResult = await turso.execute('SELECT note_id, title, component_instances FROM notes WHERE component_instances IS NOT NULL');
    
    console.log('📊 总笔记数量:', notesResult.rows.length);
    
    const issues = [];
    const normalNotes = [];
    
    for (const note of notesResult.rows) {
      try {
        const components = JSON.parse(note.component_instances);
        
        if (Array.isArray(components)) {
          // 检查组件数量是否异常
          if (components.length > 50) {
            issues.push({
              note_id: note.note_id,
              title: note.title,
              issue: '组件数量异常',
              count: components.length,
              type: 'excessive_components'
            });
          }
          
          // 检查是否有重复的组件ID
          const ids = components.map(comp => comp.id).filter(id => id);
          const uniqueIds = new Set(ids);
          if (ids.length !== uniqueIds.size) {
            issues.push({
              note_id: note.note_id,
              title: note.title,
              issue: '重复组件ID',
              count: ids.length - uniqueIds.size,
              type: 'duplicate_ids'
            });
          }
          
          // 检查是否有无效组件
          const invalidComponents = components.filter(comp => 
            !comp || !comp.id || !comp.type || comp.title === undefined
          );
          if (invalidComponents.length > 0) {
            issues.push({
              note_id: note.note_id,
              title: note.title,
              issue: '无效组件',
              count: invalidComponents.length,
              type: 'invalid_components'
            });
          }
          
          normalNotes.push({
            note_id: note.note_id,
            title: note.title,
            component_count: components.length
          });
          
        } else {
          issues.push({
            note_id: note.note_id,
            title: note.title,
            issue: '非数组格式',
            count: 0,
            type: 'non_array'
          });
        }
        
      } catch (e) {
        // 检查是否是双重编码问题
        try {
          const firstParse = JSON.parse(note.component_instances);
          if (typeof firstParse === 'string') {
            const secondParse = JSON.parse(firstParse);
            if (Array.isArray(secondParse)) {
              issues.push({
                note_id: note.note_id,
                title: note.title,
                issue: '双重编码',
                count: secondParse.length,
                type: 'double_encoded'
              });
            }
          }
        } catch (e2) {
          issues.push({
            note_id: note.note_id,
            title: note.title,
            issue: '解析失败',
            count: 0,
            type: 'parse_error'
          });
        }
      }
    }
    
    console.log('\n📋 问题统计:');
    const issueTypes = {};
    issues.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    });
    
    Object.entries(issueTypes).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}个笔记`);
    });
    
    console.log('\n❌ 发现问题的笔记:');
    issues.forEach(issue => {
      console.log(`- 笔记${issue.note_id} (${issue.title}): ${issue.issue} (${issue.count})`);
    });
    
    console.log('\n✅ 正常笔记数量:', normalNotes.length);
    
    // 统计正常笔记的组件数量分布
    console.log('\n📊 正常笔记的组件数量分布:');
    const countRanges = {
      '1-5': 0,
      '6-10': 0,
      '11-20': 0,
      '21-50': 0,
      '50+': 0
    };
    
    normalNotes.forEach(note => {
      if (note.component_count <= 5) countRanges['1-5']++;
      else if (note.component_count <= 10) countRanges['6-10']++;
      else if (note.component_count <= 20) countRanges['11-20']++;
      else if (note.component_count <= 50) countRanges['21-50']++;
      else countRanges['50+']++;
    });
    
    Object.entries(countRanges).forEach(([range, count]) => {
      console.log(`- ${range}个组件: ${count}个笔记`);
    });
    
    return { issues, normalNotes };
    
  } catch (error) {
    console.error('❌ 扫描失败:', error);
    return { issues: [], normalNotes: [] };
  }
}

scanAllNotesForIssues();
