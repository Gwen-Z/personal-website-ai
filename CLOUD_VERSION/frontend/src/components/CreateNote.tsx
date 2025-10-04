import React, { useState } from 'react';
import apiClient from '../apiClient';
import { smartSync } from '../utils/componentSync';
import { recordComponentTypes, analysisComponentTypes, chartTypes } from '../utils/componentTypes';

// Card component
const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    {children}
  </div>
);

// Bubble interface
interface Bubble {
  id: string;
  label: string;
  size: 'large' | 'medium' | 'small';
  color: string;
  x: number;
  y: number;
}

// Notebook type bubbles
const notebookTypes: Bubble[] = [
  { id: '1', label: '工作笔记', size: 'large', color: 'bg-purple-500', x: 20, y: 30 },
  { id: '2', label: '学习笔记', size: 'large', color: 'bg-purple-600', x: 70, y: 25 },
  { id: '3', label: '生活记录', size: 'medium', color: 'bg-purple-400', x: 15, y: 70 },
  { id: '4', label: '创意灵感', size: 'medium', color: 'bg-purple-700', x: 60, y: 65 },
  { id: '5', label: '健康管理', size: 'small', color: 'bg-purple-300', x: 85, y: 70 },
  { id: '6', label: '旅行日记', size: 'small', color: 'bg-purple-800', x: 40, y: 85 },
];

const sizeClasses = {
  large: 'w-32 h-32 sm:w-40 sm:h-40',
  medium: 'w-24 h-24 sm:w-28 sm:h-28',
  small: 'w-16 h-16 sm:w-20 sm:h-20',
};

// 组件类型已从 componentTypes.ts 导入

// Component instance interface
interface ComponentInstance {
  id: string;
  type: string;
  title: string;
  content?: string;
  config?: any;
}

// Main CreateNote component
function CreateNote() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customNotebookName, setCustomNotebookName] = useState('');
  const [customNotebookDescription, setCustomNotebookDescription] = useState('');
  const [selectedRecordComponents, setSelectedRecordComponents] = useState<string[]>([]);
  const [componentInstances, setComponentInstances] = useState<ComponentInstance[]>([]);
  const [componentCounts, setComponentCounts] = useState<Record<string, number>>({});

  // 移除自动打开弹窗的逻辑，让用户先看到 bubble 选择界面
  // useEffect(() => {
  //   setShowCustomModal(true);
  //   setSelectedType('custom');
  // }, []);

  const handleBubbleClick = (bubbleId: string) => {
    if (bubbleId === 'custom') {
      setShowCustomModal(true);
      setSelectedType('custom');
    } else {
      setSelectedType(selectedType === bubbleId ? null : bubbleId);
    }
  };

  const handleRecordComponentToggle = (componentId: string) => {
    const isCurrentlySelected = selectedRecordComponents.includes(componentId);
    
    setSelectedRecordComponents(prev => 
      isCurrentlySelected
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
    
    // 如果选中组件且数量为0，设置默认数量为1
    // updateComponentCount会自动创建实例，不需要重复调用addComponentInstance
    if (!isCurrentlySelected && (componentCounts[componentId] || 0) === 0) {
      updateComponentCount(componentId, 1);
    }
  };

  const addComponentInstance = (componentType: string) => {
    const component = recordComponentTypes.find(c => c.id === componentType);
    if (!component) return;

    const newInstance: ComponentInstance = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      title: component.label,
      content: '',
      config: {}
    };

    setComponentInstances(prev => [...prev, newInstance]);
  };

  const addAnalysisComponent = (componentType: string) => {
    console.log('Adding analysis component:', componentType);
    const component = analysisComponentTypes.find(c => c.id === componentType);
    if (!component) return;

    const newInstance: ComponentInstance = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      title: component.label,
      content: '',
      config: {}
    };

    console.log('Creating new analysis component instance:', newInstance);
    setComponentInstances(prev => [...prev, newInstance]);
  };

  const removeComponentInstance = (instanceId: string) => {
    setComponentInstances(prev => prev.filter(instance => instance.id !== instanceId));
  };

  const removeComponentType = (componentType: string) => {
    // 从选中的组件列表中移除
    setSelectedRecordComponents(prev => prev.filter(id => id !== componentType));
    
    // 移除该类型的所有实例
    setComponentInstances(prev => prev.filter(instance => instance.type !== componentType));
    
    // 重置该类型的计数
    setComponentCounts(prev => ({
      ...prev,
      [componentType]: 0
    }));
  };

  // 计算每个组件类型的实例数量
  const getComponentCount = (type: string) => {
    return componentInstances.filter(instance => instance.type === type).length;
  };

  // 检查是否有特定类型的组件实例
  const hasComponentInstances = (type: string) => {
    return componentInstances.some(instance => instance.type === type);
  };

  const updateComponentInstance = (instanceId: string, updates: Partial<ComponentInstance>) => {
    setComponentInstances(prev => 
      prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, ...updates }
          : instance
      )
    );
  };

  const updateComponentCount = (componentType: string, count: number) => {
    const newCount = Math.max(0, count);
    setComponentCounts(prev => ({
      ...prev,
      [componentType]: newCount
    }));
    
    // 使用函数式更新来确保获取最新的componentInstances状态
    setComponentInstances(prevInstances => {
      const currentInstances = prevInstances.filter(instance => instance.type === componentType);
      const currentCount = currentInstances.length;
      
      if (newCount > currentCount) {
        // 添加缺失的实例
        const newInstances = [];
        for (let i = currentCount; i < newCount; i++) {
          const component = recordComponentTypes.find(c => c.id === componentType);
          if (component) {
            const newInstance: ComponentInstance = {
              id: `${componentType}-${Date.now()}-${i}`,
              type: componentType,
              title: component.label,
              content: '',
              config: {}
            };
            newInstances.push(newInstance);
          }
        }
        return [...prevInstances, ...newInstances];
      } else if (newCount < currentCount) {
        // 移除多余的实例
        const instancesToRemove = currentInstances.slice(newCount);
        return prevInstances.filter(instance => !instancesToRemove.includes(instance));
      }
      
      return prevInstances;
    });
  };


  const handleCreateCustomNotebook = async () => {
    if (!customNotebookName.trim()) {
      alert('请输入笔记本名称');
      return;
    }
    
    try {
      console.log('创建自定义笔记本:', {
        name: customNotebookName,
        description: customNotebookDescription,
        recordComponents: selectedRecordComponents,
        analysisComponents: componentInstances.map(instance => instance.type),
        componentInstances: componentInstances
      });
      
      // 调用API创建笔记本
      const { data } = await apiClient.post('/api/notebooks', { 
        name: customNotebookName.trim(),
        description: customNotebookDescription.trim() || undefined,
        componentConfig: {
          recordComponents: selectedRecordComponents,
          analysisComponents: componentInstances.map(instance => instance.type),
          componentInstances: componentInstances
        }
      });
      
      if (data && data.success) {
        console.log('✅ 自定义笔记本创建成功:', data);
        
        // 双向同步：将新笔记本的组件实例同步到所有相关笔记（如果有的话）
        try {
          console.log('🔄 开始双向同步自定义笔记本组件实例...');
          const syncResult = await smartSync(data.notebook?.notebook_id, componentInstances, 'notebook');
          
          if (syncResult.success) {
            console.log('✅ 自定义笔记本组件实例同步成功:', syncResult.message);
          } else {
            console.warn('⚠️ 自定义笔记本组件实例同步失败:', syncResult.message);
            // 不阻止笔记本创建，只记录警告
          }
        } catch (syncError) {
          console.error('❌ 自定义笔记本组件实例同步异常:', syncError);
          // 不阻止笔记本创建，只记录错误
        }
        
        // 触发全局事件，通知其他组件刷新并跳转
        const event = new CustomEvent('notebook:created', { 
          detail: { id: data.notebook?.notebook_id } 
        });
        window.dispatchEvent(event);
        
        setShowCustomModal(false);
        resetForm();
      } else {
        console.error('❌ 创建自定义笔记本失败:', data);
        alert('创建笔记本失败: ' + (data?.message || '未知错误'));
      }
    } catch (error) {
      console.error('❌ 创建自定义笔记本异常:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert('创建笔记本时发生错误: ' + errorMessage);
    }
  };

  const closeCustomModal = () => {
    setShowCustomModal(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomNotebookName('');
    setCustomNotebookDescription('');
    setSelectedRecordComponents([]);
    setComponentInstances([]);
  };


  return (
    <>
      <Card>
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">创建笔记本</h2>
        </div>
        
        <div className="p-6">
        {/* Bubble Selection Section */}
        <div className="mb-8">
          
          <div className="relative w-full h-96 sm:h-[500px] mx-auto max-w-4xl">
            {notebookTypes.map((bubble) => (
              <div
                key={bubble.id}
                className={`absolute ${sizeClasses[bubble.size]} ${bubble.color} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 shadow-lg ${
                  selectedType === bubble.id ? 'ring-4 ring-purple-300 scale-110' : ''
                }`}
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity: hoveredBubble && hoveredBubble !== bubble.id ? 0.6 : 1,
                }}
                onMouseEnter={() => setHoveredBubble(bubble.id)}
                onMouseLeave={() => setHoveredBubble(null)}
                onClick={() => handleBubbleClick(bubble.id)}
              >
                <span className="text-white font-medium text-lg sm:text-xl">
                  {bubble.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Custom Notebook Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => handleBubbleClick('custom')}
              className={`px-8 py-4 rounded-full font-medium text-lg transition-all duration-300 ${
                selectedType === 'custom'
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105'
              }`}
            >
              + 自定义笔记本
            </button>
          </div>
        </div>

      </div>
    </Card>

    {/* Custom Notebook Modal */}
    {showCustomModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-800">自定义笔记本</h3>
              <button
                onClick={closeCustomModal}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Notebook Name */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📚</span>
                <label className="text-sm font-medium text-slate-700">笔记本名称</label>
              </div>
              <input
                type="text"
                placeholder="输入笔记本名称..."
                value={customNotebookName}
                onChange={(e) => setCustomNotebookName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Notebook Description */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📝</span>
                <label className="text-sm font-medium text-slate-700">笔记本描述</label>
              </div>
              <textarea
                placeholder="描述这个笔记本的用途..."
                value={customNotebookDescription}
                onChange={(e) => setCustomNotebookDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Record Components Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📝</span>
                <label className="text-lg font-medium text-slate-700">添加记录组件</label>
              </div>
              
              {/* Add New Record Component Card */}
              <div className="mb-4">
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl text-slate-400">➕</span>
                    <div>
                      <div className="font-medium text-slate-600">新增</div>
                      <div className="text-xs text-slate-400">添加记录组件</div>
                    </div>
                  </div>
                  <select 
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        // Remove 'record-' prefix to get the actual component type
                        const componentType = value.replace('record-', '');
                        
                        // Auto-select the component when added
                        if (!selectedRecordComponents.includes(componentType)) {
                          handleRecordComponentToggle(componentType);
                        }
                        // Note: handleRecordComponentToggle will handle setting count to 1 if needed
                      }
                      e.target.value = ''; // Reset selection
                    }}
                  >
                    <option value="">选择记录组件...</option>
                    {recordComponentTypes.map((component) => (
                      <option key={`record-${component.id}`} value={`record-${component.id}`}>
                        {component.icon} {component.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Record Component Instances */}
              {selectedRecordComponents.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium text-slate-700 mb-4">已选择的记录组件</div>
                  <div className="space-y-4">
                    {selectedRecordComponents.map((componentId) => {
                      const component = recordComponentTypes.find(c => c.id === componentId);
                      const instances = componentInstances.filter(instance => instance.type === componentId);
                      const count = componentCounts[componentId] || 0;
                      
                      return (
                        <div key={componentId} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{component?.icon}</span>
                              <div>
                                <div className="font-medium text-slate-800">{component?.label}</div>
                                <div className="text-xs text-slate-500">已添加 {instances.length} 个实例</div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要删除整个${component?.label}组件吗？这将删除该组件的所有实例。`)) {
                                  removeComponentType(componentId);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              title={`删除整个${component?.label}组件`}
                            >
                              删除组件
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {instances.map((instance, index) => (
                              <div key={instance.id} className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <input
                                    type="text"
                                    className="component-title-input"
                                    value={instance.title || ''}
                                    onChange={(e) => updateComponentInstance(instance.id, { title: e.target.value })}
                                    placeholder={`输入${component?.label}标题...`}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => addComponentInstance(componentId)}
                                      className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                      title="新增一个相同的组件实例"
                                    >
                                      新增
                                    </button>
                                    <button
                                      onClick={() => removeComponentInstance(instance.id)}
                                      className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                      title="删除此组件实例"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {instances.length < count && (
                              <button
                                onClick={() => addComponentInstance(componentId)}
                                className="w-full py-2 text-sm border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-purple-300 hover:text-purple-600 transition-colors"
                              >
                                + 添加更多 {component?.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>


            {/* Analysis Components Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <label className="text-lg font-medium text-slate-700">添加分析组件</label>
              </div>
              
              {/* Add New Analysis Component Card */}
              <div className="mb-4">
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl text-slate-400">➕</span>
                    <div>
                      <div className="font-medium text-slate-600">新增</div>
                      <div className="text-xs text-slate-400">添加分析组件</div>
                    </div>
                  </div>
                  <select 
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('Selected value:', value);
                      if (value) {
                        // Remove 'analysis-' prefix to get the actual component type
                        const componentType = value.replace('analysis-', '');
                        console.log('Component type after removing prefix:', componentType);
                        addAnalysisComponent(componentType);
                      }
                      e.target.value = ''; // Reset selection
                    }}
                  >
                    <option value="">选择分析组件...</option>
                    {analysisComponentTypes.map((component) => (
                      <option key={`analysis-${component.id}`} value={`analysis-${component.id}`}>
                        {component.icon} {component.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* AI Component Dropdown Card - Only show if AI component is selected */}
              {hasComponentInstances('ai-custom') && (
                <div className="mb-4">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🤖</span>
                        <div>
                          <div className="font-medium text-slate-800">AI组件</div>
                          <div className="text-xs text-slate-500">自定义AI分析组件</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`transform transition-transform ${
                          hasComponentInstances('ai-custom') ? 'rotate-180' : ''
                        }`}>
                          ▼
                        </span>
                      </div>
                    </div>
                    
                    {/* AI Component Instances */}
                    {hasComponentInstances('ai-custom') && (
                      <div className="p-4 bg-white border-t border-slate-200">
                        <div className="space-y-4">
                          {componentInstances
                            .filter(instance => instance.type === 'ai-custom')
                            .map((instance, index) => (
                              <div key={instance.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <div className="flex items-center justify-between mb-3">
                                  <input
                                    type="text"
                                    className="component-title-input"
                                    value={instance.title || ''}
                                    onChange={(e) => updateComponentInstance(instance.id, { title: e.target.value })}
                                    placeholder="输入AI组件标题..."
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => addAnalysisComponent('ai-custom')}
                                      className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                      title="新增一个AI组件实例"
                                    >
                                      新增
                                    </button>
                                    <button
                                      onClick={() => removeComponentInstance(instance.id)}
                                      className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                      title="删除此AI组件实例"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">Prompt提示内容</label>
                                  <textarea
                                    placeholder="输入AI分析的提示内容..."
                                    value={instance.config.prompt || ''}
                                    onChange={(e) => updateComponentInstance(instance.id, { 
                                      config: { ...instance.config, prompt: e.target.value }
                                    })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Chart Component Dropdown Card - Only show if Chart component is selected */}
              {hasComponentInstances('chart') && (
                <div className="mb-4">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <div>
                          <div className="font-medium text-slate-800">图表组件</div>
                          <div className="text-xs text-slate-500">数据可视化图表</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`transform transition-transform ${
                          hasComponentInstances('chart') ? 'rotate-180' : ''
                        }`}>
                          ▼
                        </span>
                      </div>
                    </div>
                    
                    {/* Chart Component Instances */}
                    {hasComponentInstances('chart') && (
                      <div className="p-4 bg-white border-t border-slate-200">
                        <div className="space-y-4">
                          {componentInstances
                            .filter(instance => instance.type === 'chart')
                            .map((instance, index) => (
                              <div key={instance.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                <div className="flex items-center justify-between mb-3">
                                  <input
                                    type="text"
                                    className="component-title-input"
                                    value={instance.title || ''}
                                    onChange={(e) => updateComponentInstance(instance.id, { title: e.target.value })}
                                    placeholder="输入图表组件标题..."
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => addAnalysisComponent('chart')}
                                      className="text-blue-500 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                      title="新增一个图表组件实例"
                                    >
                                      新增
                                    </button>
                                    <button
                                      onClick={() => removeComponentInstance(instance.id)}
                                      className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                      title="删除此图表组件实例"
                                    >
                                      删除
                                    </button>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {chartTypes.map((chart) => (
                                      <div
                                        key={chart.id}
                                        onClick={() => updateComponentInstance(instance.id, { 
                                          config: { ...instance.config, chartType: chart.id }
                                        })}
                                        className={`p-2 border-2 rounded-lg cursor-pointer transition-all duration-200 text-center ${
                                          instance.config.chartType === chart.id
                                            ? 'border-purple-500 bg-purple-100'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                      >
                                        <div className="text-sm mb-1">{chart.icon}</div>
                                        <div className="text-xs font-medium text-slate-700" style={{ fontSize: '0.65rem' }}>{chart.label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>



            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeCustomModal}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateCustomNotebook}
                disabled={!customNotebookName.trim()}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                创建笔记本
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default CreateNote;
