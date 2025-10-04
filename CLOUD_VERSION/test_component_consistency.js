const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// 测试组件类型一致性
async function testComponentConsistency() {
  console.log('🧪 开始测试组件类型一致性...\n');

  try {
    // 1. 获取所有组件类型
    console.log('1️⃣ 获取组件类型列表...');
    const componentTypesResponse = await axios.get(`${API_BASE}/component-types`);
    const componentTypes = componentTypesResponse.data;
    console.log('✅ 组件类型列表:', componentTypes.map(t => `${t.id} (${t.name})`).join(', '));

    // 2. 创建一个测试笔记
    console.log('\n2️⃣ 创建测试笔记...');
    const testNote = {
      title: '组件一致性测试笔记',
      content: '这是一个用于测试组件类型一致性的笔记',
      components: [
        {
          id: 'comp1',
          type: 'text_short',
          title: '短文本组件',
          content: '这是短文本内容',
          position: { x: 0, y: 0 },
          size: { width: 200, height: 50 }
        },
        {
          id: 'comp2',
          type: 'image',
          title: '图片组件',
          content: 'https://example.com/image.jpg',
          position: { x: 0, y: 100 },
          size: { width: 200, height: 150 }
        },
        {
          id: 'comp3',
          type: 'video',
          title: '视频组件',
          content: 'https://example.com/video.mp4',
          position: { x: 0, y: 300 },
          size: { width: 200, height: 150 }
        },
        {
          id: 'comp4',
          type: 'audio',
          title: '音频组件',
          content: 'https://example.com/audio.mp3',
          position: { x: 0, y: 500 },
          size: { width: 200, height: 50 }
        },
        {
          id: 'comp5',
          type: 'file',
          title: '文件组件',
          content: 'document.pdf, image.png',
          position: { x: 0, y: 600 },
          size: { width: 200, height: 50 }
        },
        {
          id: 'comp6',
          type: 'chart',
          title: '图表组件',
          content: '',
          config: {
            chartType: 'bar',
            title: '测试图表',
            dataSource: '{"labels":["A","B","C"],"datasets":[{"data":[1,2,3]}]}'
          },
          position: { x: 0, y: 700 },
          size: { width: 200, height: 150 }
        }
      ]
    };

    const createResponse = await axios.post(`${API_BASE}/notes`, testNote);
    const createdNote = createResponse.data;
    console.log('✅ 测试笔记创建成功，ID:', createdNote.id);

    // 3. 获取笔记详情
    console.log('\n3️⃣ 获取笔记详情...');
    const noteDetailResponse = await axios.get(`${API_BASE}/notes/${createdNote.id}`);
    const noteDetail = noteDetailResponse.data;
    console.log('✅ 笔记详情获取成功');

    // 4. 验证组件类型一致性
    console.log('\n4️⃣ 验证组件类型一致性...');
    const availableTypes = componentTypes.map(t => t.id);
    const noteComponentTypes = noteDetail.components.map(c => c.type);
    
    console.log('📋 可用的组件类型:', availableTypes);
    console.log('📋 笔记中的组件类型:', noteComponentTypes);

    let allTypesValid = true;
    const invalidTypes = [];

    noteComponentTypes.forEach(compType => {
      if (!availableTypes.includes(compType)) {
        allTypesValid = false;
        invalidTypes.push(compType);
      }
    });

    if (allTypesValid) {
      console.log('✅ 所有组件类型都有效！组件类型一致性测试通过');
    } else {
      console.log('❌ 发现无效的组件类型:', invalidTypes);
    }

    // 5. 测试前端组件渲染
    console.log('\n5️⃣ 测试前端组件渲染...');
    console.log('🌐 请访问 http://localhost:3000 查看笔记详情页');
    console.log('📝 笔记ID:', createdNote.id);
    console.log('🔗 直接链接: http://localhost:3000/notes/' + createdNote.id);

    // 6. 清理测试数据
    console.log('\n6️⃣ 清理测试数据...');
    await axios.delete(`${API_BASE}/notes/${createdNote.id}`);
    console.log('✅ 测试数据已清理');

    console.log('\n🎉 组件一致性测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.response?.data || error.message);
  }
}

// 运行测试
testComponentConsistency();
