# Figma前端设计集成指南

## 🎨 概述

这个项目已经为你配置好了完整的Figma前端设计集成环境，包括：

- 📦 预配置的React组件库
- 🎯 Figma设计风格的CSS变量系统
- 📱 响应式设计支持
- 🔧 完整的开发环境

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 2. 启动开发服务器

```bash
# 方法1: 使用快速启动脚本
node start-figma-demo.js

# 方法2: 分别启动
# 终端1 - 启动前端
cd frontend
npm start

# 终端2 - 启动后端
cd backend
npm start
```

### 3. 访问应用

- 🌐 前端地址: http://localhost:3000
- 🔗 后端地址: http://localhost:5000

## 📁 项目结构

```
个人网站/personal-website-ai/
├── frontend/
│   ├── src/
│   │   ├── components/          # Figma组件
│   │   │   ├── FigmaButton.js
│   │   │   ├── FigmaCard.js
│   │   │   ├── FigmaInput.js
│   │   │   ├── FigmaBadge.js
│   │   │   └── FigmaExample.js
│   │   ├── styles/             # 样式文件
│   │   │   ├── figma-theme.css
│   │   │   └── components.css
│   │   └── assets/
│   │       └── images/         # 图片资源
│   └── public/
├── backend/                     # 后端API
├── FIGMA_INTEGRATION_GUIDE.md  # 详细集成指南
└── start-figma-demo.js         # 快速启动脚本
```

## 🎯 可用组件

### FigmaButton - 按钮组件

```jsx
import FigmaButton from './components/FigmaButton';

// 基础用法
<FigmaButton>点击我</FigmaButton>

// 不同样式
<FigmaButton variant="primary">主要按钮</FigmaButton>
<FigmaButton variant="secondary">次要按钮</FigmaButton>
<FigmaButton variant="outline">轮廓按钮</FigmaButton>
<FigmaButton variant="ghost">幽灵按钮</FigmaButton>

// 不同尺寸
<FigmaButton size="sm">小按钮</FigmaButton>
<FigmaButton size="lg">大按钮</FigmaButton>

// 状态
<FigmaButton loading>加载中...</FigmaButton>
<FigmaButton disabled>禁用按钮</FigmaButton>
```

### FigmaCard - 卡片组件

```jsx
import FigmaCard from './components/FigmaCard';

// 基础卡片
<FigmaCard title="标题" subtitle="副标题">
  卡片内容
</FigmaCard>

// 高亮卡片
<FigmaCard title="高亮卡片" elevated>
  带有阴影效果的卡片
</FigmaCard>

// 带页脚的卡片
<FigmaCard 
  title="带页脚" 
  footer={<button>操作按钮</button>}
>
  卡片内容
</FigmaCard>
```

### FigmaInput - 输入框组件

```jsx
import FigmaInput from './components/FigmaInput';

// 基础输入框
<FigmaInput label="姓名" placeholder="请输入姓名" />

// 带验证的输入框
<FigmaInput 
  label="邮箱" 
  type="email" 
  required 
  error="请输入有效的邮箱地址"
/>

// 成功状态
<FigmaInput 
  label="用户名" 
  success 
  value="valid_username"
/>
```

### FigmaBadge - 徽章组件

```jsx
import FigmaBadge from './components/FigmaBadge';

<FigmaBadge variant="primary">主要</FigmaBadge>
<FigmaBadge variant="success">成功</FigmaBadge>
<FigmaBadge variant="warning">警告</FigmaBadge>
<FigmaBadge variant="error">错误</FigmaBadge>
```

## 🎨 自定义样式

### 修改颜色主题

编辑 `frontend/src/styles/figma-theme.css` 文件中的CSS变量：

```css
:root {
  --primary-color: #你的主色;
  --secondary-color: #你的次色;
  --text-primary: #你的主文本色;
  --background-primary: #你的背景色;
}
```

### 添加新组件

1. 在 `frontend/src/components/` 创建新组件文件
2. 在 `frontend/src/styles/components.css` 添加样式
3. 导入并使用新组件

## 📱 响应式设计

所有组件都支持响应式设计，会自动适应不同屏幕尺寸：

- 📱 移动端 (< 768px)
- 📱 平板 (768px - 1024px)
- 🖥️ 桌面 (> 1024px)

## 🔧 开发工具

### 查看组件示例

访问 `http://localhost:3000` 查看完整的组件示例页面。

### 调试样式

使用浏览器开发者工具查看CSS变量和样式：

```javascript
// 在控制台中查看CSS变量
getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
```

## 📦 部署

### 构建生产版本

```bash
cd frontend
npm run build
```

### 配置后端服务静态文件

在 `backend/app.js` 中添加：

```javascript
app.use(express.static(path.join(__dirname, '../frontend/build')));
```

## 🐛 常见问题

### 1. 样式不生效
- 确保CSS文件已正确导入
- 检查浏览器缓存
- 确认CSS类名正确

### 2. 组件不渲染
- 检查组件导入路径
- 确认JSX语法正确
- 查看浏览器控制台错误

### 3. 图片不显示
- 确认图片路径正确
- 检查图片是否在 `public` 目录下
- 使用相对路径引用图片

## 📚 下一步

1. 🎨 根据你的Figma设计调整颜色和字体
2. 🔧 创建更多自定义组件
3. ✨ 添加动画和交互效果
4. 🚀 优化性能和用户体验
5. 📱 测试不同设备的兼容性

## 🤝 支持

如果遇到问题，请检查：

- 📋 控制台错误信息
- 🌐 网络请求状态
- 📁 文件路径是否正确
- 📦 依赖是否正确安装

---

**🎉 现在你可以开始使用Figma组件来构建你的个人网站了！** 