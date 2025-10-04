import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';
import { onConfigUpdate, smartSync, SyncDirection } from '../utils/componentSync';
import { useNoteContext, useNoteEvent } from '../contexts/NoteContext';
import { DynamicComponentRenderer } from './DynamicComponentRenderer';
import { registerAllComponentRenderers } from './renderers';
import { generateRenderedComponents, convertToTemplate, ComponentTemplate, NoteData, RenderedComponent } from '../utils/contentGenerator';
import { getDisplayTitle } from '../utils/displayTitle';

interface Note {
  note_id: string;
  notebook_id: string;
  title: string;
  content: string;
  content_text: string;
  image_url: string;
  images: string[];
  image_urls: string; // JSON字符串存储多张图片URL
  image_files: string; // JSON字符串存储上传的图片文件信息
  source_url: string;
  source: string; // 来源
  original_url: string; // 原链接
  author: string; // 作者
  upload_time: string; // 上传时间
  duration_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
  component_instances?: ComponentInstance[]; // 组件实例数据
  component_data?: Record<string, any>; // 组件数据
}

// 组件实例接口
interface ComponentInstance {
  id: string;
  type: string;
  title: string;
  content?: string;
  config?: any;
}

interface Notebook {
  notebook_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  note_count: number;
  component_config?: {
    componentInstances?: ComponentInstance[];
    analysisComponents?: string[];
  };
}

interface AIAnalysis {
  coreViewpoints: string;
  keywords: string[];
  knowledgeExtension: string;
  learningPath: string;
  chatSummary: string;
}

const NoteDetailPage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { getComponentInstances, updateComponentInstances } = useNoteContext();
  const [note, setNote] = useState<Note | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSummary, setChatSummary] = useState('');
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  // 组件编辑状态管理
  const [editingComponentInstances, setEditingComponentInstances] = useState<ComponentInstance[]>([]);
  const [isEditingComponents, setIsEditingComponents] = useState(false);

  // 初始化组件渲染器
  useEffect(() => {
    registerAllComponentRenderers();
  }, []);

  useEffect(() => {
    console.log('🔍 NoteDetailPage useEffect triggered, noteId:', noteId);
    if (!noteId) {
      console.log('❌ No noteId provided');
      return;
    }

    const fetchNoteDetail = async () => {
      console.log('🔄 Fetching note detail for ID:', noteId);
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/note-detail-data?id=${noteId}`);
        console.log('✅ API response received:', response.data);
        
        if (response.data.success) {
          console.log('✅ Setting note data:', response.data.note);
          console.log('✅ Setting notebook data:', response.data.notebook);
          console.log('🔍 Note component_instances:', response.data.note.component_instances);
          console.log('🔍 Note component_instances length:', response.data.note.component_instances?.length);
          
          setNote(response.data.note);
          setNotebook(response.data.notebook);
          
          // 初始化图片数据
          let imageUrls = [];
          try {
            if (response.data.note.image_urls) {
              imageUrls = JSON.parse(response.data.note.image_urls);
            } else if (response.data.note.images) {
              // 兼容旧的images字段
              imageUrls = Array.isArray(response.data.note.images) ? response.data.note.images : JSON.parse(response.data.note.images || '[]');
            }
          } catch (e) {
            console.error('解析图片数据失败:', e);
            imageUrls = [];
          }
          setEditImages(imageUrls);
          
          // 初始化组件实例编辑状态
          if (response.data.note.component_instances) {
            setEditingComponentInstances(response.data.note.component_instances);
          }
          
          console.log('✅ Note detail data loaded successfully');
        } else {
          console.log('❌ API response not successful:', response.data);
          setError(response.data.error || 'Failed to load note');
        }
      } catch (err) {
        console.error('❌ Error fetching note details:', err);
        setError('Failed to load note details');
      }
      setLoading(false);
    };

    fetchNoteDetail();
  }, [noteId]);

  // 监听组件删除事件，实现实时同步
  useNoteEvent('COMPONENT_DELETED', (event) => {
    console.log('📡 收到组件删除事件:', event);
    if (event.payload.noteId === noteId || event.payload.noteId === notebook?.notebook_id) {
      console.log('🔄 组件删除事件匹配，刷新笔记数据');
      // 重新获取笔记详情
      const refreshNote = async () => {
        try {
          const response = await apiClient.get(`/api/note-detail-data?id=${noteId}`);
          if (response.data.success) {
            setNote(response.data.note);
            setNotebook(response.data.notebook);
            console.log('✅ 笔记数据已刷新');
          }
        } catch (error) {
          console.error('❌ 刷新笔记数据失败:', error);
        }
      };
      refreshNote();
    }
  }, [noteId, notebook?.notebook_id]);

  // 监听组件实例更新事件
  useNoteEvent('COMPONENT_UPDATED', (event) => {
    console.log('📡 收到组件更新事件:', event);
    if (event.payload.noteId === noteId) {
      console.log('🔄 组件更新事件匹配，刷新笔记数据');
      // 重新获取笔记详情
      const refreshNote = async () => {
        try {
          const response = await apiClient.get(`/api/note-detail-data?id=${noteId}`);
          if (response.data.success) {
            setNote(response.data.note);
            setNotebook(response.data.notebook);
            console.log('✅ 笔记数据已刷新');
          }
        } catch (error) {
          console.error('❌ 刷新笔记数据失败:', error);
        }
      };
      refreshNote();
    }
  }, [noteId]);

  // 监听自定义事件：组件删除
  useEffect(() => {
    const handleComponentDeleted = (event: CustomEvent) => {
      console.log('📡 收到自定义组件删除事件:', event.detail);
      if (event.detail.notebookId === notebook?.notebook_id) {
        console.log('🔄 组件删除事件匹配，刷新笔记数据');
        // 重新获取笔记详情
        const refreshNote = async () => {
          try {
            const response = await apiClient.get(`/api/note-detail-data?id=${noteId}`);
            if (response.data.success) {
              setNote(response.data.note);
              setNotebook(response.data.notebook);
              console.log('✅ 笔记数据已刷新');
            }
          } catch (error) {
            console.error('❌ 刷新笔记数据失败:', error);
          }
        };
        refreshNote();
      }
    };

    window.addEventListener('note:component-deleted', handleComponentDeleted as EventListener);
    return () => {
      window.removeEventListener('note:component-deleted', handleComponentDeleted as EventListener);
    };
  }, [noteId, notebook?.notebook_id]);

  // 监听自定义事件：组件新增
  useEffect(() => {
    const handleComponentAdded = (event: CustomEvent) => {
      console.log('📡 收到自定义组件新增事件:', event.detail);
      if (event.detail.notebookId === notebook?.notebook_id) {
        console.log('🔄 组件新增事件匹配，刷新笔记数据');
        // 重新获取笔记详情
        const refreshNote = async () => {
          try {
            const response = await apiClient.get(`/api/note-detail-data?id=${noteId}`);
            if (response.data.success) {
              setNote(response.data.note);
              setNotebook(response.data.notebook);
              console.log('✅ 笔记数据已刷新');
            }
          } catch (error) {
            console.error('❌ 刷新笔记数据失败:', error);
          }
        };
        refreshNote();
      }
    };

    window.addEventListener('note:component-added', handleComponentAdded as EventListener);
    return () => {
      window.removeEventListener('note:component-added', handleComponentAdded as EventListener);
    };
  }, [noteId, notebook?.notebook_id]);

  // 监听自定义事件：组件更新
  useEffect(() => {
    const handleComponentUpdated = (event: CustomEvent) => {
      console.log('📡 收到自定义组件更新事件:', event.detail);
      if (event.detail.notebookId === notebook?.notebook_id) {
        console.log('🔄 组件更新事件匹配，刷新笔记数据');
        // 重新获取笔记详情
        const refreshNote = async () => {
          try {
            const response = await apiClient.get(`/api/note-detail-data?id=${noteId}`);
            if (response.data.success) {
              setNote(response.data.note);
              setNotebook(response.data.notebook);
              console.log('✅ 笔记数据已刷新');
            }
          } catch (error) {
            console.error('❌ 刷新笔记数据失败:', error);
          }
        };
        refreshNote();
      }
    };

    window.addEventListener('note:component-updated', handleComponentUpdated as EventListener);
    return () => {
      window.removeEventListener('note:component-updated', handleComponentUpdated as EventListener);
    };
  }, [noteId, notebook?.notebook_id]);

  // 监听笔记本配置更新事件
  useEffect(() => {
    const cleanup = onConfigUpdate((updatedNotebookId, config) => {
      if (updatedNotebookId === notebook?.notebook_id) {
        console.log('🔄 收到笔记本配置更新事件，更新笔记本配置');
        // 更新本地笔记本配置
        setNotebook(prev => prev ? { ...prev, component_config: config } : null);
      }
    });
    
    return cleanup;
  }, [notebook?.notebook_id]);

  // 处理图片URL输入
  const handleImageUrlSubmit = () => {
    if (imageInput.trim()) {
      setPendingImages([...pendingImages, imageInput.trim()]);
      setImageInput('');
    }
  };

  // 添加图片URL的别名函数
  const addImageFromUrl = handleImageUrlSubmit;

  // 处理图片粘贴
  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            setPendingImages([...pendingImages, imageUrl]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            setPendingImages([...pendingImages, imageUrl]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // 删除图片
  const removeImage = (index: number) => {
    setEditImages(editImages.filter((_, i) => i !== index));
  };

  // 删除待确认图片
  const removePendingImage = (index: number) => {
    setPendingImages(pendingImages.filter((_, i) => i !== index));
  };

  // 确认添加图片
  const confirmAddImages = async () => {
    const newImages = [...editImages, ...pendingImages];
    setEditImages(newImages);
    setPendingImages([]);
    
    // 如果有笔记，立即保存图片到数据库
    if (note) {
      try {
        const response = await apiClient.put(`/api/notes/${note.note_id}`, {
          image_urls: JSON.stringify(newImages)
        });
        
        if (response.data.success) {
          setNote(prev => prev ? { 
            ...prev, 
            image_urls: JSON.stringify(newImages)
          } : null);
        }
      } catch (err) {
        console.error('保存图片失败:', err);
        alert('保存图片失败，请重试');
      }
    }
  };

  // 取消添加图片
  const cancelAddImages = () => {
    setPendingImages([]);
  };

  const generateAIAnalysis = async (noteData: Note) => {
    if (!noteData) return;
    
    setAiLoading(true);
    try {
      const content = noteData.content_text || noteData.content || '';
      const title = noteData.title || '';
      
      // 调用豆包API生成分析
      const response = await apiClient.post('/doubao-analysis', {
        title,
        content,
        noteId: noteData.note_id
      });
      
      if (response.data.success) {
        setAiAnalysis(response.data.analysis);
      }
    } catch (err) {
      console.error('Failed to generate AI analysis:', err);
    }
    setAiLoading(false);
  };

  const handleBack = () => {
    if (notebook) {
      navigate(`/notes/${notebook.notebook_id}`);
    } else {
      navigate('/');
    }
  };


  const handleEditImages = () => {
    if (note) {
      setEditImages(note.image_urls ? JSON.parse(note.image_urls) : []);
    }
    setIsEditingImages(true);
  };


  const handleSaveImages = async () => {
    if (!note) return;
    
    try {
      const response = await apiClient.put(`/api/notes/${note.note_id}`, {
        image_urls: JSON.stringify(editImages)
      });
      
      if (response.data.success) {
        setNote(prev => prev ? { 
          ...prev, 
          image_urls: JSON.stringify(editImages)
        } : null);
        setIsEditingImages(false);
        alert('图片保存成功！');
      } else {
        alert('图片保存失败，请重试');
      }
    } catch (err) {
      console.error('Save images error:', err);
      alert('图片保存失败，请重试');
    }
  };


  const handleCancelImages = () => {
    if (note) {
      setEditImages(note.image_urls ? JSON.parse(note.image_urls) : []);
    }
    setPendingImages([]);
    setIsEditingImages(false);
  };


  // 组件编辑相关函数
  const handleEditComponents = () => {
    // 获取组件实例：优先使用笔记的component_instances，如果为空则从笔记本配置中获取
    let componentInstances = note?.component_instances || [];
    if (componentInstances.length === 0) {
      // 检查两种可能的数据结构
      const notebookComponentInstances = notebook?.component_config?.componentInstances;
      if (notebookComponentInstances && Array.isArray(notebookComponentInstances)) {
        componentInstances = notebookComponentInstances;
      }
    }
    
    // 用 note.component_data 为实例填充 content，便于编辑时看到真实内容
    const normalizeToMap = (input: unknown): Record<string, any> => {
      if (!input) return {};
      try {
        const data = typeof input === 'string' ? JSON.parse(input) : input;
        if (Array.isArray(data)) {
          const map: Record<string, any> = {};
          data.forEach((item: any) => {
            const k = item?.id ?? item?.key;
            if (k !== undefined && k !== null) map[String(k)] = item;
          });
          return map;
        }
        if (typeof data === 'object') return data as Record<string, any>;
      } catch {
        return {};
      }
      return {};
    };
    const dataMap: Record<string, any> = normalizeToMap(note?.component_data as unknown);
    const instancesWithContent = componentInstances.map(ci => {
      const idKey = String(ci.id);
      let entry = dataMap[idKey];
      // 如果 id 未命中，尝试通过 type + title 模糊匹配一次
      if (!entry) {
        const candidates = Object.values(dataMap) as any[];
        entry = candidates.find(e => e && e.type === ci.type && (e.title === ci.title || !e.title));
      }
      const value = entry && typeof entry.value === 'string' ? entry.value : '';
      if (value && value.trim() !== '') {
        return { ...ci, content: value } as ComponentInstance;
      }
      // 编辑态兜底：与展示态一致，确保输入框能看到可编辑文本
      if (ci.type === 'text-short') {
        const fallbackFromTitle = (note?.title || '').trim();
        const fallbackFromContent = (note?.content_text || '').split(/[\n。.!?？!]/)[0] || '';
        const fallback = fallbackFromTitle || fallbackFromContent;
        if (fallback) {
          return { ...ci, content: fallback } as ComponentInstance;
        }
      }
      if (ci.type === 'text-long') {
        const longFallback = (note?.content_text || '').trim();
        if (longFallback) {
          return { ...ci, content: longFallback } as ComponentInstance;
        }
      }
      return ci as ComponentInstance;
    });
    
    // 生成分析组件实例
    let analysisComponentInstances: ComponentInstance[] = [];
    const analysisComponents = notebook?.component_config?.analysisComponents;
    if (analysisComponents && 
        Array.isArray(analysisComponents) && 
        analysisComponents.length > 0) {
      analysisComponentInstances = analysisComponents.map((componentType: string, index: number) => ({
        id: `analysis-${componentType}-${index}`,
        type: componentType,
        title: componentType, // 使用组件类型作为标题，或者从组件注册表获取
        config: {} // 使用空配置，让组件渲染器处理默认配置
      }));
    }
    
    // 合并所有组件实例
    const allComponentInstancesToEdit = [...instancesWithContent, ...analysisComponentInstances];
    setEditingComponentInstances([...allComponentInstancesToEdit]);
    setIsEditingComponents(true);
  };

  const handleSaveComponents = async () => {
    if (!note) return;
    
    try {
      // 构建 component_data（仅保存有内容的组件）
      const finalComponentData: Record<string, { value: string; type: string; title: string }> = {};
      editingComponentInstances.forEach(inst => {
        if (typeof inst.content === 'string' && inst.content.trim() !== '') {
          finalComponentData[inst.id] = {
            value: inst.content,
            type: inst.type,
            title: inst.title || inst.type
          };
        }
      });

      const response = await apiClient.put(`/api/notes/${note.note_id}`, {
        component_instances: JSON.stringify(editingComponentInstances),
        component_data: JSON.stringify(finalComponentData)
      });
      
      if (response.data.success) {
        setNote(prev => prev ? { 
          ...prev, 
          component_instances: editingComponentInstances,
          component_data: finalComponentData
        } : null);
        
        // 双向同步：将笔记的组件实例同步到笔记本配置
        try {
          console.log('🔄 开始双向同步组件实例...');
          const syncResult = await smartSync(note.notebook_id, editingComponentInstances, 'note');
          
          if (syncResult.success) {
            console.log('✅ 组件实例同步成功:', syncResult.message);
          } else {
            console.warn('⚠️ 组件实例同步失败:', syncResult.message);
            // 不阻止保存，只记录警告
          }
        } catch (syncError) {
          console.error('❌ 组件实例同步异常:', syncError);
          // 不阻止保存，只记录错误
        }
        
        setIsEditingComponents(false);
        alert('组件内容保存成功！');
      } else {
        alert('组件内容保存失败，请重试');
      }
    } catch (err) {
      console.error('Save components error:', err);
      alert('组件内容保存失败，请重试');
    }
  };

  const handleCancelComponents = () => {
    // 重置编辑状态，不设置editingComponentInstances
    setIsEditingComponents(false);
  };

  const updateComponentContent = (instanceId: string, content: string) => {
    setEditingComponentInstances(prev => 
      prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, content }
          : instance
      )
    );
  };

  const updateComponentConfig = (instanceId: string, config: any) => {
    setEditingComponentInstances(prev => 
      prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, config: { ...instance.config, ...config } }
          : instance
      )
    );
  };

  const handleDelete = async () => {
    if (!note || !window.confirm('确定删除这条笔记吗？')) return;
    
    try {
      await apiClient.post('/api/note-delete', { id: note.note_id });
      handleBack();
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert('删除失败');
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !note) return;
    
    const userMessage = { role: 'user' as const, content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    try {
      const response = await apiClient.post('/doubao-chat', {
        message: chatInput,
        noteId: note.note_id,
        noteTitle: note.title,
        noteContent: note.content_text || note.content
      });
      
      if (response.data.success) {
        const assistantMessage = { role: 'assistant' as const, content: response.data.reply };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Failed to send chat message:', err);
      const errorMessage = { role: 'assistant' as const, content: '抱歉，AI助手暂时无法回复，请稍后再试。' };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  const generateChatSummary = async () => {
    if (chatMessages.length === 0) return;
    
    try {
      const response = await apiClient.post('/doubao-chat-summary', {
        messages: chatMessages,
        noteId: note?.note_id
      });
      
      if (response.data.success) {
        setChatSummary(response.data.summary);
      }
    } catch (err) {
      console.error('Failed to generate chat summary:', err);
    }
  };

  // 动态渲染组件 - 使用组件注册表
  const renderComponent = (instance: RenderedComponent, isEditing: boolean = false) => {
    return (
      <DynamicComponentRenderer
        instance={instance}
        isEditing={isEditing}
        onUpdate={updateComponentContent}
        onConfigUpdate={updateComponentConfig}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">{error || '笔记不存在'}</div>
      </div>
    );
  }

  // 使用模板化系统生成组件实例
  console.log('🔍 检查note对象:', note);
  console.log('🔍 note?.component_instances:', note?.component_instances);
  
  // 将笔记数据转换为NoteData格式
  const noteData: NoteData = {
    title: note?.title || '',
    content_text: note?.content_text || '',
    images: note?.images || [],
    source_url: note?.source_url || '',
    original_url: note?.original_url || '',
    author: note?.author || '',
    upload_time: note?.upload_time || '',
    created_at: note?.created_at || '',
    updated_at: note?.updated_at || ''
  };
  
  // 将组件实例转换为模板
  const componentTemplates: ComponentTemplate[] = (note?.component_instances || []).map(convertToTemplate);
  console.log('🔍 组件模板数量:', componentTemplates.length);
  console.log('🔍 组件模板:', componentTemplates.map(t => ({ type: t.type, title: t.title, dataMapping: t.dataMapping })));
  
  // 使用模板和数据生成最终渲染的组件
  const generatedInstances: RenderedComponent[] = generateRenderedComponents(componentTemplates, noteData);
  
  // 合并 note.component_data 中的真实输入值（优先生效）
  const normalizeToMap = (input: unknown): Record<string, any> => {
    if (!input) return {};
    try {
      const data = typeof input === 'string' ? JSON.parse(input) : input;
      if (Array.isArray(data)) {
        const map: Record<string, any> = {};
        data.forEach((item: any) => {
          const k = item?.id ?? item?.key;
          if (k !== undefined && k !== null) map[String(k)] = item;
        });
        return map;
      }
      if (typeof data === 'object') return data as Record<string, any>;
    } catch {
      return {};
    }
    return {};
  };
  const componentData: Record<string, any> = normalizeToMap(note?.component_data as unknown);
  const allComponentInstances: RenderedComponent[] = generatedInstances.map(inst => {
    const idKey = String(inst.id);
    let dataEntry = componentData[idKey];
    if (!dataEntry) {
      const candidates = Object.values(componentData) as any[];
      dataEntry = candidates.find(e => e && e.type === inst.type && (e.title === inst.title || !e.title));
    }
    const value = dataEntry && typeof dataEntry.value === 'string' ? dataEntry.value : '';
    if (value && value.trim() !== '') {
      return { ...inst, content: value };
    }
    // Fallback: if text-short has no content, try note title or first sentence of content_text
    if (inst.type === 'text-short') {
      const fallbackFromTitle = (note?.title || '').trim();
      const fallbackFromContent = (note?.content_text || '').split(/[\n。.!?？!]/)[0] || '';
      const fallback = fallbackFromTitle || fallbackFromContent;
      if (fallback) {
        return { ...inst, content: fallback };
      }
    }
    return inst;
  });
  
  console.log('🔍 渲染组件数量:', allComponentInstances.length);
  console.log('🔍 渲染组件:', allComponentInstances.map(c => ({ type: c.type, title: c.title, content: (c.content || '').substring(0, 50) + '...' })));
  
  // 检查是否有异常数量的组件
  if (allComponentInstances.length > 50) {
    console.error('❌ 组件数量异常！', {
      totalCount: allComponentInstances.length,
      allInstances: allComponentInstances
    });
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-800 tracking-[1px] leading-5">{getDisplayTitle(note as any)}</h1>
              {notebook && (
                <p className="text-sm text-gray-500 mt-1">
                  来自：{notebook.name} • {allComponentInstances.length} 个组件
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700"
            >
              AI助手
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 动态组件渲染区域 */}
          {allComponentInstances.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              {/* 标题和编辑按钮 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="inline-block px-4 py-2 text-base font-semibold text-white bg-purple-600 rounded-xl">笔记内容</h2>
                <div className="flex items-center gap-2">
                  {!isEditingComponents && allComponentInstances.length > 0 && (
                    <button
                      onClick={handleEditComponents}
                      className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      编辑
                    </button>
                  )}
                  {isEditingComponents && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCancelComponents}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveComponents}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        保存组件
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 动态组件列表 */}
              <div className="space-y-4">
                {(isEditingComponents ? editingComponentInstances : allComponentInstances).map((instance, index) => {
                  // 确保 content 存在，如果不存在则使用空字符串
                  const renderedInstance: RenderedComponent = {
                    ...instance,
                    content: instance.content || ''
                  };
                  return (
                    <div key={instance.id || index}>
                      {renderComponent(renderedInstance, isEditingComponents)}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 回退到原始固定组件显示 */
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              {/* 标题和编辑按钮 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="inline-block px-4 py-2 text-base font-semibold text-white bg-purple-600 rounded-xl">笔记内容</h2>
              </div>

              {/* 内容区域 */}
                <div className="space-y-6">
                  {/* 标题区域 */}
                  <div>
                    <h4 className="inline-block px-3 py-1 text-lg font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">标题</h4>
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[60px]">
                      <h3 className="text-sm font-semibold text-gray-700 tracking-[1px] leading-5">{getDisplayTitle(note as any)}</h3>
                    </div>
                  </div>

                  {/* 内容区域 */}
                  <div>
                    <h4 className="inline-block px-3 py-1 text-lg font-semibold text-purple-600 border-2 border-purple-600 rounded-lg mb-3">内容</h4>
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
                      {note.content_text ? (
                        <div className="text-xs text-gray-700 tracking-[1px] leading-5" dangerouslySetInnerHTML={{ 
                          __html: note.content_text.replace(/\n/g, '<br/>') 
                        }} />
                      ) : note.content ? (
                        <div className="text-xs text-gray-700 tracking-[1px] leading-5" dangerouslySetInnerHTML={{ 
                          __html: note.content.replace(/\n/g, '<br/>') 
                        }} />
                      ) : (
                        <div className="text-gray-400 italic">（无文本内容）</div>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          )}

        </div>
      </div>

      {/* AI助手聊天弹窗 */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl h-96 flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="inline-block px-3 py-1 text-lg font-semibold text-purple-600 border-2 border-purple-600 rounded-lg">AI助手</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                  placeholder="输入您的问题..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleChatSend}
                  className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteDetailPage;