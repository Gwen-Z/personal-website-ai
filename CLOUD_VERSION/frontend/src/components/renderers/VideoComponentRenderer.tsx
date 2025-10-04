import React from 'react';

export const videoRenderer = {
  type: 'video',
  render: (instance: any, isEditing: boolean, onUpdate: (id: string, content: string) => void, onConfigUpdate: (id: string, config: any) => void) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onUpdate(instance.id, files.map(f => f.name).join(', '));
      }
    };

    return (
      <div className="video-component">
        <div className="component-header">
          <h3 className="component-title">{instance.title || '视频组件'}</h3>
        </div>
        <div className="component-content">
          {isEditing ? (
            <div className="file-upload-group">
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  id={`video-upload-${instance.id}`}
                  onChange={handleFileChange}
                />
                <button 
                  className="file-upload-button" 
                  onClick={() => document.getElementById(`video-upload-${instance.id}`)?.click()}
                >
                  选择视频
                </button>
                <div className="file-upload-hint">支持多个视频文件上传</div>
              </div>
            </div>
          ) : (
            <div className="video-display">
              {instance.content ? (
                <div className="video-files">
                  {instance.content.split(', ').map((fileName: string, index: number) => (
                    <div key={index} className="video-file-item">
                      <span className="video-icon">🎥</span>
                      <span className="video-name">{fileName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-content">暂无视频文件</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
};
