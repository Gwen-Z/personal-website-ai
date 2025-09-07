import React, { useState, useEffect';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList, Brush, Cell } from 'recharts';
import RawDataPage from './components/RawDataPage.tsx';
import AIDataPage from './components/AIDataPage.tsx';
import AIModal from './components/AIModal.tsx';
import TimelineBubbleChart from './components/TimelineBubbleChart.tsx';
import NotesPage from './components/NotesPage.tsx';

// Type definitions
type TabId = 'emotion' | 'life' | 'study' | 'work' | 'inspiration';
type DataSubTab = 'raw' | 'ai';
type ViewType = 'category' | 'data' | 'notes';

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

function SectionHeader({ title, onAIClick, onDateChange, onQuery }: { 
  title: string; 
  onAIClick?: () => void;
  onDateChange?: (from: string, to: string) => void;
  onQuery?: (from: string, to: string) => void;
}) {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const handleQueryClick = () => {
    if (!fromDate && !toDate) return;
    const from = fromDate ? new Date(fromDate) : (toDate ? new Date(new Date(toDate).getTime() - 6*24*3600*1000) : new Date());
    const to = toDate ? new Date(toDate) : new Date(from.getTime() + 6*24*3600*1000);
    const msInDay = 24*3600*1000;
    let s = from, e = to;
    if ((e.getTime() - s.getTime())/msInDay < 6) {
      e = new Date(s.getTime() + 6*msInDay);
    }
    if (onDateChange) onDateChange(s.toISOString().slice(0,10), e.toISOString().slice(0,10));
    if (onQuery) onQuery(s.toISOString().slice(0,10), e.toISOString().slice(0,10));
  };

  return (
    <div className="mb-3 flex items-center justify-between gap-4 min-w-0">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 whitespace-nowrap truncate">{title}</h2>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-slate-500">时间区间</span>
          <input type="date" className="h-9 rounded-xl border px-2 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="text-slate-500">至</span>
          <input type="date" className="h-9 rounded-xl border px-2 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button onClick={handleQueryClick} className="rounded-xl border px-3 py-2 text-sm whitespace-nowrap hover:bg-slate-50 transition-colors" title="至少支持7天，最多支持1年">查询</button>
          <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">（仅支持查询一周及以上的数据）</span>
        </div>
        <button onClick={onAIClick} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white whitespace-nowrap hover:bg-indigo-700 transition-colors">AI总结和建议</button>
      </div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

type MoodPoint = { day: string; score: number | null; event?: string; emoji?: string };

const moodEmoji = (v: number) => (v>=5?'😄':v>=3?'🙂':v>=1?'😌':v>=0?'😐':v>=-1?'😣':'😫');

const MoodDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.score === null || payload.score === undefined) return null;
  const emoji = payload.emoji || moodEmoji(payload.score);
  const title = payload.event || '';
  const padX = 8;
  const w = Math.max(48, title.length * 10 + padX * 2);
  const h = 22;
  const stickerY = cy + 18;
  return (
    <g>
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize="18">{emoji}</text>
      {title && (
        <>
          <rect x={cx - w/2} y={stickerY} rx={10} ry={10} width={w} height={h} fill="#fff" stroke="#E5E7EB"/>
          <text x={cx} y={stickerY+15} textAnchor="middle" fontSize="12" fill="#111827">{title}</text>
        </>
      )}
      <circle cx={cx} cy={cy} r={3.5} fill="#6366F1" />
    </g>
  );
};

function EmotionTrend({ onAIClick }: { onAIClick?: () => void }) {
  const [data, setData] = React.useState<MoodPoint[]>([]);
  const getDefaultDateRange = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 6);
    return { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) };
  };
  const [dateRange, setDateRange] = React.useState<{from: string, to: string}>(getDefaultDateRange());
  const [aiAnalysis, setAiAnalysis] = React.useState({ timePeriod: '...', summary: '正在分析...', causes: '正在分析...', suggestions: '正在分析...', positiveRatio: 0, recoveryScore: 0 });

  const generateContinuousDateData = (originalData: MoodPoint[]) => {
    const minDate = new Date(dateRange.from);
    const maxDate = new Date(dateRange.to);
    const dataMap = new Map();
    originalData.forEach(item => dataMap.set(item.day, item));
    const continuousData: MoodPoint[] = [];
    const currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const existingData = dataMap.get(dateStr);
      if (existingData) {
        continuousData.push(existingData);
      } else {
        continuousData.push({ day: dateStr, score: null, event: '', emoji: '' });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return continuousData;
  };

  const generateDefaultMoodData = (): MoodPoint[] => {
    const today = new Date();
    const events = ['工作顺利', '加班', '朋友聚餐', '普通一天', '运动', '学习新技能', '休息放松'];
    const scores = [2.5, -1, 3.5, 1.0, 4.0, 2.0, 3.0];
    const result: MoodPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      result.push({ day: dateStr, score: scores[i % scores.length], event: events[i % events.length] });
    }
    return result;
  };

  const analyzeEmotionData = (moodData: MoodPoint[]) => {
    const validScores = moodData.map(d => d.score).filter(score => score !== null) as number[];
    if (validScores.length < 2) {
      setAiAnalysis({ timePeriod: '最近7天', summary: '暂无足够数据进行分析', causes: '请先记录您的情绪', suggestions: '至少需要两条记录才能生成分析', positiveRatio: 0, recoveryScore: 0 });
      return;
    }
    const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const positiveRatio = Math.round((validScores.filter(s => s > 0).length / validScores.length) * 100);
    const variance = validScores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / validScores.length;
    const volatility = Math.sqrt(variance);
    const midPoint = Math.ceil(validScores.length / 2);
    const firstHalf = validScores.slice(0, midPoint);
    const secondHalf = validScores.slice(midPoint);
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : firstHalfAvg;
    let trendText = '，情绪保持平稳';
    if (secondHalfAvg > firstHalfAvg + 0.5) trendText = '，整体呈上升趋势';
    else if (secondHalfAvg < firstHalfAvg - 0.5) trendText = '，但近期有所回落';
    let summary = '';
    if (volatility > 1.8) summary = '情绪波动较大' + trendText;
    else if (volatility > 1) summary = '情绪有一定波动' + trendText;
    else summary = '情绪相对稳定' + trendText;
    const negativeEvents = moodData.filter(d => d.score !== null && d.score < 0 && d.event).map(d => d.event);
    let causes = '暂无明显负面触发因素';
    if (negativeEvents.length > 0) {
      const commonWords = ['工作', '压力', '加班', '担忧', '疲惫', '会议'];
      const foundCauses = commonWords.filter(word => negativeEvents.some(event => event?.includes(word)));
      if (foundCauses.length > 0) causes = `“${foundCauses.join('”、“')}”可能是主要的情绪影响因素`;
    }
    let suggestions = '继续保持，一切顺利！';
    if (secondHalfAvg < firstHalfAvg - 0.5) suggestions = '近期情绪有所下滑，建议关注休息，安排一些放松的活动。';
    else if (volatility > 1.8) suggestions = '情绪波动较大，尝试通过运动或冥想来稳定心绪。';
    else if (avgScore < 0) suggestions = '整体情绪偏低，可以主动与朋友聊聊或进行户外活动。';
    const recoveryScore = Math.max(1, Math.min(10, 5 + avgScore + (positiveRatio / 20)));
    setAiAnalysis({ timePeriod: '最近7天', summary, causes, suggestions, positiveRatio, recoveryScore: Number(recoveryScore.toFixed(1)) });
  };

  React.useEffect(() => {
    function parseMoodToScore(moodText: string): number {
      if (!moodText) return 0;
      const s = moodText.toLowerCase();
      if (/(极差|非常差|崩溃|糟|难受|😭|😫|😤|低落|不适合)/.test(s)) return -3;
      if (/(难过|差|烦|压力|😣|😟|烦躁|卡死|慌)/.test(s)) return -1;
      if (/(一般|平静|普通|还行|😐|平稳)/.test(s)) return 0;
      if (/(不错|开心|愉快|良好|🙂|😀|回升)/.test(s)) return 2;
      if (/(很好|超好|兴奋|激动|优秀|😄|🎉|挺不错)/.test(s)) return 4;
      return 0;
    }
    async function load() {
      try {
        const params: any = {};
        if (dateRange.from) params.from = dateRange.from;
        if (dateRange.to) params.to = dateRange.to;
        const res = await axios.get(`/api/simple-records`, { params });
        const rows = Array.isArray(res.data.records) ? res.data.records : [];
        const pointsByDate: MoodPoint[] = rows
          .filter((r: any) => r.mood_description && r.mood_description.trim() !== '')
          .map((r: any) => {
            const dateStr = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10);
            const rawScore = (r as any).mood_score;
            const score = (typeof rawScore === 'number' && !Number.isNaN(rawScore)) ? rawScore : parseMoodToScore(r.mood_description || '');
            const note = (r.mood_description || '');
            return { day: dateStr, score, event: note.length > 15 ? note.substring(0, 15) + '…' : note, emoji: r.mood_emoji };
          })
          .sort((a: any, b: any) => String(a.day).localeCompare(String(b.day)));
        const processedData = generateContinuousDateData(pointsByDate.length > 0 ? pointsByDate : []);
        const sanitized = processedData.map(p => ({ ...p, score: (typeof p.score === 'number' && !Number.isNaN(p.score)) ? p.score : null }));
        const indexedData = sanitized.map((d: any, idx: number) => ({ ...d, xIndex: idx + 1 }));
        setData(indexedData);
        analyzeEmotionData(pointsByDate);
      } catch (e) {
        console.warn('API请求失败，使用默认测试数据', e);
        const fallbackData = generateDefaultMoodData();
        setData(fallbackData);
        analyzeEmotionData(fallbackData);
      }
    }
    load();
  }, [dateRange]);

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to });

  return (
    <Card>
      <SectionHeader title="情绪趋势" onAIClick={onAIClick} onDateChange={handleDateChange} />
      <div className="mb-2 text-sm text-slate-500">数据点数量: {data.length}</div>
      <div className="h-[260px] md:h-[320px] xl:h-[360px] rounded-xl bg-slate-50 p-4">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="xIndex" type="number" domain={[0, (data?.length || 0) + 1]} allowDecimals={false} tick={{ fontSize: 12 }} interval={0} axisLine={true} tickLine={true} ticks={Array.from({ length: (data?.length || 0) }, (_, i) => i + 1)} tickFormatter={(v:any) => { const idx = Number(v) - 1; const item = data[idx]; const dateStr = item?.day || ''; if (dateStr.length >= 10 && dateStr.includes('-')) return dateStr.slice(5); return dateStr; }} />
              <YAxis tick={{ fontSize: 12 }} domain={[-3, 5]} allowDecimals={true} />
              <Tooltip formatter={(v:any)=>[v,'分值']} labelFormatter={(l:any)=>l} />
              <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={<MoodDot />} activeDot={{ r: 5 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">暂无情绪数据</div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3"><span className="text-lg">🤖</span><h3 className="font-semibold text-slate-800">AI解读</h3></div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-start gap-3"><span className="text-sm mt-1">💡</span><div><div className="text-sm font-medium text-slate-700">情绪总结：{aiAnalysis.summary}</div></div></div>
            <div className="flex items-start gap-3"><span className="text-sm mt-1">🔍</span><div><div className="text-sm font-medium text-slate-700">情绪归因：{aiAnalysis.causes}</div></div></div>
            <div className="flex items-start gap-3"><span className="text-sm mt-1">⚠️</span><div><div className="text-sm font-medium text-slate-700">建议：{aiAnalysis.suggestions}</div></div></div>
              </div>
            </div>
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">😊</span></div>
            <div className="text-xs text-slate-500 mb-1">积极情绪占比</div>
            <div className="text-2xl font-bold text-indigo-600">{aiAnalysis.positiveRatio}%</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">⚡</span></div>
            <div className="text-xs text-slate-500 mb-1">情绪恢复力</div>
            <div className="text-2xl font-bold text-indigo-600">{aiAnalysis.recoveryScore}分</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LifeTimeline({ onAIClick }: { onAIClick?: () => void }) { return <div>Life Timeline Content</div>; }
function StudyTimeDist({ onAIClick }: { onAIClick?: () => void }) { return <div>Study Time Dist Content</div>; }
function WorkCompletion({ onAIClick }: { onAIClick?: () => void }) { return <div>Work Completion Content</div>; }
function InspirationNotes({ onAIClick }: { onAIClick?: () => void }) { return <div>Inspiration Notes Content</div>; }

// Main App Component
export default function AnalyticsTabsPage() {
  const [active, setActive] = useState<TabId>('emotion');
  const [catOpen, setCatOpen] = useState(true);
  const [dataOpen, setDataOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [dataActive, setDataActive] = useState<DataSubTab>('raw');
  const [view, setView] = useState<ViewType>('category');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);

  useEffect(() => {
    const fetchNotebooks = async () => {
      try {
        const response = await axios.get('/api/notebooks');
        if (response.data.success) {
          setNotebooks(response.data.notebooks);
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