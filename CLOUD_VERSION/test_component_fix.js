// 测试组件重复修复
const fetch = require('node-fetch');

async function testNote1015() {
  try {
    console.log('🔍 测试笔记1015的组件重复问题...');
    
    // 获取笔记数据
    const response = await fetch('http://localhost:3001/api/notes/1015');
    const data = await response.json();
    
    if (data.success) {
      const note = data.note;
      const notebook = data.notebook;
      
      console.log('\n📋 笔记组件实例:');
      note.component_instances.forEach((comp, index) => {
        console.log(`  ${index + 1}. ${comp.type} - ${comp.title} (${comp.id})`);
      });
      
      console.log('\n🤖 笔记本分析组件配置:');
      console.log('  analysisComponents:', notebook.component_config.analysisComponents);
      
      console.log('\n🔍 分析组件类型统计:');
      const componentTypes = note.component_instances.map(comp => comp.type);
      const typeCount = {};
      componentTypes.forEach(type => {
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}个`);
      });
      
      // 检查是否有重复的分析组件
      const analysisComponents = notebook.component_config.analysisComponents || [];
      const duplicateAnalysis = analysisComponents.filter(compType => 
        componentTypes.filter(type => type === compType).length > 1
      );
      
      if (duplicateAnalysis.length > 0) {
        console.log('\n❌ 发现重复的分析组件:', duplicateAnalysis);
      } else {
        console.log('\n✅ 没有发现重复的分析组件');
      }
      
    } else {
      console.error('❌ 获取笔记数据失败:', data);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testNote1015();
