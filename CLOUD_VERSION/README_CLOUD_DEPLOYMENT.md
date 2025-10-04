# 🚀 云端版本部署指南

## 📋 概述
这是个人数据分析网站的**完整云端版本**，包含：
- ✅ 完整前端应用（React + 图表）
- ✅ Vercel Serverless API 函数
- ✅ Turso 云数据库集成
- ✅ 云端 AI 服务（Anthropic + OpenAI）
- ✅ 快捷指令数据接收

## 🎯 部署目标
- **从**: `http://localhost:3000/` (本地版本)
- **到**: `https://your-app.vercel.app/` (云端版本)

## 📁 项目结构
```
CLOUD_VERSION/
├── frontend/              # React前端应用
│   ├── src/               # React前端源码
│   ├── public/            # 静态资源
│   ├── build/             # 构建输出
│   ├── landing-page/      # 着陆页
│   └── package.json       # 前端配置
├── backend/               # Node.js后端
│   ├── app.js             # 主应用
│   ├── db.js              # 数据库连接
│   └── package.json       # 后端配置
├── api/                   # Vercel API路由
├── lib/                   # 共享库
│   ├── turso.js           # Turso 数据库连接
│   └── cloud-ai-service.js # 云端 AI 服务
├── package.json           # 根项目配置
└── README_CLOUD_DEPLOYMENT.md
```

## 🚀 部署步骤

### Step 1: 准备 Turso 数据库
1. **访问 Turso 控制台**
   ```bash
   # 访问: https://app.turso.tech/gwen-z
   ```

2. **创建数据库**
   ```bash
   turso db create personal-website-prod
   ```

3. **获取连接信息**
   ```bash
   turso db show personal-website-prod
   turso db tokens create personal-website-prod
   ```

### Step 2: 数据迁移
1. **导出本地数据**
   ```bash
   cd ../LOCAL_BACKUP/data
   sqlite3 records.db .dump > data_export.sql
   ```

2. **导入到 Turso**
   ```bash
   turso db shell personal-website-prod < data_export.sql
   ```

### Step 3: 配置环境变量
在 Vercel 项目设置中添加：
```bash
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

### Step 4: 部署到 Vercel
1. **推送到 GitHub**
   ```bash
   cd CLOUD_VERSION
   git init
   git add .
   git commit -m "Initial cloud version"
   git remote add origin https://github.com/your-username/personal-website-cloud.git
   git push -u origin main
   ```

2. **连接 Vercel**
   - 访问 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "New Project"
   - 选择 GitHub 仓库
   - 配置环境变量
   - 部署

### Step 5: 更新快捷指令
更新快捷指令中的 URL：
```
从: http://your-mac-ip:3001/api/raw-entry
到: https://your-app.vercel.app/api/raw-entry
```

## 🔧 API 端点

### 数据查询
- `GET /api/simple-records` - 获取处理后的数据记录
- `GET /api/dashboard` - 获取仪表板数据

### 数据接收
- `POST /api/raw-entry` - 接收快捷指令数据

### AI 功能
- `POST /api/ai-chat` - AI 聊天对话
- `GET /api/ai-analysis` - AI 数据分析

## 🤖 AI 服务配置

### 支持的 AI 服务商
1. **Anthropic Claude** (主要)
   - 模型: claude-3-sonnet-20240229
   - 用途: 主要分析和对话

2. **OpenAI GPT** (备用)
   - 模型: gpt-4
   - 用途: 备用分析和对话

### 智能降级机制
- 主服务不可用时自动切换备用服务
- 所有服务不可用时提供基础功能
- 错误日志和监控

## 📊 功能对比

| 功能 | 本地版本 | 云端版本 |
|------|----------|----------|
| 前端界面 | ✅ 完整 | ✅ 完整 |
| 数据图表 | ✅ 完整 | ✅ 完整 |
| AI 分析 | ✅ 本地+云端 | ✅ 纯云端 |
| 数据存储 | ✅ SQLite | ✅ Turso |
| 快捷指令 | ✅ 需要Mac开机 | ✅ 24/7可用 |
| 访问方式 | 🏠 仅本地 | 🌐 全球访问 |

## ✅ 验证清单

### 部署后验证
- [ ] 网站可正常访问: `https://your-app.vercel.app`
- [ ] API 健康检查: `https://your-app.vercel.app/api/health`
- [ ] 数据查询正常: `https://your-app.vercel.app/api/simple-records`
- [ ] 快捷指令可发送数据
- [ ] AI 聊天功能正常
- [ ] 图表数据显示正常

### 功能验证
- [ ] 所有图表正常渲染
- [ ] 数据筛选功能正常
- [ ] AI 分析生成正常
- [ ] 聊天机器人响应正常
- [ ] 原始数据查看正常

## 🔄 数据同步

### 本地 → 云端
```bash
# 导出本地数据
sqlite3 ../LOCAL_BACKUP/data/records.db .dump > local_data.sql

# 导入到 Turso
turso db shell personal-website-prod < local_data.sql
```

### 云端 → 本地
```bash
# 从 Turso 导出
turso db shell personal-website-prod .dump > cloud_data.sql

# 导入到本地
sqlite3 ../LOCAL_BACKUP/data/records.db < cloud_data.sql
```

## 🚨 故障排除

### 常见问题
1. **API 返回 500 错误**
   - 检查环境变量配置
   - 查看 Vercel 函数日志

2. **数据库连接失败**
   - 验证 Turso 连接字符串
   - 检查认证令牌有效性

3. **AI 服务不响应**
   - 确认 API 密钥正确
   - 检查服务商配额

### 监控和日志
- Vercel 函数日志: `vercel logs`
- Turso 数据库监控: Turso Dashboard
- AI 服务使用情况: 各服务商控制台

## 🎉 部署完成

部署成功后，你将拥有：
- 🌐 **全球可访问**的个人数据分析网站
- 📱 **24/7 可用**的快捷指令数据接收
- 🤖 **智能 AI 分析**和聊天功能
- 📊 **实时数据可视化**和趋势分析
- 🔒 **云端数据安全**和自动备份

同时保留本地版本作为开发和备份环境！

