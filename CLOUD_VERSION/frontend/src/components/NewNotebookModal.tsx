import React, { useState, useEffect } from 'react';
import apiClient from '../apiClient';
import { triggerConfigUpdate, validateComponentConfig, smartSync, SyncDirection, ComponentConfig } from '../utils/componentSync';

// ComponentConfig 接口从 componentSync.ts 导入

interface ComponentInstance {
  id: string;
  type: string;
  title: string;
  content?: string;
  config?: any;
}

// 记录组件类型
interface RecordComponentType {
  id: string;
  label: string;
  icon: string;
  description: string;
}

// 分析组件类型
interface AnalysisComponentType {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const recordComponentTypes: RecordComponentType[] = [
  { id: 'text-short', label: '短文本', icon: '📝', description: '用于记录标题等短文本内容' },
  { id: 'text-long', label: '长文本', icon: '📄', description: '用于记录段落等长文本内容' },
  { id: 'date', label: '日期组件', icon: '📅', description: '用于记录日期和时间' },
  { id: 'number', label: '数字组件', icon: '🔢', description: '用于记录数字数据' },
  { id: 'image', label: '图片组件', icon: '🖼️', description: '用于上传和显示图片' },
  { id: 'video', label: '视频组件', icon: '🎥', description: '用于上传和播放视频' },
  { id: 'audio', label: '音频组件', icon: '🎵', description: '用于上传和播放音频' },
  { id: 'file', label: '文件组件', icon: '📄', description: '用于上传和下载文件' },
];

const analysisComponentTypes: AnalysisComponentType[] = [
  { id: 'ai-custom', label: 'AI组件', icon: '🤖', description: '自定义AI分析组件' },
  { id: 'chart', label: '图表组件', icon: '📊', description: '数据可视化图表' },
];

// 移除预设笔记本配置 - 用户完全自由配置组件

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewNotebookModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // 组件配置状态
  const [selectedRecordComponents, setSelectedRecordComponents] = useState<string[]>([]);
  const [selectedAnalysisComponents, setSelectedAnalysisComponents] = useState<string[]>([]);
  const [componentInstances, setComponentInstances] = useState<ComponentInstance[]>([]);
  const [componentCounts, setComponentCounts] = useState<Record<string, number>>({});
  // 移除预设选择状态

  // 处理记录组件选择
  const handleRecordComponentToggle = (componentId: string) => {
    const isCurrentlySelected = selectedRecordComponents.includes(componentId);
    
    setSelectedRecordComponents(prev => 
      isCurrentlySelected
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
    
    // 如果选中组件且数量为0，设置默认数量为1
    if (!isCurrentlySelected && (componentCounts[componentId] || 0) === 0) {
      updateComponentCount(componentId, 1);
    }
  };

  // 处理分析组件选择
  const handleAnalysisComponentToggle = (componentId: string) => {
    const isCurrentlySelected = selectedAnalysisComponents.includes(componentId);
    
    setSelectedAnalysisComponents(prev => 
      isCurrentlySelected
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
    
    // 如果选中组件且数量为0，设置默认数量为1
    if (!isCurrentlySelected && (componentCounts[componentId] || 0) === 0) {
      updateComponentCount(componentId, 1);
    }
  };

  // 更新组件数量
  const updateComponentCount = (componentType: string, count: number) => {
    setComponentCounts(prev => ({
      ...prev,
      [componentType]: count
    }));

    // 更新组件实例
    const currentInstances = componentInstances.filter(instance => instance.type !== componentType);
    const newInstances: ComponentInstance[] = [];
    
    for (let i = 0; i < count; i++) {
      newInstances.push({
        id: `${componentType}-${Date.now()}-${i}`,
        type: componentType,
        title: `${analysisComponentTypes.find(c => c.id === componentType)?.label || componentType} ${i + 1}`,
        content: '',
        config: {}
      });
    }
    
    setComponentInstances([...currentInstances, ...newInstances]);
  };

  // 移除预设选择处理函数 - 用户完全自由配置

  // 重置表单
  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedRecordComponents([]);
    setSelectedAnalysisComponents([]);
    setComponentInstances([]);
    setComponentCounts({});
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const componentConfig: ComponentConfig = {
        componentInstances: componentInstances
      };

      const { data } = await apiClient.post('/api/notebooks', { 
        name: trimmed,
        description: description.trim() || undefined,
        componentConfig: componentConfig
      });
      
      if (data && data.success) {
        // 双向同步：将新笔记本的组件实例同步到所有相关笔记（如果有的话）
        try {
          console.log('🔄 开始双向同步新笔记本组件实例...');
          const syncResult = await smartSync(data.notebook?.notebook_id, componentInstances, 'notebook');
          
          if (syncResult.success) {
            console.log('✅ 新笔记本组件实例同步成功:', syncResult.message);
          } else {
            console.warn('⚠️ 新笔记本组件实例同步失败:', syncResult.message);
            // 不阻止笔记本创建，只记录警告
          }
        } catch (syncError) {
          console.error('❌ 新笔记本组件实例同步异常:', syncError);
          // 不阻止笔记本创建，只记录错误
        }
        
        // 通知全局刷新并打开新笔记本
        const event = new CustomEvent('notebook:created', { detail: { id: data.notebook?.notebook_id } });
        window.dispatchEvent(event);
        onClose();
        setTimeout(() => resetForm(), 0);
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="text-base font-semibold text-slate-800">新建笔记本</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {/* 移除预设选择 - 用户完全自由配置组件 */}

          {/* 基本信息 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">笔记本名称 *</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="请输入笔记本名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
              <textarea
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="请输入笔记本描述（可选）"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* 记录组件配置 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">记录组件</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recordComponentTypes.map((component) => (
                <div
                  key={component.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRecordComponents.includes(component.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleRecordComponentToggle(component.id)}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{component.icon}</div>
                    <div className="text-xs font-medium text-slate-700">{component.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{component.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 分析组件配置 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">分析组件</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {analysisComponentTypes.map((component) => (
                <div
                  key={component.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAnalysisComponents.includes(component.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleAnalysisComponentToggle(component.id)}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{component.icon}</div>
                    <div className="text-xs font-medium text-slate-700">{component.label}</div>
                    <div className="text-xs text-slate-500 mt-1">{component.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 组件实例配置 */}
          {componentInstances.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-700 mb-3">组件实例配置</h3>
              <div className="space-y-3">
                {componentInstances.map((instance) => (
                  <div key={instance.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-700">{instance.title}</span>
                        <span className="text-xs text-slate-500">({instance.type})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={componentCounts[instance.type] || 1}
                          onChange={(e) => updateComponentCount(instance.type, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <span className="text-xs text-slate-500">个</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-center gap-6 flex-shrink-0">
          <button 
            disabled={!name.trim() || submitting} 
            onClick={handleSubmit} 
            className={`px-6 h-10 rounded-lg text-white text-sm font-medium transition-all duration-200 ${
              !name.trim() || submitting 
                ? 'bg-red-300 border-2 border-red-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-2 border-red-500 hover:border-red-600 shadow-lg hover:shadow-xl'
            }`}
            style={{ 
              writingMode: 'horizontal-tb',
              textOrientation: 'mixed',
              direction: 'ltr',
              unicodeBidi: 'normal',
              transform: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed' }}>新增</span>
          </button>
          <button 
            onClick={onClose} 
            className="px-6 h-10 rounded-lg border-2 border-red-300 bg-white text-red-600 text-sm hover:bg-red-50 hover:border-red-400 transition-all duration-200 font-medium"
            style={{ 
              writingMode: 'horizontal-tb',
              textOrientation: 'mixed',
              direction: 'ltr',
              unicodeBidi: 'normal',
              transform: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ writingMode: 'horizontal-tb', textOrientation: 'mixed' }}>删除</span>
          </button>
        </div>
      </div>
    </div>
  );
}


