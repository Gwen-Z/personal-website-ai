import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerConfigUpdate, smartSync, ComponentConfig } from '../utils/componentSync';
import { recordComponentTypes, analysisComponentTypes, chartTypes, getComponentTitle, ComponentType } from '../utils/componentTypes';
import { useNoteContext } from '../contexts/NoteContext';
import { ComponentInstance } from '../contexts/ComponentTemplateContext';
import { ComponentTemplate } from '../utils/contentGenerator';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import apiClient from '../apiClient';
import './NewNoteModal.css';

// ComponentInstance 接口从 ComponentTemplateContext 导入

// ComponentConfig 接口从 componentSync.ts 导入

// 组件类型接口已从 componentTypes.ts 导入

interface DraggableComponentItemProps {
  instance: ComponentInstance;
  component: ComponentType;
  onRemove: (id: string) => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateConfig: (id: string, config: Record<string, unknown>) => void;
  onUpdateTitle: (id: string, title: string) => void;
  isComponentEditing?: boolean;
}

// 组件类型已从 componentTypes.ts 导入

// 公共事件处理函数
const stopEventPropagation = (e: React.SyntheticEvent) => {
  e.stopPropagation();
};

// 用于需要阻止默认行为的事件处理函数
const stopEventAndPreventDefault = (e: React.SyntheticEvent) => {
  e.stopPropagation();
  e.preventDefault();
};

const DraggableComponentItem: React.FC<DraggableComponentItemProps> = ({
  instance,
  component,
  onRemove,
  onUpdateContent,
  onUpdateConfig,
  onUpdateTitle,
  isComponentEditing = false,
}) => {
  // 编辑模式状态
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(instance.title || '');

  // 编辑模式处理函数
  const handleEditTitle = () => {
    setTempTitle(instance.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    // 保留用户输入的标题，只有在完全为空时才使用默认标题
    const finalTitle = tempTitle.trim() !== '' ? tempTitle.trim() : getComponentTitle(instance.type);
    onUpdateTitle(instance.id, finalTitle);
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setTempTitle(instance.title || '');
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 公共输入属性
  const getInputProps = (type: string, placeholder: string, rows?: number) => ({
    className: type === 'textarea' ? 'form-textarea' : 'form-input',
    placeholder,
    value: instance.content || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
      onUpdateContent(instance.id, e.target.value),
    onMouseDown: stopEventPropagation,
    onMouseUp: stopEventPropagation,
    onClick: stopEventPropagation,
    ...(rows && { rows })
  });

  const renderComponentContent = () => {
    switch (instance.type) {
      case 'text-short':
        return (
          <div>
            <input type="text" {...getInputProps('input', '')} />
          </div>
        );
      case 'text-long':
        return (
          <div>
            <textarea {...getInputProps('textarea', '', 2)} />
          </div>
        );
      case 'date':
        return (
          <div>
            <input type="datetime-local" {...getInputProps('input', '')} />
          </div>
        );
      case 'number':
        return (
          <div>
            <input type="number" {...getInputProps('input', '')} />
          </div>
        );
      case 'image':
        return (
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
                  onUpdateContent(instance.id, files.map(f => f.name).join(', '));
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
          </div>
        );
      case 'ai-custom':
        return (
          <div>
            <div className="ai-prompt-edit">
              <textarea
                className="form-textarea"
                placeholder=""
                rows={2}
                value={String(instance.config?.prompt || '')}
                onChange={(e) => onUpdateConfig(instance.id, { ...instance.config, prompt: e.target.value })}
              />
            </div>
            <div className="ai-result-info">
              <div className="text-sm text-slate-500 italic">
                💡 AI分析结果将在笔记详情页中显示
              </div>
            </div>
          </div>
        );
      case 'chart':
        return (
          <div>
            <div className="chart-type-selection">
              <div className="grid grid-cols-3 gap-2">
                {chartTypes.map((chart) => (
                  <div
                    key={chart.id}
                    onClick={() => onUpdateConfig(instance.id, { 
                      ...instance.config, 
                      chartType: chart.id 
                    })}
                    className={`p-2 border-2 rounded-lg cursor-pointer transition-all duration-200 text-center ${
                      (instance.config?.chartType || 'bar') === chart.id
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
            <div className="chart-placeholder mt-3">
              <div className="chart-placeholder-content" style={{ fontSize: '0.65rem' }}>
                📊 图表将根据数据自动生成
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="form-input" style={{ color: '#999' }}>
            暂不支持此组件类型
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`component-item-draggable ${isDragging ? 'dragging' : ''}`}
    >
      <div className="component-drag-handle" {...attributes} {...listeners}>
        <div className="drag-icon">⋮⋮</div>
      </div>
      <div className="component-content">
        <div className="component-header">
          {isEditingTitle ? (
            // 编辑模式
            <div className="title-edit-mode">
              <input
                type="text"
                className="component-title-input editing"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                autoFocus
                onMouseDown={stopEventPropagation}
                onMouseUp={stopEventPropagation}
                onClick={stopEventPropagation}
              />
              <div className="title-edit-buttons">
                <button
                  className="save-title-button"
                  onClick={(e) => {
                    stopEventPropagation(e);
                    handleSaveTitle();
                  }}
                  title="保存 (Enter)"
                >
                  ✓
                </button>
                <button
                  className="cancel-title-button"
                  onClick={(e) => {
                    stopEventPropagation(e);
                    handleCancelEdit();
                  }}
                  title="取消 (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            // 显示模式
            <div className="title-display-mode">
              <span className="component-title-display">
                {instance.title || getComponentTitle(instance.type)}
              </span>
              <div className="title-action-buttons">
                <button
                  className="edit-title-button"
                  onClick={(e) => {
                    stopEventPropagation(e);
                    handleEditTitle();
                  }}
                  title="编辑标题"
                >
                  ✏️
                </button>
                {isComponentEditing && (
                  <button
                    className="remove-component-button"
                    onClick={(e) => { stopEventAndPreventDefault(e); onRemove(instance.id); }}
                    onMouseDown={stopEventAndPreventDefault}
                    onMouseUp={stopEventAndPreventDefault}
                    title="删除组件"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="component-body">
          {renderComponentContent()}
        </div>
      </div>
    </div>
  );
};

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
  onCreated?: (noteId: string) => void;
  mode?: 'create' | 'edit';
}

// 移除默认组件，保留空组件实例生成

// 生成空组件实例的函数 - 用于真正需要空组件的情况
const generateEmptyComponentInstances = (): ComponentInstance[] => {
  // 返回空数组，不生成任何默认组件
  return [];
};

// 根据组件类型和标题生成数据映射规则
function getDataMappingForComponent(instance: ComponentInstance): { source: string; transform?: string } | undefined {
  const title = instance.title.toLowerCase();
  const type = instance.type;
  
  // 标题组件
  if (title.includes('标题')) {
    return { source: 'title', transform: 'capitalize' };
  }
  
  // 内容组件
  if (title.includes('内容')) {
    return { source: 'content_text' };
  }
  
  // 来源组件
  if (title.includes('来源')) {
    return { source: 'source_url' };
  }
  
  // 作者组件
  if (title.includes('作者')) {
    return { source: 'author' };
  }
  
  // 时间组件
  if (title.includes('时间') || title.includes('日期') || type === 'date') {
    return { source: 'created_at', transform: 'datetime' };
  }
  
  // 图片组件
  if (type === 'image') {
    return { source: 'images' };
  }
  
  // 图表组件
  if (type === 'chart') {
    return { source: 'title' }; // 图表可以基于标题生成
  }
  
  return undefined;
}

export default function NewNoteModal({ isOpen, onClose, notebookId, onCreated, mode = 'create' }: NewNoteModalProps) {
  const navigate = useNavigate();
  // const { } = useNoteContext(); // 暂时注释掉，避免ESLint错误
  // 不再使用全局模板，直接从笔记本配置获取组件实例
  
  // 本地状态管理可编辑的组件实例
  const [editableComponentInstances, setEditableComponentInstances] = useState<ComponentInstance[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // 调试：监听 editableComponentInstances 变化
  useEffect(() => {
    console.log('🔄 editableComponentInstances 状态变化:', editableComponentInstances);
    console.log('📊 组件实例数量:', editableComponentInstances.length);
  }, [editableComponentInstances]);
  
  // 重置状态函数
  const resetModalState = () => {
    setEditableComponentInstances([]);
    setSelectedAnalysisComponents([]);
    setHasUnsavedChanges(false);
    setHasInternalChanges(false);
    setIsComponentEditing(false);
    setComponentEditSnapshot([]);
    setShowEditComponentButton(true);
    setSelectedComponents([]);
    setIsMultiSelectMode(false);
    setShowRecordComponents(false);
    setShowAnalysisComponents(false);
  };
  
  // 当弹窗关闭时重置状态
  const handleClose = () => {
    resetModalState();
    onClose();
  };

  // 组件编辑模式处理函数
  const handleStartComponentEdit = () => {
    // 保存当前状态作为快照
    setComponentEditSnapshot([...editableComponentInstances]);
    setIsComponentEditing(true);
    // 进入编辑模式时显示编辑按钮
    setShowEditComponentButton(true);
  };

  const handleSaveComponentEdit = () => {
    setIsComponentEditing(false);
    setComponentEditSnapshot([]);
    // 保存编辑时显示编辑按钮
    setShowEditComponentButton(true);
  };

  const handleCancelComponentEdit = () => {
    // 恢复到编辑前的状态
    setEditableComponentInstances([...componentEditSnapshot]);
    setIsComponentEditing(false);
    setComponentEditSnapshot([]);
    // 取消编辑时显示编辑按钮
    setShowEditComponentButton(true);
  };

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动8像素才激活拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 组件相关状态
  const [selectedAnalysisComponents, setSelectedAnalysisComponents] = useState<string[]>([]);
  
  // 多选组件状态
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  // 下拉列表状态
  const [showDropdown, setShowDropdown] = useState(false);
  const [showRecordComponents, setShowRecordComponents] = useState(false);
  const [showAnalysisComponents, setShowAnalysisComponents] = useState(false);
  
  // 编辑状态管理
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasInternalChanges, setHasInternalChanges] = useState(false);
  
  // 组件编辑模式状态
  const [isComponentEditing, setIsComponentEditing] = useState(false);
  const [componentEditSnapshot, setComponentEditSnapshot] = useState<ComponentInstance[]>([]);
  
  // 控制是否显示编辑组件按钮（新增组件时隐藏）
  const [showEditComponentButton, setShowEditComponentButton] = useState(true);
  


  // 移除独立来源，selectedAnalysisComponents 完全由 editableComponentInstances 推导

  // 同步selectedAnalysisComponents状态，基于当前实际使用的分析组件类型
  useEffect(() => {
    const usedAnalysisTypes = editableComponentInstances
      .map(inst => inst.type)
      .filter(type => analysisComponentTypes.some(c => c.id === type));
    
    const uniqueAnalysisTypes = [...new Set(usedAnalysisTypes)];
    
    setSelectedAnalysisComponents(() => {
      // 只保留当前实际使用的分析组件类型，移除已删除的类型
      const newSelection = uniqueAnalysisTypes;
      return newSelection;
    });
  }, [editableComponentInstances]);

  // 调试：监听弹窗状态变化
  useEffect(() => {
    console.log('🔄 弹窗状态变化 - isOpen:', isOpen, 'notebookId:', notebookId);
  }, [isOpen, notebookId]);

  // 初始化可编辑的组件实例 - 弹窗打开时从笔记本配置获取或使用默认组件
  useEffect(() => {
    console.log('🔍 useEffect 触发 - isOpen:', isOpen, 'notebookId:', notebookId);
    if (isOpen && notebookId) {
      // 从笔记本配置获取组件实例
      const loadNotebookComponents = async () => {
        try {
          console.log('🔍 正在加载笔记本配置，notebookId:', notebookId);
          const { data } = await apiClient.get(`/api/notebooks/${notebookId}`);
          console.log('📋 笔记本API响应:', data);
          console.log('🔍 笔记本完整数据结构:', JSON.stringify(data, null, 2));
          
          if (data.success && data.notebook.component_config?.componentInstances && data.notebook.component_config.componentInstances.length > 0) {
            console.log('✅ 找到保存的组件配置:', data.notebook.component_config.componentInstances);
            console.log('📊 组件配置数量:', data.notebook.component_config.componentInstances.length);
            
            // 清空历史组件的内容，保留结构和标题
            const clearedInstances = data.notebook.component_config.componentInstances.map((instance: ComponentInstance) => {
              // 为日期组件设置默认的当前日期时间
              let defaultContent = '';
              if (instance.type === 'date') {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                defaultContent = `${year}-${month}-${day}T${hours}:${minutes}`;
              }
              
              return {
                ...instance,
                content: defaultContent, // 清空内容，只保留默认值
                id: `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // 生成新的ID
              };
            });
            
            console.log('🔄 清空内容后的组件实例:', clearedInstances);
            setEditableComponentInstances(clearedInstances);
          } else {
            console.log('❌ 没有找到组件配置，使用空配置');
            console.log('🔍 笔记本配置详情:', data.notebook?.component_config);
            // 如果没有笔记本配置，使用空组件
            const instances: ComponentInstance[] = [];
            setEditableComponentInstances(instances);
            console.log('🔍 使用空组件实例:', instances);
          }
        } catch (error) {
          console.error('获取笔记本配置失败:', error);
          // 出错时使用空组件
          const instances: ComponentInstance[] = [];
          setEditableComponentInstances(instances);
          console.log('⚠️ 获取配置失败，使用空组件');
        }
      };
      
      loadNotebookComponents();
    }
  }, [isOpen, notebookId]);




  // 新增组件
  const addComponentLocal = (componentType: string) => {
    const component = [...recordComponentTypes, ...analysisComponentTypes].find(c => c.id === componentType);
    if (!component) return;

    // 为日期组件设置默认的当前日期时间
    let defaultContent = '';
    if (componentType === 'date') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      defaultContent = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    const newInstance: ComponentInstance = {
      id: `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: componentType,
      title: component.label,
      content: defaultContent,
      config: componentType === 'chart' ? { chartType: 'bar' } : {}
    };

    setEditableComponentInstances(prev => [...prev, newInstance]);
    // 不再需要同步到全局模板，直接保存到笔记本配置
    
    // 如果是分析组件，更新selectedAnalysisComponents状态
    const isAnalysisComponent = analysisComponentTypes.some(c => c.id === componentType);
    if (isAnalysisComponent && !selectedAnalysisComponents.includes(componentType)) {
      setSelectedAnalysisComponents(prev => [...prev, componentType]);
    }
    
    // removed: showAddComponentMenu
    setHasUnsavedChanges(true);
    debouncedSaveComponentConfigToNotebook(200);
    
    // 触发组件新增事件，通知其他页面
    const componentAddEvent = new CustomEvent('note:component-added', {
      detail: {
        notebookId,
        componentId: newInstance.id,
        componentType: componentType,
        componentTitle: newInstance.title,
        allInstances: [...editableComponentInstances, newInstance]
      }
    });
    window.dispatchEvent(componentAddEvent);
  };


  // 批量添加选中的组件
  const addSelectedComponents = () => {
    if (selectedComponents.length === 0) return;

    const newInstances: ComponentInstance[] = [];
    
    selectedComponents.forEach(componentType => {
      const component = [...recordComponentTypes, ...analysisComponentTypes].find(c => c.id === componentType);
      if (!component) return;

      // 为日期组件设置默认的当前日期时间
      let defaultContent = '';
      if (componentType === 'date') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        defaultContent = `${year}-${month}-${day}T${hours}:${minutes}`;
      }

      const newInstance: ComponentInstance = {
        id: `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: componentType,
        title: component.label,
        content: defaultContent,
        config: componentType === 'chart' ? { chartType: 'bar' } : {}
      };

      newInstances.push(newInstance);
    });

    setEditableComponentInstances(prev => [...prev, ...newInstances]);
    
    // 更新分析组件状态
    const newAnalysisComponents = selectedComponents.filter(type => 
      analysisComponentTypes.some(c => c.id === type)
    );
    if (newAnalysisComponents.length > 0) {
      setSelectedAnalysisComponents(prev => {
        const updated = [...prev];
        newAnalysisComponents.forEach(type => {
          if (!updated.includes(type)) {
            updated.push(type);
          }
        });
        return updated;
      });
    }
    
    // 清空选择并关闭菜单
    setSelectedComponents([]);
    setIsMultiSelectMode(false);
    // removed: showAddComponentMenu
    setHasUnsavedChanges(true);
    
    // 触发组件新增事件
    newInstances.forEach(instance => {
      const componentAddEvent = new CustomEvent('note:component-added', {
        detail: {
          notebookId,
          componentId: instance.id,
          componentType: instance.type,
          componentTitle: instance.title,
          allInstances: [...editableComponentInstances, ...newInstances]
        }
      });
      window.dispatchEvent(componentAddEvent);
    });
    
    // 统一防抖保存
    debouncedSaveComponentConfigToNotebook(200);
  };

  // 切换组件选择状态
  const toggleComponentSelection = (componentType: string) => {
    if (selectedComponents.includes(componentType)) {
      setSelectedComponents(prev => prev.filter(type => type !== componentType));
    } else {
      setSelectedComponents(prev => [...prev, componentType]);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = (components: ComponentType[]) => {
    const allComponentTypes = components.map(c => c.id);
    const allSelected = allComponentTypes.every(type => selectedComponents.includes(type));
    
    if (allSelected) {
      // 取消全选
      setSelectedComponents(prev => prev.filter(type => !allComponentTypes.includes(type)));
    } else {
      // 全选
      setSelectedComponents(prev => {
        const newSelection = [...prev];
        allComponentTypes.forEach(type => {
          if (!newSelection.includes(type)) {
            newSelection.push(type);
          }
        });
        return newSelection;
      });
    }
  };

  // 删除组件
  const removeComponent = (componentId: string) => {
    // 获取要删除的组件类型
    const componentToRemove = editableComponentInstances.find(inst => inst.id === componentId);
    
    if (!componentToRemove) {
      return;
    }
    
    // 检查是否还有其他同类型的组件实例（在删除前检查）
    let hasOtherInstances = false;
    if (componentToRemove) {
      const isAnalysisComponent = analysisComponentTypes.some(c => c.id === componentToRemove.type);
      if (isAnalysisComponent) {
        hasOtherInstances = editableComponentInstances.some(inst => 
          inst.id !== componentId && inst.type === componentToRemove.type
        );
      }
    }
    
    // 删除组件实例
    let newInstances: ComponentInstance[] = [];
    setEditableComponentInstances(prev => {
      newInstances = prev.filter(inst => inst.id !== componentId);
      return newInstances;
    });
    
    // 如果是分析组件且没有其他同类型实例，从selectedAnalysisComponents中移除
    if (componentToRemove) {
      const isAnalysisComponent = analysisComponentTypes.some(c => c.id === componentToRemove.type);
      if (isAnalysisComponent && !hasOtherInstances) {
        setSelectedAnalysisComponents(prev => {
          const newSelection = prev.filter(type => type !== componentToRemove.type);
          return newSelection;
        });
      }
    }
    
    setHasUnsavedChanges(true);
    setHasInternalChanges(true);
    
    // 立即保存配置到笔记本（使用新的实例数组）
    saveComponentConfigToNotebook(newInstances);
    
    // 触发组件删除事件，通知其他页面
    const componentDeleteEvent = new CustomEvent('note:component-deleted', {
      detail: {
        notebookId,
        componentId,
        componentType: componentToRemove?.type,
        remainingInstances: newInstances
      }
    });
    window.dispatchEvent(componentDeleteEvent);
  };


  // 拖拽排序
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    setEditableComponentInstances((items) => {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // 统一防抖保存
      debouncedSaveComponentConfigToNotebook(200);
      
      return newItems;
    });
  };

  // 触发组件更新事件的公共函数
  const triggerComponentUpdateEvent = (updatedInstances: ComponentInstance[]) => {
    const componentUpdateEvent = new CustomEvent('note:component-updated', {
      detail: {
        notebookId,
        componentInstances: updatedInstances
      }
    });
    window.dispatchEvent(componentUpdateEvent);
  };

  // 触发配置更新和刷新事件的公共函数
  const triggerConfigAndRefreshEvents = (updatedConfig: ComponentConfig) => {
    // 使用同步工具触发配置更新事件
    const normalizedConfig = {
      componentInstances: updatedConfig.componentInstances || []
    };
    triggerConfigUpdate(notebookId, normalizedConfig);
    
    // 触发组件更新事件，通知其他页面组件配置已变更
    triggerComponentUpdateEvent(updatedConfig.componentInstances || []);
    
    // 强制刷新笔记本列表，确保所有相关组件都能获取到最新配置
    const refreshEvent = new CustomEvent('notebook:refresh');
    window.dispatchEvent(refreshEvent);
  };

  // 更新组件内容
  const handleUpdateComponentContent = (id: string, content: string) => {
    const updatedInstances = editableComponentInstances.map(inst => 
      inst.id === id ? { ...inst, content } : inst
    );
    
    setEditableComponentInstances(updatedInstances);
    
    // 触发组件更新事件，通知笔记详情页
    triggerComponentUpdateEvent(updatedInstances);
  };

  // 更新组件配置
  const handleUpdateComponentConfig = (id: string, config: Record<string, unknown>) => {
    const updatedInstances = editableComponentInstances.map(inst => 
      inst.id === id ? { ...inst, config: { ...inst.config, ...config } } : inst
    );
    
    setEditableComponentInstances(updatedInstances);
    
    // 统一防抖保存
    debouncedSaveComponentConfigToNotebook(400);
    
    // 触发组件更新事件，通知笔记详情页
    triggerComponentUpdateEvent(updatedInstances);
  };

  // 更新组件标题
  const handleUpdateComponentTitle = (id: string, title: string) => {
    // 直接使用用户输入的标题，不强制替换为默认标题
    // 只有在失去焦点且标题为空时才使用默认标题
    const updatedInstances = editableComponentInstances.map(inst => 
      inst.id === id ? { ...inst, title: title } : inst
    );
    
    setEditableComponentInstances(updatedInstances);
    
    // 统一防抖保存
    debouncedSaveComponentConfigToNotebook(200);
    
    // 触发组件更新事件，通知笔记详情页
    triggerComponentUpdateEvent(updatedInstances);
  };

  // 保存组件配置到笔记本
  const saveComponentConfigToNotebook = async (instances?: ComponentInstance[]) => {
    try {
      const instancesToSave = instances || editableComponentInstances;
      
      // 确保所有组件实例都有正确的标题
      // 只有在标题完全为空时才使用默认标题，保留用户自定义的标题
      const validatedInstances = instancesToSave.map(inst => ({
        ...inst,
        title: inst.title && inst.title.trim() !== '' ? inst.title : getComponentTitle(inst.type)
      }));
      
      // 从当前组件实例中提取记录组件类型
      const currentRecordComponents = validatedInstances
        .map(inst => inst.type)
        .filter(type => recordComponentTypes.some(c => c.id === type));
      
      // 构建新的组件配置 - 只包含组件实例
      const updatedConfig: ComponentConfig = {
        componentInstances: validatedInstances
      };
      
      // 调用后端API更新笔记本配置
      const { data } = await apiClient.put(`/api/notebooks/${notebookId}`, {
        componentConfig: updatedConfig
      });
      
      console.log('💾 保存配置API响应:', data);
      
      if (data && data.success) {
        console.log('✅ 配置保存成功');
        // 不再需要通知父组件配置更新，组件数据完全由弹窗自己管理
        
        // 使用公共函数触发配置更新和刷新事件
        triggerConfigAndRefreshEvents(updatedConfig);
      } else {
        console.log('❌ 配置保存失败:', data?.message);
      }
    } catch (err) {
      console.error(err);
      // 不阻止创建笔记，只是记录错误
    }
  };

  // 统一防抖保存，避免频繁请求与竞态
  let saveTimer: number | undefined;
  const debouncedSaveComponentConfigToNotebook = (delay = 300) => {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
    }
    saveTimer = window.setTimeout(() => {
      saveComponentConfigToNotebook();
    }, delay);
  };

  // 保存设置到笔记本配置
  const handleSaveSettings = async () => {
    setSubmitting(true);
    try {
      // 确保所有组件实例都有正确的标题
      const validatedInstances = editableComponentInstances.map(inst => ({
        ...inst,
        title: inst.title && inst.title.trim() !== '' ? inst.title : getComponentTitle(inst.type)
      }));
      
      // 构建新的组件配置
      const updatedConfig: ComponentConfig = {
        componentInstances: validatedInstances
      };
      
      console.log('💾 正在保存组件配置到笔记本:', notebookId);
      console.log('📦 保存的配置:', updatedConfig);
      console.log('📦 保存的配置JSON:', JSON.stringify(updatedConfig, null, 2));
      
      // 调用后端API更新笔记本配置
      const requestBody = {
        componentConfig: updatedConfig
      };
      console.log('📤 发送的请求体:', JSON.stringify(requestBody, null, 2));
      
      const { data } = await apiClient.put(`/api/notebooks/${notebookId}`, requestBody);
      
      console.log('💾 保存配置API响应:', data);
      
      if (data && data.success) {
        // 使用公共函数触发配置更新和刷新事件
        triggerConfigAndRefreshEvents(updatedConfig);
        
        alert('设置已保存！下次创建笔记时将使用此配置。');
      } else {
        alert('保存设置失败: ' + (data?.message || '未知错误'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('保存设置时发生错误:', err);
      alert('保存设置时发生错误: ' + errorMessage);
    }
    setSubmitting(false);
  };

  // 更新笔记本配置
  const handleUpdateNotebookConfig = async () => {
    setSubmitting(true);
    try {
      // 构建新的组件配置 - 只包含组件实例
      const updatedConfig: ComponentConfig = {
        componentInstances: editableComponentInstances
      };
      
      // 调用后端API更新笔记本配置
      const { data } = await apiClient.put(`/api/notebooks/${notebookId}`, {
        componentConfig: updatedConfig
      });
      
      if (data && data.success) {
        // 双向同步：将笔记本配置同步到所有相关笔记
        try {
          await smartSync(notebookId, editableComponentInstances, 'notebook');
        } catch {
          // 不阻止配置更新，只记录错误
        }
        
        // 不再需要通知父组件配置更新，组件数据完全由弹窗自己管理
        
        // 使用公共函数触发配置更新和刷新事件
        triggerConfigAndRefreshEvents(updatedConfig);
        
        handleClose();
        alert('组件配置已更新！');
      } else {
        alert('更新配置失败: ' + (data?.message || '未知错误'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      alert('更新配置时发生错误: ' + errorMessage);
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!notebookId) {
      alert('笔记本ID为空，无法操作');
      return;
    }
    
    if (mode === 'edit') {
      // 编辑模式：更新笔记本配置
      await handleUpdateNotebookConfig();
      return;
    }
    
    // 创建模式：创建新笔记
    if (!editableComponentInstances || editableComponentInstances.length === 0) {
      alert('请至少添加一个组件');
      return;
    }
    
    setSubmitting(true);
    try {
      // 首先保存组件配置到笔记本
      await saveComponentConfigToNotebook();
      // 从组件数据中提取标题和内容
      let finalTitle = '新建笔记';
      let finalContentText = '';
      let finalImages: string[] = [];
      let finalSource = '';
      const finalOriginalUrl = '';
      let finalAuthor = '';
      let finalUploadTime = '';
      
      // 查找标题组件（优先短文本组件 'text-short'），然后回退到标题包含“标题”的组件
      const shortTextComponent = editableComponentInstances.find(inst => inst.type === 'text-short');
      const titleComponent = shortTextComponent || editableComponentInstances.find(inst => 
        inst.title.toLowerCase().includes('标题')
      );
      
      if (titleComponent && titleComponent.content) {
        finalTitle = titleComponent.content.trim();
      }
      
      // 查找文本内容组件 - 查找包含"内容"的组件
      const contentComponent = editableComponentInstances.find(inst => 
        inst.title.toLowerCase().includes('内容')
      );
      
      if (contentComponent && contentComponent.content) {
        finalContentText = contentComponent.content.trim();
      }
      
      // 查找图片组件
      const imageComponent = editableComponentInstances.find(inst => 
        inst.type === 'image' && inst.title.toLowerCase().includes('图片')
      ) || editableComponentInstances.find(inst => inst.type === 'image');
      
      if (imageComponent && imageComponent.content) {
        // 处理图片数据，将逗号分隔的字符串转换为数组
        try {
          finalImages = imageComponent.content.split(',').map(url => url.trim()).filter(url => url);
        } catch {
          finalImages = [];
        }
      }
      
      // 查找来源组件
      const sourceComponent = editableComponentInstances.find(inst => 
        inst.title.toLowerCase().includes('来源')
      );
      if (sourceComponent && sourceComponent.content) {
        finalSource = sourceComponent.content.trim();
      }
      
      
      // 查找作者组件
      const authorComponent = editableComponentInstances.find(inst => 
        inst.title.toLowerCase().includes('作者')
      );
      if (authorComponent && authorComponent.content) {
        finalAuthor = authorComponent.content.trim();
      }
      
      // 查找上传时间组件 - 优先查找date类型，然后查找包含"时间"的组件
      const timeComponent = editableComponentInstances.find(inst => 
        inst.type === 'date'
      ) || editableComponentInstances.find(inst => 
        inst.title.toLowerCase().includes('时间')
      );
      
      if (timeComponent && timeComponent.content) {
        finalUploadTime = timeComponent.content.trim();
      }
      
      // 如果没有找到标题，使用第一个组件的标题
      if (finalTitle === '新建笔记' && editableComponentInstances.length > 0) {
        finalTitle = editableComponentInstances[0].title || '新建笔记';
      }
      
      // 构建组件数据对象
      const finalComponentData: Record<string, { value: string; type: string; title: string }> = {};
      editableComponentInstances.forEach(instance => {
        if (instance.content) {
          finalComponentData[instance.id] = {
            value: instance.content,
            type: instance.type,
            title: instance.title
          };
        }
      });
      
      // 将组件实例转换为模板（移除content字段，只保留配置）
      const componentTemplates = editableComponentInstances.map(instance => ({
        id: instance.id,
        type: instance.type,
        title: instance.title,
        config: instance.config,
        // 不保存content，让详情页根据笔记数据动态生成
        dataMapping: getDataMappingForComponent(instance)
      }));
      
      const requestData = { 
        notebook_id: notebookId, 
        title: finalTitle, 
        content_text: finalContentText, 
        images: finalImages, 
        source_url: finalOriginalUrl,
        source: finalSource,
        original_url: finalOriginalUrl,
        author: finalAuthor,
        upload_time: finalUploadTime,
        component_data: finalComponentData,
        selected_analysis_components: selectedAnalysisComponents,
        component_instances: componentTemplates // 使用模板而不是完整实例
      };
      
      const { data } = await apiClient.post('/api/notes', requestData);
      
      if (data && data.success) {
        // 双向同步：将笔记的组件实例同步到笔记本配置
        try {
          await smartSync(notebookId, editableComponentInstances, 'note');
        } catch {
          // 不阻止笔记创建，只记录错误
        }
        
        // 自动跳转到笔记详情页
        const noteId = data.note?.note_id || data.noteId;
        
        if (onCreated) onCreated(noteId);
        handleClose();
        if (noteId) {
          navigate(`/note/${noteId}`);
        }
        
        // 清理状态
        setEditableComponentInstances([]);
        setSelectedAnalysisComponents([]);
        // 重新显示编辑按钮，为下次编辑做准备
        setShowEditComponentButton(true);
      } else {
        alert('创建笔记失败: ' + (data?.message || '未知错误'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      alert('创建笔记时发生错误: ' + errorMessage);
    }
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="header-left">
            <h2>{mode === 'edit' ? '编辑组件配置' : ''}</h2>
            <div className="component-buttons">
              {!isComponentEditing && showEditComponentButton ? (
                <button 
                  className="edit-component-button"
                  onClick={handleStartComponentEdit}
                  disabled={editableComponentInstances.length === 0}
                >
                  <span>✏️</span>
                  编辑组件
                </button>
              ) : null}
              {!isComponentEditing && (
                <button 
                  className="add-component-button"
                  onClick={() => {
                    const next = !showDropdown;
                    setShowDropdown(next);
                    // 打开下拉时不再预选历史组件，确保默认不勾选
                    if (next) {
                      setSelectedComponents([]);
                    }
                  }}
                >
                  <span>➕</span>
                  新增组件
                  <span className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}>▼</span>
                </button>
              )}
              
              {/* 新增组件下拉面板 */}
              {showDropdown && (
                <div className="component-dropdown-panel">
                  <div className="dropdown-content">
                    {/* 记录组件分类 */}
                    <div className="component-category">
                      <div 
                        className="category-header"
                        onClick={() => setShowRecordComponents(!showRecordComponents)}
                      >
                        <span className="category-icon">📝</span>
                        <span className="category-title">记录组件</span>
                        <span className={`category-arrow ${showRecordComponents ? 'open' : ''}`}>
                          ▼
                        </span>
                      </div>
                      {showRecordComponents && (
                        <div className="category-options">
                          {recordComponentTypes.map((component) => (
                            <div
                              key={component.id}
                              className="component-option"
                            >
                              <input
                                type="checkbox"
                                id={`record-${component.id}`}
                                checked={selectedComponents.includes(component.id)}
                                onChange={() => toggleComponentSelection(component.id)}
                                className="component-checkbox"
                              />
                              <label htmlFor={`record-${component.id}`} className="component-label">
                                <span className="option-icon">{component.icon}</span>
                                <span className="option-title">{component.label}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 分析组件分类 */}
                    <div className="component-category">
                      <div 
                        className="category-header"
                        onClick={() => setShowAnalysisComponents(!showAnalysisComponents)}
                      >
                        <span className="category-icon">🔍</span>
                        <span className="category-title">分析组件</span>
                        <span className={`category-arrow ${showAnalysisComponents ? 'open' : ''}`}>
                          ▼
                        </span>
                      </div>
                      {showAnalysisComponents && (
                        <div className="category-options">
                          {analysisComponentTypes.map((component) => (
                            <div
                              key={component.id}
                              className="component-option"
                            >
                              <input
                                type="checkbox"
                                id={`analysis-${component.id}`}
                                checked={selectedComponents.includes(component.id)}
                                onChange={() => toggleComponentSelection(component.id)}
                                className="component-checkbox"
                              />
                              <label htmlFor={`analysis-${component.id}`} className="component-label">
                                <span className="option-icon">{component.icon}</span>
                                <span className="option-title">{component.label}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* removed: selected-components preview */}

                  {/* 操作按钮 */}
                  <div className="dropdown-actions">
                    <button
                      className="cancel-button"
                      onClick={() => {
                        setSelectedComponents([]);
                        setShowDropdown(false);
                      }}
                    >
                      取消
                    </button>
                    <button
                      className="add-button"
                      onClick={() => {
                        addSelectedComponents();
                        setShowDropdown(false);
                      }}
                      disabled={selectedComponents.length === 0}
                    >
                      添加组件 ({selectedComponents.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="header-actions">
            {/* 组件编辑操作按钮 */}
            {isComponentEditing && (
              <div className="edit-buttons">
                <button 
                  className="cancel-component-edit-button"
                  onClick={handleCancelComponentEdit}
                >
                  取消
                </button>
                <button 
                  className="save-component-edit-button"
                  onClick={handleSaveComponentEdit}
                >
                  保存设置
                </button>
              </div>
            )}
            <button className="close-button" onClick={handleClose}>✕</button>
          </div>
        </div>
        
        <div className="modal-form">

          <div className="modal-form-content">
            {/* 可拖拽的组件列表 */}
            {editableComponentInstances && editableComponentInstances.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={editableComponentInstances.map(inst => inst.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="components-list">
                    {editableComponentInstances.map((instance) => {
                      const component = [...recordComponentTypes, ...analysisComponentTypes].find(c => c.id === instance.type);
                if (!component) return null;
                
                return (
                        <DraggableComponentItem
                          key={instance.id}
                          instance={instance}
                          component={component}
                          onRemove={removeComponent}
                          onUpdateContent={handleUpdateComponentContent}
                          onUpdateConfig={handleUpdateComponentConfig}
                          onUpdateTitle={handleUpdateComponentTitle}
                          isComponentEditing={isComponentEditing}
                        />
                      );
                    })}
                          </div>
                </SortableContext>
              </DndContext>
            )}

            {/* 空状态提示 */}
            {(!editableComponentInstances || editableComponentInstances.length === 0) && (
              <div className="empty-components">
                <div className="empty-components-icon">📝</div>
                <div className="empty-components-text">暂无组件，点击上方按钮添加组件</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="cancel-button" onClick={handleClose}>
            {hasUnsavedChanges ? '关闭' : '取消'}
          </button>
          <button 
            className="save-settings-button"
            onClick={handleSaveSettings}
            disabled={submitting}
          >
            保存设置
          </button>
          <button 
            disabled={submitting || editableComponentInstances.length === 0} 
            className={`save-button ${submitting || editableComponentInstances.length === 0 ? 'disabled' : ''}`} 
            onClick={handleSubmit}
          >
{submitting ? '提交中...' : (mode === 'edit' ? '保存配置' : '创建笔记')}
          </button>
        </div>
      </div>
    </div>
  );
}