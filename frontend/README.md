# 个人数据分析前端

## 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm start
```

## Vercel部署配置

### 环境变量设置

在Vercel部署时，需要在项目设置中配置以下环境变量：

1. 进入Vercel项目设置
2. 找到"Environment Variables"部分
3. 添加以下环境变量：

```
REACT_APP_API_URL=https://your-backend-domain.vercel.app
```

### 后端部署

确保你的后端API已经部署到Vercel或其他平台，并更新前端的环境变量指向正确的API地址。

### 常见问题

1. **数据显示为undefined或NaN**：
   - 检查API地址是否正确
   - 确保后端API正常运行
   - 检查浏览器控制台是否有错误信息

2. **CORS错误**：
   - 确保后端已正确配置CORS
   - 检查API地址是否包含正确的协议（http/https）

3. **图表不显示**：
   - 检查数据格式是否正确
   - 确保数据中包含有效的数值 