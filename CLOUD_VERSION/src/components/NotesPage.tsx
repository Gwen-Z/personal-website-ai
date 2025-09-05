import React, {Effect } from 'react';
import axios from 'axios';

// Define types for our data
interface Note {
  id: number;
  title: string;
  image_url: string;
  duration_minutes: number;
  created_at: string;
}

interface Notebook {
  id: number;
  name: string;
  note_count: number;
  updated_at: string;
}

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
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;
  }

  if (!notebook) {
    return <div className="flex items-center justify-center h-full">Select a notebook to view notes.</div>;
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{notebook.name}</h1>
            <p className="text-sm text-gray-500">
              当前位置：{notebook.name} &nbsp;·&nbsp; {new Date(notebook.updated_at).toLocaleString()} &nbsp;·&nbsp; {notebook.note_count} 篇笔记
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">新建笔记本</button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">新建笔记</button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map(note => (
          <div key={note.id} className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <img src={note.image_url} alt={note.title} className="w-24 h-16 object-cover rounded-md" />
              <div>
                <h2 className="font-semibold text-gray-800">{note.title}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  上传时间：{new Date(note.created_at).toLocaleString()} &nbsp;·&nbsp; 时长：{note.duration_minutes} 分钟
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">成功</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesPage;
