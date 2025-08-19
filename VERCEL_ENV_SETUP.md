# Vercel 环境变量配置指南

## 🎯 已创建的 Turso 数据库信息

- **数据库名称**: personal-website-data
- **用户**: gwen-z
- **地区**: aws-ap-northeast-1

## 📋 需要在 Vercel 中配置的环境变量

### 1. TURSO_DATABASE_URL
```
libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io
```

### 2. TURSO_AUTH_TOKEN
```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTU1ODgxMzAsImlkIjoiODNlYTk1MTgtOWQwNC00MjAzLWJkNTEtMzlhMWNlNDI5NGEzIiwicmlkIjoiMGY3MWIzNDQtOTkzZC00MWE0LTlmMGYtOGEwYTQ0OWI2YTQ3In0.B-G9Gl9ghOhCcFuaAvd-HAK5HSyu4J3jTcdIn_fWwuQd8PLwp66DXjB5WAYDeurpNqhQMRi590jnIBhbnCRGAg
```

## 🔧 在 Vercel 中配置步骤

### 方法一：通过 Vercel 控制台
1. 访问你的 Vercel 项目：https://vercel.com/dashboard
2. 选择你的项目（personal-website-ai）
3. 点击 **Settings** 标签
4. 点击左侧菜单的 **Environment Variables**
5. 添加两个环境变量：
   - Name: `TURSO_DATABASE_URL`, Value: `libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io`
   - Name: `TURSO_AUTH_TOKEN`, Value: `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...`
6. 点击 **Save**
7. 重新部署项目

### 方法二：通过 Vercel CLI
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 在项目根目录执行
vercel env add TURSO_DATABASE_URL
# 粘贴 URL: libsql://personal-website-data-gwen-z.aws-ap-northeast-1.turso.io

vercel env add TURSO_AUTH_TOKEN
# 粘贴 Token: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## 🚀 部署项目

### 首次部署
```bash
# 确保在项目根目录
cd /Users/guanchenzhan/Desktop/VSCODE/个人网站/personal-website-ai

# 部署到 Vercel
vercel --prod
```

### 后续更新
```bash
# 推送到 GitHub 主分支会自动触发部署
git add .
git commit -m "Add cloud database support"
git push origin main
```

## 📊 测试部署

部署完成后，你会得到一个类似这样的 URL：
```
https://personal-website-ai-xxx.vercel.app
```

### 1. 健康检查
访问：`https://your-app.vercel.app/api/health`

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-19T...",
  "service": "Personal Website AI API",
  "database": "configured",
  "version": "1.0.0",
  "endpoints": [...]
}
```

### 2. 使用测试脚本
```bash
# 设置环境变量
export VERCEL_API_URL="https://your-app.vercel.app"

# 运行测试
npm run test:vercel
```

## 🔄 更新快捷指令

部署成功后，需要更新 iPhone 快捷指令：

1. 打开快捷指令 App
2. 找到"每日数据记录"快捷指令
3. 编辑快捷指令
4. 找到"获取 URL 内容"操作
5. 将 URL 从 `http://192.168.31.23:3001/api/raw-entry` 
   改为 `https://your-app.vercel.app/api/raw-entry`
6. 保存快捷指令

## 🛠️ 故障排除

### 1. 数据库连接失败
- 检查环境变量是否正确配置
- 确认 Turso 令牌未过期
- 重新部署项目

### 2. API 404 错误
- 确认 API 路由正确
- 检查 vercel.json 配置
- 查看 Vercel 部署日志

### 3. CORS 错误
- 已在 API 中配置 CORS 头部
- 如有问题，检查请求方法和头部

### 4. 快捷指令连接失败
- 确认 Vercel 域名正确
- 检查网络连接
- 验证数据格式
