import React from 'react';
import { ComponentInstance } from '../DynamicComponentRenderer';
import './ImageComponent.css';

// 图片组件渲染器
export const imageRenderer = {
  type: 'image',
  render: (instance: ComponentInstance, isEditing: boolean, onUpdate: (id: string, content: string) => void) => (
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="inline-block px-3 py-1 text-base font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">
        {instance.title}
      </h4>
      
      {isEditing ? (
        // 编辑模式：显示与新建组件相同的上传界面
        <div className="file-upload-group">
          <div className="file-upload-area">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id={`image-upload-${instance.id}`}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                onUpdate(instance.id, files.map(f => f.name).join(', '));
              }}
            />
            <button 
              className="file-upload-button" 
              onClick={() => document.getElementById(`image-upload-${instance.id}`)?.click()}
            >
              选择图片
            </button>
            <div className="file-upload-hint">支持多张图片上传或直接粘贴</div>
          </div>
          
          {/* 显示已上传的图片 */}
          {instance.content && (
            <div className="image-grid">
              {instance.content.split(',').map((url, index) => (
                <div key={index} className="image-item">
                  <img
                    src={url.trim()}
                    alt={`图片 ${index + 1}`}
                    className="image-preview"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <button 
                    className="image-delete-button"
                    onClick={() => {
                      const urls = (instance.content || '').split(',').filter((_, i) => i !== index);
                      onUpdate(instance.id, urls.join(', '));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // 查看模式：显示图片网格
        <div className="text-sm text-gray-600">
          {instance.content ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {instance.content.split(',').map((url, index) => (
                <img
                  key={index}
                  src={url.trim()}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic">未上传图片</div>
          )}
        </div>
      )}
    </div>
  )
};
