import React from 'react';
import { ComponentInstance } from '../DynamicComponentRenderer';

// AI自定义组件渲染器
export const aiCustomRenderer = {
  type: 'ai-custom',
  render: (instance: ComponentInstance, isEditing: boolean, onUpdate: (id: string, content: string) => void, onConfigUpdate: (id: string, config: any) => void) => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="inline-block px-3 py-1 text-base font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">
        {instance.title}
      </h4>
      <div className="text-sm text-gray-600">
        {isEditing ? (
          <div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">AI提示词：</label>
              <textarea
                value={instance.config?.prompt || ''}
                onChange={(e) => onConfigUpdate(instance.id, { prompt: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="输入AI分析提示词"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">分析结果：</label>
              <textarea
                value={instance.content || ''}
                onChange={(e) => onUpdate(instance.id, e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="AI分析结果将显示在这里"
              />
            </div>
          </div>
        ) : (
          <div>
            {instance.config?.prompt ? (
              <div>
                <div className="mb-2">
                  <strong>提示词：</strong>
                  <div className="mt-1 p-2 bg-white rounded border text-xs">
                    {instance.config.prompt}
                  </div>
                </div>
                <div className="mt-3">
                  {instance.content ? (
                    <div>
                      <strong>分析结果：</strong>
                      <div className="mt-1 p-2 bg-white rounded border text-xs whitespace-pre-wrap">
                        {instance.content}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      点击&quot;AI助手&quot;按钮开始分析
                    </div>
                  )}
                </div>
              </div>
            ) : '未设置AI提示词'}
          </div>
        )}
      </div>
    </div>
  )
};
