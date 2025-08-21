import { processAndImportData } from './import-processed-data.js';

// 您提供的原始数据
const yourRawData = `日期：2025年8月11日 23:48  
【语音输入】  
心情是：今天心情有点duang～因为下午突然停！电！代码没存差点挂  
生活是：中午去楼下吃了碗酸汤面，味道还将就；晚上停电就点了个蜡烛听播课  
学习是：今天把《流畅的Python》第5章看了一大半，顺手写了50来行小练手  
工作是：上午开了一个需求评审会，老板说明天要看第一版demo（可能？）  
灵感是：突然想用WebRTC搞个小小的在线画板，大概吧……  
【文本输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：  

日期：2025年8月12日 00:15  
【语音输入】  
心情是：今天心情还行吧，因为我把个人记录的数据用AI写到网叶里了  
生活是：今天其实没出门也没健身，落枕了，脖子歪的  
学习是：今天一直用cursor，花了20块搞了15天无限？  
工作是：阿里高得HR发邮件问我要不要去面试，我嗯了一下  
灵感是：今天没啥特别的灵杆  
【文本输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：  

日期：2025年8月13日 23:59  
【文本输入】  
心情是：情绪平净，傍晚暴雨，雨声还挺治遇  
生活是：早餐做了燕麦被，下午去健房练了背，晚上自己剪了牛扒  
学习是：研究了一下Next.js 14的Server Actoins，写了个todo小lizi  
工作是：修了昨天提的两个P1 bgu，QA说可以提测了  
灵感是：想用树霉派+墨水屏做极客风桌面日历  
【语音输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：  

日期：2025年8月14日 22:30  
【语音输入】  
心情是：今天超开森，收到好久不见的朋友寄来的明信片  
生活是：中午吃了楼下新开的海蓝鸡饭，晚上跑了大概5公里吧  
学习是：把LangChain的文档扫了一遍，跑通了最简的LLM链  
工作是：给团队做了分享，题目好像叫"用Cursor提效10倍？"  
灵感是：想每天心情自动同步到Notion，AI给我画图表  
【文本输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：  

日期：2025年8月15日 23:03  
【文本输入】  
心情是：略焦绿，版本快发，需求还在变  
生活是：早餐忘了吃，中午罗森饭团，晚上9点才吃拉面  
学习是：抽空看了30分钟Go协程调度器源玛解析  
工作是：跟产品对了三遍细节，需求锁在v1.2.3吧  
灵感是：想做一个基于地理的匿名树栋  
【语音输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：  

日期：2025年8月16日 22:55  
【语音输入】  
心情是：周末心情松，早上睡到太阳晒屁股  
生活是：去朝阳公园跑了10km，路上买了超大杯冰美  
学习是：看完《Designing Data-Intensive Applications》第7章，画了个脑图  
工作是：没加班，电脑关机躺平  
灵感是：想给跑步数据写个自动生成周抱的小脚本  
【文本输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：  

日期：2025年8月17日 21:20  
【文本输入】  
心情是：平静里带点小期代，周日晚上总这样  
生活是：上午收拾房见，下午和朋友打了俩小时羽毛球  
学习是：复盘了本周的AI实验，写了篇博客草稿  
工作是：把下周迭代计划拆成7个task，扔进Trello  
灵感是：想做个快捷指令一键把当天数据同步到GitHub私有库  
【语音输入】  
心情是：  
生活是：  
学习是：  
工作是：  
灵感是：`;

async function testDataPipeline() {
  console.log('🚀 开始测试数据处理流水线...\n');
  
  try {
    const result = await processAndImportData(yourRawData);
    
    console.log('\n📋 处理结果摘要:');
    console.log(`总计处理: ${result.length} 条记录`);
    console.log('日期范围:', result[result.length - 1]?.date, '到', result[0]?.date);
    
    // 显示一些处理示例
    console.log('\n📝 处理示例 (第一条记录):');
    const firstRecord = result[0];
    if (firstRecord) {
      console.log('原始心情:', firstRecord.mood);
      console.log('心情分析:', {
        emoji: firstRecord.mood_emoji,
        event: firstRecord.mood_event,
        score: firstRecord.mood_score,
        category: firstRecord.mood_category
      });
      console.log('整体情感:', firstRecord.overall_sentiment);
      console.log('数据质量评分:', firstRecord.data_quality_score);
    }
    
    console.log('\n✅ 流水线测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testDataPipeline();
