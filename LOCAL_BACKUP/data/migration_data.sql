PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood TEXT NOT NULL,
        life TEXT NOT NULL,
        study TEXT NOT NULL,
        work TEXT NOT NULL,
        inspiration TEXT NOT NULL,
        note TEXT
      , mood_emoji TEXT DEFAULT '😊', mood_description TEXT);
INSERT INTO records VALUES(1,'2025-08-01','心情不错','生活规律','学习效率高','工作顺利','灵感一般','数据库修复后的测试数据（字符串类型）','😊',NULL);
INSERT INTO records VALUES(2,'2025-01-15','8.5','7.2','9','6.8','8.3','iPhone快捷指令测试','😊',NULL);
INSERT INTO records VALUES(3,'2025-08-11','4','2','3','4','1','完成了AI写日记的任务，收到面试邀请，但身体不适','😊',NULL);
INSERT INTO records VALUES(4,'2025-08-06','3','4','2','1','5','平稳的一天，有点想法','🤔','平稳的一天，没有特别开心的事，也没有烦心事');
INSERT INTO records VALUES(5,'2025-08-06','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(6,'2025-08-06','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(7,'2025-08-07','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(8,'2025-08-08','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(9,'2025-08-09','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(10,'2025-08-10','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(11,'2025-08-11','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(12,'2025-08-12','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(13,'2025-08-06','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(14,'2025-08-06','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(15,'2025-08-07','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(16,'2025-08-08','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(17,'2025-08-09','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(18,'2025-08-10','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(19,'2025-08-11','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
INSERT INTO records VALUES(20,'2025-08-12','3','3','3','3','3','自动处理失败，使用默认评分','😐','心情一般');
CREATE TABLE ai_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT,
      content TEXT,
      score REAL
    );
CREATE TABLE raw_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_text TEXT,
      life_text TEXT,
      study_text TEXT,
      work_text TEXT,
      inspiration_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , fitness_text TEXT);
INSERT INTO raw_entries VALUES(1,'2025-08-11','今天心情挺不错的因为我把我自己的个人记录的数据用AI实现写到网页里了','今天关于生活其实没有出门也没有健身也没吃什么好吃的吧今天落枕了有点不是很舒服','今天学到的新知识今天一直都在用cute然后学会了二花20块钱用15天免费无限额度的','今天阿里高德的HR有发就是想让我确认是否有兴趣去面试有邮箱收到','今天没什么特别的灵感','2025-08-12 06:56:36',NULL);
INSERT INTO raw_entries VALUES(2,'2025-08-06','今天心情还行，虽然没啥特别开心的事，但也没啥烦心事，算平稳的一天','今天出门买了点水果，吃了个椰子鸡外卖，味道一般，但比自己做强点','今天看了一点关于Next.js的文档，感觉还是有点抽象，准备找个实战项目练练','今天没啥工作上的进展，主要是整理了下简历，准备开始投一波','今天突然想到一个点子，能不能用AI生成一个"每日小总结"网页，自动记录我每天的碎碎念','2025-08-13 06:34:02',NULL);
INSERT INTO raw_entries VALUES(3,'2025-08-06','今天心情还行，虽然没啥特别开心的事，但也没啥烦心事，算平稳的一天','今天出门买了点水果，吃了个椰子鸡外卖，味道一般，但比自己做强点','今天看了一点关于Next.js的文档，感觉还是有点抽象，准备找个实战项目练练','今天没啥工作上的进展，主要是整理了下简历，准备开始投一波','今天突然想到一个点子，能不能用AI生成一个"每日小总结"网页，自动记录我每天的碎碎念','2025-08-13 06:50:42',NULL);
INSERT INTO raw_entries VALUES(4,'2025-08-06','今天心情还行，虽然没啥特别开心的事，但也没啥烦心事，算平稳的一天','今天出门买了点水果，吃了个椰子鸡外卖，味道一般，但比自己做强点','今天看了一点关于Next.js的文档，感觉还是有点抽象，准备找个实战项目练练','今天没啥工作上的进展，主要是整理了下简历，准备开始投一波','今天突然想到一个点子，能不能用AI生成一个"每日小总结"网页，自动记录我每天的碎碎念','2025-08-13 06:58:56',NULL);
INSERT INTO raw_entries VALUES(5,'2025-08-07','今天心情有点烦躁，主要是下午电脑突然卡死了，差点没保存代码','今天吃了泡面和煎蛋，简单但满足，晚上还洗了个头，感觉清爽了点','今天学了点cursor的快捷键，发现真的可以省很多事，尤其是多光标编辑','今天投了三份简历，其中有一个是远程的岗位，感觉可以试试','今天突然想做一个"极简生活记录器"，只记录三句话：吃了啥、学了啥、想了啥','2025-08-13 06:58:56',NULL);
INSERT INTO raw_entries VALUES(6,'2025-08-08','今天心情不错，主要是收到了一个面试邀约，虽然只是初筛，但也挺开心','今天去楼下散了步，顺便买了杯冰美式，天气有点闷但还能忍','今天研究了一下Vercel部署，终于把那个测试项目给部署上去了，虽然样式有点丑','今天主要是准备面试题，刷了10道JS手写题，感觉脑子快烧了','今天突然想到，能不能用AI帮我自动生成面试题答案，然后我再背下来','2025-08-13 06:58:57',NULL);
INSERT INTO raw_entries VALUES(7,'2025-08-09','今天心情一般，主要是面试题刷得有点烦，感觉怎么都准备不完','今天没出门，点了个麻辣香锅，辣得我有点怀疑人生，胃不太舒服','今天学了一点React的useEffect陷阱，发现自己以前写的代码全是bug','今天收到了一个小公司的笔试题，三道算法题，做了两道半，放弃了','今天突然想到，能不能做一个"程序员每日崩溃语录"合集，感觉会火','2025-08-13 06:58:57',NULL);
INSERT INTO raw_entries VALUES(8,'2025-08-10','今天心情有点低落，主要是笔试题没做完，感觉自己是不是不适合干这行','今天吃了点粥和咸菜，清淡一点，胃终于舒服点了','今天没学啥新东西，主要是复盘了一下那三道题，发现自己其实思路是对的','今天收到了阿里高德的邮件，说简历过了初筛，让我准备面试，突然有点慌','今天突然想写一个"程序员自我安慰语录生成器"，比如"bug不是你写的，是代码自己长出来的"','2025-08-13 06:58:58',NULL);
INSERT INTO raw_entries VALUES(9,'2025-08-11','今天心情回升了一点，主要是和朋友语音聊了一个小时，感觉被理解了一点','今天出门买了点酸奶和香蕉，顺便走了3000步，算是动了动','今天学了点cursor的AI补全功能，发现它真的能猜到我下一句要写啥，有点吓人','今天主要是准备阿里高德的面试，看了一下他们的技术栈，感觉还挺对我胃口','今天突然想做一个"面试前焦虑指数测试"，每天答5道题，看看今天适合投简历吗','2025-08-13 06:58:58',NULL);
INSERT INTO raw_entries VALUES(10,'2025-08-12','今天心情挺不错的因为我把我自己的个人记录的数据用AI实现写到网页里了','今天关于生活其实没有出门也没有健身也没吃什么好吃的吧今天落枕了有点不是很舒服','今天学到的新知识今天一直都在用cursor然后学会了花20块钱用15天免费无限额度的','今天阿里高德的HR有发就是想让我确认是否有兴趣去面试有邮箱收到','今天没什么特别的','2025-08-13 06:58:59',NULL);
INSERT INTO raw_entries VALUES(11,'2025-08-06','测试心情','测试生活','测试学习','测试工作','测试灵感','2025-08-13 06:59:12',NULL);
INSERT INTO raw_entries VALUES(12,'2025-08-06','今天心情还行，虽然没啥特别开心的事，但也没啥烦心事，算平稳的一天','今天出门买了点水果，吃了个椰子鸡外卖，味道一般，但比自己做强点','今天看了一点关于Next.js的文档，感觉还是有点抽象，准备找个实战项目练练','今天没啥工作上的进展，主要是整理了下简历，准备开始投一波','今天突然想到一个点子，能不能用AI生成一个"每日小总结"网页，自动记录我每天的碎碎念','2025-08-13 07:01:28',NULL);
INSERT INTO raw_entries VALUES(13,'2025-08-07','今天心情有点烦躁，主要是下午电脑突然卡死了，差点没保存代码','今天吃了泡面和煎蛋，简单但满足，晚上还洗了个头，感觉清爽了点','今天学了点cursor的快捷键，发现真的可以省很多事，尤其是多光标编辑','今天投了三份简历，其中有一个是远程的岗位，感觉可以试试','今天突然想做一个"极简生活记录器"，只记录三句话：吃了啥、学了啥、想了啥','2025-08-13 07:01:28',NULL);
INSERT INTO raw_entries VALUES(14,'2025-08-08','今天心情不错，主要是收到了一个面试邀约，虽然只是初筛，但也挺开心','今天去楼下散了步，顺便买了杯冰美式，天气有点闷但还能忍','今天研究了一下Vercel部署，终于把那个测试项目给部署上去了，虽然样式有点丑','今天主要是准备面试题，刷了10道JS手写题，感觉脑子快烧了','今天突然想到，能不能用AI帮我自动生成面试题答案，然后我再背下来','2025-08-13 07:01:29',NULL);
INSERT INTO raw_entries VALUES(15,'2025-08-09','今天心情一般，主要是面试题刷得有点烦，感觉怎么都准备不完','今天没出门，点了个麻辣香锅，辣得我有点怀疑人生，胃不太舒服','今天学了一点React的useEffect陷阱，发现自己以前写的代码全是bug','今天收到了一个小公司的笔试题，三道算法题，做了两道半，放弃了','今天突然想到，能不能做一个"程序员每日崩溃语录"合集，感觉会火','2025-08-13 07:01:29',NULL);
INSERT INTO raw_entries VALUES(16,'2025-08-10','今天心情有点低落，主要是笔试题没做完，感觉自己是不是不适合干这行','今天吃了点粥和咸菜，清淡一点，胃终于舒服点了','今天没学啥新东西，主要是复盘了一下那三道题，发现自己其实思路是对的','今天收到了阿里高德的邮件，说简历过了初筛，让我准备面试，突然有点慌','今天突然想写一个"程序员自我安慰语录生成器"，比如"bug不是你写的，是代码自己长出来的"','2025-08-13 07:01:30',NULL);
INSERT INTO raw_entries VALUES(17,'2025-08-11','今天心情回升了一点，主要是和朋友语音聊了一个小时，感觉被理解了一点','今天出门买了点酸奶和香蕉，顺便走了3000步，算是动了动','今天学了点cursor的AI补全功能，发现它真的能猜到我下一句要写啥，有点吓人','今天主要是准备阿里高德的面试，看了一下他们的技术栈，感觉还挺对我胃口','今天突然想做一个"面试前焦虑指数测试"，每天答5道题，看看今天适合投简历吗','2025-08-13 07:01:30',NULL);
INSERT INTO raw_entries VALUES(18,'2025-08-12','今天心情挺不错的因为我把我自己的个人记录的数据用AI实现写到网页里了','今天关于生活其实没有出门也没有健身也没吃什么好吃的吧今天落枕了有点不是很舒服','今天学到的新知识今天一直都在用cursor然后学会了花20块钱用15天免费无限额度的','今天阿里高德的HR有发就是想让我确认是否有兴趣去面试有邮箱收到','今天没什么特别的','2025-08-13 07:01:31',NULL);
INSERT INTO raw_entries VALUES(19,'2025-08-13','今天心情很好，完成了数据结构改造','今天生活很充实','学了很多新技术','工作进展顺利','有了新的想法','2025-08-13 07:16:37',NULL);
INSERT INTO raw_entries VALUES(20,'2025-08-06','今天心情还行，虽然没啥特别开心的事，但也没啥烦心事，算平稳的一天','今天出门买了点水果，吃了个椰子鸡外卖，味道一般，但比自己做强点','今天看了一点关于Next.js的文档，感觉还是有点抽象，准备找个实战项目练练','今天没啥工作上的进展，主要是整理了下简历，准备开始投一波','今天突然想到一个点子，能不能用AI生成一个"每日小总结"网页，自动记录我每天的碎碎念','2025-08-13 07:18:52',NULL);
INSERT INTO raw_entries VALUES(21,'2025-08-07','今天心情有点烦躁，主要是下午电脑突然卡死了，差点没保存代码','今天吃了泡面和煎蛋，简单但满足，晚上还洗了个头，感觉清爽了点','今天学了点cursor的快捷键，发现真的可以省很多事，尤其是多光标编辑','今天投了三份简历，其中有一个是远程的岗位，感觉可以试试','今天突然想做一个"极简生活记录器"，只记录三句话：吃了啥、学了啥、想了啥','2025-08-13 07:18:53',NULL);
INSERT INTO raw_entries VALUES(22,'2025-08-08','今天心情不错，主要是收到了一个面试邀约，虽然只是初筛，但也挺开心','今天去楼下散了步，顺便买了杯冰美式，天气有点闷但还能忍','今天研究了一下Vercel部署，终于把那个测试项目给部署上去了，虽然样式有点丑','今天主要是准备面试题，刷了10道JS手写题，感觉脑子快烧了','今天突然想到，能不能用AI帮我自动生成面试题答案，然后我再背下来','2025-08-13 07:18:53',NULL);
INSERT INTO raw_entries VALUES(23,'2025-08-09','今天心情一般，主要是面试题刷得有点烦，感觉怎么都准备不完','今天没出门，点了个麻辣香锅，辣得我有点怀疑人生，胃不太舒服','今天学了一点React的useEffect陷阱，发现自己以前写的代码全是bug','今天收到了一个小公司的笔试题，三道算法题，做了两道半，放弃了','今天突然想到，能不能做一个"程序员每日崩溃语录"合集，感觉会火','2025-08-13 07:18:53',NULL);
INSERT INTO raw_entries VALUES(24,'2025-08-10','今天心情有点低落，主要是笔试题没做完，感觉自己是不是不适合干这行','今天吃了点粥和咸菜，清淡一点，胃终于舒服点了','今天没学啥新东西，主要是复盘了一下那三道题，发现自己其实思路是对的','今天收到了阿里高德的邮件，说简历过了初筛，让我准备面试，突然有点慌','今天突然想写一个"程序员自我安慰语录生成器"，比如"bug不是你写的，是代码自己长出来的"','2025-08-13 07:18:54',NULL);
INSERT INTO raw_entries VALUES(25,'2025-08-11','今天心情回升了一点，主要是和朋友语音聊了一个小时，感觉被理解了一点','今天出门买了点酸奶和香蕉，顺便走了3000步，算是动了动','今天学了点cursor的AI补全功能，发现它真的能猜到我下一句要写啥，有点吓人','今天主要是准备阿里高德的面试，看了一下他们的技术栈，感觉还挺对我胃口','今天突然想做一个"面试前焦虑指数测试"，每天答5道题，看看今天适合投简历吗','2025-08-13 07:18:54',NULL);
INSERT INTO raw_entries VALUES(26,'2025-08-12','今天心情挺不错的因为我把我自己的个人记录的数据用AI实现写到网页里了','今天关于生活其实没有出门也没有健身也没吃什么好吃的吧今天落枕了有点不是很舒服','今天学到的新知识今天一直都在用cursor然后学会了花20块钱用15天免费无限额度的','今天阿里高德的HR有发就是想让我确认是否有兴趣去面试有邮箱收到','今天没什么特别的','2025-08-13 07:18:54',NULL);
INSERT INTO raw_entries VALUES(27,'2025-08-14','今天心情超级棒！终于成功添加了AI总结功能，emoji和事件都能自动生成了','今天生活很充实','学会了新的数据库迁移技巧','完成了重要功能开发','想做一个更智能的情绪分析工具','2025-08-13 07:46:06',NULL);
INSERT INTO raw_entries VALUES(28,'2025-08-14','今天心情很好，完成了数据结构改造','跳绳3050，哑铃20分钟，散步5公里，骑车4.5公里','学习新技术','工作进展顺利','有了新的想法','2025-08-13 08:54:58',NULL);
INSERT INTO raw_entries VALUES(29,'2025-08-13','今天心情不错','很困，骑车5公里','学习进展良好','工作正常','有一些想法','2025-08-13 08:54:59',NULL);
INSERT INTO raw_entries VALUES(30,'2025-08-12','今天心情一般','没有健身，今天落枕了有点不是很舒服','学习正常','工作进展','创意想法','2025-08-13 08:55:00',NULL);
INSERT INTO raw_entries VALUES(31,'2025-08-11','今天心情回升','跳绳2500','学习新知识','工作顺利','有灵感','2025-08-13 08:55:01',NULL);
INSERT INTO raw_entries VALUES(32,'2025-08-10','今天心情有点低落','来大姨妈第一天，床上躺了一天，很难受','学习较少','工作一般','创意不多','2025-08-13 08:55:02',NULL);
INSERT INTO raw_entries VALUES(33,'2025-08-09','今天心情还可以','没出门，在家有氧1小时','学习进展','工作正常','有想法','2025-08-13 08:55:03',NULL);
INSERT INTO raw_entries VALUES(34,'2025-08-08','今天心情不错','出门散步50分钟','学习新技术','工作顺利','灵感丰富','2025-08-13 08:55:04',NULL);
INSERT INTO raw_entries VALUES(35,'2025-08-07','今天心情一般','跳绳3400','学习正常','工作进展','有创意','2025-08-13 08:55:05',NULL);
INSERT INTO raw_entries VALUES(36,'2025-08-06','今天心情还行','跳绳2700，有氧哑铃30分钟','学习进展良好','工作正常','想法不少','2025-08-13 08:55:06',NULL);
INSERT INTO raw_entries VALUES(37,'2025-01-15','今天做饭特别成功，给自己点个赞，心情超好','跳绳30分钟','学习AI技术1小时','完成了项目开发','想做一个智能厨房助手','2025-08-15 15:24:04',NULL);
INSERT INTO raw_entries VALUES(38,'2025-01-16','今天做饭特别成功，给自己点个赞，心情超好','','','','','2025-08-15 15:25:39',NULL);
CREATE TABLE simple_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      mood_description TEXT,
      life_description TEXT,
      study_description TEXT,
      work_description TEXT,
      inspiration_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , mood_emoji TEXT, mood_event TEXT, fitness_intensity TEXT, fitness_duration TEXT, fitness_calories TEXT, fitness_type TEXT, study_duration TEXT, study_category TEXT, work_ai_summary TEXT, work_summary TEXT, inspiration_theme TEXT, inspiration_product TEXT, mood_score REAL, mood_category TEXT, work_task_type TEXT, work_priority TEXT, work_complexity TEXT, work_estimated_hours INTEGER, inspiration_difficulty TEXT, inspiration_progress TEXT, overall_sentiment TEXT, energy_level TEXT, productivity_score REAL, life_balance_score REAL, data_quality_score REAL, fitness_description TEXT);
INSERT INTO simple_records VALUES(183,'2025-08-07','烦，搬家','跳绳3400','看了一本心理学的书','功能构思完成','想学书法','2025-08-15 06:25:55','😐','搬家','低强度','30','200','跳绳','未提及','心理学','规划',NULL,'书法学习','教学视频',-2.0,'中度消','规划','中','中等',4,'高',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(184,'2025-08-08','计划被打乱了有点失落，但决定重新安排','出门散步50分钟','学习美股2小时','网页/移动端协作准备','没想法','2025-08-15 06:25:55','😔','身体不适','正常燃脂','50','200','散步','2h','金融','规划',NULL,'暂无主题','暂无产品',-2.0,'中度消极','规划','低','简单',3,'—',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(185,'2025-08-09','和家人视频通话，感到很温暖很想念','没出门，在家有氧1小时','学习使用即梦','iPhone快捷指令搭建','想做一个监督自己学习英语的快捷指令','2025-08-15 06:25:55','🥰','情感体验','正常燃脂','60','300','有氧运动','未提及','AI应用','开发',NULL,'英语学习监督','快捷指令工具',2.0,'积极中','开发','中','复杂',8,'中',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(186,'2025-08-10','身体有点不舒服，心情也跟着低落','来大姨妈第一天，床上躺了一天，很难受','机器学习-聚类算法','GitHub与后端实时更新机制','能不能用AI 帮我分析…','2025-08-15 06:25:55','😔','身体不适','无运动','0','0','休息','未提及','AI技术','开发',NULL,'视频喜好分析','视频推荐工具',-2.0,'中度消极','开发','中','中等',8,'中',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(187,'2025-08-11','今天做饭特别成功，给自己点个赞','跳绳2500','机器学习-分类算法','选择Vercel作为前端部署平台','现在AI博主…','2025-08-15 06:25:55','😊','工作成就','低强度','20','200','跳绳','未提及','AI技术','部署',NULL,'AI博主分析','行业研究报告',2.0,'积极中','部署','中','简单',3,'高',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(188,'2025-08-12','计划被打乱了有点失落，但决定重新安排','没有健身，今天落枕了有点不是很舒服','口语一小时','Figma设计AI工具网页','口语可以用录屏的方式…','2025-08-15 06:25:55','😔','身体不适','无运动','0','0','休息','1h','外语','UI/UX设计',NULL,'英语口语监督','学习监督App',-2.0,'中度消极','UI/UX设计','低','中等',6,'中',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(189,'2025-08-13','计划被打乱了有点失落，但决定重新安排','很困，骑车5公里','python 1小时','用MCP实现Figma设计','现在AI分析股市都是怎么实现的？','2025-08-15 06:25:55','😔','身体不适','低强度','30','120','骑车','1h','编程','开发',NULL,'AI股市分析','金融分析平台',-2.0,'中度消极','开发','低','复杂',8,'高',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(208,'2025-08-14','今天出去吃了好吃的烤鱼，还有看了电影F1，很开心','今天休息日，在家做了简单的拉伸运动','阅读了技术文章，了解最新前端趋势','整理了项目文档和待办事项','想到可以增加数据可视化的交互功能','2025-08-16 04:39:09','😄','开心事件','低','20','100','拉伸运动','1小时','技术阅读',NULL,NULL,'产品优化','中',3.0,'积极高','文档整理','低',NULL,NULL,'中',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(209,'2025-08-15','今天心情不错，完成了重要的项目里程碑','晨跑30分钟，感觉精力充沛','学习了新的React优化技巧','完成了用户界面设计优化','想到了一个新的数据可视化方案','2025-08-16 05:40:20','😊','项目进展顺利','中等','30','280','有氧运动','2小时','编程',NULL,NULL,'技术创新','中',8.0,'正面','界面优化','高',NULL,NULL,'中',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO simple_records VALUES(212,'2025-08-16','今天遇到了claude code听不懂人话的情况，切换到gpt5它一下这就明白了',NULL,NULL,NULL,NULL,'2025-08-16 07:48:22','😐','日常心情',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0.0,'中性',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
CREATE TABLE ai_enhanced_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      growth_indicators TEXT, -- JSON数组
      key_themes TEXT, -- JSON数组
      action_items TEXT, -- JSON数组
      emotional_tags TEXT, -- JSON数组
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE processing_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_date TEXT NOT NULL,
      total_entries INTEGER,
      average_quality_score REAL,
      sentiment_distribution TEXT, -- JSON对象
      top_themes TEXT, -- JSON数组
      processing_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('records',20);
INSERT INTO sqlite_sequence VALUES('raw_entries',38);
INSERT INTO sqlite_sequence VALUES('simple_records',212);
COMMIT;
