import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// 组件实例接口
export interface ComponentInstance {
  id: string;
  type: string;
  title: string;
  content?: string;
  config?: Record<string, unknown>;
}

// 状态接口
interface ComponentTemplateState {
  newNoteTemplate: ComponentInstance[];
  lastUpdated: number;
}

// 动作类型
type ComponentTemplateAction = 
  | { type: 'UPDATE_NEW_NOTE_TEMPLATE'; payload: ComponentInstance[] }
  | { type: 'RESET_NEW_NOTE_TEMPLATE' }
  | { type: 'ADD_COMPONENT_TO_TEMPLATE'; payload: ComponentInstance }
  | { type: 'REMOVE_COMPONENT_FROM_TEMPLATE'; payload: string }
  | { type: 'UPDATE_COMPONENT_IN_TEMPLATE'; payload: { id: string; updates: Partial<ComponentInstance> } };

// 初始状态
const initialState: ComponentTemplateState = {
  newNoteTemplate: [],
  lastUpdated: 0
};

// Reducer
function componentTemplateReducer(state: ComponentTemplateState, action: ComponentTemplateAction): ComponentTemplateState {
  switch (action.type) {
    case 'UPDATE_NEW_NOTE_TEMPLATE':
      return {
        ...state,
        newNoteTemplate: action.payload,
        lastUpdated: Date.now()
      };

    case 'RESET_NEW_NOTE_TEMPLATE':
      return {
        ...state,
        newNoteTemplate: [],
        lastUpdated: Date.now()
      };

    case 'ADD_COMPONENT_TO_TEMPLATE':
      return {
        ...state,
        newNoteTemplate: [...state.newNoteTemplate, action.payload],
        lastUpdated: Date.now()
      };

    case 'REMOVE_COMPONENT_FROM_TEMPLATE':
      return {
        ...state,
        newNoteTemplate: state.newNoteTemplate.filter(comp => comp.id !== action.payload),
        lastUpdated: Date.now()
      };

    case 'UPDATE_COMPONENT_IN_TEMPLATE':
      return {
        ...state,
        newNoteTemplate: state.newNoteTemplate.map(comp => 
          comp.id === action.payload.id 
            ? { ...comp, ...action.payload.updates }
            : comp
        ),
        lastUpdated: Date.now()
      };

    default:
      return state;
  }
}

// Context 类型
interface ComponentTemplateContextType {
  state: ComponentTemplateState;
  dispatch: React.Dispatch<ComponentTemplateAction>;
  updateNewNoteTemplate: (instances: ComponentInstance[]) => void;
  resetNewNoteTemplate: () => void;
  addComponentToTemplate: (component: ComponentInstance) => void;
  removeComponentFromTemplate: (componentId: string) => void;
  updateComponentInTemplate: (componentId: string, updates: Partial<ComponentInstance>) => void;
  getNewNoteTemplate: () => ComponentInstance[];
}

// 创建Context
const ComponentTemplateContext = createContext<ComponentTemplateContextType | undefined>(undefined);

// Provider组件
export function ComponentTemplateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(componentTemplateReducer, initialState);

  // 更新新建笔记模板
  const updateNewNoteTemplate = (instances: ComponentInstance[]) => {
    dispatch({ type: 'UPDATE_NEW_NOTE_TEMPLATE', payload: instances });
  };

  // 重置新建笔记模板
  const resetNewNoteTemplate = () => {
    dispatch({ type: 'RESET_NEW_NOTE_TEMPLATE' });
  };

  // 添加组件到模板
  const addComponentToTemplate = (component: ComponentInstance) => {
    dispatch({ type: 'ADD_COMPONENT_TO_TEMPLATE', payload: component });
  };

  // 从模板中移除组件
  const removeComponentFromTemplate = (componentId: string) => {
    dispatch({ type: 'REMOVE_COMPONENT_FROM_TEMPLATE', payload: componentId });
  };

  // 更新模板中的组件
  const updateComponentInTemplate = (componentId: string, updates: Partial<ComponentInstance>) => {
    dispatch({ type: 'UPDATE_COMPONENT_IN_TEMPLATE', payload: { id: componentId, updates } });
  };

  // 获取新建笔记模板
  const getNewNoteTemplate = () => {
    return state.newNoteTemplate;
  };

  const value: ComponentTemplateContextType = {
    state,
    dispatch,
    updateNewNoteTemplate,
    resetNewNoteTemplate,
    addComponentToTemplate,
    removeComponentFromTemplate,
    updateComponentInTemplate,
    getNewNoteTemplate
  };

  return (
    <ComponentTemplateContext.Provider value={value}>
      {children}
    </ComponentTemplateContext.Provider>
  );
}

// Hook
export function useComponentTemplate() {
  const context = useContext(ComponentTemplateContext);
  if (context === undefined) {
    throw new Error('useComponentTemplate must be used within a ComponentTemplateProvider');
  }
  return context;
}
