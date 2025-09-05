import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList, Brush, Cell } from 'recharts';
import RawDataPage from './components/RawDataPage.tsx';
import AIDataPage from './components/AIDataPage.tsx';
import AIModal from './components/AIModal.tsx';
import TimelineBubbleChart from './components/TimelineBubbleChart.tsx';
import NotesPage from './components/NotesPage.tsx'; // Import the new NotesPage component

// Type definitions
type TabId = 'emotion' | 'life' | 'study' | 'work' | 'inspiration';
type DataSubTab = 'raw' | 'ai';
type ViewType = 'category' | 'data' | 'notes'; // Add 'notes' to view types

interface Notebook {
  id: number;
  name: string;
  note_count: number;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'emotion',     label: '情绪趋势', icon: '💜' },
  { id: 'life',        label: '健身打卡', icon: '💪' },
  { id: 'study',       label: '学习跟进', icon: '🎓' },
  { id: 'work',        label: '工作upup', icon: '🧩' },
  { id: 'inspiration', label: '捕捉灵感', icon: '💡' },
];

// ... (SectionHeader, Card, MoodPoint, MoodDot, etc. components remain the same)

// Main App Component
export default function AnalyticsTabsPage() {
  const [active, setActive] = useState<TabId>('emotion');
  const [catOpen, setCatOpen] = useState(true);
  const [dataOpen, setDataOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true); // State for the new notes section
  const [dataActive, setDataActive] = useState<DataSubTab>('raw');
  const [view, setView] = useState<ViewType>('category');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);

  // Fetch notebooks on component mount
  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const response = await axios.get('/api/notebooks');
        if (response.data.success) {
          setNotebooks(response.data.notebooks);
          // Optionally, set the first notebook as active by default
          if (response.data.notebooks.length > 0 && !activeNotebookId) {
            // setActiveNotebookId(response.data.notebooks[0].id);
            // setView('notes');
          }
        }
      } catch (error) {
        console.error('Failed to fetch notebooks:', error);
      }
    };
    fetchNotebooks();
  }, []);

  const handleAIClick = () => {
    setAiModalOpen(true);
  };

  const getContextForAI = () => {
    if (view === 'notes') {
        return '用户正在查看笔记页面';
    }
    if (view === 'category') {
      switch (active) {
        case 'emotion': return '用户正在查看情绪趋势分析页面';
        case 'life': return '用户正在查看休闲娱乐分析页面';
        case 'study': return '用户正在查看学习跟进分析页面';
        case 'work': return '用户正在查看工作完成度分析页面';
        case 'inspiration': return '用户正在查看灵感记录分析页面';
        default: return '用户正在查看数据分析页面';
      }
    } else {
      return dataActive === 'raw' ? '用户正在查看原始数据管理页面' : '用户正在查看AI数据管理页面';
    }
  };

  return (
    <div className="h-[calc(100vh-48px)] grid grid-cols-[280px_minmax(0,1fr)] gap-4 py-6 px-6">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 overflow-y-auto">
        {/* Categories Section */}
        <button
          onClick={() => setCatOpen(v => !v)}
          className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <span>{catOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700">分类</span>
          </span>
          <span className="text-slate-400">{catOpen ? '▾' : '▸'}</span>
        </button>
        {catOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setView('category'); setActive(t.id); setActiveNotebookId(null); }}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-0 ${
                  view === 'category' && active === t.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{t.icon}</span>
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="my-3" />

        {/* Notes Section - NEW */}
        <button
          onClick={() => setNotesOpen(v => !v)}
          className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <span>{notesOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700">我的笔记</span>
          </span>
          <span className="text-slate-400">{notesOpen ? '▾' : '▸'}</span>
        </button>
        {notesOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            {notebooks.map(notebook => (
              <button
                key={notebook.id}
                onClick={() => { setView('notes'); setActiveNotebookId(notebook.id); }}
                className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-0 ${
                  view === 'notes' && activeNotebookId === notebook.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>🗒️</span>
                <span className="whitespace-nowrap">{notebook.name}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="my-3" />

        {/* Data Section */}
        <button
          onClick={() => setDataOpen(v => !v)}
          className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <span>{dataOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700">数据</span>
          </span>
          <span className="text-slate-400">{dataOpen ? '▾' : '▸'}</span>
        </button>
        {dataOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            <button
              onClick={() => { setView('data'); setDataActive('raw'); setActiveNotebookId(null); }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-0 ${
                view === 'data' && dataActive === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>📜</span>
              <span className="whitespace-nowrap">AI分析结果</span>
            </button>
            <button
              onClick={() => { setView('data'); setDataActive('ai'); setActiveNotebookId(null); }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-0 ${
                view === 'data' && dataActive === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🤖</span>
              <span className="whitespace-nowrap">原始数据录入</span>
            </button>
          </nav>
        )}
      </aside>

      <section className="h-full px-0">
        {view === 'data' && (
          <>
            {dataActive === 'raw' && <RawDataPage />}
            {dataActive === 'ai' && <AIDataPage />}
          </>
        )}
        {view === 'category' && (
          <>
            {active === 'emotion' && <EmotionTrend onAIClick={handleAIClick} />}
            {active === 'life' && <LifeTimeline onAIClick={handleAIClick} />}
            {active === 'study' && <StudyTimeDist onAIClick={handleAIClick} />}
            {active === 'work' && <WorkCompletion onAIClick={handleAIClick} />}
            {active === 'inspiration' && <InspirationNotes onAIClick={handleAIClick} />}
          </>
        )}
        {view === 'notes' && activeNotebookId && (
          <NotesPage notebookId={activeNotebookId} />
        )}
      </section>

      {/* AI Modal */}
      <AIModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)}
        context={getContextForAI()}
      />
    </div>
  );
}

// The rest of the components (EmotionTrend, LifeTimeline, etc.) remain unchanged.