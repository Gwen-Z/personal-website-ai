import { componentRegistry } from '../DynamicComponentRenderer';
import { textShortRenderer, textLongRenderer } from './TextComponentRenderer';
import { dateRenderer } from './DateComponentRenderer';
import { numberRenderer } from './NumberComponentRenderer';
import { imageRenderer } from './ImageComponentRenderer';
import { aiCustomRenderer } from './AIComponentRenderer';
import { videoRenderer } from './VideoComponentRenderer';
import { audioRenderer } from './AudioComponentRenderer';
import { fileRenderer } from './FileComponentRenderer';
import { chartRenderer } from './ChartComponentRenderer';

// 注册所有组件渲染器
export const registerAllComponentRenderers = () => {
  // 注册文本组件
  componentRegistry.register(textShortRenderer);
  componentRegistry.register(textLongRenderer);
  
  // 注册日期组件
  componentRegistry.register(dateRenderer);
  
  // 注册数字组件
  componentRegistry.register(numberRenderer);
  
  // 注册图片组件
  componentRegistry.register(imageRenderer);
  
  // 注册AI组件
  componentRegistry.register(aiCustomRenderer);
  
  // 注册视频组件
  componentRegistry.register(videoRenderer);
  
  // 注册音频组件
  componentRegistry.register(audioRenderer);
  
  // 注册文件组件
  componentRegistry.register(fileRenderer);
  
  // 注册图表组件
  componentRegistry.register(chartRenderer);
  
  console.log('✅ 所有组件渲染器已注册');
  console.log('📋 已注册的组件类型:', componentRegistry.getRegisteredTypes());
};

// 导出组件注册表，供其他模块使用
export { componentRegistry } from '../DynamicComponentRenderer';
