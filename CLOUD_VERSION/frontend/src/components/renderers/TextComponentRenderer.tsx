import React from 'react';
import { ComponentInstance } from '../DynamicComponentRenderer';

// 短文本组件渲染器
export const textShortRenderer = {
  type: 'text-short',
  render: (instance: ComponentInstance, isEditing: boolean, onUpdate: (id: string, content: string) => void) => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="inline-block px-3 py-1 text-base font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">
        {instance.title}
      </h4>
      {isEditing ? (
        <input
          type="text"
          value={instance.content || ''}
          onChange={(e) => onUpdate(instance.id, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="输入短文本..."
        />
      ) : (
        <div className="text-sm text-gray-600">
          {instance.content || '未设置'}
        </div>
      )}
    </div>
  )
};

// 长文本组件渲染器
export const textLongRenderer = {
  type: 'text-long',
  render: (instance: ComponentInstance, isEditing: boolean, onUpdate: (id: string, content: string) => void) => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="inline-block px-3 py-1 text-base font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">
        {instance.title}
      </h4>
      {isEditing ? (
        <textarea
          value={instance.content || ''}
          onChange={(e) => onUpdate(instance.id, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[200px]"
          rows={8}
          placeholder="输入长文本..."
        />
      ) : (
        <div className="text-sm text-gray-600 whitespace-pre-wrap">
          {instance.content || '未设置'}
        </div>
      )}
    </div>
  )
};
