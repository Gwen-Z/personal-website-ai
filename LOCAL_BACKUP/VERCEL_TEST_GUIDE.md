# Vercel数据测试指南

## 测试步骤

### 1. 环境准备

首先确保安装了必要的依赖：

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
```

### 2. 本地测试

在测试Vercel之前，先确保本地环境正常：

```bash
# 启动后端服务
cd backend
npm start

# 在另一个终端启动前端
cd frontend
npm start
```

### 3. Vercel测试

#### 方法一：使用测试脚本

1. 设置环境变量（替换为你的实际Vercel后端URL）：
   ```bash
   export VERCEL_API_URL="https://your-backend-app.vercel.app"
   ```

2. 运行测试：
   ```bash
   npm run test:vercel
   ```

#### 方法二：手动测试

1. **健康检查**：
   ```bash
   curl https://your-backend-app.vercel.app/health
   ```

2. **添加测试数据**：
   ```bash
   curl -X POST https://your-backend-app.vercel.app/api/record \
     -H "Content-Type: application/json" \
     -d '{
       "date": "2024-01-15",
       "mood": 4,
       "life": 3,
       "study": 4,
       "work": 3,
       "inspiration": 4,
       "note": "测试数据"
     }'
   ```

3. **获取数据**：
   ```bash
   curl https://your-backend-app.vercel.app/api/records
   ```

4. **AI分析**：
   ```bash
   curl "https://your-backend-app.vercel.app/api/ai-analysis?period=all"
   ```

### 4. 前端测试

1. 设置前端环境变量：
   ```bash
   # 在frontend目录创建.env文件
   echo "REACT_APP_API_URL=https://your-backend-app.vercel.app" > frontend/.env
   ```

2. 启动前端：
   ```bash
   cd frontend
   npm start
   ```

3. 在浏览器中测试：
   - 访问 http://localhost:3000
   - 尝试添加新记录
   - 查看数据表格
   - 测试AI分析功能

## 常见问题排查

### 1. 连接错误

**症状**：无法连接到Vercel API

**解决方案**：
- 检查Vercel后端是否已部署
- 验证API URL是否正确
- 确认网络连接正常

### 2. CORS错误

**症状**：浏览器控制台显示CORS错误

**解决方案**：
- 检查后端CORS配置
- 确认前端请求的域名在CORS允许列表中

### 3. 数据格式错误

**症状**：API返回400错误

**解决方案**：
- 检查请求数据格式
- 确认所有必需字段都已提供
- 验证数据类型是否正确

### 4. 环境变量问题

**症状**：前端无法连接到后端

**解决方案**：
- 检查REACT_APP_API_URL环境变量
- 重新构建前端应用
- 确认Vercel环境变量设置正确

## 测试检查清单

- [ ] 本地后端服务正常启动
- [ ] 本地前端可以正常访问
- [ ] Vercel后端已部署并可访问
- [ ] 健康检查接口正常响应
- [ ] 数据添加接口正常工作
- [ ] 数据获取接口返回正确格式
- [ ] AI分析接口正常工作
- [ ] 前端可以连接到Vercel后端
- [ ] 所有功能在Vercel环境下正常

## 调试技巧

1. **查看Vercel日志**：
   - 在Vercel控制台查看部署日志
   - 检查函数执行日志

2. **使用浏览器开发者工具**：
   - 查看Network标签页
   - 检查Console错误信息

3. **API测试工具**：
   - 使用Postman或curl测试API
   - 验证请求和响应格式

## 成功标准

测试成功的标志：
- ✅ 所有API端点正常响应
- ✅ 数据可以正确添加和获取
- ✅ 前端可以正常显示数据
- ✅ AI分析功能正常工作
- ✅ 没有CORS或网络错误 