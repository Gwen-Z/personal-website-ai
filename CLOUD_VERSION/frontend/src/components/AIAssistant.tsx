import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format, addDays, differenceInCalendarDays, min as dmin, max as dmax, parseISO } from 'date-fns'

type TabId = 'radar' | 'emotion' | 'life' | 'study' | 'work' | 'inspiration'

type SimpleRecordItem = {
  id: number
  date: string
  mood_description?: string
  life_description?: string
  study_description?: string
  work_description?: string
  inspiration_description?: string
  mood_emoji?: string
  mood_event?: string
  fitness_intensity?: string
  fitness_duration?: string
  fitness_calories?: string
  fitness_type?: string
  study_duration?: string
  study_category?: string
  work_summary?: string
  inspiration_theme?: string
  inspiration_product?: string
  created_at?: string
}

type ComponentProps = {
  data: SimpleRecordItem[]
  from: string
  to: string
  setFrom: (value: string) => void
  setTo: (value: string) => void
  onQuery: () => void
  aiSummary?: any
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'radar', label: '综合能力雷达图', icon: '📈' },
  { id: 'emotion', label: '情绪波动趋势分析', icon: '💜' },
  { id: 'life', label: '生活时间轴分析', icon: '📅' },
  { id: 'study', label: '学习时间分布', icon: '🎓' },
  { id: 'work', label: '工作完成度分析', icon: '🧩' },
  { id: 'inspiration', label: '灵感记录', icon: '💡' },
]

function SectionHeader({
  title,
  from,
  to,
  onSetFrom,
  onSetTo,
  onQuickSelect,
  onQuery
}: {
  title: string
  from: string
  to: string
  onSetFrom: (value: string) => void
  onSetTo: (value: string) => void
  onQuickSelect: (days: number) => void
  onQuery: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">时间区间</span>
          <input 
            type="date" 
            className="h-8 w-[120px] rounded-md border border-slate-300 px-2 text-sm focus:border-indigo-500 focus:outline-none" 
            value={from}
            onChange={e => onSetFrom(e.target.value)}
            min="2025-06-01"
            max="2099-12-31"
          />
          <span className="text-slate-500">至</span>
          <input 
            type="date" 
            className="h-8 w-[120px] rounded-md border border-slate-300 px-2 text-sm focus:border-indigo-500 focus:outline-none" 
            value={to}
            onChange={e => onSetTo(e.target.value)}
            min={from || "2025-06-01"}
            max="2099-12-31"
          />
          {/* 快捷区间 */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {[7, 30, 90, 180, 365].map(d => (
              <button key={d} className="h-7 px-2 rounded border text-xs text-slate-600 hover:bg-slate-50" onClick={()=>onQuickSelect(d)}>近{d}天</button>
            ))}
          </div>
          <button 
            className="h-8 rounded-md bg-slate-600 text-white px-3 text-sm hover:bg-slate-700 transition-colors"
            onClick={onQuery}
          >
            查询
          </button>
        </div>
        <button className="h-8 rounded-md bg-indigo-600 px-3 text-sm text-white hover:bg-indigo-700 transition-colors">AI总结和建议</button>
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
  )
}

/* 下面6个面板按截图布局占位，先静态，后续你把现有图表/数据替换进来即可 */
function RadarOverview({ data, from, to, setFrom, setTo, onQuery }: ComponentProps) {
  // 计算各维度得分
  const moodScore = Math.round((data.filter(d => d.mood_description).length / Math.max(data.length, 1)) * 100)
  const lifeScore = Math.round((data.filter(d => d.life_description).length / Math.max(data.length, 1)) * 100)
  const studyScore = Math.round((data.filter(d => d.study_description).length / Math.max(data.length, 1)) * 100)
  const workScore = Math.round((data.filter(d => d.work_description).length / Math.max(data.length, 1)) * 100)
  const inspirationScore = Math.round((data.filter(d => d.inspiration_description).length / Math.max(data.length, 1)) * 100)

  return (
    <Card>
      <SectionHeader title="综合能力雷达图" from={from} to={to} onSetFrom={setFrom} onSetTo={setTo} onQuickSelect={()=>{}} onQuery={onQuery} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg font-semibold text-slate-700">综合数据概览</div>
            <div className="text-sm text-slate-500 mt-2">基于 {data.length} 条记录分析</div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: '心情', score: moodScore, color: 'text-pink-600' },
            { label: '生活', score: lifeScore, color: 'text-green-600' },
            { label: '学习', score: studyScore, color: 'text-blue-600' },
            { label: '工作', score: workScore, color: 'text-purple-600' },
            { label: '创意', score: inspirationScore, color: 'text-orange-600' }
          ].map((item, i) => (
            <div key={item.label} className="rounded-lg bg-white border p-3 text-center">
              <div className={`text-2xl font-bold ${item.color}`}>{item.score}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 text-sm text-slate-500">
        数据范围: {data.length} 条记录 {from && to && `(${from} 至 ${to})`}
      </div>
    </Card>
  )
}

function EmotionTrend({ data, from, to, setFrom, setTo, onQuery }: ComponentProps) {
  // 筛选情绪相关数据
  const moodData = data.filter(item => item.mood_description)
  
  return (
    <Card>
      <SectionHeader title="情绪波动趋势分析" from={from} to={to} onSetFrom={setFrom} onSetTo={setTo} onQuickSelect={()=>{}} onQuery={onQuery} />
      
      <div className="h-72 rounded-lg bg-slate-50 p-4">
        <div className="text-slate-600 mb-4">情绪记录 ({moodData.length} 条)</div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {moodData.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-white rounded-lg">
              <span className="text-lg">{item.mood_emoji || '😊'}</span>
              <div className="flex-1">
                <div className="text-sm text-slate-700">{item.mood_description}</div>
                <div className="text-xs text-slate-500">{item.date}</div>
              </div>
              {item.mood_event && (
                <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                  {item.mood_event}
                </div>
              )}
            </div>
          ))}
          {moodData.length === 0 && (
            <div className="text-center text-slate-400 py-8">暂无情绪数据</div>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" /> 情绪稳定性
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">记录总数</div>
          <div className="text-indigo-600 font-semibold">{moodData.length}</div>
        </div>
      </div>
    </Card>
  )
}

function LifeTimeline({ data, from, to, setFrom, setTo, onQuery }: ComponentProps) {
  // 筛选生活相关数据
  const lifeData = data.filter(item => item.life_description)
  
  return (
    <Card>
      <SectionHeader title="生活时间轴分析" from={from} to={to} onSetFrom={setFrom} onSetTo={setTo} onQuickSelect={()=>{}} onQuery={onQuery} />
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {lifeData.map((item) => (
          <div key={item.id} className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-800 font-medium">{item.date}</div>
              <div className="flex gap-2 text-xs">
                {item.fitness_type && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{item.fitness_type}</span>
                )}
                {item.fitness_duration && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">{item.fitness_duration}</span>
                )}
              </div>
            </div>
            <div className="text-slate-600">{item.life_description}</div>
            {item.fitness_intensity && (
              <div className="text-xs text-slate-500 mt-1">强度: {item.fitness_intensity}</div>
            )}
          </div>
        ))}
        {lifeData.length === 0 && (
          <div className="text-center text-slate-400 py-8">暂无生活记录</div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-slate-500">记录总数</div>
          <div className="text-xl font-bold text-slate-900">{lifeData.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">健身次数</div>
          <div className="text-xl font-bold text-slate-900">
            {lifeData.filter(item => item.fitness_type).length}
          </div>
        </div>
      </div>
    </Card>
  )
}

function StudyTimeDist({ data, from, to, setFrom, setTo, onQuery }: ComponentProps) {
  // 筛选学习相关数据
  const studyData = data.filter(item => item.study_description)
  
  return (
    <Card>
      <SectionHeader title="学习时间分布" from={from} to={to} onSetFrom={setFrom} onSetTo={setTo} onQuickSelect={()=>{}} onQuery={onQuery} />
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {studyData.map((item) => (
          <div key={item.id} className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-800 font-medium">{item.date}</div>
              <div className="flex gap-2 text-xs">
                {item.study_duration && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">{item.study_duration}</span>
                )}
                {item.study_category && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">{item.study_category}</span>
                )}
              </div>
            </div>
            <div className="text-slate-600">{item.study_description}</div>
          </div>
        ))}
        {studyData.length === 0 && (
          <div className="text-center text-slate-400 py-8">暂无学习记录</div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-slate-500">学习记录</div>
          <div className="text-indigo-600 font-bold">{studyData.length}次</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">分类统计</div>
          <div className="text-indigo-600 font-bold">
            {[...new Set(studyData.map(item => item.study_category).filter(Boolean))].length}种
          </div>
        </div>
      </div>
    </Card>
  )
}

function WorkCompletion({ data, from, to, setFrom, setTo, onQuery }: ComponentProps) {
  // 筛选工作相关数据
  const workData = data.filter(item => item.work_description)
  
  return (
    <Card>
      <SectionHeader title="工作完成度分析" from={from} to={to} onSetFrom={setFrom} onSetTo={setTo} onQuickSelect={()=>{}} onQuery={onQuery} />
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {workData.map((item) => (
          <div key={item.id} className="rounded-xl border bg-slate-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-800 font-medium">{item.date}</div>
              {item.work_summary && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">有AI总结</span>
              )}
            </div>
            <div className="text-slate-600 mb-2">{item.work_description}</div>
            {item.work_summary && (
              <div className="text-sm text-slate-500 bg-slate-100 p-2 rounded">
                💡 {item.work_summary}
              </div>
            )}
          </div>
        ))}
        {workData.length === 0 && (
          <div className="text-center text-slate-400 py-8">暂无工作记录</div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs text-slate-500">工作记录</div>
          <div className="text-indigo-600 font-semibold">{workData.length}项</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">AI分析</div>
          <div className="text-indigo-600 font-extrabold text-2xl">
            {workData.filter(item => item.work_summary).length}
          </div>
        </div>
      </div>
    </Card>
  )
}

function InspirationNotes({ data, from, to, setFrom, setTo, onQuery }: ComponentProps) {
  // 筛选灵感相关数据
  const inspirationData = data.filter(item => item.inspiration_description)
  
  return (
    <Card>
      <SectionHeader title="灵感记录" from={from} to={to} onSetFrom={setFrom} onSetTo={setTo} onQuickSelect={()=>{}} onQuery={onQuery} />
      
      <div className="rounded-xl border">
        <div className="grid grid-cols-[160px_1fr_160px] px-4 py-3 text-sm font-medium text-slate-600 border-b bg-slate-50">
          <div>主题</div><div>内容</div><div>创建时间</div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {inspirationData.map((item) => (
            <div key={item.id} className="grid grid-cols-[160px_1fr_160px] px-4 py-3 text-sm text-slate-800 border-b last:border-0">
              <div className="flex flex-col">
                <span className="font-medium">{item.inspiration_theme || '—'}</span>
                {item.inspiration_product && (
                  <span className="text-xs text-indigo-600 mt-1">{item.inspiration_product}</span>
                )}
              </div>
              <div className="truncate">{item.inspiration_description}</div>
              <div className="text-slate-500">{item.date}</div>
            </div>
          ))}
          {inspirationData.length === 0 && (
            <div className="text-center text-slate-400 py-8">暂无灵感记录</div>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between text-sm">
        <div>灵感记录：<span className="text-indigo-600">{inspirationData.length}条</span></div>
        <div>有主题提炼：<span className="text-indigo-600">
          {inspirationData.filter(item => item.inspiration_theme).length}条
        </span></div>
      </div>
    </Card>
  )
}

export default function AnalyticsTabs() {
  const [active, setActive] = useState<TabId>('radar')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<SimpleRecordItem[]>([])
  const [loading, setLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<any>(null)

  // 约束并设置日期区间：至少7天，至多365天
  function clampAndSet(startStr: string, endStr: string) {
    if (!startStr && !endStr) return;
    const MIN = new Date('2025-06-01')
    const MAX = new Date('2099-12-31')
    let s = startStr ? parseISO(startStr) : undefined
    let e = endStr ? parseISO(endStr) : undefined
    if (!s && e) s = addDays(e, -6)
    if (s && !e) e = addDays(s, 6)
    if (!s || !e) return;
    // clamp to bounds
    s = dmax([s, MIN]); e = dmin([e, MAX]);
    // at least 7 days
    if (differenceInCalendarDays(e, s) < 6) e = addDays(s, 6)
    // at most 365 days
    if (differenceInCalendarDays(e, s) > 364) e = addDays(s, 364)
    setFrom(format(s, 'yyyy-MM-dd'))
    setTo(format(e, 'yyyy-MM-dd'))
  }

  function handleSetFrom(v: string) {
    clampAndSet(v, to)
  }
  function handleSetTo(v: string) {
    clampAndSet(from, v)
  }
  function handleQuickSelect(days: number) {
    const end = new Date()
    const start = addDays(end, - (days - 1))
    clampAndSet(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'))
    // 自动查询
    setTimeout(() => loadData(), 0)
  }

  // 加载数据的函数
  async function loadData() {
    try {
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to
      const response = await axios.get('/api/simple-records', { params })
      // 处理Turso API返回的数据格式 {records, stats, source}
      const records = response.data.records || response.data || []
      setData(Array.isArray(records) ? records : [])
      console.log(`✅ 从Turso加载了 ${records.length} 条数据用于图表显示`, response.data.source)

      // AI 解读（优先使用 from/to）
      try {
        const ai = await axios.get('/api/ai-analysis', { params })
        setAiSummary(ai.data)
      } catch (aiError) {
        console.log('AI分析服务暂不可用:', aiError)
        setAiSummary(null)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      setData([])
      setAiSummary(null)
    }
  }

  // 初始加载数据
  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6">
      {/* 左侧纵向 Tab 栏 */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-sm font-medium text-slate-500 px-2 mb-2">数据总览</div>
        <nav className="space-y-1">
          {TABS.map(t=>(
            <button
              key={t.id}
              onClick={()=>setActive(t.id)}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm
                ${active===t.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 右侧内容区：每个Tab占满一页 */}
      <section className="space-y-6">
        {active==='radar' && <RadarOverview data={data} from={from} to={to} setFrom={setFrom} setTo={setTo} onQuery={loadData} />}
        {active==='emotion' && <EmotionTrend data={data} from={from} to={to} setFrom={handleSetFrom} setTo={handleSetTo} onQuery={loadData} />}
        {active==='life' && <LifeTimeline data={data} from={from} to={to} setFrom={handleSetFrom} setTo={handleSetTo} onQuery={loadData} />}
        {active==='study' && <StudyTimeDist data={data} from={from} to={to} setFrom={handleSetFrom} setTo={handleSetTo} onQuery={loadData} />}
        {active==='work' && <WorkCompletion data={data} from={from} to={to} setFrom={handleSetFrom} setTo={handleSetTo} onQuery={loadData} />}
        {active==='inspiration' && <InspirationNotes data={data} from={from} to={to} setFrom={handleSetFrom} setTo={handleSetTo} onQuery={loadData} />}
      </section>
    </div>
  )
}