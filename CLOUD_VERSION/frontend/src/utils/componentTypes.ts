// 组件类型定义
export interface ComponentType {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface ChartType {
  id: string;
  label: string;
  icon: string;
}

// 记录组件类型
export const recordComponentTypes: ComponentType[] = [
  { id: 'text-short', label: '短文本', icon: '📝', description: '输入简短文本内容' },
  { id: 'text-long', label: '长文本', icon: '📄', description: '输入长文本内容' },
  { id: 'date', label: '日期', icon: '📅', description: '选择日期' },
  { id: 'number', label: '数字', icon: '🔢', description: '输入数字' },
  { id: 'image', label: '图片', icon: '🖼️', description: '上传图片' },
  { id: 'video', label: '视频', icon: '🎥', description: '上传视频' },
  { id: 'audio', label: '音频', icon: '🎵', description: '上传音频' },
  { id: 'file', label: '文件', icon: '📎', description: '上传文件' },
];

// 分析组件类型
export const analysisComponentTypes: ComponentType[] = [
  { id: 'ai-custom', label: 'AI组件', icon: '🤖', description: 'AI智能分析组件' },
  { id: 'chart', label: '图表', icon: '📊', description: '数据可视化图表' },
];

// 图表类型
export const chartTypes: ChartType[] = [
  { id: 'bar', label: '柱状图', icon: '📊' },
  { id: 'bubble', label: '气泡图', icon: '🫧' },
  { id: 'gantt', label: '甘特图', icon: '📅' },
];

// 获取组件标题的辅助函数
export const getComponentTitle = (componentType: string): string => {
  const allComponents = [...recordComponentTypes, ...analysisComponentTypes];
  const component = allComponents.find(c => c.id === componentType);
  return component ? component.label : '未知组件';
};

// 根据类型获取组件信息
export const getComponentInfo = (componentType: string): ComponentType | undefined => {
  const allComponents = [...recordComponentTypes, ...analysisComponentTypes];
  return allComponents.find(c => c.id === componentType);
};
