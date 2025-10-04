import React from 'react';
import { ComponentInstance } from '../DynamicComponentRenderer';

// 日期组件渲染器
export const dateRenderer = {
  type: 'date',
  render: (instance: ComponentInstance, isEditing: boolean, onUpdate: (id: string, content: string) => void) => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="inline-block px-3 py-1 text-base font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">
        {instance.title}
      </h4>
      {isEditing ? (
        <input
          type="date"
          value={instance.content || ''}
          onChange={(e) => onUpdate(instance.id, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      ) : (
        <div className="text-sm text-gray-600">
          {instance.content ? new Date(instance.content).toLocaleString('zh-CN') : '未设置'}
        </div>
      )}
    </div>
  )
};
