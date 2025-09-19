import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';

interface Note {
  id: string;
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
}

interface Notebook {
  notebook_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  note_count: number;
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
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingImages, setIsEditingImages] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSource, setEditSource] = useState('');
  const [editOriginalUrl, setEditOriginalUrl] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editUploadTime, setEditUploadTime] = useState('');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);

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
          
          setNote(response.data.note);
          setNotebook(response.data.notebook);
          setEditTitle(response.data.note.title);
          setEditContent(response.data.note.content_text || response.data.note.content || '');
          
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
          
          // 初始化元数据
          setEditSource(response.data.note.source || '');
          setEditOriginalUrl(response.data.note.original_url || '');
          setEditAuthor(response.data.note.author || '');
          setEditUploadTime(response.data.note.upload_time || '');
          
          console.log('✅ Note detail data loaded successfully');
          // 自动生成AI分析 - 暂时禁用，因为API端点不存在
          // generateAIAnalysis(response.data.note);
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
        const response = await apiClient.put(`/notes/${note.id}`, {
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
        noteId: noteData.id
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

  const handleEdit = () => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content_text || note.content || '');
      setEditSource(note.source || '');
      setEditOriginalUrl(note.original_url || '');
      setEditAuthor(note.author || '');
      setEditUploadTime(note.upload_time || '');
      setEditImages(note.image_urls ? JSON.parse(note.image_urls) : []);
    }
    setIsEditing(true);
  };

  const handleEditImages = () => {
    if (note) {
      setEditImages(note.image_urls ? JSON.parse(note.image_urls) : []);
    }
    setIsEditingImages(true);
  };

  const handleSave = async () => {
    if (!note) return;
    
    try {
      const response = await apiClient.put(`/api/notes/${note.id}`, {
        title: editTitle,
        content: editContent,
        content_text: editContent,  // 同时更新content_text字段
        source: editSource,
        original_url: editOriginalUrl,
        author: editAuthor,
        upload_time: editUploadTime,
        image_urls: JSON.stringify(editImages)  // 同时保存图片
      });
      
      if (response.data.success) {
        setNote(prev => prev ? { 
          ...prev, 
          title: editTitle, 
          content: editContent,
          content_text: editContent,
          source: editSource,
          original_url: editOriginalUrl,
          author: editAuthor,
          upload_time: editUploadTime,
          image_urls: JSON.stringify(editImages)
        } : null);
        setIsEditing(false);
        // 注意：不重置 setIsEditingMetadata(false)，因为元数据编辑是独立的
        alert('保存成功！');
      } else {
        alert('保存失败，请重试');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('保存失败，请重试');
    }
  };

  const handleSaveImages = async () => {
    if (!note) return;
    
    try {
      const response = await apiClient.put(`/api/notes/${note.id}`, {
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

  const handleCancel = () => {
    if (note) {
      setEditTitle(note.title);
      setEditContent(note.content_text || note.content || '');
      setEditSource(note.source || '');
      setEditOriginalUrl(note.original_url || '');
      setEditAuthor(note.author || '');
      setEditUploadTime(note.upload_time || '');
    }
    setIsEditing(false);
    // 注意：不重置 setIsEditingMetadata(false)，因为元数据编辑是独立的
  };

  const handleCancelImages = () => {
    if (note) {
      setEditImages(note.image_urls ? JSON.parse(note.image_urls) : []);
    }
    setPendingImages([]);
    setIsEditingImages(false);
  };

  const handleDelete = async () => {
    if (!note || !window.confirm('确定删除这条笔记吗？')) return;
    
    try {
      await apiClient.post('/api/note-delete', { id: note.id });
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
        noteId: note.id,
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
        noteId: note?.id
      });
      
      if (response.data.success) {
        setChatSummary(response.data.summary);
      }
    } catch (err) {
      console.error('Failed to generate chat summary:', err);
    }
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
              <h1 className="text-lg font-semibold text-gray-800">{note.title}</h1>
              {notebook && (
                <p className="text-sm text-gray-500 mt-1">
                  来自：{notebook.name}
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
          {/* 1. 记录标题和详细笔记内容 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            {/* 标题和编辑按钮 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="inline-block px-4 py-2 text-base font-semibold text-white bg-purple-600 rounded-xl">笔记内容</h2>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </button>
              )}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    保存
                  </button>
                </div>
              )}
            </div>

            {/* 内容区域 */}
            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入笔记标题"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="输入笔记内容"
                  />
                </div>

                {/* 图片编辑区域 */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="inline-block px-3 py-1.5 text-base font-medium text-white bg-purple-600 rounded-xl">图片管理</h4>
                    <button
                      onClick={() => setIsEditingImages(!isEditingImages)}
                      className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                    >
                      {isEditingImages ? '完成编辑' : '编辑图片'}
                    </button>
                  </div>
                  
                  {isEditingImages ? (
                    // 图片编辑模式
                    <div className="space-y-4">
                      {/* 图片输入区域 */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={imageInput}
                            onChange={(e) => setImageInput(e.target.value)}
                            placeholder="输入图片URL"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={addImageFromUrl}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                          >
                            添加URL
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="image-upload-edit"
                          />
                          <label
                            htmlFor="image-upload-edit"
                            className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors cursor-pointer"
                          >
                            本地上传
                          </label>
                        </div>
                      </div>

                      {/* 待确认图片区域 */}
                      {pendingImages.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">待确认的图片 ({pendingImages.length})</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {pendingImages.map((imageUrl, index) => (
                              <div key={index} className="relative group bg-yellow-50 border-2 border-yellow-200 rounded-xl p-2">
                                <img
                                  src={imageUrl}
                                  alt={`待确认图片 ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => removePendingImage(index)}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={confirmAddImages}
                              className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
                            >
                              确认添加
                            </button>
                            <button
                              onClick={() => setPendingImages([])}
                              className="px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 已确认图片展示区域 */}
                      {editImages.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">已添加的图片 ({editImages.length})</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {editImages.map((imageUrl, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={imageUrl}
                                  alt={`图片 ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {editImages.length === 0 && pendingImages.length === 0 && (
                        <div className="bg-gray-50 rounded-xl p-8 min-h-[100px] flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>暂无图片，请添加图片URL或上传本地图片</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 图片展示模式
                    <div className="space-y-3">
                      {editImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {editImages.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={imageUrl}
                                alt={`图片 ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-8 min-h-[100px] flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>暂无图片</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 元数据编辑区域 */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="inline-block px-3 py-1.5 text-base font-medium text-white bg-purple-600 rounded-xl">其他信息</h4>
                    <button
                      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                      className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                    >
                      {isEditingMetadata ? '完成编辑' : '编辑'}
                    </button>
                  </div>
                  
                  {isEditingMetadata ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">来源</label>
                        <input
                          type="text"
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="如：长桥app"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">原链接</label>
                        <input
                          type="url"
                          value={editOriginalUrl}
                          onChange={(e) => setEditOriginalUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="原始链接地址"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">作者</label>
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={(e) => setEditAuthor(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="作者名称"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">上传时间</label>
                        <input
                          type="datetime-local"
                          value={editUploadTime}
                          onChange={(e) => setEditUploadTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">来源:</span>
                        <span className="text-gray-800">{note.source || '未填写'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">原链接:</span>
                        <span className="text-gray-800 truncate max-w-48">{note.original_url || '未填写'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">作者:</span>
                        <span className="text-gray-800">{note.author || '未填写'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">上传时间:</span>
                        <span className="text-gray-800">{note.upload_time || '未填写'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 标题区域 */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">标题</h4>
                  <div className="bg-gray-50 rounded-xl p-4 min-h-[60px]">
                    <h3 className="text-lg font-semibold text-gray-700">{note.title}</h3>
                  </div>
                </div>

                {/* 内容区域 */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">内容</h4>
                  <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
                    {note.content_text ? (
                      <div className="text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: note.content_text.replace(/\n/g, '<br/>') 
                      }} />
                    ) : note.content ? (
                      <div className="text-gray-700" dangerouslySetInnerHTML={{ 
                        __html: note.content.replace(/\n/g, '<br/>') 
                      }} />
                    ) : (
                      <div className="text-gray-400 italic">（无文本内容）</div>
                    )}
                  </div>
                </div>

                {/* 图片展示区域 - 默认显示 */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-medium text-gray-700">图片</h4>
                    {!isEditingImages && (
                      <button
                        onClick={handleEditImages}
                        className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        编辑图片
                      </button>
                    )}
                    {isEditingImages && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelImages}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveImages}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditingImages ? (
                    // 图片编辑模式
                    <div className="space-y-4">
                      {/* 图片输入区域 */}
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={imageInput}
                            onChange={(e) => setImageInput(e.target.value)}
                            placeholder="粘贴图片URL"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={handleImageUrlSubmit}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                          >
                            添加URL
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="image-upload-edit"
                          />
                          <label
                            htmlFor="image-upload-edit"
                            className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors cursor-pointer"
                          >
                            本地上传
                          </label>
                        </div>
                      </div>

                      {/* 待确认图片区域 */}
                      {pendingImages.length > 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-yellow-800">待确认的图片 ({pendingImages.length})</h5>
                            <div className="flex gap-2">
                              <button
                                onClick={confirmAddImages}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                              >
                                确认添加
                              </button>
                              <button
                                onClick={cancelAddImages}
                                className="px-3 py-1 text-sm bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {pendingImages.map((imageUrl, index) => (
                              <div key={`pending-${index}`} className="relative group">
                                <img
                                  src={imageUrl}
                                  alt={`待确认图片 ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-xl border border-yellow-300"
                                />
                                <button
                                  onClick={() => removePendingImage(index)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 已确认图片展示区域 */}
                      {editImages.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">已添加的图片 ({editImages.length})</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {editImages.map((imageUrl, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={imageUrl}
                                  alt={`图片 ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-xl border border-gray-200"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {editImages.length === 0 && pendingImages.length === 0 && (
                        <div className="bg-gray-50 rounded-xl p-8 min-h-[100px] flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>暂无图片，请添加上方输入框中添加图片</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 图片显示模式
                    (() => {
                      try {
                        // 优先使用 image_urls 字段
                        let imageUrls = [];
                        if (note.image_urls) {
                          imageUrls = JSON.parse(note.image_urls);
                        } else if (note.images) {
                          // 兼容旧的 images 字段
                          imageUrls = Array.isArray(note.images) ? note.images : JSON.parse(note.images || '[]');
                        } else if (note.image_url) {
                          // 兼容单个图片字段
                          imageUrls = [note.image_url];
                        }
                        
                        if (imageUrls.length > 0) {
                          return (
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {imageUrls.map((imageUrl: string, index: number) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={imageUrl}
                                      alt={`图片 ${index + 1}`}
                                      className="w-full h-48 object-cover rounded-xl border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                                      onClick={() => window.open(imageUrl, '_blank')}
                                      onError={(e) => {
                                        console.error('图片加载失败:', imageUrl);
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          // 没有图片时显示未上传状态和上传按钮
                          return (
                            <div className="bg-gray-50 rounded-xl p-4 min-h-[100px] flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-gray-400 mb-3">
                                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p className="text-gray-500">未上传图片</p>
                                </div>
                                <button
                                  onClick={() => setShowImageUpload(true)}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                                >
                                  上传
                                </button>
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {
                        console.error('解析图片数据失败:', e);
                        return (
                          <div className="bg-gray-50 rounded-xl p-4 min-h-[100px] flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-gray-400 mb-3">
                                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-500">未上传图片</p>
                              </div>
                              <button
                                onClick={() => setShowImageUpload(true)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                              >
                                上传
                              </button>
                            </div>
                          </div>
                        );
                      }
                    })()
                  )}
                </div>

                {/* 元数据展示区域 */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="inline-block px-3 py-1.5 text-base font-medium text-white bg-purple-600 rounded-xl mb-4">其他信息</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">来源:</span>
                      <span className="text-gray-800">{note.source || '未填写'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">原链接:</span>
                      <span className="text-gray-800 truncate max-w-48">
                        {note.original_url ? (
                          <a 
                            href={note.original_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {note.original_url}
                          </a>
                        ) : '未填写'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">作者:</span>
                      <span className="text-gray-800">{note.author || '未填写'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">上传时间:</span>
                      <span className="text-gray-800">{note.upload_time || '未填写'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. AI总结和关键词标签 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="inline-block px-4 py-2 text-base font-semibold text-white bg-purple-600 rounded-xl mb-4">AI总结</h3>
            
            {/* 核心观点 */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3">核心观点</h4>
              <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
                {aiLoading ? (
                  <div className="flex items-center justify-center text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span className="ml-2">AI正在分析中...</span>
                  </div>
                ) : aiAnalysis?.coreViewpoints ? (
                  <p className="text-gray-700">{aiAnalysis.coreViewpoints}</p>
                ) : (
                  <p className="text-gray-400 italic">点击"AI助手"按钮开始分析</p>
                )}
              </div>
            </div>

            {/* 关键词标签 */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">关键词标签</h4>
              <div className="flex flex-wrap gap-2">
                {aiLoading ? (
                  <div className="flex items-center text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <span className="ml-2">生成中...</span>
                  </div>
                ) : aiAnalysis?.keywords && aiAnalysis.keywords.length > 0 ? (
                  aiAnalysis.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded-full"
                    >
                      {keyword}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">暂无关键词</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. 知识延伸 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="inline-block px-4 py-2 text-lg font-semibold text-white bg-purple-600 rounded-xl mb-4">知识延伸</h3>
            <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
              {aiLoading ? (
                <div className="flex items-center justify-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2">AI正在推荐相关资源...</span>
                </div>
              ) : aiAnalysis?.knowledgeExtension ? (
                <p className="text-gray-700">{aiAnalysis.knowledgeExtension}</p>
              ) : (
                <p className="text-gray-400 italic">AI在你写完笔记后，可以提示"想深入理解这个知识，可以去看看XXX(书籍/论文/相关案例)"</p>
              )}
            </div>
          </div>

          {/* 4. 学习路径 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="inline-block px-4 py-2 text-lg font-semibold text-white bg-purple-600 rounded-xl mb-4">学习路径</h3>
            <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
              {aiLoading ? (
                <div className="flex items-center justify-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="ml-2">AI正在生成学习路径...</span>
                </div>
              ) : aiAnalysis?.learningPath ? (
                <p className="text-gray-700">{aiAnalysis.learningPath}</p>
              ) : (
                <p className="text-gray-400 italic">如果你写的内容属于某个领域(如机器学习)，AI可以生成一条"学习路线图"(基础→进阶→应用)</p>
              )}
            </div>
          </div>

          {/* 5. AI聊天总结 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="inline-block px-4 py-2 text-lg font-semibold text-white bg-purple-600 rounded-xl mb-4">AI聊天总结</h3>
            <p className="text-sm text-gray-600 mb-4">(总结你与AI助手的对话，记录你对这条笔记的困惑和理解)</p>
            <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
              {chatSummary ? (
                <p className="text-gray-700">{chatSummary}</p>
              ) : chatMessages.length > 0 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={generateChatSummary}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  >
                    生成总结
                  </button>
                  <span className="text-gray-500 text-sm">点击生成聊天总结</span>
                </div>
              ) : (
                <p className="text-gray-400 italic">暂无聊天记录，点击"AI助手"开始对话</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI助手聊天弹窗 */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl h-96 flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">AI助手</h3>
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

      {/* 图片上传弹窗 */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">上传图片</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* 图片输入区域 */}
              <div className="space-y-3 mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    placeholder="粘贴图片URL"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleImageUrlSubmit}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    添加URL
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="image-upload-modal"
                  />
                  <label
                    htmlFor="image-upload-modal"
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors cursor-pointer"
                  >
                    本地上传
                  </label>
                  <span className="text-sm text-gray-500">或直接粘贴图片到内容区域</span>
                </div>
              </div>

              {/* 待确认图片区域 */}
              {pendingImages.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-yellow-800">待确认的图片 ({pendingImages.length})</h5>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          confirmAddImages();
                          setShowImageUpload(false);
                        }}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                      >
                        确认添加
                      </button>
                      <button
                        onClick={cancelAddImages}
                        className="px-3 py-1 text-sm bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {pendingImages.map((imageUrl, index) => (
                      <div key={`pending-${index}`} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`待确认图片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-yellow-300"
                        />
                        <button
                          onClick={() => removePendingImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 已确认图片展示区域 */}
              {editImages.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-3">已添加的图片 ({editImages.length})</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {editImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`图片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-xl border border-gray-200"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteDetailPage;
