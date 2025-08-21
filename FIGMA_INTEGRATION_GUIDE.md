# Figma前端设计集成指南

## 概述
本指南将帮助你将Figma设计转换为代码并配置到现有的个人网站项目中。

## 项目结构
```
个人网站/personal-website-ai/
├── backend/          # 后端API服务
│   ├── app.js       # Express服务器
│   ├── package.json # 后端依赖
│   └── ...
├── frontend/        # 前端React应用
│   ├── src/         # 源代码
│   ├── public/      # 静态资源
│   ├── package.json # 前端依赖
│   └── ...
└── FIGMA_INTEGRATION_GUIDE.md # 本指南
```

## 步骤1: 从Figma导出设计资源

### 1.1 导出图片资源
1. 在Figma中选择需要导出的组件
2. 右键选择 "Export"
3. 选择合适的格式（PNG/SVG）
4. 导出到 `frontend/public/images/` 目录

### 1.2 获取设计规范
1. 颜色值（HEX/RGB）
2. 字体样式和大小
3. 间距和布局尺寸
4. 组件尺寸

## 步骤2: 配置前端样式

### 2.1 创建样式文件
在 `frontend/src/` 目录下创建以下文件：

```css
/* styles/figma-theme.css */
:root {
  /* 从Figma复制的颜色变量 */
  --primary-color: #your-color;
  --secondary-color: #your-color;
  --text-color: #your-color;
  --background-color: #your-color;
  
  /* 字体变量 */
  --font-family: 'Your-Font', sans-serif;
  --font-size-small: 14px;
  --font-size-medium: 16px;
  --font-size-large: 18px;
  --font-size-xl: 24px;
  
  /* 间距变量 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### 2.2 创建组件样式
```css
/* styles/components.css */
.figma-button {
  background: var(--primary-color);
  border: none;
  border-radius: 8px;
  padding: var(--spacing-sm) var(--spacing-md);
  font-family: var(--font-family);
  font-size: var(--font-size-medium);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.figma-card {
  background: white;
  border-radius: 12px;
  padding: var(--spacing-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

## 步骤3: 创建React组件

### 3.1 创建组件目录结构
```
frontend/src/
├── components/
│   ├── FigmaHeader.js
│   ├── FigmaHero.js
│   ├── FigmaCard.js
│   ├── FigmaButton.js
│   └── FigmaFooter.js
├── styles/
│   ├── figma-theme.css
│   ├── components.css
│   └── layout.css
└── assets/
    └── images/
```

### 3.2 示例组件代码
```jsx
// components/FigmaButton.js
import React from 'react';
import '../styles/components.css';

const FigmaButton = ({ children, onClick, variant = 'primary' }) => {
  return (
    <button 
      className={`figma-button figma-button--${variant}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default FigmaButton;
```

## 步骤4: 集成到现有App.js

### 4.1 导入Figma样式
在 `App.js` 顶部添加：
```javascript
import './styles/figma-theme.css';
import './styles/components.css';
```

### 4.2 使用Figma组件
```jsx
import FigmaButton from './components/FigmaButton';
import FigmaCard from './components/FigmaCard';

// 在现有组件中使用
<FigmaButton onClick={handleClick}>
  点击我
</FigmaButton>
```

## 步骤5: 响应式设计

### 5.1 添加媒体查询
```css
/* styles/responsive.css */
@media (max-width: 768px) {
  .figma-card {
    padding: var(--spacing-md);
  }
  
  .figma-button {
    font-size: var(--font-size-small);
  }
}
```

## 步骤6: 运行和测试

### 6.1 启动前端开发服务器
```bash
cd 个人网站/personal-website-ai/frontend
npm start
```

### 6.2 启动后端服务器
```bash
cd 个人网站/personal-website-ai/backend
npm start
```

## 步骤7: 部署配置

### 7.1 构建前端
```bash
cd frontend
npm run build
```

### 7.2 配置后端服务静态文件
在 `backend/app.js` 中添加：
```javascript
app.use(express.static(path.join(__dirname, '../frontend/build')));
```

## 常见问题解决

### 问题1: 样式不生效
- 检查CSS文件是否正确导入
- 确认CSS类名是否正确
- 检查浏览器开发者工具

### 问题2: 图片不显示
- 确认图片路径正确
- 检查图片是否在 `public` 目录下
- 使用相对路径引用图片

### 问题3: 组件不渲染
- 检查组件是否正确导入
- 确认JSX语法正确
- 查看浏览器控制台错误信息

## 最佳实践

1. **保持一致性**: 使用CSS变量确保设计一致性
2. **组件化**: 将重复的UI元素封装为组件
3. **响应式**: 确保在不同设备上都能正常显示
4. **性能优化**: 压缩图片，使用适当的图片格式
5. **可访问性**: 添加适当的ARIA标签和键盘导航

## 下一步

1. 根据你的具体Figma设计调整颜色和字体
2. 创建更多自定义组件
3. 添加动画和交互效果
4. 优化性能和用户体验

## 联系支持

如果在集成过程中遇到问题，请检查：
- 控制台错误信息
- 网络请求状态
- 文件路径是否正确
- 依赖是否正确安装 