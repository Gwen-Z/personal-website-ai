import React from 'react';

export const chartRenderer = {
  type: 'chart',
  render: (instance: any, isEditing: boolean, onUpdate: (id: string, content: string) => void, onConfigUpdate: (id: string, config: any) => void) => {
    const handleConfigChange = (key: string, value: any) => {
      const newConfig = { ...instance.config, [key]: value };
      onConfigUpdate(instance.id, newConfig);
    };

    return (
      <div className="chart-component">
        <div className="component-header">
          <h3 className="component-title">{instance.title || '图表组件'}</h3>
        </div>
        <div className="component-content">
          {isEditing ? (
            <div className="chart-config">
              <div className="config-group">
                <label className="config-label">图表类型</label>
                <select
                  value={instance.config?.chartType || 'bar'}
                  onChange={(e) => handleConfigChange('chartType', e.target.value)}
                  className="config-select"
                >
                  <option value="bar">柱状图</option>
                  <option value="line">折线图</option>
                  <option value="pie">饼图</option>
                  <option value="scatter">散点图</option>
                </select>
              </div>
              <div className="config-group">
                <label className="config-label">图表标题</label>
                <input
                  type="text"
                  value={instance.config?.title || ''}
                  onChange={(e) => handleConfigChange('title', e.target.value)}
                  className="config-input"
                  placeholder="请输入图表标题"
                />
              </div>
              <div className="config-group">
                <label className="config-label">数据源</label>
                <textarea
                  value={instance.config?.dataSource || ''}
                  onChange={(e) => handleConfigChange('dataSource', e.target.value)}
                  className="config-textarea"
                  placeholder="请输入数据源（JSON格式）"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="chart-display">
              {instance.config?.dataSource ? (
                <div className="chart-placeholder">
                  <div className="chart-icon">📊</div>
                  <div className="chart-title">{instance.config.title || '图表'}</div>
                  <div className="chart-type">{instance.config.chartType || 'bar'}</div>
                </div>
              ) : (
                <div className="no-content">暂无图表数据</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
};
