import { createClient } from '@libsql/client';

// 获取Turso客户端
async function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL || 'libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io';
  const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTc2NTY4MzgsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.X5YU1QY27JEAIll0Ivj1VRSh7pupCv4vaEmRJ32DWwHr3_jG8vI7MdM9m7M2hrYS06SXkOYMYe-VMg4i1CHgDw';
  return createClient({ url, authToken });
}

async function verifyWeekData() {
  try {
    const turso = await getTursoClient();
    console.log('🔍 验证一周数据同步情况...\n');
    
    // 1. 检查raw_entries表
    console.log('📝 原始数据表 (raw_entries):');
    const rawEntries = await turso.execute({
      sql: 'SELECT date, mood_text, fitness_text, study_text, work_text, inspiration_text FROM raw_entries WHERE date >= ? AND date <= ? ORDER BY date',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`   共 ${rawEntries.rows.length} 条原始记录`);
    rawEntries.rows.forEach(row => {
      console.log(`   ${row[0]}: 心情="${row[1]?.substring(0, 20)}...", 健身="${row[2]?.substring(0, 15)}...", 学习="${row[3]?.substring(0, 15)}..."`);
    });
    
    // 2. 检查simple_records表
    console.log('\n📊 结构化数据表 (simple_records):');
    const simpleRecords = await turso.execute({
      sql: 'SELECT date, mood_emoji, mood_score, mood_category, fitness_type, study_category, work_task_type, inspiration_theme FROM simple_records WHERE date >= ? AND date <= ? ORDER BY date',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`   共 ${simpleRecords.rows.length} 条结构化记录`);
    simpleRecords.rows.forEach(row => {
      console.log(`   ${row[0]}: ${row[1]} (${row[2]}分, ${row[3]}) | 健身:${row[4]} | 学习:${row[5]} | 工作:${row[6]} | 灵感:${row[7]}`);
    });
    
    // 3. 检查ai_data表
    console.log('\n🤖 AI分析历史表 (ai_data):');
    const aiData = await turso.execute({
      sql: 'SELECT date, category, title, content FROM ai_data WHERE date >= ? AND date <= ? ORDER BY date, category',
      args: ['2025-09-13', '2025-09-19']
    });
    
    console.log(`   共 ${aiData.rows.length} 条AI分析记录`);
    const groupedAiData = {};
    aiData.rows.forEach(row => {
      if (!groupedAiData[row[0]]) {
        groupedAiData[row[0]] = [];
      }
      groupedAiData[row[0]].push(`${row[2]}: ${row[3]?.substring(0, 30)}...`);
    });
    
    Object.keys(groupedAiData).sort().forEach(date => {
      console.log(`   ${date}:`);
      groupedAiData[date].forEach(item => {
        console.log(`     - ${item}`);
      });
    });
    
    // 4. 数据完整性检查
    console.log('\n✅ 数据完整性检查:');
    console.log(`   - 原始数据: ${rawEntries.rows.length}/7 条`);
    console.log(`   - 结构化数据: ${simpleRecords.rows.length}/7 条`);
    console.log(`   - AI分析记录: ${aiData.rows.length} 条`);
    
    if (rawEntries.rows.length === 7 && simpleRecords.rows.length === 7) {
      console.log('   🎉 数据同步完整！');
    } else {
      console.log('   ⚠️ 数据同步不完整');
    }
    
    // 5. 心情趋势分析
    console.log('\n📈 本周心情趋势:');
    const moodTrend = simpleRecords.rows.map(row => ({
      date: row[0],
      emoji: row[1],
      score: row[2],
      category: row[3]
    }));
    
    moodTrend.forEach(day => {
      console.log(`   ${day.date}: ${day.emoji} ${day.score}分 (${day.category})`);
    });
    
    const avgScore = moodTrend.reduce((sum, day) => sum + day.score, 0) / moodTrend.length;
    console.log(`   📊 平均心情分数: ${avgScore.toFixed(1)}分`);
    
    // 6. 活动统计
    console.log('\n🏃 本周活动统计:');
    const fitnessTypes = {};
    const studyCategories = {};
    const workTypes = {};
    
    simpleRecords.rows.forEach(row => {
      // 健身类型统计
      const fitnessType = row[4] || '无';
      fitnessTypes[fitnessType] = (fitnessTypes[fitnessType] || 0) + 1;
      
      // 学习类别统计
      const studyCategory = row[5] || '无';
      studyCategories[studyCategory] = (studyCategories[studyCategory] || 0) + 1;
      
      // 工作类型统计
      const workType = row[6] || '无';
      workTypes[workType] = (workTypes[workType] || 0) + 1;
    });
    
    console.log('   健身活动:');
    Object.entries(fitnessTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}天`);
    });
    
    console.log('   学习内容:');
    Object.entries(studyCategories).forEach(([category, count]) => {
      console.log(`     ${category}: ${count}天`);
    });
    
    console.log('   工作类型:');
    Object.entries(workTypes).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}天`);
    });
    
    console.log('\n🎉 数据验证完成！');
    
  } catch (error) {
    console.error('验证数据失败:', error);
  }
}

// 运行验证
verifyWeekData();
