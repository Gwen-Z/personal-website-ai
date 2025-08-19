# 📱 iPhone快捷指令数据上传配置指南

## 🎯 目标
通过iPhone快捷指令直接向个人网站后端上传每日数据记录

## 📊 数据格式要求

### 必需字段：
- `date`: 日期 (YYYY-MM-DD格式，如：2025-01-15)
- `mood`: 心情分数 (0-10的数字，如：8.5)
- `life`: 生活分数 (0-10的数字，如：7.2)
- `study`: 学习分数 (0-10的数字，如：9.0)
- `work`: 工作分数 (0-10的数字，如：6.8)
- `inspiration`: 灵感分数 (0-10的数字，如：8.3)

### 可选字段：
- `note`: 备注文字 (如：今天学习了新技术)

## 🔧 快捷指令配置步骤

### 步骤1：创建新快捷指令
1. 打开iPhone的"快捷指令"App
2. 点击右上角"+"创建新快捷指令
3. 命名为"每日数据记录"

### 步骤2：添加输入组件
依次添加以下操作：

#### 2.1 获取当前日期
- 搜索并添加"获取当前日期"操作
- 设置格式为"自定义" → "yyyy-MM-dd"

#### 2.2 获取用户输入
分别添加5个"要求输入"操作：

1. **心情分数输入**
   - 操作：要求输入 → 数字
   - 提示：请输入心情分数(0-10)
   - 变量名：moodScore

2. **生活分数输入**
   - 操作：要求输入 → 数字  
   - 提示：请输入生活分数(0-10)
   - 变量名：lifeScore

3. **学习分数输入**
   - 操作：要求输入 → 数字
   - 提示：请输入学习分数(0-10)
   - 变量名：studyScore

4. **工作分数输入**
   - 操作：要求输入 → 数字
   - 提示：请输入工作分数(0-10)
   - 变量名：workScore

5. **灵感分数输入**
   - 操作：要求输入 → 数字
   - 提示：请输入灵感分数(0-10)
   - 变量名：inspirationScore

6. **备注输入**（可选）
   - 操作：要求输入 → 文本
   - 提示：今天有什么想记录的吗？
   - 变量名：noteText

### 步骤3：构建JSON数据
添加"获取字典的值"操作：

```json
{
  "date": "当前日期",
  "mood": "moodScore",
  "life": "lifeScore", 
  "study": "studyScore",
  "work": "workScore",
  "inspiration": "inspirationScore",
  "note": "noteText"
}
```

### 步骤4：发送HTTP请求
添加"获取URL内容"操作：

- **URL**: `http://你的服务器IP:5101/api/record`
- **方法**: POST
- **请求体**: 选择上一步的字典
- **头部**:
  - Content-Type: application/json

### 步骤5：处理响应
添加"显示通知"操作：
- 成功时显示：✅ 数据上传成功！
- 失败时显示：❌ 上传失败，请检查网络

## 🌐 网络配置

### 本地测试（同WiFi）
如果iPhone和电脑在同一WiFi网络：
- URL: `http://192.168.31.23:5101/api/record`
- 确保后端服务正在运行

### 外网访问（推荐）
为了随时随地上传数据，建议：

1. **使用ngrok内网穿透**
2. **部署到云服务器**
3. **使用Vercel等平台**

## 📝 快捷指令JSON配置文件

以下是完整的快捷指令配置（可直接导入）：

```json
{
  "WFWorkflowMinimumClientVersionString": "900",
  "WFWorkflowMinimumClientVersion": 900,
  "WFWorkflowIcon": {
    "WFWorkflowIconStartColor": 2846468607,
    "WFWorkflowIconGlyphNumber": 59511
  },
  "WFWorkflowClientVersion": "2605.0.5",
  "WFWorkflowOutputContentItemClasses": [],
  "WFWorkflowHasOutputFallback": false,
  "WFWorkflowActions": [
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.date",
      "WFWorkflowActionParameters": {
        "WFDateFormatStyle": "Custom",
        "WFDateFormat": "yyyy-MM-dd"
      }
    },
    {
      "WFWorkflowActionIdentifier": "is.workflow.actions.ask",
      "WFWorkflowActionParameters": {
        "WFAskActionPrompt": "请输入心情分数(0-10)",
        "WFInputType": "Number"
      }
    }
  ],
  "WFWorkflowInputContentItemClasses": [],
  "WFWorkflowImportQuestions": [],
  "WFQuickActionSurfaces": [],
  "WFWorkflowTypes": []
}
```

## 🔍 测试方法

### 使用curl测试API
```bash
curl -X POST http://localhost:5101/api/record \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15",
    "mood": 8.5,
    "life": 7.2,
    "study": 9.0,
    "work": 6.8,
    "inspiration": 8.3,
    "note": "测试数据"
  }'
```

### 预期响应
```json
{
  "message": "Record added successfully"
}
```

## 🚨 注意事项

1. **网络连接**：确保iPhone能访问到后端服务器
2. **数据格式**：分数必须是数字类型，不能是文本
3. **日期格式**：严格使用YYYY-MM-DD格式
4. **错误处理**：添加网络错误的提示和重试机制
5. **数据验证**：确保分数在0-10范围内

## 📈 高级功能

### 自动化触发
- 设置每日定时提醒
- 与日历事件关联
- 基于位置触发记录

### 数据预填充
- 使用历史平均值作为默认值
- 智能推荐基于时间段的分数
- 集成健康数据作为参考

## 🔧 故障排除

### 常见问题：
1. **连接失败**：检查IP地址和端口
2. **数据格式错误**：确认JSON格式正确
3. **服务器未响应**：确认后端服务正在运行
4. **权限问题**：检查网络权限设置
