import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { Notebook } from '../apiClient';
import NewNoteModal from './NewNoteModal';
import { getDisplayTitle } from '../utils/displayTitle';
import MoveNoteModal from './MoveNoteModal';
import AIModal from './AIModal';
import { onConfigUpdate } from '../utils/componentSync';

// Define types for our data
interface Note {
  id?: string;
  note_id?: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  source_url?: string;
}


// NoteItem component for displaying a single note
const NoteItem = ({ note, onNoteClick, notebooks, currentNotebookId, batchMode, isSelected, onSelect }: { 
  note: Note; 
  onNoteClick: (noteId: string) => void;
  notebooks: Notebook[];
  currentNotebookId: string;
  batchMode: boolean;
  isSelected: boolean;
  onSelect: (noteId: string) => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(note.title);
  const [moveOpen, setMoveOpen] = useState(false);

  // 处理移动笔记
  const handleMoveNote = async (targetNotebookId: string) => {
    try {
      await apiClient.post('/api/note-move', { 
        note_id: note.id || note.note_id, 
        target_notebook_id: targetNotebookId 
      });
      window.dispatchEvent(new Event('notes:refresh'));
      setMoveOpen(false);
    } catch (error) {
      console.error('移动失败:', error);
      alert('移动失败，请重试');
    }
  };

  // 点击外部区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen) {
        const target = event.target as Element;
        if (!target.closest('.dropdown-menu') && !target.closest('.menu-button')) {
          setMenuOpen(false);
        }
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    // 移除整个卡片的点击跳转功能
    // 现在只有"查看"按钮才能触发跳转
    console.log('🖱️ 笔记卡片被点击，但不会跳转');
  };

  return (
    <div 
      className={`bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between hover:shadow-sm transition-shadow duration-200 cursor-default ${
        isSelected ? 'ring-2 ring-purple-500 bg-purple-50' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3">
        {batchMode && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(note.id || note.note_id || '')}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
          </div>
        )}
        <div className="w-16 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex flex-col justify-center flex-1 h-12">
          {renaming ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input 
                className="border border-purple-300 rounded-lg px-2 py-1 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none" 
                value={newTitle} 
                onChange={(e)=>setNewTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <button 
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    await apiClient.post('/api/note-rename', { id: note.id || note.note_id, title: newTitle });
                    setRenaming(false);
                    window.dispatchEvent(new Event('notes:refresh'));
                  } catch (error) {
                    console.error('重命名失败:', error);
                    alert('重命名失败，请重试');
                  }
                }} 
                className="text-xs px-2 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                保存
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRenaming(false); 
                  setNewTitle(note.title);
                }} 
                className="text-xs px-2 py-1 rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-gray-900 leading-tight text-sm mb-2">{getDisplayTitle(note as any)}</h2>
              <p className="text-[10px] text-gray-500 leading-tight">
                创建时间：{new Date(note.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '/')} &nbsp;·&nbsp; 更新：{new Date(note.updated_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6 relative">
        <span className={`px-1.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full`}>
          已保存
        </span>
        <button 
          onClick={(e) => {
            console.log('🔘 三个点按钮被点击, menuOpen:', menuOpen);
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            console.log('🔘 设置 menuOpen 为:', !menuOpen);
          }} 
          className="menu-button p-2 rounded-full hover:bg-purple-100"
          style={{ zIndex: 1000 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
        {menuOpen && (
          <div 
            className="dropdown-menu absolute top-8 right-0 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 9999 }}
          >
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (note.source_url) {
                  window.open(note.source_url, '_blank');
                } else {
                  alert('无来源链接');
                }
                setMenuOpen(false);
              }} 
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              访问源网址
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRenaming(true);
                setMenuOpen(false);
              }} 
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              重命名
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMoveOpen(true);
                setMenuOpen(false);
              }} 
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              移到
            </button>
            <button 
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.confirm('确定删除这条笔记吗？')) {
                  try {
                    await apiClient.post('/api/note-delete', { id: note.id || note.note_id });
                    window.dispatchEvent(new Event('notes:refresh'));
                  } catch (error) {
                    console.error('删除失败:', error);
                    alert('删除失败，请重试');
                  }
                }
                setMenuOpen(false);
              }} 
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              删除
            </button>
          </div>
        )}
        <button 
          onClick={(e) => {
            const noteId = note.id || note.note_id;
            console.log('🔍 查看按钮被点击, noteId:', noteId);
            e.stopPropagation();
            if (noteId) {
              console.log('✅ 准备跳转到:', `/note/${noteId}`);
              onNoteClick(noteId);
            } else {
              console.log('❌ 笔记ID不存在，无法跳转');
            }
          }} 
          className="px-1.5 py-0.5 text-xs rounded-xl border border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors"
        >
          查看详情
        </button>
        <MoveNoteModal
          isOpen={moveOpen}
          onClose={() => setMoveOpen(false)}
          onMove={handleMoveNote}
          notebooks={notebooks}
          currentNotebookId={currentNotebookId}
        />
      </div>
    </div>
  );
};

function DynamicMoveModal({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [currentNotebookId, setCurrentNotebookId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // 获取笔记本列表
        const notebooksResponse = await apiClient.get('/api/notebooks');
        if (notebooksResponse.data.success) {
          setNotebooks(notebooksResponse.data.notebooks);
        }
        
        // 获取当前笔记的笔记本ID
        const noteResponse = await apiClient.get(`/api/note-detail/${noteId}`);
        if (noteResponse.data.success) {
          setCurrentNotebookId(noteResponse.data.note.notebook_id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('加载数据失败:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [noteId]);
  
  const handleMove = async (targetNotebookId: string) => {
    try {
      await apiClient.post('/api/note-move', { 
        note_id: noteId, 
        target_notebook_id: targetNotebookId 
      });
      window.dispatchEvent(new Event('notes:refresh'));
      onClose();
    } catch (error) {
      console.error('移动失败:', error);
      alert('移动失败，请重试');
    }
  };
  
  if (loading) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg p-6"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="text-center">加载中...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h2 className="text-xl font-bold mb-4">移动笔记</h2>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          const targetNotebookId = formData.get('notebookId') as string;
          if (targetNotebookId && targetNotebookId !== currentNotebookId) {
            handleMove(targetNotebookId);
          }
        }}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择目标笔记本
            </label>
            <select
              name="notebookId"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <option value="">请选择笔记本</option>
              {notebooks
                .filter(notebook => notebook.notebook_id !== currentNotebookId)
                .map(notebook => (
                  <option key={notebook.notebook_id} value={notebook.notebook_id}>
                    {notebook.name} ({notebook.note_count} 个笔记)
                  </option>
                ))
              }
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              移动
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const NotesPage = ({ notebookId }: { notebookId: string }) => {
  const navigate = useNavigate();
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentNotebookId, setCurrentNotebookId] = useState<string>(notebookId);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [batchMoveModalOpen, setBatchMoveModalOpen] = useState(false);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState('all'); // 'all', 'title', 'content'
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  
  // 日期筛选状态
  const [dateFilter, setDateFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: ''
  });
  
  // AI总结状态
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // 搜索和筛选功能
  useEffect(() => {
    let filtered = [...notes];
    
    // 文本搜索筛选
    if (searchQuery.trim()) {
      filtered = filtered.filter(note => {
        const title = note.title || '';
        const content = note.content || '';
        const query = searchQuery.toLowerCase();
        
        switch (searchScope) {
          case 'title':
            return title.toLowerCase().includes(query);
          case 'content':
            return content.toLowerCase().includes(query);
          case 'all':
          default:
            return title.toLowerCase().includes(query) || content.toLowerCase().includes(query);
        }
      });
    }
    
    // 日期筛选
    if (dateFilter.startDate || dateFilter.endDate) {
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.created_at);
        const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
        const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
        
        if (startDate && endDate) {
          return noteDate >= startDate && noteDate <= endDate;
        } else if (startDate) {
          return noteDate >= startDate;
        } else if (endDate) {
          return noteDate <= endDate;
        }
        return true;
      });
    }
    
    setFilteredNotes(filtered);
  }, [searchQuery, searchScope, notes, dateFilter]);

  useEffect(() => {
    console.log('📝 NotesPage useEffect triggered, notebookId:', notebookId);
    if (!notebookId) {
      console.log('❌ No notebookId provided to NotesPage');
      return;
    }

    // Update currentNotebookId when notebookId changes
    setCurrentNotebookId(notebookId);

    const fetchNotes = async () => {
      console.log('🔄 Fetching notes for notebook:', notebookId);
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/api/notes?notebook_id=${notebookId}`);
        console.log('✅ Notes API response:', response.data);
        if (response.data.success) {
          console.log('✅ Setting notebook:', response.data.notebook);
          console.log('✅ Setting notes:', response.data.notes);
          setNotebook(response.data.notebook);
          setNotes(response.data.notes);
        } else {
          console.log('❌ API response not successful:', response.data);
        }
      } catch (err) {
        setError('Failed to load notes.');
        console.error('❌ Error fetching notes:', err);
      }
      setLoading(false);
    };

    fetchNotes();
    loadNotebooks();

    const refresh = () => fetchNotes();
    window.addEventListener('notes:refresh', refresh);
    return () => window.removeEventListener('notes:refresh', refresh);
  }, [notebookId]);

  // 监听笔记本配置更新事件
  useEffect(() => {
    const cleanup = onConfigUpdate((updatedNotebookId, config) => {
      if (updatedNotebookId === notebookId) {
        console.log('🔄 收到笔记本配置更新事件，更新笔记本配置');
        // 更新本地笔记本配置
        setNotebook(prev => prev ? { ...prev, component_config: config } : null);
      }
    });
    
    return cleanup;
  }, [notebookId]);

  // Load notebooks list
  const loadNotebooks = async () => {
    try {
      const response = await apiClient.get('/api/notebooks');
      if (response.data.success) {
        setNotebooks(response.data.notebooks);
      }
    } catch (err) {
      console.error('Failed to load notebooks:', err);
    }
  };

  const refreshNotes = async () => {
    if (!notebookId) return;
    try {
      const response = await apiClient.get(`/api/notes?notebook_id=${notebookId}`);
      if (response.data.success) {
        setNotebook(response.data.notebook);
        setNotes(response.data.notes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 批量操作处理函数
  const handleBatchModeToggle = () => {
    setBatchMode(!batchMode);
    setSelectedNotes([]);
  };

  const handleNoteSelect = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotes.length === notes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(notes.map(note => note.id || note.note_id || ''));
    }
  };

  const handleBatchDelete = async () => {
    try {
      await apiClient.post('/api/notes-batch-delete', {
        note_ids: selectedNotes
      });
      setBatchDeleteConfirmOpen(false);
      setSelectedNotes([]);
      setBatchMode(false);
      refreshNotes();
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('批量删除失败，请重试');
    }
  };

  const handleBatchMove = async (targetNotebookId: string) => {
    try {
      await apiClient.post('/api/notes-batch-move', {
        note_ids: selectedNotes,
        target_notebook_id: targetNotebookId
      });
      setBatchMoveModalOpen(false);
      setSelectedNotes([]);
      setBatchMode(false);
      refreshNotes();
    } catch (error) {
      console.error('批量移动失败:', error);
      alert('批量移动失败，请重试');
    }
  };

  // AI总结功能
  const handleAISummary = () => {
    if (filteredNotes.length === 0) {
      alert('没有可总结的笔记');
      return;
    }
    
    setAiModalOpen(true);
  };

  // 准备AI助手的上下文数据
  const getAIContext = () => {
    const notesData = filteredNotes.map(note => ({
      title: note.title,
      content: note.content,
      created_at: note.created_at
    }));

    return {
      notebook_name: notebook?.name || '当前笔记本',
      notes_count: filteredNotes.length,
      notes: notesData,
      date_range: dateFilter.startDate && dateFilter.endDate ? {
        start: dateFilter.startDate,
        end: dateFilter.endDate
      } : null
    };
  };



  console.log('📝 NotesPage render - loading:', loading, 'error:', error, 'notebook:', notebook, 'notes count:', notes.length);
  console.log('📝 NotesPage render - notebookId:', notebookId);
  console.log('📝 NotesPage render - notes array:', notes);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading notes...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }

  if (!notebook) {
    return <div className="flex items-center justify-center h-full text-gray-500">Select a notebook to view notes.</div>;
  }

  return (
    <div className="pl-2 pr-6 pt-2 pb-12 h-full overflow-y-auto">
      {/* Header Section */}
      <div className="mb-6">
        {/* 第一行：笔记本信息和功能按钮 */}
        <div className="flex items-start justify-between -mb-10">
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            </div>
            <div>
              <div className="text-xs text-gray-500 space-y-1">
                <div>当前位置：<span className="text-purple-600 font-medium">{notebook.name}</span></div>
                <div>创建于：{new Date(notebook.updated_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                <div>笔记数：{notebook.note_count} 篇</div>
              </div>
            </div>
          </div>
          
          {/* 日期筛选和AI总结按钮 */}
          <div className="flex items-start gap-3">
            {/* 日期筛选器 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">时间区间</span>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-xs text-gray-500">至</span>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => {
                  // 日期筛选会自动通过 useEffect 触发，这里只是确保状态更新
                  console.log('🔍 执行日期筛选查询:', dateFilter);
                }}
                className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                查询
              </button>
            </div>
            
            {/* AI总结按钮 */}
            <button
              onClick={handleAISummary}
              disabled={filteredNotes.length === 0}
              className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-2xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI总结和建议
            </button>
          </div>
        </div>
        
        {/* 第二行：搜索、筛选、批量操作等按钮 */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
            {/* 搜索框 */}
            <div className="relative w-24">
                <input 
                  type="text" 
                  placeholder="搜索笔记..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 px-3 py-2 text-xs font-medium border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500" 
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            
            {/* 搜索范围选择 */}
            <div className="relative w-20">
                <select
                  value={searchScope}
                  onChange={(e) => setSearchScope(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-2xl px-3 py-2 pr-8 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">全部</option>
                  <option value="title">仅标题</option>
                  <option value="content">仅内容</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            
            <button 
              onClick={handleBatchModeToggle}
              className={`px-3 py-2 text-xs font-medium rounded-2xl flex items-center gap-2 whitespace-nowrap ${
                batchMode 
                  ? 'text-white bg-purple-600 hover:bg-purple-700' 
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-purple-50 hover:border-purple-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {batchMode ? '退出批量' : '批量操作'}
            </button>
            {batchMode && selectedNotes.length > 0 && (
              <>
                <button 
                  onClick={handleSelectAll}
                  className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  {selectedNotes.length === notes.length ? '取消全选' : '全选'}
                </button>
                <button 
                  onClick={() => setBatchMoveModalOpen(true)}
                  className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 flex items-center gap-2 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  移动({selectedNotes.length})
                </button>
                <button 
                  onClick={() => setBatchDeleteConfirmOpen(true)}
                  className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 flex items-center gap-2 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  删除({selectedNotes.length})
                </button>
              </>
            )}
            {!batchMode && (
              <>
                <button onClick={() => navigate('/CreateNote')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-2 whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    新建笔记本
                </button>
                <button onClick={() => {
                  console.log('🖱️ 新建笔记按钮被点击');
                  console.log('📝 当前 notebookId:', notebookId);
                  console.log('📝 当前笔记本名称:', notebook?.name);
                  
                  // 检查是否是健身笔记，如果是则以编辑模式打开
                  const isFitnessNotebook = notebook?.name?.toLowerCase().includes('健身') || 
                                          notebook?.name?.toLowerCase().includes('fitness');
                  
                  if (isFitnessNotebook) {
                    console.log('🏃‍♂️ 检测到健身笔记，以编辑模式打开');
                    setModalMode('edit');
                  } else {
                    console.log('📝 普通笔记，以创建模式打开');
                    setModalMode('create');
                  }
                  
                  console.log('📝 设置 modalOpen 为 true');
                  setModalOpen(true);
                }} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-purple-50 hover:border-purple-200 flex items-center gap-2 whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  新建笔记
                </button>
              </>
            )}
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.map(note => (
          <NoteItem 
            key={note.id || note.note_id} 
            note={note} 
            notebooks={notebooks}
            currentNotebookId={currentNotebookId}
            batchMode={batchMode}
            isSelected={selectedNotes.includes(note.id || note.note_id || '')}
            onSelect={handleNoteSelect}
            onNoteClick={(noteId) => {
              console.log('🚀 NotesPage onNoteClick 被调用, noteId:', noteId);
              console.log('🚀 准备执行 navigate 到:', `/note/${noteId}`);
              navigate(`/note/${noteId}`);
              console.log('✅ navigate 调用完成');
            }}
          />
        ))}
        {filteredNotes.length === 0 && notes.length > 0 && (
            <div className="text-center py-16 text-gray-500">
                <p>没有找到匹配的笔记。</p>
            </div>
        )}
        {notes.length === 0 && (
            <div className="text-center py-16 text-gray-500">
                <p>这个笔记本里还没有笔记。</p>
            </div>
        )}
      </div>
      <NewNoteModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        notebookId={notebookId} 
        onCreated={refreshNotes}
        mode={modalMode}
      />
      
      {/* 批量删除确认对话框 */}
      {batchDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-red-600">确认删除</h2>
            <p className="text-gray-700 mb-6">
              确定要删除选中的 {selectedNotes.length} 篇笔记吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBatchDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量移动对话框 */}
      {batchMoveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-purple-600">移动笔记</h2>
            <p className="text-gray-700 mb-4">
              将选中的 {selectedNotes.length} 篇笔记移动到：
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const targetNotebookId = formData.get('notebookId') as string;
              if (targetNotebookId && targetNotebookId !== currentNotebookId) {
                handleBatchMove(targetNotebookId);
              }
            }}>
              <select
                name="notebookId"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                required
              >
                <option value="">选择目标笔记本</option>
                {notebooks
                  .filter(nb => nb.notebook_id !== currentNotebookId)
                  .map(notebook => (
                    <option key={notebook.notebook_id} value={notebook.notebook_id}>
                      {notebook.name}
                    </option>
                  ))}
              </select>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setBatchMoveModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  确认移动
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI助手模态框 */}
      <AIModal 
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        context={JSON.stringify(getAIContext())}
        notes={filteredNotes}
      />
    </div>
  );
}

export default NotesPage;