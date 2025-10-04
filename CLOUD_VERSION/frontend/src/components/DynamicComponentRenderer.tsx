import React from 'react';

// 组件实例接口
export interface ComponentInstance {
  id: string;
  type: string;
  title: string;
  content?: string;
  config?: any;
}

// 组件渲染器接口
export interface ComponentRenderer {
  type: string;
  render: (instance: ComponentInstance, isEditing: boolean, onUpdate: (id: string, content: string) => void, onConfigUpdate: (id: string, config: any) => void) => React.ReactNode;
}

// 组件渲染器注册表
class ComponentRegistry {
  private renderers: Map<string, ComponentRenderer> = new Map();

  // 注册组件渲染器
  register(renderer: ComponentRenderer) {
    this.renderers.set(renderer.type, renderer);
  }

  // 获取组件渲染器
  getRenderer(type: string): ComponentRenderer | undefined {
    return this.renderers.get(type);
  }

  // 获取所有已注册的组件类型
  getRegisteredTypes(): string[] {
    return Array.from(this.renderers.keys());
  }

  // 检查组件类型是否已注册
  isRegistered(type: string): boolean {
    return this.renderers.has(type);
  }
}

// 全局组件注册表实例
export const componentRegistry = new ComponentRegistry();

// 动态组件渲染器组件
interface DynamicComponentRendererProps {
  instance: ComponentInstance;
  isEditing: boolean;
  onUpdate: (id: string, content: string) => void;
  onConfigUpdate: (id: string, config: any) => void;
}

export const DynamicComponentRenderer: React.FC<DynamicComponentRendererProps> = ({
  instance,
  isEditing,
  onUpdate,
  onConfigUpdate
}) => {
  const { type, title } = instance;
  
  // 获取对应的渲染器
  const renderer = componentRegistry.getRenderer(type);
  
  if (!renderer) {
    // 如果组件类型未注册，显示默认的通用组件
    return (
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="inline-block px-3 py-1 text-base font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">
          {title}
        </h4>
        <div className="text-sm text-gray-600">
          <div className="mb-2">
            <strong>组件类型：</strong>{type}
          </div>
          <div className="mb-2">
            <strong>内容：</strong>{instance.content || '未填写'}
          </div>
          {instance.config && (
            <div>
              <strong>配置：</strong>
              <pre className="text-xs bg-white p-2 rounded border mt-1">
                {JSON.stringify(instance.config, null, 2)}
              </pre>
            </div>
          )}
          <div className="text-yellow-600 text-xs mt-2">
            ⚠️ 此组件类型未注册渲染器，显示为通用组件
          </div>
        </div>
      </div>
    );
  }

  // 使用注册的渲染器渲染组件
  return (
    <>
      {renderer.render(instance, isEditing, onUpdate, onConfigUpdate)}
    </>
  );
};

// 导出组件注册表，供其他模块使用
export { ComponentRegistry };
