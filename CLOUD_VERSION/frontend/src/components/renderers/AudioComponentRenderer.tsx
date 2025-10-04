import React from 'react';

export const audioRenderer = {
  type: 'audio',
  render: (instance: any, isEditing: boolean, onUpdate: (id: string, content: string) => void, onConfigUpdate: (id: string, config: any) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpdate(instance.id, files.map(f => f.name).join(', '));
      }
    };

    return (
      <div className="audio-component">
        <div className="component-header">
          <h3 className="component-title">{instance.title || '音频组件'}</h3>
        </div>
        <div className="component-content">
          {isEditing ? (
            <div className="file-upload-group">
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  id={`audio-upload-${instance.id}`}
                  onChange={handleFileChange}
                />
                <button 
                  className="file-upload-button" 
                  onClick={() => document.getElementById(`audio-upload-${instance.id}`)?.click()}
                >
                  选择音频
                </button>
                <div className="file-upload-hint">支持多个音频文件上传</div>
              </div>
            </div>
          ) : (
            <div className="audio-display">
              {instance.content ? (
                <div className="audio-files">
                  {instance.content.split(', ').map((fileName: string, index: number) => (
                    <div key={index} className="audio-file-item">
                      <span className="audio-icon">🎵</span>
                      <span className="audio-name">{fileName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-content">暂无音频文件</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
};
