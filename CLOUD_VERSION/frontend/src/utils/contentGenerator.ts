// 动态内容生成器
// 根据组件模板和笔记数据生成最终显示内容

export interface ComponentTemplate {
  id: string;
  type: string;
  title: string;
  contentTemplate?: string;
  config?: any;
  dataMapping?: {
    source: string;
    transform?: string;
  };
}

export interface NoteData {
  title: string;
  content_text: string;
  images: string[];
  source_url: string;
  original_url: string;
  author: string;
  upload_time: string;
  created_at: string;
  updated_at: string;
}

export interface RenderedComponent {
  id: string;
  type: string;
  title: string;
  content: string;
  config?: any;
}

/**
 * 数据转换函数
 */
const transformFunctions: Record<string, (value: any) => string> = {
  uppercase: (value: string) => value?.toString().toUpperCase() || '',
  lowercase: (value: string) => value?.toString().toLowerCase() || '',
  capitalize: (value: string) => {
    const str = value?.toString() || '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  date: (value: string) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('zh-CN');
    } catch {
      return value;
    }
  },
  datetime: (value: string) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleString('zh-CN');
    } catch {
      return value;
    }
  },
  truncate: (value: string) => {
    const str = value?.toString() || '';
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
  }
};

/**
 * 解析数据源路径，如 "note.title" -> noteData.title
 */
function resolveDataSource(path: string, noteData: NoteData): any {
  const parts = path.split('.');
  let value = noteData as any;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return '';
    }
  }
  
  return value;
}

/**
 * 应用数据转换
 */
function applyTransform(value: any, transform?: string): string {
  if (!transform || !transformFunctions[transform]) {
    return value?.toString() || '';
  }
  
  return transformFunctions[transform](value);
}

/**
 * 处理模板字符串，替换占位符
 */
function processTemplate(template: string, noteData: NoteData): string {
  // 支持 {{note.title}} 格式的占位符
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = resolveDataSource(path.trim(), noteData);
    return value?.toString() || '';
  });
}

/**
 * 根据组件模板和笔记数据生成渲染组件
 */
export function generateRenderedComponents(
  templates: ComponentTemplate[],
  noteData: NoteData
): RenderedComponent[] {
  return templates.map(template => {
    let content = '';
    
    // 1. 如果有数据映射，使用映射规则
    if (template.dataMapping) {
      const sourceValue = resolveDataSource(template.dataMapping.source, noteData);
      content = applyTransform(sourceValue, template.dataMapping.transform);
    }
    // 2. 如果有内容模板，处理模板字符串
    else if (template.contentTemplate) {
      content = processTemplate(template.contentTemplate, noteData);
    }
    // 3. 根据组件类型使用默认映射
    else {
      content = getDefaultContent(template, noteData);
    }
    
    return {
      id: template.id,
      type: template.type,
      title: template.title,
      content,
      config: template.config
    };
  });
}

/**
 * 根据组件类型获取默认内容
 */
function getDefaultContent(template: ComponentTemplate, noteData: NoteData): string {
  switch (template.type) {
    case 'text-short':
    case 'text-long':
      // 标题组件
      if (template.title.toLowerCase().includes('标题')) {
        return noteData.title || '';
      }
      // 内容组件
      if (template.title.toLowerCase().includes('内容')) {
        return noteData.content_text || '';
      }
      // 来源组件
      if (template.title.toLowerCase().includes('来源')) {
        return noteData.source_url || noteData.original_url || '';
      }
      // 作者组件
      if (template.title.toLowerCase().includes('作者')) {
        return noteData.author || '';
      }
      // 时间组件
      if (template.title.toLowerCase().includes('时间') || template.title.toLowerCase().includes('日期')) {
        return noteData.upload_time || noteData.created_at || '';
      }
      break;
      
    case 'image':
      // 图片组件
      if (Array.isArray(noteData.images) && noteData.images.length > 0) {
        return noteData.images.join(',');
      }
      break;
      
    case 'date':
      // 日期组件
      return noteData.upload_time || noteData.created_at || '';
      
    case 'chart':
      // 图表组件 - 可以根据笔记数据生成图表数据
      return JSON.stringify({
        title: noteData.title,
        data: [noteData.title, noteData.content_text?.length || 0]
      });
      
    default:
      return '';
  }
  
  return '';
}

/**
 * 将旧的ComponentInstance转换为ComponentTemplate
 */
export function convertToTemplate(instance: any): ComponentTemplate {
  return {
    id: instance.id,
    type: instance.type,
    title: instance.title,
    contentTemplate: instance.contentTemplate,
    config: instance.config,
    dataMapping: instance.dataMapping
  };
}

/**
 * 创建预定义的组件模板
 */
export function createDefaultTemplates(): ComponentTemplate[] {
  return [
    {
      id: 'title-template',
      type: 'text-short',
      title: '笔记标题',
      dataMapping: {
        source: 'title',
        transform: 'capitalize'
      }
    },
    {
      id: 'content-template',
      type: 'text-long',
      title: '笔记内容',
      dataMapping: {
        source: 'content_text'
      }
    },
    {
      id: 'source-template',
      type: 'text-short',
      title: '来源',
      dataMapping: {
        source: 'source_url'
      }
    },
    {
      id: 'author-template',
      type: 'text-short',
      title: '作者',
      dataMapping: {
        source: 'author'
      }
    },
    {
      id: 'time-template',
      type: 'date',
      title: '创建时间',
      dataMapping: {
        source: 'created_at',
        transform: 'datetime'
      }
    }
  ];
}
