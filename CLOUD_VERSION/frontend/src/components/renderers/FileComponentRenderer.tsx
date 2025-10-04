import React from 'react';

export const fileRenderer = {
  type: 'file',
  render: (instance: any, isEditing: boolean, onUpdate: (id: string, content: string) => void, onConfigUpdate: (id: string, config: any) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpdate(instance.id, files.map(f => f.name).join(', '));
      }
    };

    return (
      <div className="file-component">
        <div className="component-header">
          <h3 className="component-title">{instance.title || '文件组件'}</h3>
        </div>
        <div className="component-content">
          {isEditing ? (
            <div className="file-upload-group">
              <div className="file-upload-area">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id={`file-upload-${instance.id}`}
                  onChange={handleFileChange}
                />
                <button 
                  className="file-upload-button" 
                  onClick={() => document.getElementById(`file-upload-${instance.id}`)?.click()}
                >
                  选择文件
                </button>
                <div className="file-upload-hint">支持多个文件上传</div>
              </div>
            </div>
          ) : (
            <div className="file-display">
              {instance.content ? (
                <div className="file-files">
                  {instance.content.split(', ').map((fileName: string, index: number) => (
                    <div key={index} className="file-file-item">
                      <span className="file-icon">📎</span>
                      <span className="file-name">{fileName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-content">暂无文件</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
};
