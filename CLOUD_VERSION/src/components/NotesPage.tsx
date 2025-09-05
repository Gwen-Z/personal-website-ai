, { useState, useEffect } from 'react';
import axios from 'axios';

// Define types for our data
interface Note {
  id: number;
  title: string;
  image_url: string;
  duration_minutes: number;
  created_at: string;
  status: string;
}

interface Notebook {
  id: number;
  name: string;
  note_count: number;
  updated_at: string;
}

// NoteItem component for displaying a single note
const NoteItem = ({ note }: { note: Note }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <img src={note.image_url} alt={note.title} className="w-32 h-20 object-cover rounded-md bg-gray-100" />
        <div className="flex flex-col justify-between h-20 py-1">
          <h2 className="font-semibold text-gray-800 leading-tight">{note.title}</h2>
          <p className="text-xs text-gray-500 mt-1">
            上传时间：{new Date(note.created_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} &nbsp;·&nbsp; 时长：{note.duration_minutes} 分钟
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 relative">
        <span className={`px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full`}>
          {note.status === 'success' ? '成功' : '处理中'}
        </span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded-full hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
        </button>
        {menuOpen && (
          <div className="absolute top-8 right-0 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
            <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">访问源网址</a>
            <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">重命名</a>
            <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">移到</a>
            <a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">删除</a>
          </div>
        )}
      </div>
    </div>
  );
};

const NotesPage = ({ notebookId }: { notebookId: number }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notebookId) return;

    const fetchNotes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/notes?notebook_id=${notebookId}`);
        if (response.data.success) {
          setNotebook(response.data.notebook);
          setNotes(response.data.notes);
        }
      } catch (err) {
        setError('Failed to load notes.');
        console.error(err);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [notebookId]);

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
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{notebook.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              当前位置：<span className="text-purple-600 font-medium">{notebook.name}</span> &nbsp;·&nbsp; {new Date(notebook.updated_at).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} &nbsp;·&nbsp; {notebook.note_count} 篇笔记
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative w-64">
                <input type="text" placeholder="请输入搜索文件名称" className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                新建笔记本
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">新建笔记</button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map(note => (
          <NoteItem key={note.id} note={note} />
        ))}
        {notes.length === 0 && (
            <div className="text-center py-16 text-gray-500">
                <p>这个笔记本里还没有笔记。</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;