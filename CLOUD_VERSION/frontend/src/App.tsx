import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from './apiClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList, Brush, Cell, ReferenceLine } from 'recharts';
import RawDataPage from './components/RawDataPage';
import AIDataPage from './components/AIDataPage';
import AIModal from './components/AIModal';
import TimelineBubbleChart from './components/TimelineBubbleChart';
import NotesPage from './components/NotesPage';
import NoteDetailPage from './components/NoteDetailPage';
import NewNotebookModal from './components/NewNotebookModal';
import CreateNote from './components/CreateNote';
import { NoteProvider } from './contexts/NoteContext';
import { ComponentTemplateProvider } from './contexts/ComponentTemplateContext';

// Type definitions
type TabId = 'emotion' | 'life' | 'study' | 'work' | 'inspiration' | 'creatnote';
type DataSubTab = 'raw' | 'ai';
type ViewType = 'category' | 'data' | 'notes';

interface Notebook {
  notebook_id: string;
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

function SectionHeader({ title, onAIClick, onDateChange, onQuery, defaultFromDate, defaultToDate, hideTitle = false }: { 
  title: string; 
  onAIClick?: () => void;
  onDateChange?: (from: string, to: string) => void;
  onQuery?: (from: string, to: string) => void;
  defaultFromDate?: string;
  defaultToDate?: string;
  hideTitle?: boolean;
}) {
  const [fromDate, setFromDate] = React.useState(defaultFromDate || '');
  const [toDate, setToDate] = React.useState(defaultToDate || '');

  const handleQueryClick = () => {
    if (!fromDate && !toDate) return;
    const from = fromDate ? new Date(fromDate) : (toDate ? new Date(new Date(toDate).getTime() - 6*24*3600*1000) : new Date());
    const to = toDate ? new Date(toDate) : new Date(from.getTime() + 6*24*3600*1000);
    const msInDay = 24*3600*1000;
    const s = from;
    let e = to;
    if ((e.getTime() - s.getTime())/msInDay < 6) {
      e = new Date(s.getTime() + 6*msInDay);
    }
    if (onDateChange) onDateChange(s.toISOString().slice(0,10), e.toISOString().slice(0,10));
    if (onQuery) onQuery(s.toISOString().slice(0,10), e.toISOString().slice(0,10));
  };

  return (
    <div className="mb-3 flex items-center justify-between gap-4 min-w-0">
      {!hideTitle && <h2 className="text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap truncate">{title}</h2>}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-xs">
          <span className="text-slate-500">时间区间</span>
          <input type="date" className="h-9 rounded-xl border-2 border-slate-300 px-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500" style={{borderRadius: '0.75rem', border: '2px solid #cbd5e1'}} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span className="text-slate-500">至</span>
          <input type="date" className="h-9 rounded-xl border-2 border-slate-300 px-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500" style={{borderRadius: '0.75rem', border: '2px solid #cbd5e1'}} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button onClick={handleQueryClick} className="rounded-xl bg-purple-600 text-white px-3 py-2 text-xs whitespace-nowrap hover:bg-purple-700 transition-colors" title="至少支持7天，最多支持1年">查询</button>
          <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">（仅支持查询一周及以上的数据）</span>
        </div>
        <button onClick={onAIClick} className="rounded-xl bg-purple-600 px-3 py-2 text-xs text-white whitespace-nowrap hover:bg-purple-700 transition-colors">AI总结和建议</button>
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

type MoodPoint = { 
  day: string; 
  score: number | null; 
  event?: string; 
  emoji?: string;
  // AI分析字段
  mood_event?: string;
  mood_score?: number;
  mood_category?: string;
};

const moodEmoji = (v: number) => (v>=5?'😄':v>=3?'🙂':v>=1?'😌':v>=0?'😐':v>=-1?'😣':'😫');

interface MoodDotProps {
  cx?: number;
  cy?: number;
  payload: {
    score: number;
    emoji?: string;
  };
}

const MoodDot = (props: MoodDotProps) => {
  const { cx, cy, payload } = props;
  
  // 检查坐标是否有效
  if (cx === undefined || cy === undefined || cx === null || cy === null) {
    // console.warn('MoodDot: Invalid coordinates', { cx, cy, payload });
    return null;
  }
  
  if (payload.score === null || payload.score === undefined) return null;
  
  const emoji = payload.emoji || moodEmoji(payload.score);
  
  return (
    <g>
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize="18">{emoji}</text>
      <circle cx={cx} cy={cy} r={3.5} fill="#7c3aed" />
    </g>
  );
};

function EmotionTrend({ onAIClick }: { onAIClick?: () => void }) {
  const [data, setData] = React.useState<MoodPoint[]>([]);
  const getDefaultDateRange = () => {
    // 近7天的数据（包含今天），确保显示7天
    // 使用中国时区 (UTC+8)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为中国时区
    const todayStr = chinaTime.getFullYear() + '-' + String(chinaTime.getMonth() + 1).padStart(2, '0') + '-' + String(chinaTime.getDate()).padStart(2, '0');
    const today = new Date(todayStr);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 从7天前开始
    return { 
      from: sevenDaysAgo.toISOString().slice(0, 10), 
      to: todayStr // 使用中国时区的今天
    };
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
        const params: Record<string, string> = {};
        if (dateRange.from) params.from = dateRange.from;
        if (dateRange.to) params.to = dateRange.to;
        const res = await apiClient.get(`/api/simple-records`, { params });
        const rows = Array.isArray(res.data.records) ? res.data.records : [];
        const pointsByDate: MoodPoint[] = rows
          .filter((r: Record<string, any>) => r.mood_description && r.mood_description.trim() !== '')
          .map((r: Record<string, any>) => {
            const dateStr = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10);
            const rawScore = (r as any).mood_score;
            // 如果mood_score是有效数字则使用，否则从文本解析
            const score = (typeof rawScore === 'number' && !Number.isNaN(rawScore)) ? rawScore : parseMoodToScore(r.mood_description || '');
            const note = (r.mood_description || '');
            return { 
              day: dateStr, 
              score, 
              event: note.length > 15 ? note.substring(0, 15) + '…' : note, 
              emoji: r.mood_emoji,
              // AI分析字段
              mood_event: r.mood_event,
              mood_score: r.mood_score,
              mood_category: r.mood_category
            };
          })
          .sort((a: MoodPoint, b: MoodPoint) => String(a.day).localeCompare(String(b.day)));
        const processedData = generateContinuousDateData(pointsByDate.length > 0 ? pointsByDate : []);
        const sanitized = processedData.map(p => ({ ...p, score: (typeof p.score === 'number' && !Number.isNaN(p.score)) ? p.score : null }));
        const indexedData = sanitized.map((d: MoodPoint, idx: number) => ({ ...d, xIndex: idx + 1 })) as (MoodPoint & { xIndex: number })[];
        
        // 调试数据
        // console.log('EmotionTrend data:', indexedData);
        
        setData(indexedData);
        analyzeEmotionData(pointsByDate);
      } catch (e) {
        // console.warn('API请求失败，无数据可显示', e);
        setData([]);
        setAiAnalysis({ timePeriod: '最近7天', summary: '暂无数据', causes: '请先记录您的情绪', suggestions: '至少需要一条记录才能生成分析', positiveRatio: 0, recoveryScore: 0 });
      }
    }
    load();
  }, [dateRange]);

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to });
  const handleQuery = (from: string, to: string) => setDateRange({ from, to });

  // 自定义心情Tooltip组件
  const CustomMoodTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data || data.score === null) return null;
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <div className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-lg">{data.emoji || moodEmoji(data.score)}</span>
            <span>心情记录</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">{data.day}</div>
          <div className="text-sm mb-3">{data.event || '无详细描述'}</div>
          
          {/* AI分析信息卡片 */}
          <div className="bg-purple-50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-800">心情事件(AI)</span>
              <span className="text-sm text-purple-600">
                {data.mood_event || '未分析'}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-800">分值(AI)</span>
              <span 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  (data.mood_score || data.score) >= 3 ? 'bg-green-500 text-white' :
                  (data.mood_score || data.score) >= 1 ? 'bg-blue-500 text-white' :
                  (data.mood_score || data.score) >= 0 ? 'bg-gray-500 text-white' :
                  (data.mood_score || data.score) >= -1 ? 'bg-yellow-500 text-white' :
                  (data.mood_score || data.score) >= -2 ? 'bg-orange-500 text-white' :
                  'bg-red-500 text-white'
                }`}
              >
                {data.mood_score !== undefined ? data.mood_score : data.score}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-800">分类(AI)</span>
              <span 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.mood_category === '积极高' ? 'bg-green-100 text-green-800' :
                  data.mood_category === '中性' ? 'bg-gray-100 text-gray-800' :
                  data.mood_category === '特殊情' ? 'bg-blue-100 text-blue-800' :
                  data.mood_category === '轻度消' ? 'bg-yellow-100 text-yellow-800' :
                  data.mood_category === '中度消' ? 'bg-orange-100 text-orange-800' :
                  data.mood_category === '高强度' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {data.mood_category || '未分类'}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            <div>原始描述: {data.event || '无'}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <SectionHeader title="情绪趋势" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} defaultFromDate={dateRange.from} defaultToDate={dateRange.to} hideTitle={true} />
      <div className="h-[260px] md:h-[320px] xl:h-[360px] rounded-xl bg-slate-50 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 60, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="xIndex" 
              type="number" 
              domain={[0, Math.max((data?.length || 0) + 1, 7)]} 
              allowDecimals={false} 
              tick={{ fontSize: 12 }} 
              interval={0} 
              axisLine={true} 
              tickLine={true} 
              ticks={Array.from({ length: Math.max(data?.length || 0, 7) }, (_, i) => i + 1)} 
              tickFormatter={(v:any) => { 
                const idx = Number(v) - 1; 
                const item = data[idx]; 
                if (item?.day) {
                  const dateStr = item.day; 
                  if (dateStr.length >= 10 && dateStr.includes('-')) return dateStr.slice(5); 
                  return dateStr; 
                }
                // 当没有数据时，生成日期标签
                const today = new Date();
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() - (6 - idx));
                return targetDate.toISOString().slice(5, 10);
              }} 
            />
            <YAxis tick={{ fontSize: 12 }} domain={[-3, 5]} allowDecimals={true} tickCount={9} />
            <Tooltip content={<CustomMoodTooltip />} wrapperStyle={{ outline: 'none' }} />
            {data.length > 0 && (
              <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={(props: any) => <MoodDot {...props} />} activeDot={{ r: 5 }} connectNulls={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none">
            暂无情绪数据
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg">
              <span className="text-base">🤖</span>
              <h3 className="text-base font-semibold">AI解读</h3>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-center gap-3"><span className="text-sm">💡</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">情绪总结：{aiAnalysis.summary}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">🔍</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">情绪归因：{aiAnalysis.causes}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">⚠️</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">建议：{aiAnalysis.suggestions}</div></div></div>
              </div>
            </div>
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">😊</span></div>
            <div className="text-xs text-slate-500 mb-1">积极情绪占比</div>
            <div className="text-2xl font-bold text-purple-600">{aiAnalysis.positiveRatio}%</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">⚡</span></div>
            <div className="text-xs text-slate-500 mb-1">情绪恢复力</div>
            <div className="text-2xl font-bold text-purple-600">{aiAnalysis.recoveryScore}分</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LifeTimeline({ onAIClick }: { onAIClick?: () => void }) {
  type LifeBar = {
    date: string; 
    calories: number; 
    duration: number; 
    durationLabel: string; 
    desc: string; 
    type?: string; 
    hours: number;
    // AI分析字段
    fitness_intensity?: string;
    fitness_duration?: string;
    fitness_calories?: string;
    fitness_type?: string;
  }
  const [bars, setBars] = React.useState<LifeBar[]>([])
  const getDefaultDateRange = () => {
    // 使用中国时区 (UTC+8)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为中国时区
    const todayStr = chinaTime.getFullYear() + '-' + String(chinaTime.getMonth() + 1).padStart(2, '0') + '-' + String(chinaTime.getDate()).padStart(2, '0');
    const today = new Date(todayStr);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 从7天前开始
    return { 
      from: sevenDaysAgo.toISOString().slice(0, 10), 
      to: todayStr // 使用中国时区的今天
    }
  }
  const [dateRange, setDateRange] = React.useState<{from: string, to: string}>(getDefaultDateRange())

  const generateEmptyDateData = () => {
    const minDate = new Date(dateRange.from);
    const maxDate = new Date(dateRange.to);
    const emptyData: Record<string, any>[] = [];
    const currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      emptyData.push({ date: dateStr, calories: 0, duration: 0, type: '', durationLabel: '', hours: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return emptyData;
  };

  const generateCompleteWeekData = (realData: LifeBar[], dateRange: {from: string, to: string}): LifeBar[] => {
    const result: LifeBar[] = []
    const dataMap = new Map()
    realData.forEach(item => { dataMap.set(item.date, item) })
    const currentDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const existingData = dataMap.get(dateStr)
      if (existingData) {
        result.push(existingData)
      } else {
        result.push({ date: dateStr, calories: 0, duration: 0, durationLabel: '', desc: '无运动记录', type: '无运动', hours: 0 })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return result
  }


  const [lifeAnalysis, setLifeAnalysis] = React.useState({
    summary: '运动习惯良好，运动安排合理',
    causes: '运动类型多样，健身计划执行良好',
    suggestions: '保持当前运动频率，可适当增加力量训练',
    typesCount: 0,
    totalCalories: 0,
    totalMinutes: 0,
    totalHours: 0
  })

  function parseNumber(s?: string): number { 
    if (!s) return 0; 
    const m = String(s).match(/\d+/); 
    return m ? Number(m[0]) : 0;
  }
  const TYPE_COLORS: Record<string, string> = { '有氧运动': '#7c3aed', '力量训练': '#a855f7', '柔韧性训练': '#c084fc', '低强度有氧': '#8b5cf6' }
  function splitTypes(type?: string): string[] { if (!type) return []; return String(type).split(/[、/|,\s]+/).filter(Boolean) }
  const CustomLifeTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0].payload as LifeBar
    const types = splitTypes(item.type)
    // const palette = ['#6366F1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxWidth: 320 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>日期：{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#334155' }}>运动时长：</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.hours.toFixed(1)} 小时</span>
          {item.duration ? (<span style={{ marginLeft: 8, fontSize: 12, color: '#475569' }}>（{item.duration} 分钟）</span>) : null}
        </div>
        {item.desc ? (<div style={{ fontSize: 12, color: '#475569', lineHeight: 1.45, marginBottom: 8 }}>内容：{item.desc}</div>) : null}
        
        {/* AI分析字段 */}
        <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>AI分析</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {item.fitness_intensity ? (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>强度(AI)：</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{item.fitness_intensity}</span>
              </div>
            ) : null}
            {item.fitness_duration ? (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>时长(AI)：</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{item.fitness_duration}</span>
              </div>
            ) : null}
            {item.fitness_calories ? (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>消耗(AI)：</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{item.fitness_calories}</span>
              </div>
            ) : null}
            {item.fitness_type ? (
              <div style={{ fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>运动类型(AI)：</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>{item.fitness_type}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  React.useEffect(() => {
    async function load() {
      try {
        const params: Record<string, string> = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await apiClient.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []
        const mapped: LifeBar[] = rows
          .filter((r: Record<string, any>) => r.fitness_calories || r.fitness_duration || (r.fitness_description && r.fitness_description !== '无' && r.fitness_description !== ''))
          .map((r: Record<string, any>) => {
            const date = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0,10) : new Date(r.date).toISOString().slice(0,10)
            const calories = parseNumber(r.fitness_calories)
            const duration = parseNumber(r.fitness_duration)
            const hours = duration / 60 // 将分钟转换为小时
            const type = r.fitness_type
            const desc = r.fitness_description || r.life_description || ''
            return { 
              date, 
              calories, 
              duration, 
              durationLabel: duration ? `${duration}分钟` : '', 
              desc, 
              type, 
              hours,
              fitness_intensity: r.fitness_intensity || '',
              fitness_duration: r.fitness_duration || '',
              fitness_calories: r.fitness_calories || '',
              fitness_type: r.fitness_type || ''
            }
          })
          .sort((a: LifeBar, b: LifeBar) => a.date.localeCompare(b.date))
        const finalData = generateCompleteWeekData(mapped, dateRange)
        setBars(finalData)
        const diversity = new Set(mapped.flatMap(m=>splitTypes(m.type)).filter(Boolean)).size
        const totalCal = mapped.reduce((s,m)=>s+m.calories,0)
        const totalMin = mapped.reduce((s,m)=>s+m.duration,0)
        const totalHours = mapped.reduce((s,m)=>s+m.hours,0)
        setLifeAnalysis(v => ({ ...v, typesCount: diversity, totalCalories: totalCal, totalMinutes: totalMin, totalHours }))
      } catch (e) { 
        // console.warn('API请求失败，无健身数据可显示', e);
        setBars([]);
        setLifeAnalysis({ summary: '', causes: '', suggestions: '', typesCount: 0, totalCalories: 0, totalMinutes: 0, totalHours: 0 });
      }
    }
    load()
  }, [dateRange])

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })
  const handleQuery = (from: string, to: string) => setDateRange({ from, to })

  return (
    <Card>
      <SectionHeader title="健身打卡" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} defaultFromDate={dateRange.from} defaultToDate={dateRange.to} hideTitle={true} />
      <div className="h-[320px] md:h-[380px] xl:h-[420px] rounded-xl bg-slate-50 p-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars.length > 0 ? bars : generateEmptyDateData()} barCategoryGap="28%" barGap={8} margin={{ top: 20, right: 20, left: 60, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              angle={-30} 
              textAnchor="end" 
              interval={0} 
              height={60}
              tickFormatter={(v:any) => { 
                const dateStr = String(v); 
                if (dateStr.length >= 10 && dateStr.includes('-')) { 
                  return dateStr.slice(5) 
                } 
                return dateStr 
              }} 
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              width={80} 
              domain={[0, 6]} 
              ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]}
              label={{ value: '运动小时', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }} 
            />
            <Tooltip content={<CustomLifeTooltip />} wrapperStyle={{ outline: 'none' }} />
            {bars.length > 0 && (
              <Bar dataKey="hours" name="运动时长(小时)" barSize={18} radius={[4,4,0,0]}>
                {bars.map((b, idx) => {
                  const types = splitTypes(b.type)
                  const first = types[0]
                  const color = TYPE_COLORS[first as keyof typeof TYPE_COLORS] || TYPE_COLORS['有氧运动']
                  return <Cell key={`c-${idx}`} fill={color} />
                })}
                <LabelList dataKey="durationLabel" position="top" style={{ fill: '#334155', fontSize: 12 }} />
              </Bar>
            )}
            {bars.length > 10 && (<Brush dataKey="date" height={24} travellerWidth={10} stroke="#94a3b8" />)}
          </BarChart>
        </ResponsiveContainer>
        {bars.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none">
            暂无健身数据
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg">
              <span className="text-base">🤖</span>
              <h3 className="text-base font-semibold">AI解读</h3>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-center gap-3"><span className="text-sm">🏃‍♂️</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">运动总结：{lifeAnalysis.summary}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">💪</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">健身状态：{lifeAnalysis.causes}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">💡</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">建议：{lifeAnalysis.suggestions}</div></div></div>
          </div>
        </div>
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">🏃‍♀️</span></div><div className="text-xs text-slate-500 mb-1">运动种类</div><div className="text-2xl font-bold text-purple-600">{lifeAnalysis.typesCount}种</div></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">🔥</span></div><div className="text-xs text-slate-500 mb-1">总消耗</div><div className="text-2xl font-bold text-purple-600">{lifeAnalysis.totalCalories}卡</div></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">⏱️</span></div><div className="text-xs text-slate-500 mb-1">总时长</div><div className="text-2xl font-bold text-purple-600">{lifeAnalysis.totalMinutes}分钟</div></div>
        </div>
      </div>
    </Card>
  )
}
function StudyTimeDist({ onAIClick }: { onAIClick?: () => void }) {
  type StudyBar = { date: string; hours: number; description: string; category: string; duration: string }
  const [studyBars, setStudyBars] = React.useState<StudyBar[]>([])
  const getDefaultDateRange = () => {
    // 使用中国时区 (UTC+8)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为中国时区
    const todayStr = chinaTime.getFullYear() + '-' + String(chinaTime.getMonth() + 1).padStart(2, '0') + '-' + String(chinaTime.getDate()).padStart(2, '0');
    const today = new Date(todayStr);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 从7天前开始
    return { 
      from: sevenDaysAgo.toISOString().slice(0, 10), 
      to: todayStr // 使用中国时区的今天
    }
  }
  const [dateRange, setDateRange] = React.useState<{from: string, to: string}>(getDefaultDateRange())

  const generateCompleteStudyWeekData = (realData: StudyBar[], dateRange: {from: string, to: string}): StudyBar[] => {
    // 生成完整的日期范围数据，确保所有日期都显示
    const startDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    const completeData: StudyBar[] = []
    
    // 生成日期范围内的所有日期
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      const existingData = realData.filter(item => item.date === dateStr)
      
      if (existingData.length > 0) {
        // 如果该日期有数据，添加所有记录
        completeData.push(...existingData)
      } else {
        // 如果该日期没有数据，添加一个空记录以确保日期显示
        completeData.push({
          date: dateStr,
          hours: 0,
          description: '',
          category: '其他',
          duration: ''
        })
      }
    }
    
    return completeData
  }

  const [studyAnalysis, setStudyAnalysis] = React.useState({
    summary: '学习内容丰富多样，持续跟进',
    timeInfo: '0小时',
    suggestions: '建议增加实践应用',
    totalHours: 0,
    totalMinutes: 0,
    dailyAverage: 0
  })

  const CATEGORY_COLORS: Record<string, string> = {
    // 主要学习种类 - 使用紫色系渐变色调
    '外语': '#7c3aed',      // 深紫色 - 语言学习
    '编程': '#a855f7',      // 中紫色 - 技术开发
    'AI技术': '#8b5cf6',    // 紫色 - AI技术
    'AI应用': '#c084fc',    // 浅紫色 - AI应用
    '金融': '#d8b4fe',      // 更浅紫色 - 金融理财
    '心理学': '#e9d5ff',    // 最浅紫色 - 心理学
    '自媒体': '#7c3aed',    // 深紫色 - 内容创作
    '阅读': '#a855f7',      // 中紫色 - 阅读学习
    
    // 扩展学习种类 - 使用紫色系渐变色调
    '语言学习': '#6d28d9',  // 深紫色
    '考试准备': '#8b5cf6',  // 紫色
    '技能学习': '#7c3aed',  // 深紫色
    '记忆训练': '#a855f7',  // 中紫色
    '翻译练习': '#c084fc',  // 浅紫色
    '数学': '#d8b4fe',      // 更浅紫色
    '科学': '#e9d5ff',      // 最浅紫色
    '历史': '#8b5cf6',      // 紫色
    '艺术': '#7c3aed',      // 深紫色
    '哲学': '#0f172a',      // 深黑色
    '其他': '#6b7280'       // 灰色 - 默认
  }
  function parseNumber(s?: string): number { if (!s) return 0; const m = String(s).match(/\d+/); return m ? Number(m[0]) : 0 }
  function parseDuration(duration?: string): number {
    if (!duration || duration === '未提及') return 0.5 // 默认0.5小时
    if (duration.includes('h') || duration.includes('小时')) return parseNumber(duration)
    if (duration.includes('min') || duration.includes('分钟')) return parseNumber(duration) / 60
    // 如果只是数字，假设是分钟
    const num = parseNumber(duration)
    if (num > 0) return num / 60
    return 0.5 // 默认0.5小时
  }

  function extractCategory(description: string): string {
    if (!description) return '其他'
    const desc = description.toLowerCase()
    if (desc.includes('编程') || desc.includes('代码') || desc.includes('python') || desc.includes('javascript') || desc.includes('重构') || desc.includes('脚本')) return '编程'
    if (desc.includes('ai') || desc.includes('bert') || desc.includes('lora') || desc.includes('diffusion') || desc.includes('stable diffusion')) return 'AI技术'
    if (desc.includes('论文') || desc.includes('阅读') || desc.includes('书') || desc.includes('clean code')) return '阅读'
    if (desc.includes('博客') || desc.includes('写作') || desc.includes('文章')) return '自媒体'
    if (desc.includes('anki') || desc.includes('卡片')) return '其他'
    return '其他'
  }

  const CustomStudyTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (!active || !payload || !payload.length) return null
    
    // 检查是否有任何有效数据
    const hasValidData = payload.some((item: any) => item.value > 0)
    if (!hasValidData) {
      return (
        <div style={{ 
          background: '#fff', 
          border: '1px solid #e5e7eb', 
          borderRadius: 8, 
          padding: 12, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
          maxWidth: 320 
        }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>日期：{label}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>暂无学习数据</div>
        </div>
      )
    }
    
    const validItems = payload.filter((item: any) => item.value > 0)
    return (
      <div style={{ 
        background: '#fff', 
        border: '1px solid #e5e7eb', 
        borderRadius: 8, 
        padding: 12, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
        maxWidth: 320 
      }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>日期：{label}</div>
        {validItems.map((item: any, index: number) => {
          const category = item.dataKey
          const hours = item.value
          const description = item.payload[`${category}_desc`] || '无描述'
          const duration = item.payload[`${category}_duration`] || '未提及'
          return (
            <div key={index} style={{ marginBottom: index < validItems.length - 1 ? 8 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'nowrap' }}>
                <div style={{ 
                  background: CATEGORY_COLORS[category] || '#6b7280', 
                  color: '#fff', 
                  fontSize: 11, 
                  padding: '3px 8px', 
                  borderRadius: 6,
                  whiteSpace: 'nowrap',
                  fontWeight: '500',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `1px solid ${CATEGORY_COLORS[category] || '#6b7280'}`
                }}>
                  {category}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {hours > 0 ? `${Number(hours).toFixed(2)}小时` : '未提及'}
                </span>
                {duration !== '未提及' && (
                  <span style={{ fontSize: 11, color: '#64748b' }}>({duration})</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
                {description}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  React.useEffect(() => {
    async function load() {
      try {
        const params: Record<string, string> = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await apiClient.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []
        const studyRecords = rows
          .filter((r: any) => r.study_description && r.study_description !== '无')
          .map((r: Record<string, any>) => {
            const date = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0,10) : new Date(r.date).toISOString().slice(0,10)
            const hours = parseDuration(r.study_duration)
            const description = r.study_description || ''
            const category = r.study_category || extractCategory(description)
            const duration = r.study_duration || '未提及'
            return { date, hours, description, category, duration }
          })
        // 直接使用原始数据，不进行分组，让图表组件处理分组
        const chartData = studyRecords.sort((a: StudyBar, b: StudyBar) => a.date.localeCompare(b.date))
        const completeWeekData = generateCompleteStudyWeekData(chartData, dateRange)
        setStudyBars(completeWeekData)
        analyzeStudyData(chartData)
      } catch (e) { setStudyBars([]) }
    }
    load()
  }, [dateRange])

  const analyzeStudyData = (studyItems: StudyBar[]) => {
    const totalHoursRaw = studyItems.reduce((sum, item) => sum + item.hours, 0)
    const totalHours = Number(totalHoursRaw.toFixed(2))
    const totalMinutes = Math.round(totalHoursRaw * 60)
    const days = studyItems.length
    const dailyAverage = days > 0 ? Number((totalHoursRaw / days).toFixed(2)) : 0
    const categoryStats = studyItems.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + item.hours; return acc }, {} as Record<string, number>)
    const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCategories[0]?.[0] || '编程'
    const secondCategory = sortedCategories[1]?.[0] || '外语'
    const summary = topCategory.includes('AI') ? `${topCategory}学习投入最多，${secondCategory}持续跟进` : `${topCategory}和${secondCategory}是主要学习方向`
    const timeInfo = `${totalHours.toFixed(2)}小时（平均每日${dailyAverage.toFixed(2)}小时）`
    let suggestions = '继续保持良好的学习节奏'
    if (dailyAverage < 1) suggestions = '建议增加学习时间，培养持续学习的习惯'
    else if (dailyAverage > 2) suggestions = '学习投入充足，建议增加实践应用和项目练习'
    else suggestions = '学习内容丰富多样，建议增加实践应用'
    setStudyAnalysis({ summary, timeInfo, suggestions, totalHours, totalMinutes, dailyAverage })
  }

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })
  const handleQuery = (from: string, to: string) => setDateRange({ from, to })

  const allCategories = [...new Set(studyBars.map(item => item.category))]
  
  // 检查是否有真实的学习数据（hours > 0）
  const hasRealData = studyBars.some(item => item.hours > 0)
  const displayCategories = hasRealData ? allCategories : []

  const prepareGroupedData = () => {
    // 按日期分组，每个日期包含所有学习种类的数据
    const groupedByDate = studyBars.reduce((acc, record) => {
      const date = record.date
      if (!acc[date]) {
        acc[date] = { date }
        // 为所有可能的学习种类初始化
        displayCategories.forEach(category => {
          acc[date][category] = 0
          acc[date][`${category}_desc`] = ''
          acc[date][`${category}_duration`] = ''
        })
      }
      acc[date][record.category] = record.hours
      acc[date][`${record.category}_desc`] = record.description
      acc[date][`${record.category}_duration`] = record.duration
      return acc
    }, {} as Record<string, any>)
    
    const data = Object.values(groupedByDate).sort((a: any, b: any) => a.date.localeCompare(b.date))
    
    // 如果没有数据，提供默认数据以确保轴显示
    if (data.length === 0) {
      const today = new Date()
      const defaultDates = []
      
      // 生成最近7天的日期作为默认显示
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        defaultDates.push({ date: date.toISOString().split('T')[0] })
      }
      
      return defaultDates
    }
    
    return data
  }

  const groupedData = prepareGroupedData()

  return (
    <Card>
      <SectionHeader title="学习跟进" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} defaultFromDate={dateRange.from} defaultToDate={dateRange.to} hideTitle={true} />
      <div className="relative h-[400px] md:h-[450px] xl:h-[500px] rounded-xl bg-slate-50 p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} barCategoryGap="30%" barGap={0} margin={{ top: 60, right: 30, left: 60, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={2} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={4} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={6} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={8} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={10} stroke="#e2e8f0" strokeDasharray="3 3" />
            <ReferenceLine y={12} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={{ stroke: '#cbd5e1' }} 
              tickLine={{ stroke: '#cbd5e1' }} 
              angle={-45} 
              textAnchor="end" 
              interval={0} 
              height={80} 
              padding={{ left: 10, right: 10 }}
              tickFormatter={(v:any) => { 
                const dateStr = String(v); 
                if (dateStr.length >= 10 && dateStr.includes('-')) return dateStr.slice(5); 
                return dateStr; 
              }}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={{ stroke: '#cbd5e1' }} 
              tickLine={{ stroke: '#cbd5e1' }} 
              width={60} 
              domain={[0, 12]} 
              ticks={[0, 2, 4, 6, 8, 10, 12]}
              label={{ 
                value: '学习时长(小时)', 
                angle: -90, 
                position: 'insideLeft', 
                style: { textAnchor: 'middle', fill: '#64748b' } 
              }} 
            />
            <Tooltip content={<CustomStudyTooltip />} wrapperStyle={{ outline: 'none' }} />
            <Legend 
              verticalAlign="top" 
              height={50} 
              iconType="rect" 
              wrapperStyle={{ 
                paddingBottom: '15px', 
                fontSize: '12px',
                fontWeight: '500'
              }}
              iconSize={12}
              layout="horizontal"
              align="center"
            />
            {hasRealData && displayCategories.map(category => (
              <Bar 
                key={category} 
                dataKey={category} 
                name={category} 
                fill={CATEGORY_COLORS[category] || '#6b7280'} 
                barSize={28} 
                stackId="study"
                radius={[0, 0, 4, 4]}
                stroke={CATEGORY_COLORS[category] || '#6b7280'}
                strokeWidth={1}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {!hasRealData && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none">
            暂无学习数据
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg">
              <span className="text-base">🤖</span>
              <h3 className="text-base font-semibold">AI解读</h3>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-center gap-3"><span className="text-sm">📖</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">学习总结：{studyAnalysis.summary}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">⏰</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">学习总时长：{studyAnalysis.timeInfo}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">💡</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">建议：{studyAnalysis.suggestions}</div></div></div>
          </div>
        </div>
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">📚</span></div>
            <div className="text-xs text-slate-500 mb-1">总学习时长</div>
            <div className="text-2xl font-bold text-purple-600">{Number(studyAnalysis.totalHours).toFixed(2)}小时</div>
            <div className="text-sm text-slate-500 mt-1">约{studyAnalysis.totalMinutes}分钟</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">⏱️</span></div>
            <div className="text-xs text-slate-500 mb-1">平均每日</div>
            <div className="text-2xl font-bold text-purple-600">{Number(studyAnalysis.dailyAverage).toFixed(2)}小时</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
// 工作任务甘特图类型
interface WorkTask {
  date: string;
  task: string;
  taskType: string;
  priority: string;
  complexity: string;
  estimatedHours: number;
  startDate: Date;
  endDate: Date;
}

// 任务类型颜色映射
const TASK_TYPE_COLORS = {
  '规划': '#3b82f6',      // 蓝色
  '开发': '#10b981',      // 绿色  
  'UI/UX设计': '#8b5cf6', // 紫色
  '部署': '#f59e0b',      // 橙色
  '功能集成': '#ef4444',  // 红色
  '测试/收尾': '#84cc16', // 草绿色
  '未分类': '#6b7280'     // 灰色
}

/* 5. 工作甘特图分析 */
function WorkCompletion({ onAIClick }: { onAIClick?: () => void }) {
  const getDefaultDateRange = () => {
    // 使用中国时区 (UTC+8)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为中国时区
    const todayStr = chinaTime.getFullYear() + '-' + String(chinaTime.getMonth() + 1).padStart(2, '0') + '-' + String(chinaTime.getDate()).padStart(2, '0');
    const today = new Date(todayStr);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 改为-6，这样从7天前到昨天正好是7天
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { 
      from: sevenDaysAgo.toISOString().slice(0, 10), 
      to: yesterday.toISOString().slice(0, 10) 
    };
  };
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([]);

  const generateCompleteWorkWeekData = (realData: WorkTask[], dateRange: { from: string; to: string }): WorkTask[] => {
    const result: WorkTask[] = [];
    const dataMap = new Map();
    realData.forEach(item => { dataMap.set(item.date, item) });
    const currentDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      const existingData = dataMap.get(dateStr);
      if (existingData) {
        result.push(existingData);
      } else {
        const startDate = new Date(dateStr);
        const endDate = new Date(dateStr);
        endDate.setDate(endDate.getDate() + 1);
        result.push({ date: dateStr, task: '无工作记录', taskType: '未分类', priority: '中', complexity: '简单', estimatedHours: 0, startDate, endDate });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return result;
  };

  const [workAnalysis, setWorkAnalysis] = useState({
    summary: '项目整体进展顺利，各阶段任务有序推进',
    suggestions: '建议优化任务优先级管理，提高工作效率',
    totalTasks: 0,
    completedTasks: 0,
    avgDuration: 0
  });

  useEffect(() => {
    async function load() {
      try {
        const params: Record<string, string> = {};
        if (dateRange.from) params.from = dateRange.from;
        if (dateRange.to) params.to = dateRange.to;
        const res = await apiClient.get(`/api/simple-records`, { params });
        const rows = Array.isArray(res.data.records) ? res.data.records : [];
        const workRecords: WorkTask[] = rows
          .filter((r: any) => r.work_description)
          .map((r: Record<string, any>) => {
            const date = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10);
            const task = r.work_description || '';
            const taskType = r.work_task_type || '未分类';
            const priority = r.work_priority || '中';
            const complexity = r.work_complexity || '中等';
            const estimatedHours = r.work_estimated_hours || 8;
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            return { date, task, taskType, priority, complexity, estimatedHours, startDate, endDate };
          })
          .sort((a: any, b: any) => a.date.localeCompare(b.date));
        const completeWeekData = generateCompleteWorkWeekData(workRecords, dateRange);
        setWorkTasks(completeWeekData);
        analyzeWorkData(workRecords);
      } catch (e) {
        setWorkTasks([]);
      }
    }
    load();
  }, [dateRange]);

  const analyzeWorkData = (tasks: WorkTask[]) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => new Date(t.date) <= new Date()).length;
    const avgDuration = totalTasks > 0 ? tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / totalTasks : 0;
    const typeStats = tasks.reduce((acc, task) => { acc[task.taskType] = (acc[task.taskType] || 0) + 1; return acc }, {} as Record<string, number>);
    const sortedTypes = Object.entries(typeStats).sort((a, b) => b[1] - a[1]);
    const mainTaskType = sortedTypes[0]?.[0] || '开发';
    let summary = `项目包含${totalTasks}个任务，以${mainTaskType}为主要工作内容`;
    if (completedTasks > 0) summary += `，已完成${completedTasks}个任务，进展顺利`;
    let suggestions = '继续保持当前工作节奏';
    if (avgDuration > 8) suggestions = '任务工时较高，建议拆分复杂任务，提高执行效率';
    else if (avgDuration < 4) suggestions = '任务规模适中，可考虑增加任务复杂度以提升技能';
    else suggestions = '任务规划合理，建议定期总结经验和优化流程';
    setWorkAnalysis({ summary, suggestions, totalTasks, completedTasks, avgDuration: Math.round(avgDuration * 10) / 10 });
  };

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to });
  const handleQuery = (from: string, to: string) => setDateRange({ from, to });

  const renderGanttChart = (tasks: WorkTask[]) => {
    if (tasks.length === 0) {
      // 生成默认的日期范围来显示图表结构
      const startDate = new Date(dateRange.from);
      const endDate = new Date(dateRange.to);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const dates = Array.from({ length: totalDays }, (_, i) => { 
        const d = new Date(startDate); 
        d.setDate(d.getDate() + i); 
        return d; 
      });
      
      return (
        <div className="overflow-auto">
          <div className="min-w-[800px] pb-4">
            <div className="flex border-b border-slate-200">
              <div className="w-[220px] p-3 bg-slate-50 font-medium text-slate-700 border-r border-slate-200">任务名称</div>
              <div className="flex-1 flex">{dates.map((d, i) => (<div key={i} className="flex-1 min-w-[60px] p-2 text-center text-xs text-slate-600 border-r border-slate-100">{d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</div>))}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center border-b border-slate-100">
                <div className="w-[220px] p-3 border-r border-slate-200">
                  <div className="text-sm font-medium text-slate-400 truncate">暂无工作任务数据</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-slate-400">-</span>
                  </div>
                </div>
                <div className="flex-1 relative h-12 flex items-center">
                  <div className="absolute inset-0 flex">{dates.map((_, i) => (<div key={i} className="flex-1 min-w-[60px] border-r border-slate-100" />))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const minDate = new Date(Math.min(...tasks.map(t => t.startDate.getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => t.endDate.getTime())));
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dates = Array.from({ length: totalDays }, (_, i) => { const d = new Date(minDate); d.setDate(d.getDate() + i); return d });
    
    return (
      <div className="overflow-auto">
        <div className="min-w-[800px] pb-4">
          <div className="flex border-b border-slate-200">
            <div className="w-[220px] p-3 bg-slate-50 font-medium text-slate-700 border-r border-slate-200">任务名称</div>
            <div className="flex-1 flex">{dates.map((d, i) => (<div key={i} className="flex-1 min-w-[60px] p-2 text-center text-xs text-slate-600 border-r border-slate-100">{d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</div>))}</div>
          </div>
          <div className="space-y-1">
            {tasks.map((task, idx) => {
              const taskStartDay = Math.floor((task.startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
              const taskDuration = Math.max(1, Math.floor((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)));
              const taskWidth = (taskDuration / totalDays) * 100;
              return (
                <div key={idx} className="flex items-center border-b border-slate-100 hover:bg-slate-25">
                  <div className="w-[220px] p-3 border-r border-slate-200">
                    <div className="text-sm font-medium text-slate-800 truncate" title={task.task}>{task.task}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${task.priority === '高' ? 'bg-red-100 text-red-700' : task.priority === '中' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{task.priority}</span>
                      <span className="text-xs text-slate-500">{task.estimatedHours}h · {task.taskType}</span>
                    </div>
                  </div>
                  <div className="flex-1 relative h-12 flex items-center">
                    <div className="absolute inset-0 flex">{dates.map((_, i) => (<div key={i} className="flex-1 min-w-[60px] border-r border-slate-100" />))}</div>
                    <div className="absolute h-6 rounded flex items-center justify-center shadow-sm" style={{ left: `${(taskStartDay / totalDays) * 100}%`, width: `${taskWidth}%`, minWidth: '40px', backgroundColor: TASK_TYPE_COLORS[task.taskType as keyof typeof TASK_TYPE_COLORS] || TASK_TYPE_COLORS['未分类'] }} title={`${task.task} (${task.taskType})`}>
                      <span className="text-xs text-white font-medium truncate px-2">{task.taskType}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const GanttChart = () => {
    return renderGanttChart(workTasks);
  };

  return (
    <Card>
      <SectionHeader title="工作upup" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} defaultFromDate={dateRange.from} defaultToDate={dateRange.to} hideTitle={true} />
      <div className="h-[560px] md:h-[600px] rounded-xl bg-white border border-slate-200 overflow-auto"><GanttChart /></div>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg">
              <span className="text-base">🤖</span>
              <h3 className="text-base font-semibold">AI解读</h3>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-center gap-3"><span className="text-sm">💼</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">项目总结：{workAnalysis.summary}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">💡</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">优化建议：{workAnalysis.suggestions}</div></div></div>
          </div>
        </div>
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">📋</span></div><div className="text-xs text-slate-500 mb-1">总任务数</div><div className="text-lg font-bold text-indigo-600">{workAnalysis.totalTasks}</div></div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">⏰</span></div><div className="text-xs text-slate-500 mb-1">平均工时</div><div className="text-lg font-bold text-slate-600">{workAnalysis.avgDuration}h</div></div>
        </div>
      </div>
    </Card>
  );
}
// NotebookItem component for displaying a single notebook with rename functionality
const NotebookItem = ({ 
  notebook, 
  isActive, 
  onClick, 
  onRename 
}: { 
  notebook: Notebook; 
  isActive: boolean; 
  onClick: () => void; 
  onRename: () => void; 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 rounded-2xl px-2 py-1.5 text-xs min-w-0 ${
          isActive ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-purple-50 hover:border-purple-200'
        }`}
      >
        <span>🗒️</span>
        <span className="whitespace-nowrap flex-1 text-left">{notebook.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={`opacity-0 group-hover:opacity-100 transition-opacity ${
            isActive ? 'text-white' : 'text-slate-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </button>
      
      {showMenu && (
        <div className="absolute right-0 top-0 mt-8 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onRename();
            }}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-200 rounded-lg text-left"
          >
            重命名
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              if (window.confirm(`确定要删除笔记本"${notebook.name}"吗？这将同时删除该笔记本下的所有笔记，此操作不可恢复！`)) {
                apiClient.post('/api/notebook-delete', { id: notebook.notebook_id }).then(response => {
                  if (response.data.success) {
                    // 刷新笔记本列表
                    window.dispatchEvent(new Event('notebooks:refresh'));
                    // 如果当前正在查看被删除的笔记本，切换到其他笔记本
                    if (window.location.hash.includes(`notebook=${notebook.notebook_id}`)) {
                      window.location.hash = '#/notes';
                    }
                  } else {
                    alert('删除失败：' + (response.data.error || response.data.message || '未知错误'));
                  }
                }).catch(err => {
                  // console.error('删除失败:', err);
                  alert('删除失败，请重试');
                });
              }
            }}
            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left"
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
};

function NoteCategory({ onAIClick }: { onAIClick?: () => void }) {
  const [notebooks, setNotebooks] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    async function loadNotebooks() {
      setLoading(true)
      try {
        console.log('🔄 NoteCategory: 正在获取笔记本数据...')
        const res = await apiClient.get('/api/notebooks')
        console.log('📚 NoteCategory: API响应:', res)
        console.log('📚 NoteCategory: 笔记本数据:', res.data.notebooks)
        setNotebooks(res.data.notebooks || [])
        console.log('✅ NoteCategory: 设置笔记本数据成功，数量:', res.data.notebooks?.length || 0)
      } catch (e) {
        console.error('❌ NoteCategory: 获取笔记本失败:', e)
        setNotebooks([])
      } finally {
        setLoading(false)
      }
    }
    loadNotebooks()
  }, [])

  const handleNotebookClick = (notebookId: string) => {
    // 跳转到该笔记本的笔记列表
    console.log('🔄 点击笔记本:', notebookId)
    window.location.href = `/notes/${notebookId}`
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3 flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-blue-600 whitespace-nowrap truncate">创建</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onAIClick} className="rounded-xl bg-purple-600 px-3 py-2 text-xs text-white whitespace-nowrap hover:bg-purple-700 transition-colors">AI总结和建议</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : notebooks.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📂</div>
              <div>暂无笔记本</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notebooks.map((notebook) => (
              <div
                key={notebook.notebook_id}
                onClick={() => handleNotebookClick(notebook.notebook_id)}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {notebook.name || '未命名笔记本'}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {notebook.note_count || 0} 篇
                  </span>
                </div>
                {notebook.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {notebook.description}
                  </p>
                )}
                <div className="text-xs text-gray-400">
                  创建于 {new Date(notebook.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InspirationNotes({ onAIClick }: { onAIClick?: () => void }) {
  const [inspirationData, setInspirationData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const getDefaultDateRange = () => {
    // 使用中国时区 (UTC+8)
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // 转换为中国时区
    const todayStr = chinaTime.getFullYear() + '-' + String(chinaTime.getMonth() + 1).padStart(2, '0') + '-' + String(chinaTime.getDate()).padStart(2, '0');
    const today = new Date(todayStr);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 从7天前开始
    return { 
      from: sevenDaysAgo.toISOString().slice(0, 10), 
      to: todayStr // 使用中国时区的今天
    }
  }
  const [dateRange, setDateRange] = React.useState(getDefaultDateRange())

  const generateCompleteInspirationWeekData = (realData: any[], dateRange: {from: string, to: string}): any[] => {
    // 只返回有实际数据的记录，不生成空数据
    return realData.filter(item => 
      item.inspiration_description && 
      item.inspiration_description.trim() !== '' && 
      item.inspiration_description !== '没想法' &&
      item.inspiration_theme && 
      item.inspiration_theme.trim() !== '' &&
      item.inspiration_theme !== '无'
    )
  }

  React.useEffect(() => {
    async function loadInspirationData() {
      setLoading(true)
      try {
        const params: Record<string, string> = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await apiClient.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []
        const inspirationRows = rows.filter((r: any) => r.inspiration_description && String(r.inspiration_description).trim() !== '' && r.inspiration_description !== '没想法')
        const completeWeekData = generateCompleteInspirationWeekData(inspirationRows, dateRange)
        // console.log('灵感数据加载结果:', {
        //   totalRows: rows.length,
        //   inspirationRows: inspirationRows.length,
        //   completeWeekData: completeWeekData.length,
        //   dateRange
        // })
        setInspirationData(completeWeekData)
      } catch (e) {
        setInspirationData([])
      } finally {
        setLoading(false)
      }
    }
    loadInspirationData()
  }, [dateRange])

  const [inspirationAnalysis, setInspirationAnalysis] = React.useState({
    totalCount: 0,
    mostCategory: '未分类',
    activeTime: '创意时间',
    sources: { xiaohongshu: 0, shipinhao: 0, others: 100 },
    suggestions: '开始记录你的创意灵感吧！',
    highValueCount: 0,
    difficultyCount: {} as Record<string, number>
  })

  const analyzeInspirationData = React.useCallback(() => {
    const totalCount = inspirationData.length
    const categoryCount: Record<string, number> = {}
    inspirationData.forEach((item: any) => { const theme = item.inspiration_theme || '未分类'; categoryCount[theme] = (categoryCount[theme] || 0) + 1 })
    const mostCategory = Object.entries(categoryCount).sort(([,a],[,b]) => (b as number) - (a as number))[0]?.[0] || '未分类'
    const difficultyCount: Record<string, number> = {}
    inspirationData.forEach((item: any) => { const difficulty = item.inspiration_difficulty || '中'; difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1 })
    const highValueCount = inspirationData.filter((item: any) => item.inspiration_difficulty === '高' || (item.inspiration_theme && ['AI工具开发','金融科技'].includes(item.inspiration_theme))).length
    let suggestions = '继续保持灵感记录的好习惯'
    if (totalCount === 0) suggestions = '开始记录你的创意灵感吧！'
    else if (highValueCount > totalCount * 0.3) suggestions = '高价值项目较多，建议优先实现可行性高的项目'
    else if (mostCategory === 'AI工具开发') suggestions = 'AI相关灵感丰富，建议深入发展该领域'
    else if (totalCount > 5) suggestions = '灵感数量丰富，建议分类整理并制定实现计划'
    setInspirationAnalysis({ totalCount, mostCategory, activeTime: '创意时间', sources: { xiaohongshu: 0, shipinhao: 0, others: 100 }, suggestions, highValueCount, difficultyCount })
  }, [inspirationData])

  React.useEffect(() => { analyzeInspirationData() }, [analyzeInspirationData])

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })

  return (
    <Card>
      <SectionHeader title="捕捉灵感" onAIClick={onAIClick} onDateChange={handleDateChange} defaultFromDate={dateRange.from} defaultToDate={dateRange.to} hideTitle={true} />
      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-500"><div className="text-center"><div className="text-2xl mb-2">⏳</div><div>加载灵感数据中...</div></div></div>
      ) : inspirationData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📝</div>
            <div>暂无灵感数据</div>
            <div className="text-sm mt-2">请先添加一些灵感记录</div>
          </div>
        </div>
      ) : (
        <TimelineBubbleChart data={inspirationData} height={550} from={dateRange.from} to={dateRange.to} />
      )}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg">
              <span className="text-base">🤖</span>
              <h3 className="text-base font-semibold">AI解读</h3>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-center gap-3"><span className="text-sm">💡</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">灵感总数：{inspirationAnalysis.totalCount}个</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">🎯</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">高价值项目：{inspirationAnalysis.highValueCount}个 {inspirationAnalysis.totalCount > 0 && `(${Math.round(inspirationAnalysis.highValueCount / inspirationAnalysis.totalCount * 100)}%)`}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">📊</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">难度分布：{Object.entries(inspirationAnalysis.difficultyCount).map(([difficulty, count]) => ` ${difficulty}(${count})`).join(' ')}</div></div></div>
            <div className="flex items-center gap-3"><span className="text-sm">🚀</span><div><div className="text-xs font-medium text-slate-700 tracking-wide">AI建议：{inspirationAnalysis.suggestions}</div></div></div>
          </div>
        </div>
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center flex-1 flex flex-col justify-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">🎯</span></div><div className="text-xs text-slate-500 mb-1">热门主题</div><div className="text-lg font-bold text-purple-600">{inspirationAnalysis.mostCategory}</div></div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center flex-1 flex flex-col justify-center"><div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">💎</span></div><div className="text-xs text-slate-500 mb-1">高价值占比</div><div className="text-sm font-bold text-purple-600">{inspirationAnalysis.totalCount > 0 ? `${Math.round(inspirationAnalysis.highValueCount / inspirationAnalysis.totalCount * 100)}%` : '0%'}</div></div>
        </div>
      </div>
    </Card>
  )
}

// Main Analytics Component
function AnalyticsTabsPage() {
  const { notebookId } = useParams<{ notebookId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  
  const [active, setActive] = useState<TabId>('emotion');
  const [catOpen, setCatOpen] = useState(true);
  const [dataOpen, setDataOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [dataActive, setDataActive] = useState<DataSubTab>('raw');
  const [view, setView] = useState<ViewType>(notebookId ? 'notes' : 'category');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [newNotebookModalOpen, setNewNotebookModalOpen] = useState(false);
  
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(
    notebookId || null
  );

  const fetchNotebooks = useCallback(async () => {
    try {
      console.log('🔄 Fetching notebooks...');
      console.log('🔄 API_BASE_URL:', process.env.REACT_APP_API_URL || 'http://localhost:3001');
      
      // 使用代理路径
      const response = await fetch('/api/notebooks');
      console.log('📚 Raw response:', response);
      console.log('📚 Response status:', response.status);
      console.log('📚 Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📚 Parsed data:', data);
      
      if (data.success) {
        setNotebooks(data.notebooks);
        console.log('✅ Notebooks set:', data.notebooks);
        console.log('✅ Notebooks count:', data.notebooks.length);
        console.log('✅ Current notebooks state will be updated to:', data.notebooks);
      } else {
        console.error('❌ API response not successful:', data);
      }
    } catch (error) {
      console.error('❌ Failed to fetch notebooks:', error);
      console.error('❌ Error message:', (error as any).message);
    }
  }, []);

  // Handle URL path changes to set appropriate view
  useEffect(() => {
    const path = location.pathname;
    // console.log('🔍 URL path changed:', path);
    
    if (path === '/RawDataPage') {
      setView('data');
      setDataActive('raw');
      setDataOpen(true);
    } else if (path === '/AIDataPage') {
      setView('data');
      setDataActive('ai');
      setDataOpen(true);
    } else if (path === '/create') {
      setView('category');
      setDataActive('raw');
      setCreateOpen(true);
    } else if (path === '/EmotionTrend') {
      setView('category');
      setActive('emotion');
      setCatOpen(true);
    } else if (path === '/FitnessData') {
      setView('category');
      setActive('life');
      setCatOpen(true);
    } else if (path === '/StudyTimeDist') {
      setView('category');
      setActive('study');
      setCatOpen(true);
    } else if (path === '/WorkCompletion') {
      setView('category');
      setActive('work');
      setCatOpen(true);
    } else if (path === '/InspirationNotes') {
      setView('category');
      setActive('inspiration');
      setCatOpen(true);
    } else if (path === '/CreateNote') {
      setView('category');
      setActive('creatnote');
      setCreateOpen(true);
    } else if (path.startsWith('/notes/') && notebookId) {
      setView('notes');
      setActiveNotebookId(notebookId);
    } else if (path === '/notes') {
      setView('notes');
    } else if (path === '/') {
      setView('category');
    }
  }, [location.pathname, notebookId]);

  useEffect(() => {
    fetchNotebooks();

    const openHandler = () => setNewNotebookModalOpen(true);
    window.addEventListener('open:new-notebook', openHandler);
    const createdHandler = (e: any) => {
      fetchNotebooks().then(() => {
        const id = e?.detail?.id;
        if (id) {
          setView('notes');
          setActiveNotebookId(id);
          navigate(`/notes/${id}`);
          console.log('🔄 新建笔记本后跳转到:', id);
        }
      });
    };
    const refreshHandler = () => {
      fetchNotebooks();
    };
    window.addEventListener('notebook:created', createdHandler);
    window.addEventListener('notebooks:refresh', refreshHandler);
    return () => {
      window.removeEventListener('open:new-notebook', openHandler);
      window.removeEventListener('notebook:created', createdHandler);
      window.removeEventListener('notebooks:refresh', refreshHandler);
    };
  }, [fetchNotebooks]);

  // 处理自动选择第一个笔记本的逻辑
  useEffect(() => {
    if (view === 'notes' && !activeNotebookId && notebooks.length > 0) {
      const firstNotebook = notebooks[0];
      setActiveNotebookId(firstNotebook.notebook_id);
      navigate(`/notes/${firstNotebook.notebook_id}`);
      console.log('🔄 Auto-selecting first notebook:', firstNotebook.notebook_id);
    }
  }, [view, activeNotebookId, notebooks, navigate]);

  // Update activeNotebookId when route changes
  useEffect(() => {
    console.log('🔍 Route change detected, notebookId:', notebookId);
    if (notebookId) {
      console.log('📝 Setting activeNotebookId to:', notebookId);
      setActiveNotebookId(notebookId);
      setView('notes');
    }
  }, [notebookId]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔍 State changed - view:', view, 'activeNotebookId:', activeNotebookId);
  }, [view, activeNotebookId]);

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
        {/* Create Section */}
        <button
          onClick={() => setCreateOpen(v => !v)}
          className="w-full flex items-center justify-between rounded-xl px-2 py-1.5 text-xs bg-slate-50 hover:bg-purple-50 hover:border-purple-200"
        >
          <span className="flex items-center gap-2">
            <span>{createOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700 text-xs">创建</span>
          </span>
          <span className="text-slate-400">{createOpen ? '▾' : '▸'}</span>
        </button>
        {createOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            <button
              onClick={() => {
                setView('category');
                setActive('creatnote');
                navigate('/CreateNote');
              }}
              className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs min-w-0 ${
                active === 'creatnote' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-purple-50 hover:border-purple-200'
              }`}
            >
              <span>📝</span>
              <span className="font-medium text-xs">创建笔记本</span>
            </button>
          </nav>
        )}

        <div className="my-3" />

        {/* Categories Section */}
        <button
          onClick={() => setCatOpen(v => !v)}
          className="w-full flex items-center justify-between rounded-xl px-2 py-1.5 text-xs bg-slate-50 hover:bg-purple-50 hover:border-purple-200"
        >
          <span className="flex items-center gap-2">
            <span>{catOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700 text-xs">我的日常总结</span>
          </span>
          <span className="text-slate-400">{catOpen ? '▾' : '▸'}</span>
        </button>
        {catOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            {TABS.map(t => {
              const getRoutePath = (tabId: TabId) => {
                switch (tabId) {
                  case 'emotion': return '/EmotionTrend';
                  case 'life': return '/FitnessData';
                  case 'study': return '/StudyTimeDist';
                  case 'work': return '/WorkCompletion';
                  case 'inspiration': return '/InspirationNotes';
                  default: return '/';
                }
              };
              
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActive(t.id);
                    setView('category');
                    navigate(getRoutePath(t.id));
                  }}
                  className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs min-w-0 ${
                    view === 'category' && active === t.id ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-purple-50 hover:border-purple-200'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        <div className="my-3" />

        {/* Notes Section - NEW */}
        <button
          onClick={() => {
            setNotesOpen(v => !v);
            // 如果点击展开"我的笔记"，切换到笔记视图
            if (!notesOpen) {
              setView('notes');
              // 如果没有选择笔记本，自动选择第一个笔记本
              if (activeNotebookId) {
                navigate(`/notes/${activeNotebookId}`);
              } else if (notebooks.length > 0) {
                const firstNotebook = notebooks[0];
                setActiveNotebookId(firstNotebook.notebook_id);
                navigate(`/notes/${firstNotebook.notebook_id}`);
              } else {
                navigate('/notes');
              }
            }
          }}
          className="w-full flex items-center justify-between rounded-xl px-2 py-1.5 text-xs bg-slate-50 hover:bg-purple-50 hover:border-purple-200"
        >
          <span className="flex items-center gap-2">
            <span>{notesOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700 text-xs">上传外部笔记</span>
          </span>
          <span className="text-slate-400">{notesOpen ? '▾' : '▸'}</span>
        </button>
        {notesOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            {notebooks.length === 0 ? (
              <div className="text-sm text-gray-500 px-3 py-2">
                暂无笔记本 (调试: notebooks.length = {notebooks.length}, notesOpen = {notesOpen.toString()})
                <br />
                <small>API URL: {process.env.REACT_APP_API_URL || 'http://localhost:3001'}</small>
              </div>
            ) : (
              notebooks.map(notebook => (
                <NotebookItem 
                  key={notebook.notebook_id}
                  notebook={notebook}
                  isActive={view === 'notes' && activeNotebookId === notebook.notebook_id}
                  onClick={() => { 
                    setView('notes'); 
                    setActiveNotebookId(notebook.notebook_id);
                    navigate(`/notes/${notebook.notebook_id}`);
                  }}
                  onRename={() => {
                    const newName = prompt('请输入新的笔记本名称:', notebook.name);
                    if (newName && newName.trim() && newName !== notebook.name) {
                      apiClient.post('/api/notebook-rename', { id: notebook.notebook_id, name: newName.trim() }).then(() => {
                        // 刷新笔记本列表
                        window.dispatchEvent(new Event('notebooks:refresh'));
                      }).catch(err => {
                        console.error('重命名失败:', err);
                        alert('重命名失败，请重试');
                      });
                    }
                  }}
                />
              ))
            )}
          </nav>
        )}

        <div className="my-3" />

        {/* Data Section */}
        <button
          onClick={() => setDataOpen(v => !v)}
          className="w-full flex items-center justify-between rounded-xl px-2 py-1.5 text-xs bg-slate-50 hover:bg-slate-100"
        >
          <span className="flex items-center gap-2">
            <span>{dataOpen ? '📂' : '📁'}</span>
            <span className="font-medium text-slate-700 text-xs">日常数据</span>
          </span>
          <span className="text-slate-400">{dataOpen ? '▾' : '▸'}</span>
        </button>
        {dataOpen && (
          <nav className="mt-2 space-y-1 pl-6">
            <button
              onClick={() => {
                setView('data');
                setDataActive('ai');
                navigate('/AIDataPage');
              }}
              className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs min-w-0 ${
                view === 'data' && dataActive === 'ai' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="whitespace-nowrap">🤖  AI分析数据</span>
            </button>
            <button
              onClick={() => {
                setView('data');
                setDataActive('raw');
                navigate('/RawDataPage');
              }}
              className={`w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs min-w-0 ${
                view === 'data' && dataActive === 'raw' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="whitespace-nowrap">📒  每日数据记录</span>
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
            {active === 'creatnote' && <NoteCategory onAIClick={handleAIClick} />}
          </>
        )}
        {view === 'notes' && activeNotebookId && (
          <NotesPage notebookId={activeNotebookId} />
        )}
        {view === 'notes' && !activeNotebookId && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-4">📝</div>
              <h2 className="text-xl font-semibold mb-2">选择笔记本</h2>
              <p className="text-gray-600 mb-4">请从左侧选择一个笔记本来查看笔记</p>
              {notebooks.length > 0 ? (
                <div className="space-y-2">
                  {notebooks.map(notebook => (
                    <button
                      key={notebook.notebook_id}
                      onClick={() => {
                        setActiveNotebookId(notebook.notebook_id);
                        navigate(`/notes/${notebook.notebook_id}`);
                      }}
                      className="block w-full px-4 py-2 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{notebook.name}</div>
                      <div className="text-sm text-gray-500">{notebook.note_count} 篇笔记</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暂无笔记本，请先创建笔记本</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Modals */}
      <AIModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)}
        context={getContextForAI()}
      />
      <NewNotebookModal isOpen={newNotebookModalOpen} onClose={() => setNewNotebookModalOpen(false)} />
    </div>
  );
}

// Main App Component with Routing
export default function App() {
  return (
    <NoteProvider>
      <ComponentTemplateProvider>
        <Routes>
        <Route path="/" element={<AnalyticsTabsPage />} />
        <Route path="/notes" element={<AnalyticsTabsPage />} />
        <Route path="/notes/:notebookId" element={<AnalyticsTabsPage />} />
        <Route path="/note/:noteId" element={<NoteDetailPage />} />
        <Route path="/RawDataPage" element={<AnalyticsTabsPage />} />
        <Route path="/AIDataPage" element={<AnalyticsTabsPage />} />
        <Route path="/EmotionTrend" element={<AnalyticsTabsPage />} />
        <Route path="/FitnessData" element={<AnalyticsTabsPage />} />
        <Route path="/StudyTimeDist" element={<AnalyticsTabsPage />} />
        <Route path="/WorkCompletion" element={<AnalyticsTabsPage />} />
        <Route path="/InspirationNotes" element={<AnalyticsTabsPage />} />
        <Route path="/NoteCategory" element={<AnalyticsTabsPage />} />
        <Route path="/CreateNote" element={<CreateNote />} />
        </Routes>
      </ComponentTemplateProvider>
    </NoteProvider>
  );
}