// 组件配置同步工具
// 确保创建笔记本、新建笔记、笔记详情页的组件配置保持联动

import apiClient from '../apiClient';
import { recordComponentTypes, analysisComponentTypes, getComponentTitle as getComponentTitleFromTypes } from './componentTypes';

export interface ComponentConfig {
  componentInstances: ComponentInstance[];
}

export interface ComponentInstance {
  id: string;
  type: string;
  title: string;
  content?: string;
  config?: any;
}

// 组件类型定义已从 componentTypes.ts 导入
export const RECORD_COMPONENT_TYPES = recordComponentTypes;
export const ANALYSIS_COMPONENT_TYPES = analysisComponentTypes;

// 获取组件标题
export const getComponentTitle = getComponentTitleFromTypes;

// 获取组件配置
export const getComponentConfig = (componentType: string): any => {
  switch (componentType) {
    case 'ai-custom':
      return { prompt: '请分析以下内容' };
    case 'chart':
      return { chartType: 'bar' };
    default:
      return {};
  }
};

// 验证组件配置
export const validateComponentConfig = (config: ComponentConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // 检查必需字段
  if (!config.componentInstances) {
    errors.push('缺少组件实例配置');
  }
  
  // 检查组件实例的完整性
  if (config.componentInstances) {
    config.componentInstances.forEach((instance, index) => {
      if (!instance.id) {
        errors.push(`组件实例 ${index} 缺少ID`);
      }
      if (!instance.type) {
        errors.push(`组件实例 ${index} 缺少类型`);
      }
      if (!instance.title) {
        errors.push(`组件实例 ${index} 缺少标题`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 标准化组件配置
export const normalizeComponentConfig = (config: any): ComponentConfig => {
  return {
    componentInstances: config.componentInstances || []
  };
};

// 合并组件配置（用于更新时保持兼容性）
export const mergeComponentConfig = (existing: ComponentConfig, updates: Partial<ComponentConfig>): ComponentConfig => {
  return {
    componentInstances: updates.componentInstances ?? existing.componentInstances
  };
};

// 触发配置更新事件
export const triggerConfigUpdate = (notebookId: string, config: ComponentConfig) => {
  const event = new CustomEvent('notebook:configUpdated', { 
    detail: { 
      notebookId, 
      config 
    } 
  });
  window.dispatchEvent(event);
  console.log('🔄 触发配置更新事件:', { notebookId, config });
};

// 监听配置更新事件
export const onConfigUpdate = (callback: (notebookId: string, config: ComponentConfig) => void) => {
  const handleConfigUpdate = (event: CustomEvent) => {
    const { notebookId, config } = event.detail;
    callback(notebookId, config);
  };
  
  window.addEventListener('notebook:configUpdated', handleConfigUpdate as EventListener);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('notebook:configUpdated', handleConfigUpdate as EventListener);
  };
};

// ==================== 双向同步机制 ====================

// 同步策略：以笔记本配置为权威数据源
// 1. 笔记级别变更 → 同步到笔记本级别
// 2. 笔记本级别变更 → 同步到所有相关笔记

// 同步方向枚举
export enum SyncDirection {
  NOTE_TO_NOTEBOOK = 'note_to_notebook',
  NOTEBOOK_TO_NOTES = 'notebook_to_notes',
  BIDIRECTIONAL = 'bidirectional'
}

// 同步配置接口
export interface SyncConfig {
  direction: SyncDirection;
  notebookId: string;
  noteId?: string; // 仅在笔记级别同步时需要
  componentInstances: ComponentInstance[];
  forceUpdate?: boolean; // 是否强制更新
}

// 同步结果接口
export interface SyncResult {
  success: boolean;
  message: string;
  updatedNotebook?: boolean;
  updatedNotes?: string[]; // 更新的笔记ID列表
  errors?: string[];
}

// 笔记级别 → 笔记本级别同步
export const syncNoteToNotebook = async (
  notebookId: string, 
  componentInstances: ComponentInstance[]
): Promise<SyncResult> => {
  try {
    console.log('🔄 同步笔记组件实例到笔记本配置:', { notebookId, componentInstances });
    
    // 获取当前笔记本配置
    const { data: notebookData } = await apiClient.get(`/api/notebooks/${notebookId}`);
    if (!notebookData.success) {
      throw new Error('获取笔记本配置失败');
    }
    
    const currentConfig = notebookData.notebook.component_config || {};
    
    // 构建新的组件配置，只包含组件实例
    const updatedConfig: ComponentConfig = {
      componentInstances: componentInstances // 使用笔记级别的组件实例
    };
    
    // 更新笔记本配置
    const { data: updateData } = await apiClient.put(`/api/notebooks/${notebookId}`, {
      componentConfig: updatedConfig
    });
    
    if (updateData.success) {
      console.log('✅ 笔记组件实例已同步到笔记本配置');
      
      // 触发配置更新事件
      triggerConfigUpdate(notebookId, updatedConfig);
      
      return {
        success: true,
        message: '笔记组件实例已同步到笔记本配置',
        updatedNotebook: true
      };
    } else {
      throw new Error(updateData.message || '更新笔记本配置失败');
    }
  } catch (error) {
    console.error('❌ 同步笔记到笔记本失败:', error);
    return {
      success: false,
      message: `同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
      errors: [error instanceof Error ? error.message : '未知错误']
    };
  }
};

// 笔记本级别 → 所有相关笔记同步
export const syncNotebookToNotes = async (
  notebookId: string, 
  componentInstances: ComponentInstance[]
): Promise<SyncResult> => {
  try {
    console.log('🔄 同步笔记本配置到所有相关笔记:', { notebookId, componentInstances });
    
    // 获取该笔记本下的所有笔记
    const { data: notesData } = await apiClient.get(`/api/notes?notebook_id=${notebookId}`);
    if (!notesData.success) {
      throw new Error('获取笔记列表失败');
    }
    
    const notes = notesData.notes || [];
    const updatedNoteIds: string[] = [];
    const errors: string[] = [];
    
    // 批量更新所有笔记的组件实例
    const updatePromises = notes.map(async (note: any) => {
      try {
        const { data: updateData } = await apiClient.put(`/api/notes/${note.note_id}`, {
          component_instances: JSON.stringify(componentInstances)
        });
        
        if (updateData.success) {
          updatedNoteIds.push(note.note_id);
          console.log(`✅ 笔记 ${note.note_id} 组件实例已更新`);
        } else {
          errors.push(`笔记 ${note.note_id} 更新失败: ${updateData.message}`);
        }
      } catch (error) {
        const errorMsg = `笔记 ${note.note_id} 更新异常: ${error instanceof Error ? error.message : '未知错误'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    });
    
    // 等待所有更新完成
    await Promise.all(updatePromises);
    
    console.log(`✅ 笔记本配置已同步到 ${updatedNoteIds.length} 个笔记`);
    
    return {
      success: updatedNoteIds.length > 0,
      message: `已同步到 ${updatedNoteIds.length} 个笔记`,
      updatedNotes: updatedNoteIds,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('❌ 同步笔记本到笔记失败:', error);
    return {
      success: false,
      message: `同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
      errors: [error instanceof Error ? error.message : '未知错误']
    };
  }
};

// 双向同步（智能选择同步方向）
export const syncComponentInstances = async (config: SyncConfig): Promise<SyncResult> => {
  console.log('🔄 开始双向同步:', config);
  
  try {
    switch (config.direction) {
      case SyncDirection.NOTE_TO_NOTEBOOK:
        return await syncNoteToNotebook(config.notebookId, config.componentInstances);
        
      case SyncDirection.NOTEBOOK_TO_NOTES:
        return await syncNotebookToNotes(config.notebookId, config.componentInstances);
        
      case SyncDirection.BIDIRECTIONAL: {
        // 双向同步：先同步到笔记本，再同步到所有笔记
        const notebookResult = await syncNoteToNotebook(config.notebookId, config.componentInstances);
        if (!notebookResult.success) {
          return notebookResult;
        }
        
        const notesResult = await syncNotebookToNotes(config.notebookId, config.componentInstances);
        
        return {
          success: notebookResult.success && notesResult.success,
          message: `双向同步完成: ${notebookResult.message}, ${notesResult.message}`,
          updatedNotebook: notebookResult.updatedNotebook,
          updatedNotes: notesResult.updatedNotes,
          errors: [...(notebookResult.errors || []), ...(notesResult.errors || [])]
        };
      }
        
      default:
        throw new Error(`不支持的同步方向: ${config.direction}`);
    }
  } catch (error) {
    console.error('❌ 双向同步失败:', error);
    return {
      success: false,
      message: `同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
      errors: [error instanceof Error ? error.message : '未知错误']
    };
  }
};

// 智能同步：根据变更来源自动选择同步方向
export const smartSync = async (
  notebookId: string,
  componentInstances: ComponentInstance[],
  source: 'note' | 'notebook' = 'note'
): Promise<SyncResult> => {
  const direction = source === 'note' 
    ? SyncDirection.NOTE_TO_NOTEBOOK 
    : SyncDirection.NOTEBOOK_TO_NOTES;
    
  return await syncComponentInstances({
    direction,
    notebookId,
    componentInstances
  });
};

// 验证组件实例一致性
export const validateConsistency = async (notebookId: string): Promise<{
  consistent: boolean;
  issues: string[];
  notebookInstances: ComponentInstance[];
  noteInstances: Record<string, ComponentInstance[]>;
}> => {
  try {
    // 获取笔记本配置
    const { data: notebookData } = await apiClient.get(`/api/notebooks/${notebookId}`);
    if (!notebookData.success) {
      throw new Error('获取笔记本配置失败');
    }
    
    const notebookInstances = notebookData.notebook.component_config?.componentInstances || [];
    
    // 获取所有笔记
    const { data: notesData } = await apiClient.get(`/api/notes?notebook_id=${notebookId}`);
    if (!notesData.success) {
      throw new Error('获取笔记列表失败');
    }
    
    const notes = notesData.notes || [];
    const noteInstances: Record<string, ComponentInstance[]> = {};
    const issues: string[] = [];
    
    // 检查每个笔记的组件实例
    notes.forEach((note: any) => {
      const noteComponentInstances = note.component_instances || [];
      noteInstances[note.note_id] = noteComponentInstances;
      
      // 比较组件实例数量
      if (noteComponentInstances.length !== notebookInstances.length) {
        issues.push(`笔记 ${note.note_id} 组件实例数量不一致: 笔记本(${notebookInstances.length}) vs 笔记(${noteComponentInstances.length})`);
      }
      
      // 比较组件类型
      const notebookTypes = notebookInstances.map((inst: ComponentInstance) => inst.type).sort();
      const noteTypes = noteComponentInstances.map((inst: ComponentInstance) => inst.type).sort();
      
      if (JSON.stringify(notebookTypes) !== JSON.stringify(noteTypes)) {
        issues.push(`笔记 ${note.note_id} 组件类型不一致: 笔记本[${notebookTypes.join(',')}] vs 笔记[${noteTypes.join(',')}]`);
      }
    });
    
    return {
      consistent: issues.length === 0,
      issues,
      notebookInstances,
      noteInstances
    };
  } catch (error) {
    console.error('❌ 验证一致性失败:', error);
    return {
      consistent: false,
      issues: [`验证失败: ${error instanceof Error ? error.message : '未知错误'}`],
      notebookInstances: [],
      noteInstances: {}
    };
  }
};

// 修复不一致性
export const fixInconsistency = async (notebookId: string): Promise<SyncResult> => {
  try {
    console.log('🔧 开始修复组件实例不一致性:', notebookId);
    
    // 获取笔记本配置作为权威数据源
    const { data: notebookData } = await apiClient.get(`/api/notebooks/${notebookId}`);
    if (!notebookData.success) {
      throw new Error('获取笔记本配置失败');
    }
    
    const componentInstances = notebookData.notebook.component_config?.componentInstances || [];
    
    // 使用笔记本配置同步到所有笔记
    return await syncNotebookToNotes(notebookId, componentInstances);
  } catch (error) {
    console.error('❌ 修复不一致性失败:', error);
    return {
      success: false,
      message: `修复失败: ${error instanceof Error ? error.message : '未知错误'}`,
      errors: [error instanceof Error ? error.message : '未知错误']
    };
  }
};
