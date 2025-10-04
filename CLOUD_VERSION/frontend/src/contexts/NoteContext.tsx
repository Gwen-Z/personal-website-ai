import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// 事件类型定义
export interface NoteEvent {
  type: 'COMPONENT_DELETED' | 'COMPONENT_ADDED' | 'COMPONENT_UPDATED' | 'NOTE_UPDATED';
  payload: {
    noteId: string;
    componentId?: string;
    componentType?: string;
    componentInstances?: any[];
    timestamp: number;
  };
}

// 状态接口
export interface NoteState {
  notes: Record<string, any>;
  componentInstances: Record<string, any[]>;
  lastUpdated: Record<string, number>;
}

// Action类型
type NoteAction = 
  | { type: 'UPDATE_NOTE'; payload: { noteId: string; note: any } }
  | { type: 'UPDATE_COMPONENT_INSTANCES'; payload: { noteId: string; instances: any[] } }
  | { type: 'DELETE_COMPONENT'; payload: { noteId: string; componentId: string } }
  | { type: 'ADD_COMPONENT'; payload: { noteId: string; component: any } }
  | { type: 'UPDATE_COMPONENT'; payload: { noteId: string; componentId: string; updates: any } };

// 初始状态
const initialState: NoteState = {
  notes: {},
  componentInstances: {},
  lastUpdated: {}
};

// Reducer
function noteReducer(state: NoteState, action: NoteAction): NoteState {
  switch (action.type) {
    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: {
          ...state.notes,
          [action.payload.noteId]: action.payload.note
        },
        lastUpdated: {
          ...state.lastUpdated,
          [action.payload.noteId]: Date.now()
        }
      };

    case 'UPDATE_COMPONENT_INSTANCES':
      return {
        ...state,
        componentInstances: {
          ...state.componentInstances,
          [action.payload.noteId]: action.payload.instances
        },
        lastUpdated: {
          ...state.lastUpdated,
          [action.payload.noteId]: Date.now()
        }
      };

    case 'DELETE_COMPONENT': {
      const currentInstances = state.componentInstances[action.payload.noteId] || [];
      const updatedInstances = currentInstances.filter(
        (comp: any) => comp.id !== action.payload.componentId
      );
      return {
        ...state,
        componentInstances: {
          ...state.componentInstances,
          [action.payload.noteId]: updatedInstances
        },
        lastUpdated: {
          ...state.lastUpdated,
          [action.payload.noteId]: Date.now()
        }
      };
    }

    case 'ADD_COMPONENT': {
      const existingInstances = state.componentInstances[action.payload.noteId] || [];
      return {
        ...state,
        componentInstances: {
          ...state.componentInstances,
          [action.payload.noteId]: [...existingInstances, action.payload.component]
        },
        lastUpdated: {
          ...state.lastUpdated,
          [action.payload.noteId]: Date.now()
        }
      };
    }

    case 'UPDATE_COMPONENT': {
      const instances = state.componentInstances[action.payload.noteId] || [];
      const updatedComponents = instances.map((comp: any) =>
        comp.id === action.payload.componentId
          ? { ...comp, ...action.payload.updates }
          : comp
      );
      return {
        ...state,
        componentInstances: {
          ...state.componentInstances,
          [action.payload.noteId]: updatedComponents
        },
        lastUpdated: {
          ...state.lastUpdated,
          [action.payload.noteId]: Date.now()
        }
      };
    }

    default:
      return state;
  }
}

// Context接口
interface NoteContextType {
  state: NoteState;
  dispatch: React.Dispatch<NoteAction>;
  emitEvent: (event: NoteEvent) => void;
  getNote: (noteId: string) => any;
  getComponentInstances: (noteId: string) => any[];
  updateNote: (noteId: string, note: any) => void;
  updateComponentInstances: (noteId: string, instances: any[]) => void;
  deleteComponent: (noteId: string, componentId: string) => void;
  addComponent: (noteId: string, component: any) => void;
  updateComponent: (noteId: string, componentId: string, updates: any) => void;
}

// 创建Context
const NoteContext = createContext<NoteContextType | undefined>(undefined);

// 事件监听器存储
const eventListeners: Map<string, Set<(event: NoteEvent) => void>> = new Map();

// Provider组件
export function NoteProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(noteReducer, initialState);

  // 事件发射函数
  const emitEvent = (event: NoteEvent) => {
    console.log('📡 发射事件:', event);
    
    // 通知所有监听器
    const listeners = eventListeners.get(event.type) || new Set();
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ 事件监听器执行失败:', error);
      }
    });
  };

  // 获取笔记
  const getNote = (noteId: string) => {
    return state.notes[noteId] || null;
  };

  // 获取组件实例
  const getComponentInstances = (noteId: string) => {
    return state.componentInstances[noteId] || [];
  };

  // 更新笔记
  const updateNote = (noteId: string, note: any) => {
    dispatch({ type: 'UPDATE_NOTE', payload: { noteId, note } });
  };

  // 更新组件实例
  const updateComponentInstances = (noteId: string, instances: any[]) => {
    dispatch({ type: 'UPDATE_COMPONENT_INSTANCES', payload: { noteId, instances } });
  };

  // 删除组件
  const deleteComponent = (noteId: string, componentId: string) => {
    dispatch({ type: 'DELETE_COMPONENT', payload: { noteId, componentId } });
    
    // 发射删除事件
    emitEvent({
      type: 'COMPONENT_DELETED',
      payload: {
        noteId,
        componentId,
        timestamp: Date.now()
      }
    });
  };

  // 添加组件
  const addComponent = (noteId: string, component: any) => {
    dispatch({ type: 'ADD_COMPONENT', payload: { noteId, component } });
    
    // 发射添加事件
    emitEvent({
      type: 'COMPONENT_ADDED',
      payload: {
        noteId,
        componentId: component.id,
        componentType: component.type,
        timestamp: Date.now()
      }
    });
  };

  // 更新组件
  const updateComponent = (noteId: string, componentId: string, updates: any) => {
    dispatch({ type: 'UPDATE_COMPONENT', payload: { noteId, componentId, updates } });
    
    // 发射更新事件
    emitEvent({
      type: 'COMPONENT_UPDATED',
      payload: {
        noteId,
        componentId,
        timestamp: Date.now()
      }
    });
  };

  const value: NoteContextType = {
    state,
    dispatch,
    emitEvent,
    getNote,
    getComponentInstances,
    updateNote,
    updateComponentInstances,
    deleteComponent,
    addComponent,
    updateComponent
  };

  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  );
}

// Hook
export function useNoteContext() {
  const context = useContext(NoteContext);
  if (context === undefined) {
    throw new Error('useNoteContext must be used within a NoteProvider');
  }
  return context;
}

// 事件监听Hook
export function useNoteEvent(
  eventType: NoteEvent['type'],
  callback: (event: NoteEvent) => void,
  deps: any[] = []
) {
  const context = useNoteContext();
  
  React.useEffect(() => {
    // 添加事件监听器
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, new Set());
    }
    const listeners = eventListeners.get(eventType)!;
    listeners.add(callback);

    // 清理函数
    return () => {
      listeners.delete(callback);
    };
  }, deps);

  return context;
}
