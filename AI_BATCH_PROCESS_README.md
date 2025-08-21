# AI批处理原始数据功能

## 功能概述

本功能实现了将原始数据通过AI分析后存储到AI处理数据表中的完整流程。

## 实现的组件

### 1. API接口

#### `/api/ai-batch-process.ts`
- **功能**: 批量处理原始数据，调用AI接口进行分析
- **方法**: POST
- **参数**: 
  - `limit`: 处理数量限制（默认10条）
- **处理流程**:
  1. 从 `raw_entries` 表获取未处理的原始数据
  2. 调用AI接口（豆包API）分析每条数据
  3. 将AI分析结果存储到 `simple_records` 表
  4. 返回处理结果和统计信息

#### `/api/raw-entries.ts`
- **功能**: 管理原始数据的CRUD操作
- **方法**: GET, PUT, DELETE
- **功能**:
  - GET: 获取原始数据列表，支持日期筛选
  - PUT: 更新指定ID的原始数据
  - DELETE: 删除指定ID的原始数据

#### `/api/parse-raw-text.ts`
- **功能**: 解析原始文本并存储到数据库
- **方法**: POST
- **参数**:
  - `raw_text`: 原始文本内容
- **处理流程**:
  1. 智能解析文本，按关键词分类到不同领域
  2. 提取日期信息
  3. 存储到 `raw_entries` 表

### 2. 前端组件

#### `AIDataPage.tsx` 更新
- **新增功能**:
  - AI批处理按钮和界面
  - 处理进度显示
  - 处理结果反馈
  - 加载状态管理

## AI分析能力

AI会分析原始文本并提取以下结构化信息：

### 心情数据
- `mood_description`: 心情描述
- `mood_emoji`: 表情符号
- `mood_score`: 心情分值（-3到5）
- `mood_category`: 心情分类

### 健身数据
- `life_description`: 生活描述
- `fitness_intensity`: 运动强度（低/中/高）
- `fitness_duration`: 运动时长
- `fitness_calories`: 消耗热量
- `fitness_type`: 运动类型

### 学习数据
- `study_description`: 学习描述
- `study_duration`: 学习时长
- `study_category`: 学习类别

### 工作数据
- `work_description`: 工作描述
- `work_task_type`: 任务类型（规划/开发/设计/部署/测试等）
- `work_priority`: 优先级（高/中/低）
- `work_complexity`: 复杂度（简单/中等/复杂）
- `work_estimated_hours`: 预估工时

### 灵感数据
- `inspiration_description`: 灵感描述
- `inspiration_theme`: 灵感主题
- `inspiration_difficulty`: 实现难度（高/中/低）
- `inspiration_product`: 潜在产品形态

## 使用流程

1. **添加原始数据**: 在"原始数据"页面添加或导入原始文本数据
2. **启动AI批处理**: 点击"🚀 开始AI批处理"按钮
3. **等待处理完成**: 系统会显示处理进度和结果
4. **查看处理结果**: 在"AI处理数据"页面查看结构化后的数据
5. **数据可视化**: 在各个分析页面查看图表和AI解读

## 技术特点

- **智能分类**: 基于关键词和上下文智能分类原始文本
- **批量处理**: 支持批量处理多条数据，提高效率
- **错误处理**: 完善的错误处理和用户反馈机制
- **进度显示**: 实时显示处理进度和结果统计
- **数据完整性**: 确保数据在处理过程中的完整性和一致性

## 环境要求

确保以下环境变量已配置：
- `TURSO_DATABASE_URL`: Turso数据库URL
- `TURSO_AUTH_TOKEN`: Turso认证令牌
- `OPENAI_API_KEY`: AI服务API密钥
- `OPENAI_BASE_URL`: AI服务基础URL
- `OPENAI_MODEL`: AI模型名称（默认: doubao-lite-32k-240828）

## 数据流向

```
原始文本输入 → raw_entries表 → AI分析处理 → simple_records表 → 数据可视化
```

这个功能完整实现了从原始数据到结构化数据的智能转换，为后续的数据分析和可视化提供了高质量的数据基础。
