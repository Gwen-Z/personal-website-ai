import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { Notebook } from '../apiClient';
import NewNoteModal from './NewNoteModal';
import MoveNoteModal from './MoveNoteModal';

// Define types for our data
interface Note {
  note_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  source_url?: string;
}


// NoteItem component for displaying a single note
const NoteItem = ({ note, onNoteClick, notebooks, currentNotebookId }: { 
  note: Note; 
  onNoteClick: (noteId: string) => void;
  notebooks: Notebook[];
  currentNotebookId: string;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(note.title);
  const [moveOpen, setMoveOpen] = useState(false);

  // 处理移动笔记
  const handleMoveNote = async (targetNotebookId: string) => {
    try {
      await apiClient.post('/api/note-move', { 
        note_id: note.note_id, 
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
    console.log('🖱️ 笔记卡片被点击, noteId:', note.note_id);
    // 检查点击是否来自菜单区域或其子元素
    const target = e.target as HTMLElement;
    const isMenuClick = target.closest('.dropdown-menu') || target.closest('.menu-button');
    
    if (!isMenuClick) {
      console.log('✅ 触发笔记点击, 准备跳转到:', `/note/${note.note_id}`);
      onNoteClick(note.note_id);
    } else {
      console.log('❌ 点击来自菜单区域，忽略');
    }
  };

  return (
    <div 
      className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between hover:shadow-sm transition-shadow duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-32 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex flex-col justify-between h-20 py-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input className="border border-gray-300 rounded-lg px-2 py-1 text-sm" value={newTitle} onChange={(e)=>setNewTitle(e.target.value)} />
              <button 
                onClick={async () => {
                  try {
                    await apiClient.post('/api/note-rename', { id: note.note_id, title: newTitle });
                    setRenaming(false);
                    window.dispatchEvent(new Event('notes:refresh'));
                  } catch (error) {
                    console.error('重命名失败:', error);
                    alert('重命名失败，请重试');
                  }
                }} 
                className="text-xs px-2 py-1 rounded-lg bg-indigo-600 text-white"
              >
                保存
              </button>
              <button onClick={()=>{ setRenaming(false); setNewTitle(note.title); }} className="text-xs px-2 py-1 rounded-lg border">取消</button>
            </div>
          ) : (
            <h2 className="font-semibold text-gray-800 leading-tight">{note.title}</h2>
          )}
          <p className="text-xs text-gray-500 mt-1">
            创建时间：{new Date(note.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} &nbsp;·&nbsp; 更新：{new Date(note.updated_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 relative">
        <span className={`px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full`}>
          已保存
        </span>
        <button 
          onClick={(e) => {
            console.log('🔘 三个点按钮被点击, menuOpen:', menuOpen);
            e.stopPropagation();
            setMenuOpen(!menuOpen);
            console.log('🔘 设置 menuOpen 为:', !menuOpen);
          }} 
          className="menu-button p-1 rounded-full hover:bg-gray-100"
          style={{ zIndex: 1000 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
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
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
                    await apiClient.post('/api/note-delete', { id: note.note_id });
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
            console.log('🔍 查看按钮被点击, noteId:', note.note_id);
            e.stopPropagation();
            console.log('✅ 准备跳转到:', `/note/${note.note_id}`);
            onNoteClick(note.note_id);
          }} 
          className="px-3 py-1.5 text-xs rounded-2xl border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          查看
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4 bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <div>
            <div className="text-sm text-gray-500 space-y-1">
              <div>当前位置：<span className="text-purple-600 font-medium">{notebook.name}</span></div>
              <div>创建于：{new Date(notebook.updated_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
              <div>笔记数：{notebook.note_count} 篇</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative w-64">
                <input type="text" placeholder="请输入搜索文件名称" className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button onClick={() => window.dispatchEvent(new Event('open:new-notebook'))} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-2xl hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                新建笔记本
            </button>
            <button onClick={() => setModalOpen(true)} className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-2xl hover:bg-purple-700 whitespace-nowrap">新建笔记</button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map(note => (
          <NoteItem 
            key={note.note_id} 
            note={note} 
            notebooks={notebooks}
            currentNotebookId={currentNotebookId}
            onNoteClick={(noteId) => {
              console.log('🚀 NotesPage onNoteClick 被调用, noteId:', noteId);
              console.log('🚀 准备执行 navigate 到:', `/note/${noteId}`);
              navigate(`/note/${noteId}`);
              console.log('✅ navigate 调用完成');
            }}
          />
        ))}
        {notes.length === 0 && (
            <div className="text-center py-16 text-gray-500">
                <p>这个笔记本里还没有笔记。</p>
            </div>
        )}
      </div>
      <NewNoteModal isOpen={modalOpen} onClose={() => setModalOpen(false)} notebookId={notebookId} onCreated={refreshNotes} />
    </div>
  );
}

export default NotesPage;