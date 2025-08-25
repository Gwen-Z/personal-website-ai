import React, { useState } from 'react'

import axios from 'axios'
// 通过 package.json 的 proxy 使用相对路径调用后端，无需显式 BASE_URL
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList, Brush, Cell } from 'recharts'
import RawDataPage from './components/RawDataPage.tsx'
import AIDataPage from './components/AIDataPage.tsx'
import AIModal from './components/AIModal.tsx'
import TimelineBubbleChart from './components/TimelineBubbleChart.tsx'

type TabId = 'emotion' | 'life' | 'study' | 'work' | 'inspiration'
type DataSubTab = 'raw' | 'ai'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'emotion',     label: '情绪趋势', icon: '💜' },
  { id: 'life',        label: '健身打卡', icon: '💪' },
  { id: 'study',       label: '学习跟进', icon: '🎓' },
  { id: 'work',        label: '工作upup', icon: '🧩' },
  { id: 'inspiration', label: '捕捉灵感', icon: '💡' },
]





function SectionHeader({ title, onAIClick, onDateChange, onQuery }: { 
  title: string; 
  onAIClick?: () => void;
  onDateChange?: (from: string, to: string) => void;
  onQuery?: (from: string, to: string) => void;
}) {
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')

  const handleQueryClick = () => {
    if (!fromDate && !toDate) return;
    // 至少7天
    const from = fromDate ? new Date(fromDate) : (toDate ? new Date(new Date(toDate).getTime() - 6*24*3600*1000) : new Date())
    const to = toDate ? new Date(toDate) : new Date(from.getTime() + 6*24*3600*1000)
    const msInDay = 24*3600*1000
    let s = from, e = to
    if ((e.getTime() - s.getTime())/msInDay < 6) {
      e = new Date(s.getTime() + 6*msInDay)
    }
    if (onDateChange) onDateChange(s.toISOString().slice(0,10), e.toISOString().slice(0,10))
    if (onQuery) onQuery(s.toISOString().slice(0,10), e.toISOString().slice(0,10))
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-4 min-w-0">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 whitespace-nowrap truncate">{title}</h2>
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-slate-500">时间区间</span>
          <input 
            type="date" 
            className="h-9 rounded-xl border px-2 text-sm" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span className="text-slate-500">至</span>
          <input 
            type="date" 
            className="h-9 rounded-xl border px-2 text-sm" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <button 
            onClick={handleQueryClick}
            className="rounded-xl border px-3 py-2 text-sm whitespace-nowrap hover:bg-slate-50 transition-colors"
            title="至少支持7天，最多支持1年"
          >
            查询
          </button>
          <span className="text-xs text-slate-400 ml-1 whitespace-nowrap">（仅支持查询一周及以上的数据）</span>
        </div>
        <button 
          onClick={onAIClick}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white whitespace-nowrap hover:bg-indigo-700 transition-colors"
        >
          AI总结和建议
        </button>
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  )
}



type MoodPoint = { day: string; score: number | null; event?: string; emoji?: string }

const moodEmoji = (v: number) => (v>=5?'😄':v>=3?'🙂':v>=1?'😌':v>=0?'😐':v>=-1?'😣':'😫')

const MoodDot = (props: any) => {
  const { cx, cy, payload } = props
  
  // 如果没有分数数据，不显示点
  if (payload.score === null || payload.score === undefined) {
    return null
  }
  
  const emoji = payload.emoji || moodEmoji(payload.score)
  const title = payload.event || ''
  const padX = 8
  const w = Math.max(48, title.length * 10 + padX * 2)
  const h = 22
  const stickerY = cy + 18
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
  )
}

function EmotionTrend({ onAIClick }: { onAIClick?: () => void }) {
  const [data, setData] = React.useState<MoodPoint[]>([])
  // 默认显示最近一周数据
  const getDefaultDateRange = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 6);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }
  const [dateRange, setDateRange] = React.useState<{from: string, to: string}>(getDefaultDateRange())
  const [aiAnalysis, setAiAnalysis] = React.useState({
    timePeriod: '...',
    summary: '正在分析...',
    causes: '正在分析...',
    suggestions: '正在分析...',
    positiveRatio: 0,
    recoveryScore: 0
  })

  // 生成连续日期数据，确保等间距显示
  const generateContinuousDateData = (originalData: MoodPoint[]) => {
    // 使用当前的dateRange来生成完整的7天
    const minDate = new Date(dateRange.from)
    const maxDate = new Date(dateRange.to)
    
    // 创建数据映射
    const dataMap = new Map()
    originalData.forEach(item => {
      dataMap.set(item.day, item)
    })
    
    // 生成连续日期数据，覆盖完整的7天
    const continuousData: MoodPoint[] = []
    const currentDate = new Date(minDate)
    
    while (currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const existingData = dataMap.get(dateStr)
      
      if (existingData) {
        continuousData.push(existingData)
      } else {
        // 添加空数据点，用于保持等间距
        continuousData.push({
          day: dateStr,
          score: null,
          event: '',
          emoji: ''
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return continuousData
  }

  // 生成当前日期范围的默认测试数据
  const generateDefaultMoodData = (): MoodPoint[] => {
    const today = new Date()
    const events = ['工作顺利', '加班', '朋友聚餐', '普通一天', '运动', '学习新技能', '休息放松']
    const scores = [2.5, -1, 3.5, 1.0, 4.0, 2.0, 3.0]
    const result: MoodPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      result.push({
        day: dateStr,
        score: scores[i % scores.length],
        event: events[i % events.length]
      })
    }
    return result
  }

  // 分析心情数据并生成AI解读
  const analyzeEmotionData = (moodData: MoodPoint[]) => {
    const validScores = moodData.map(d => d.score).filter(score => score !== null) as number[];
    if (validScores.length < 2) { // Need at least 2 data points for a meaningful analysis
      setAiAnalysis({
        timePeriod: '最近7天',
        summary: '暂无足够数据进行分析',
        causes: '请先记录您的情绪',
        suggestions: '至少需要两条记录才能生成分析',
        positiveRatio: 0,
        recoveryScore: 0
      });
      return;
    }

    const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const positiveRatio = Math.round((validScores.filter(s => s > 0).length / validScores.length) * 100);
    const variance = validScores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / validScores.length;
    const volatility = Math.sqrt(variance);

    // 趋势分析
    const midPoint = Math.ceil(validScores.length / 2);
    const firstHalf = validScores.slice(0, midPoint);
    const secondHalf = validScores.slice(midPoint);
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : firstHalfAvg;
    
    let trendText = '，情绪保持平稳';
    if (secondHalfAvg > firstHalfAvg + 0.5) {
      trendText = '，整体呈上升趋势';
    } else if (secondHalfAvg < firstHalfAvg - 0.5) {
      trendText = '，但近期有所回落';
    }

    // 总结
    let summary = '';
    if (volatility > 1.8) {
      summary = '情绪波动较大' + trendText;
    } else if (volatility > 1) {
      summary = '情绪有一定波动' + trendText;
    } else {
      summary = '情绪相对稳定' + trendText;
    }

    // 归因
    const negativeEvents = moodData.filter(d => d.score !== null && d.score < 0 && d.event).map(d => d.event);
    let causes = '暂无明显负面触发因素';
    if (negativeEvents.length > 0) {
      const commonWords = ['工作', '压力', '加班', '担忧', '疲惫', '会议'];
      const foundCauses = commonWords.filter(word => 
        negativeEvents.some(event => event?.includes(word))
      );
      if (foundCauses.length > 0) {
        causes = `“${foundCauses.join('”、“')}”可能是主要的情绪影响因素`;
      }
    }

    // 建议
    let suggestions = '继续保持，一切顺利！';
    if (secondHalfAvg < firstHalfAvg - 0.5) {
      suggestions = '近期情绪有所下滑，建议关注休息，安排一些放松的活动。';
    } else if (volatility > 1.8) {
      suggestions = '情绪波动较大，尝试通过运动或冥想来稳定心绪。';
    } else if (avgScore < 0) {
      suggestions = '整体情绪偏低，可以主动与朋友聊聊或进行户外活动。';
    }

    const recoveryScore = Math.max(1, Math.min(10, 5 + avgScore + (positiveRatio / 20)));

    setAiAnalysis({
      timePeriod: '最近7天',
      summary,
      causes,
      suggestions,
      positiveRatio,
      recoveryScore: Number(recoveryScore.toFixed(1))
    });
  }

  React.useEffect(() => {
    function parseMoodToScore(moodText: string): number {
      if (!moodText) return 0
      const s = moodText.toLowerCase()
      // 关键字匹配（中文/emoji）
      if (/(极差|非常差|崩溃|糟|难受|😭|😫|😤|低落|不适合)/.test(s)) return -3
      if (/(难过|差|烦|压力|😣|😟|烦躁|卡死|慌)/.test(s)) return -1
      if (/(一般|平静|普通|还行|😐|平稳)/.test(s)) return 0
      if (/(不错|开心|愉快|良好|🙂|😀|回升)/.test(s)) return 2
      if (/(很好|超好|兴奋|激动|优秀|😄|🎉|挺不错)/.test(s)) return 4
      return 0
    }

    async function load() {
      try {
        const params: any = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await axios.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []
        
        const pointsByDate: MoodPoint[] = rows
          .filter((r: any) => r.mood_description && r.mood_description.trim() !== '') // 只要有情绪描述的记录
          .map((r: any) => {
            const dateStr = (typeof r.date === 'string' && r.date.length >= 10)
              ? r.date.slice(0, 10)
              : new Date(r.date).toISOString().slice(0, 10)
            // 使用AI分析的分值；当分值为 undefined/NaN 时回退到文本解析
            const rawScore = (r as any).mood_score
            const score = (typeof rawScore === 'number' && !Number.isNaN(rawScore))
              ? rawScore
              : parseMoodToScore(r.mood_description || '')
            const note = (r.mood_description || '')
            return {
              day: dateStr,
              score,
              event: note.length > 15 ? note.substring(0, 15) + '…' : note,
              emoji: r.mood_emoji
            }
          })
          .sort((a: any, b: any) => String(a.day).localeCompare(String(b.day)))

        // 无论是否有数据，都生成完整的7天日期序列
        const processedData = generateContinuousDateData(pointsByDate.length > 0 ? pointsByDate : [])
        // 过滤掉 score 为空或非数值的点，避免整条线不可见
        const sanitized = processedData.map(p => ({
          ...p,
          score: (typeof p.score === 'number' && !Number.isNaN(p.score)) ? p.score : null
        }))
        // 使用数值型索引作为X，确保两端各留一个等距空档：domain [0, n+1]
        const indexedData = sanitized.map((d: any, idx: number) => ({
          ...d,
          xIndex: idx + 1, // 1..n
        }))
        console.log('情绪趋势数据(indexed):', indexedData)
        setData(indexedData)
        analyzeEmotionData(pointsByDate) // 分析还是用原数据
      } catch (e) {
        console.warn('API请求失败，使用默认测试数据', e)
        const fallbackData = generateDefaultMoodData()
        setData(fallbackData)
        analyzeEmotionData(fallbackData)
      }
    }
    load()
  }, [dateRange])

  const handleDateChange = (from: string, to: string) => {
    setDateRange({ from, to })
  }

  return (
    <Card>
      <SectionHeader title="情绪趋势" onAIClick={onAIClick} onDateChange={handleDateChange} />
      
      {/* 添加数据状态显示 */}
      <div className="mb-2 text-sm text-slate-500">
        数据点数量: {data.length}
      </div>
      
      <div className="h-[260px] md:h-[320px] xl:h-[360px] rounded-xl bg-slate-50 p-4">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="xIndex" 
                type="number"
                domain={[0, (data?.length || 0) + 1]}
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                interval={0}
                axisLine={true}
                tickLine={true}
                ticks={Array.from({ length: (data?.length || 0) }, (_, i) => i + 1)}
                tickFormatter={(v:any) => {
                  const idx = Number(v) - 1
                  const item = data[idx]
                  const dateStr = item?.day || ''
                  if (dateStr.length >= 10 && dateStr.includes('-')) return dateStr.slice(5)
                  return dateStr
                }}
              />
              <YAxis tick={{ fontSize: 12 }} domain={[-3, 5]} allowDecimals={true} />
              <Tooltip formatter={(v:any)=>[v,'分值']} labelFormatter={(l:any)=>l} />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#6366F1" 
                strokeWidth={3} 
                dot={<MoodDot />} 
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            暂无情绪数据
          </div>
        )}
      </div>
      
      {/* AI 解读和指标面板 */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* AI解读面板 */}
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-slate-800">AI解读</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">💡</span>
              <div>
                <div className="text-sm font-medium text-slate-700">情绪总结：{aiAnalysis.summary}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">🔍</span>
              <div>
                <div className="text-sm font-medium text-slate-700">情绪归因：{aiAnalysis.causes}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">⚠️</span>
              <div>
                <div className="text-sm font-medium text-slate-700">建议：{aiAnalysis.suggestions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 情绪指标卡片 */}
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          {/* 积极情绪占比卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">😊</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">积极情绪占比</div>
            <div className="text-2xl font-bold text-indigo-600">{aiAnalysis.positiveRatio}%</div>
          </div>

          {/* 情绪恢复力卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">情绪恢复力</div>
            <div className="text-2xl font-bold text-indigo-600">{aiAnalysis.recoveryScore}分</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* 3. 生活时间轴分析（改为条形图） */
function LifeTimeline({ onAIClick }: { onAIClick?: () => void }) {
  type LifeBar = { date: string; calories: number; duration: number; durationLabel: string; desc: string; type?: string }
  const [bars, setBars] = React.useState<LifeBar[]>([])
  // 默认显示最近一周数据
  const getDefaultDateRange = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 6);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }
  const [dateRange, setDateRange] = React.useState<{from: string, to: string}>(getDefaultDateRange())

  // 生成完整的7天数据，包含空的占位符
  const generateCompleteWeekData = (realData: LifeBar[], dateRange: {from: string, to: string}): LifeBar[] => {
    const result: LifeBar[] = []
    const dataMap = new Map()
    
    // 将真实数据映射到日期
    realData.forEach(item => {
      dataMap.set(item.date, item)
    })
    
    // 生成完整的7天
    const currentDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const existingData = dataMap.get(dateStr)
      
      if (existingData) {
        result.push(existingData)
      } else {
        // 添加空数据占位符
        result.push({
          date: dateStr,
          calories: 0,
          duration: 0,
          durationLabel: '',
          desc: '无运动记录',
          type: '无运动'
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return result
  }

  // 生成当前日期范围的默认测试数据
  const generateDefaultTestData = (): LifeBar[] => {
    const today = new Date()
    const result: LifeBar[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().slice(0, 10)
      const activities = [
        { calories: 250, duration: 30, desc: '晨跑', type: '有氧运动' },
        { calories: 180, duration: 45, desc: '瑜伽', type: '柔韧性训练' },
        { calories: 320, duration: 60, desc: '力量训练', type: '力量训练' },
        { calories: 200, duration: 35, desc: '游泳', type: '有氧运动' },
        { calories: 150, duration: 25, desc: '散步', type: '低强度有氧' },
        { calories: 280, duration: 40, desc: '跑步', type: '有氧运动' },
        { calories: 220, duration: 50, desc: '健身房', type: '综合训练' }
      ]
      const activity = activities[i % activities.length]
      result.push({
        date: dateStr,
        calories: activity.calories,
        duration: activity.duration,
        durationLabel: `${activity.duration}分钟`,
        desc: activity.desc,
        type: activity.type
      })
    }
    return result
  }

  const [lifeAnalysis, setLifeAnalysis] = React.useState({
    summary: '运动习惯良好，运动安排合理',
    status: '运动类型多样，健身计划执行良好',
    suggestions: '保持当前运动频率，可适当增加力量训练',
    typesCount: 0,
    totalCalories: 0,
    totalMinutes: 0
  })

  function parseNumber(s?: string): number {
    if (!s) return 0; const m = String(s).match(/\d+/); return m ? Number(m[0]) : 0
  }

  // 分析健身数据并生成AI解读
  const analyzeLifeData = (lifeData: LifeBar[]) => {
    const workoutData = lifeData.filter(item => item.duration > 0);
    if (workoutData.length === 0) {
      setLifeAnalysis({
        summary: '暂无运动记录',
        status: '开始记录你的第一次运动吧！',
        suggestions: '可以从散步或快走开始，迈出第一步。',
        typesCount: 0,
        totalCalories: 0,
        totalMinutes: 0
      });
      return;
    }

    const totalMinutes = workoutData.reduce((sum, item) => sum + item.duration, 0);
    const totalCalories = workoutData.reduce((sum, item) => sum + item.calories, 0);
    const workoutDays = workoutData.length;
    const avgMinutes = totalMinutes / workoutDays;
    const types = new Set(workoutData.flatMap(item => splitTypes(item.type)));
    const typesCount = types.size;

    // 总结
    let summary = '';
    if (workoutDays >= 5) {
      summary = `本周运动了 ${workoutDays} 天，非常棒！`;
    } else if (workoutDays >= 3) {
      summary = `本周运动了 ${workoutDays} 天，保持得不错。`;
    } else {
      summary = `本周运动了 ${workoutDays} 天，要继续加油哦。`;
    }
    summary += `总时长 ${totalMinutes} 分钟。`;

    // 状态
    let status = '运动类型比较单一。';
    if (typesCount > 2) {
      status = `包含 ${typesCount} 种运动，非常多样化！`;
    } else if (types.has('力量训练') && types.has('有氧运动')) {
      status = '有氧和力量训练结合，很科学。';
    } else if (types.has('有氧运动')) {
      status = '主要以有氧运动为主。';
    } else if (types.has('力量训练')) {
      status = '主要以力量训练为主。';
    }

    // 建议
    let suggestions = '';
    if (totalMinutes < 60) {
      suggestions = '运动量有待提高，尝试将每次运动时长增加到30分钟以上。';
    } else if (typesCount === 1 && totalMinutes > 120) {
      suggestions = '运动量很棒！可以尝试加入其他类型的运动，如瑜伽或力量训练，让身体得到更全面的发展。';
    } else if (avgMinutes > 45 && workoutDays >=3) {
      suggestions = '你的运动习惯非常出色！可以挑战一下新的运动目标或增加训练强度。';
    } else {
      suggestions = '保持当前的运动节奏，你做得很好！';
    }

    setLifeAnalysis({
      summary,
      status,
      suggestions,
      typesCount,
      totalCalories,
      totalMinutes
    });
  }

  // 颜色映射与 Tooltip 渲染（将"运动种类"以色块区分）
  const TYPE_COLORS: Record<string, string> = {
    '有氧运动': '#10b981',
    '力量训练': '#f59e0b',
    '柔韧性训练': '#06b6d4',
    '低强度有氧': '#8b5cf6',
  }
  function splitTypes(type?: string): string[] {
    if (!type) return []
    return String(type).split(/[、/|,\s]+/).filter(Boolean)
  }
  const CustomLifeTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const item = payload[0].payload as LifeBar
    const types = splitTypes(item.type)
    const palette = ['#6366F1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxWidth: 320 }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>日期：{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#334155' }}>运动消耗：</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.calories} 卡</span>
          {item.duration ? (
            <span style={{ marginLeft: 8, fontSize: 12, color: '#475569' }}>时长：{item.duration} 分钟</span>
          ) : null}
        </div>
        {item.desc ? (
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.45, marginBottom: 8 }}>内容：{item.desc}</div>
        ) : null}
        {types.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {types.map((t, idx) => (
              <span key={idx} style={{
                background: TYPE_COLORS[t] || palette[idx % palette.length],
                color: '#fff',
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 9999
              }}>{t}</span>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  React.useEffect(() => {
    async function load() {
      try {
        const params: any = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await axios.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []

        const mapped: LifeBar[] = rows
          .filter((r: any) => r.fitness_calories || r.fitness_duration) // 只要有健身数据的记录
          .map((r: any) => {
            const date = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0,10) : new Date(r.date).toISOString().slice(0,10)
            const calories = parseNumber(r.fitness_calories)
            const duration = parseNumber(r.fitness_duration)
            const type = r.fitness_type
            const desc = r.life_description || ''
            return { date, calories, duration, durationLabel: duration ? `${duration}分钟` : '', desc, type }
          })
          .sort((a,b)=>a.date.localeCompare(b.date))

        // 生成完整的7天数据，包含空的占位符
        const finalData = generateCompleteWeekData(mapped, dateRange)
        console.log('健身打卡数据:', finalData) // 调试输出
        setBars(finalData)

        analyzeLifeData(mapped)
      } catch (e) {
        console.warn('API请求失败，使用默认测试数据', e)
        const fallbackData = generateDefaultTestData()
        setBars(fallbackData)
        analyzeLifeData(fallbackData)
      }
    }
    load()
  }, [dateRange])

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })
  const handleQuery = (from: string, to: string) => setDateRange({ from, to })

  return (
    <Card>
      <SectionHeader title="健身打卡" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} />

      {/* 添加数据状态显示 */}
      <div className="mb-2 text-sm text-slate-500">
        数据点数量: {bars.length}
      </div>

      <div className="h-[320px] md:h-[380px] xl:h-[420px] rounded-xl bg-slate-50 p-4">
        {bars.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} barCategoryGap="28%" barGap={8} margin={{ top: 20, right: 20, left: 20, bottom: 50 }}>
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
                    return dateStr.slice(5); // 2025-01-15 -> 01-15
                  }
                  return dateStr;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} width={56} label={{ value: '卡路里', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomLifeTooltip />} wrapperStyle={{ outline: 'none' }} />
              <Bar dataKey="calories" name="运动消耗(卡)" barSize={18} radius={[4,4,0,0]}>
                {bars.map((b, idx) => {
                  const types = splitTypes(b.type)
                  const first = types[0]
                  const color = TYPE_COLORS[first || '有氧运动'] || '#6366F1'
                  return <Cell key={`c-${idx}`} fill={color} />
                })}
                <LabelList dataKey="durationLabel" position="top" style={{ fill: '#334155', fontSize: 12 }} />
              </Bar>
              {bars.length > 10 && (
                <Brush dataKey="date" height={24} travellerWidth={10} stroke="#94a3b8" />
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            暂无健身数据
          </div>
        )}
      </div>

      {/* AI 解读和指标面板 */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* AI解读面板 */}
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-slate-800">AI解读</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-start gap-3"><span className="text-sm mt-1">🏃‍♂️</span><div><div className="text-sm font-medium text-slate-700">运动总结：{lifeAnalysis.summary}</div></div></div>
            <div className="flex items-start gap-3"><span className="text-sm mt-1">💪</span><div><div className="text-sm font-medium text-slate-700">健身状态：{lifeAnalysis.status}</div></div></div>
            <div className="flex items-start gap-3"><span className="text-sm mt-1">💡</span><div><div className="text-sm font-medium text-slate-700">建议：{lifeAnalysis.suggestions}</div></div></div>
          </div>
        </div>

        {/* 指标小卡片 */}
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">🏃‍♀️</span></div>
            <div className="text-xs text-slate-500 mb-1">运动种类</div>
            <div className="text-2xl font-bold text-indigo-600">{lifeAnalysis.typesCount}种</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">🔥</span></div>
            <div className="text-xs text-slate-500 mb-1">总消耗</div>
            <div className="text-2xl font-bold text-indigo-600">{lifeAnalysis.totalCalories}卡</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="flex items-center gap-1 justify-center mb-2"><span className="text-2xl">⏱️</span></div>
            <div className="text-xs text-slate-500 mb-1">总时长</div>
            <div className="text-2xl font-bold text-indigo-600">{lifeAnalysis.totalMinutes}分钟</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* 4. 学习时间分布 */
function StudyTimeDist({ onAIClick }: { onAIClick?: () => void }) {
  type StudyBar = { date: string; hours: number; description: string; category: string; duration: string }
  const [studyBars, setStudyBars] = React.useState<StudyBar[]>([])
  // 默认显示最近一周数据
  const getDefaultDateRange = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 6);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }
  const [dateRange, setDateRange] = React.useState<{from: string, to: string}>(getDefaultDateRange())
  
  // 生成完整的7天学习数据，包含空的占位符
  const generateCompleteStudyWeekData = (realData: StudyBar[], dateRange: {from: string, to: string}): StudyBar[] => {
    const result: StudyBar[] = []
    const dataMap = new Map()
    
    // 将真实数据映射到日期
    realData.forEach(item => {
      dataMap.set(item.date, item)
    })
    
    // 生成完整的7天
    const currentDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const existingData = dataMap.get(dateStr)
      
      if (existingData) {
        result.push(existingData)
      } else {
        // 添加空数据占位符
        result.push({
          date: dateStr,
          hours: 0,
          description: '无学习记录',
          category: '其他',
          duration: '未提及'
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return result
  }

  const [studyAnalysis, setStudyAnalysis] = React.useState({
    summary: '正在分析...',
    timeInfo: '...',
    suggestions: '正在分析...',
    totalHours: 0,
    totalMinutes: 0,
    dailyAverage: 0
  })

  // 学习类别颜色映射
  const CATEGORY_COLORS: Record<string, string> = {
    '外语': '#3b82f6',     // 蓝色
    '编程': '#10b981',     // 绿色
    'AI技术': '#f59e0b',   // 橙色
    'AI应用': '#8b5cf6',   // 紫色
    '金融': '#ef4444',     // 红色
    '心理学': '#06b6d4',   // 青色
    '自媒体': '#f97316',   // 橙红色
    '阅读': '#84cc16',     // 草绿色
    '其他': '#6b7280'      // 灰色
  }

  function parseNumber(s?: string): number {
    if (!s) return 0
    const m = String(s).match(/\d+/)
    return m ? Number(m[0]) : 0
  }

  function parseDuration(duration?: string): number {
    if (!duration || duration === '未提及') return 0.1 // 显示最小值以便可见
    if (duration.includes('h')) {
      return parseNumber(duration)
    }
    if (duration.includes('min')) {
      return parseNumber(duration) / 60 // 转换为小时
    }
    return 0.1 // 其他情况也显示最小值
  }

  // 自定义Tooltip组件（适配分组数据）
  const CustomStudyTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    
    // 过滤出有数据的项目
    const validItems = payload.filter((item: any) => item.value > 0)
    if (validItems.length === 0) return null
    
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ 
                  background: CATEGORY_COLORS[category] || '#6b7280',
                  color: '#fff',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4
                }}>
                  {category}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                  {hours > 0 ? `${hours}小时` : '未提及'}
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
        const params: any = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await axios.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []

        // 处理学习数据，支持同一天多个学习记录
        const studyRecords = rows
          .filter((r: any) => r.study_description)
          .map((r: any) => {
            const date = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0,10) : new Date(r.date).toISOString().slice(0,10)
            const hours = parseDuration(r.study_duration)
            const description = r.study_description || ''
            const category = r.study_category || '其他'
            const duration = r.study_duration || '未提及'
            return { date, hours, description, category, duration }
          })

        // 按日期分组，每个类别在每天单独显示
        const groupedByDate = studyRecords.reduce((acc, record) => {
          const key = `${record.date}-${record.category}`
          if (!acc[key]) {
            acc[key] = {
              date: record.date,
              category: record.category,
              hours: 0,
              descriptions: [] as string[],
              durations: [] as string[]
            }
          }
          acc[key].hours += record.hours
          acc[key].descriptions.push(record.description)
          acc[key].durations.push(record.duration)
          return acc
        }, {} as Record<string, any>)

        // 转换为图表数据格式
        const chartData = Object.values(groupedByDate).map((group: any) => ({
          date: group.date,
          hours: group.hours,
          description: group.descriptions.join('、'),
          category: group.category,
          duration: group.durations.join('、')
        })).sort((a: any, b: any) => a.date.localeCompare(b.date))


        // 生成完整的7天数据，包含空的占位符
        const completeWeekData = generateCompleteStudyWeekData(chartData, dateRange)
        setStudyBars(completeWeekData)
        analyzeStudyData(chartData, dateRange)
      } catch (e) {
        setStudyBars([])
        analyzeStudyData([], dateRange)
      }
    }
    load()
  }, [dateRange])

  // 分析学习数据并生成AI解读
  const analyzeStudyData = (studyItems: StudyBar[], dateRange: {from: string, to: string}) => {
    const studyData = studyItems.filter(item => item.hours > 0);
    if (studyData.length === 0) {
      setStudyAnalysis({
        summary: '暂无学习记录',
        timeInfo: '0小时',
        suggestions: '“书山有路勤为径”，开始记录你的学习吧！',
        totalHours: 0,
        totalMinutes: 0,
        dailyAverage: 0
      });
      return;
    }

    const totalHours = Number(studyData.reduce((sum, item) => sum + item.hours, 0).toFixed(2));
    const totalMinutes = Math.round(totalHours * 60);
    const studyDays = new Set(studyData.map(item => item.date)).size;
    
    // 计算时间范围内的总天数
    const totalDaysInRange = (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 3600 * 24) + 1;
    const dailyAverage = Number((totalHours / totalDaysInRange).toFixed(2));

    const categoryStats = studyData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.hours;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories[0]?.[0] || '未知';
    
    let summary = `主要学习了“${topCategory}”`;
    if (sortedCategories.length > 1) {
      summary += `，同时涉猎了 ${sortedCategories.length - 1} 个其他领域`;
    }
    summary += '。';

    const timeInfo = `${totalHours}小时（平均每日约${dailyAverage}小时）`;

    let suggestions = '学习状态很棒，继续保持！';
    if (dailyAverage < 0.5) {
      suggestions = '学习投入有待加强，尝试每天安排固定的学习时间。';
    } else if (studyDays <= 2 && totalHours > 5) {
      suggestions = '学习时间集中，可以尝试分散到更多天，效果可能更好。';
    } else if (sortedCategories.length > 3 && totalHours < 7) {
      suggestions = '学习领域较广，但总时长有限，建议适当聚焦，逐个攻破。';
    } else if (dailyAverage > 2.5) {
      suggestions = '学习投入非常充足，注意与实践相结合，并保证充足休息。';
    }

    setStudyAnalysis({
      summary,
      timeInfo,
      suggestions,
      totalHours,
      totalMinutes,
      dailyAverage
    });
  }

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })
  const handleQuery = (from: string, to: string) => setDateRange({ from, to })

  // 处理分组数据，为分组条形图准备数据
  const prepareGroupedData = () => {
    // 获取所有唯一日期
    const uniqueDates = [...new Set(studyBars.map(item => item.date))].sort()
    
    // 为每个日期创建完整的数据点，包括所有类别
    return uniqueDates.map(date => {
      const dateData: any = { date }
      
      // 为这个日期获取所有学习记录
      const dayRecords = studyBars.filter(item => item.date === date)
      
      // 按类别分组
      dayRecords.forEach(record => {
        const category = record.category
        dateData[category] = record.hours
        dateData[`${category}_desc`] = record.description
        dateData[`${category}_duration`] = record.duration
      })
      
      return dateData
    })
  }

  const groupedData = prepareGroupedData()
  const allCategories = [...new Set(studyBars.map(item => item.category))]

  return (
    <Card>
      <SectionHeader title="学习跟进" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} />
      
      <div className="h-[400px] md:h-[450px] xl:h-[500px] rounded-xl bg-slate-50 p-6">
        {groupedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={groupedData} 
              barCategoryGap="30%" 
              barGap={0} 
              margin={{ top: 60, right: 30, left: 60, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
                tickFormatter={(v: any) => {
                  const dateStr = String(v);
                  if (dateStr.length >= 10 && dateStr.includes('-')) {
                    return dateStr.slice(5); // 2025-08-14 -> 08-14
                  }
                  return dateStr;
                }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                width={60} 
                domain={[0, 'dataMax']}
                label={{ value: '学习时长(小时)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b' } }} 
              />
              <Tooltip content={<CustomStudyTooltip />} wrapperStyle={{ outline: 'none' }} />
              <Legend 
                verticalAlign="top" 
                height={40}
                iconType="rect"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              
              {/* 为每个学习类别创建一个Bar（同一日期堆叠在一根柱子上） */}
              {allCategories.map(category => (
                <Bar 
                  key={category}
                  dataKey={category}
                  name={category}
                  fill={CATEGORY_COLORS[category] || '#6b7280'}
                  barSize={24}
                  stackId="study"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="text-2xl mb-2">📚</div>
              <div>暂无学习数据</div>
            </div>
          </div>
        )}
      </div>

      {/* AI 解读和指标面板 */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* AI解读面板 */}
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-slate-800">AI解读</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">📖</span>
              <div>
                <div className="text-sm font-medium text-slate-700">学习总结：{studyAnalysis.summary}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">⏰</span>
              <div>
                <div className="text-sm font-medium text-slate-700">学习总时长：{studyAnalysis.timeInfo}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">💡</span>
              <div>
                <div className="text-sm font-medium text-slate-700">建议：{studyAnalysis.suggestions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 学习指标卡片 */}
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          {/* 总学习时长卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">📚</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">总学习时长</div>
            <div className="text-2xl font-bold text-indigo-600">{Number(studyAnalysis.totalHours).toFixed(2)}小时</div>
            <div className="text-sm text-slate-500 mt-1">约{studyAnalysis.totalMinutes}分钟</div>
          </div>

          {/* 平均每日卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">平均每日</div>
            <div className="text-2xl font-bold text-indigo-600">{Number(studyAnalysis.dailyAverage).toFixed(2)}小时</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// 工作任务甘特图类型
interface WorkTask {
  date: string
  task: string
  taskType: string
  priority: string
  complexity: string
  estimatedHours: number
  startDate: Date
  endDate: Date
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
function WorkCompletion({ onAIClick, ...props }: any) {

  // 默认显示最近一周数据
  const getDefaultDateRange = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 6);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const [workTasks, setWorkTasks] = useState<WorkTask[]>([])
  
  // 生成完整的7天工作数据，包含空的占位符
  const generateCompleteWorkWeekData = (realData: WorkTask[], dateRange: {from: string, to: string}): WorkTask[] => {
    const result: WorkTask[] = []
    const dataMap = new Map()
    
    // 将真实数据映射到日期
    realData.forEach(item => {
      dataMap.set(item.date, item)
    })
    
    // 生成完整的7天
    const currentDate = new Date(dateRange.from)
    const endDate = new Date(dateRange.to)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10)
      const existingData = dataMap.get(dateStr)
      
      if (existingData) {
        result.push(existingData)
      } else {
        // 添加空数据占位符
        const startDate = new Date(dateStr)
        const endDate = new Date(dateStr)
        endDate.setDate(endDate.getDate() + 1)
        
        result.push({
          date: dateStr,
          task: '无工作记录',
          taskType: '未分类',
          priority: '中',
          complexity: '简单',
          estimatedHours: 0,
          startDate,
          endDate
        })
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return result
  }

  const [workAnalysis, setWorkAnalysis] = useState({
    summary: '正在分析...',
    suggestions: '正在分析...',
    totalTasks: 0,
    completedTasks: 0,
    avgDuration: 0
  })

  React.useEffect(() => {
    async function load() {
      try {
        const params: any = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await axios.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []

        // 处理工作数据
        const workRecords = rows
          .filter((r: any) => r.work_description)
          .map((r: any) => {
            const date = (typeof r.date === 'string' && r.date.length >= 10) ? r.date.slice(0,10) : new Date(r.date).toISOString().slice(0,10)
            const task = r.work_description || ''
            const taskType = r.work_task_type || '未分类'
            const priority = r.work_priority || '中'
            const complexity = r.work_complexity || '中等'
            const estimatedHours = r.work_estimated_hours || 8
            
            // 计算任务的开始和结束日期（假设每个任务持续1天）
            const startDate = new Date(date)
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + 1)
            
            return {
              date,
              task,
              taskType,
              priority,
              complexity,
              estimatedHours,
              startDate,
              endDate
            }
          })
          .sort((a: WorkTask, b: WorkTask) => a.date.localeCompare(b.date))

        // 生成完整的7天数据，包含空的占位符
        const completeWeekData = generateCompleteWorkWeekData(workRecords, dateRange)
        setWorkTasks(completeWeekData)
        analyzeWorkData(workRecords)
      } catch (e) {
        setWorkTasks([])
      }
    }
    load()
  }, [dateRange])

  // 分析工作数据并生成AI解读
  const analyzeWorkData = (tasks: WorkTask[]) => {
    const workData = tasks.filter(t => t.estimatedHours > 0);
    if (workData.length === 0) {
      setWorkAnalysis({
        summary: '暂无有效工作记录',
        suggestions: '“千里之行，始于足下”，开始记录你的工作任务吧！',
        totalTasks: 0,
        completedTasks: 0,
        avgDuration: 0
      });
      return;
    }

    const totalTasks = workData.length;
    const completedTasks = workData.filter(t => new Date(t.endDate) < new Date()).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalHours = workData.reduce((sum, t) => sum + t.estimatedHours, 0);
    const avgDuration = totalTasks > 0 ? Number((totalHours / totalTasks).toFixed(1)) : 0;

    const typeStats = workData.reduce((acc, task) => {
      acc[task.taskType] = (acc[task.taskType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sortedTypes = Object.entries(typeStats).sort((a, b) => b[1] - a[1]);
    const mainTaskType = sortedTypes[0]?.[0] || '未分类';

    let summary = `共 ${totalTasks} 项任务，主要为“${mainTaskType}”。`;
    if (totalTasks > 0) {
      summary += ` 完成率为 ${completionRate}%。`;
    }

    let suggestions = '项目规划清晰，执行有力，继续保持！';
    const highPriorityTasks = workData.filter(t => t.priority === '高').length;
    if (highPriorityTasks > totalTasks * 0.5) {
      suggestions = `高优先级任务占比较高（${highPriorityTasks}项），请注意风险管理，确保核心任务按时完成。`;
    } else if (avgDuration > 10) {
      suggestions = '部分任务平均耗时较长，可考虑将其拆解为更小的子任务，以便更好地跟踪和管理。';
    } else if (completionRate < 50 && totalTasks > 5) {
      suggestions = '项目仍在初期阶段，建议重点关注任务的优先级排序，确保关键路径不受阻。';
    } else if (workData.some(t => t.complexity === '高')) {
      suggestions = '项目中包含高复杂度任务，建议投入更多资源，并设置明确的里程碑。';
    }

    setWorkAnalysis({
      summary,
      suggestions,
      totalTasks,
      completedTasks,
      avgDuration
    });
  }

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })
  const handleQuery = (from: string, to: string) => setDateRange({ from, to })

  // 时间线数据准备（按天离散）
  const STAGE_ORDER = ['规划','开发','部署','UI/UX设计','功能集成','测试/收尾']
  const STAGE_TO_Y: Record<string, number> = STAGE_ORDER.reduce((acc, s, i) => { acc[s] = i + 1; return acc }, {} as Record<string, number>)
  const STAGE_COLORS: Record<string, string> = {
    '规划': '#3b82f6',       // 蓝
    '开发': '#f59e0b',       // 橙
    '部署': '#10b981',       // 绿
    'UI/UX设计': '#8b5cf6',  // 紫
    '功能集成': '#ef4444',   // 红
    '测试/收尾': '#6b7280'   // 灰
  }

  const formatDateMD = (d: Date) => {
    const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0');
    return `${m}-${day}`
  }

  // 计算日期边界（按天）
  const minDateObj = workTasks.length ? new Date(Math.min(...workTasks.map(t => new Date(t.date).getTime()))) : new Date()
  const maxDateObj = workTasks.length ? new Date(Math.max(...workTasks.map(t => new Date(t.date).getTime()))) : new Date()
  minDateObj.setHours(0,0,0,0); maxDateObj.setHours(0,0,0,0)



  // 为同一"天+阶段"的多个任务做轻微抖动，避免完全重叠
  const jitterCounter = new Map<string, number>()
  const timelinePoints = workTasks.map(t => {
    const d = new Date(t.date); d.setHours(0,0,0,0)
    const xLabel = formatDateMD(d)
    const baseY = STAGE_TO_Y[t.taskType] ?? STAGE_TO_Y['规划']
    const key = `${xLabel}|${t.taskType}`
    const idx = jitterCounter.get(key) ?? 0
    jitterCounter.set(key, idx + 1)
    const jitter = idx * 0.08 // 每条上移 0.08，避免重叠
    return {
      xLabel,
      y: baseY - jitter,
      type: t.taskType,
      task: t.task,
      date: t.date
    }
  })



  // 自定义甘特图组件（恢复）
  const GanttChart = () => {
    if (workTasks.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div>暂无工作任务数据</div>
          </div>
        </div>
      )
    }

    // 计算时间范围
    const minDate = new Date(Math.min(...workTasks.map(t => t.startDate.getTime())))
    const maxDate = new Date(Math.max(...workTasks.map(t => t.endDate.getTime())))
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 生成日期网格
    const dates = Array.from({ length: totalDays }, (_, i) => {
      const d = new Date(minDate)
      d.setDate(d.getDate() + i)
      return d
    })

    return (
      <div className="overflow-auto">
        <div className="min-w-[800px] pb-4">
          {/* 头部 - 日期轴 */}
          <div className="flex border-b border-slate-200">
            <div className="w-[220px] p-3 bg-slate-50 font-medium text-slate-700 border-r border-slate-200">
              任务名称
            </div>
            <div className="flex-1 flex">
              {dates.map((d, i) => (
                <div key={i} className="flex-1 min-w-[60px] p-2 text-center text-xs text-slate-600 border-r border-slate-100">
                  {d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </div>
              ))}
            </div>
          </div>

          {/* 任务行 */}
          <div className="space-y-1">
            {workTasks.map((task, idx) => {
              const taskStartDay = Math.floor((task.startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
              const taskDuration = Math.max(1, Math.floor((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)))
              const taskWidth = (taskDuration / totalDays) * 100

              return (
                <div key={idx} className="flex items-center border-b border-slate-100 hover:bg-slate-25">
                  {/* 名称列 */}
                  <div className="w-[220px] p-3 border-r border-slate-200">
                    <div className="text-sm font-medium text-slate-800 truncate" title={task.task}>
                      {task.task}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        task.priority === '高' ? 'bg-red-100 text-red-700' :
                        task.priority === '中' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-slate-500">{task.estimatedHours}h · {task.taskType}</span>
                    </div>
                  </div>

                  {/* 时间轴区域 */}
                  <div className="flex-1 relative h-12 flex items-center">
                    <div className="absolute inset-0 flex">
                      {dates.map((_, i) => (
                        <div key={i} className="flex-1 min-w-[60px] border-r border-slate-100" />
                      ))}
                    </div>

                    {/* 任务条 */}
                    <div
                      className="absolute h-6 rounded flex items-center justify-center shadow-sm"
                      style={{
                        left: `${(taskStartDay / totalDays) * 100}%`,
                        width: `${taskWidth}%`,
                        minWidth: '40px',
                        backgroundColor: TASK_TYPE_COLORS[task.taskType] || TASK_TYPE_COLORS['未分类']
                      }}
                      title={`${task.task} (${task.taskType})`}
                    >
                      <span className="text-xs text-white font-medium truncate px-2">
                        {task.taskType}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <SectionHeader title="工作upup" onAIClick={onAIClick} onDateChange={handleDateChange} onQuery={handleQuery} />
      
      {/* 甘特图容器 */}
      <div className="h-[560px] md:h-[600px] rounded-xl bg-white border border-slate-200 overflow-auto">
        <GanttChart />
      </div>

      {/* AI 解读和指标面板 */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* AI解读面板 */}
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-slate-800">AI解读</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">💼</span>
              <div>
                <div className="text-sm font-medium text-slate-700">项目总结：{workAnalysis.summary}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">💡</span>
              <div>
                <div className="text-sm font-medium text-slate-700">优化建议：{workAnalysis.suggestions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 工作指标卡片 */}
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          {/* 总任务数卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">总任务数</div>
            <div className="text-lg font-bold text-indigo-600">{workAnalysis.totalTasks}</div>
          </div>

          {/* 平均工时卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">平均工时</div>
            <div className="text-lg font-bold text-slate-600">{workAnalysis.avgDuration}h</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* 6. 灵感记录时间线气泡图 */
function InspirationNotes({ onAIClick }: { onAIClick?: () => void }) {
  const [inspirationData, setInspirationData] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  // 默认显示最近一周数据
  const getDefaultDateRange = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 6);
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }
  const [dateRange, setDateRange] = React.useState(getDefaultDateRange())



  // 加载真实灵感数据
  React.useEffect(() => {
    async function loadInspirationData() {
      setLoading(true)
      try {
        const params: any = {}
        if (dateRange.from) params.from = dateRange.from
        if (dateRange.to) params.to = dateRange.to
        const res = await axios.get(`/api/simple-records`, { params })
        const rows = Array.isArray(res.data.records) ? res.data.records : []
        
        // 筛选有灵感记录的数据 - 简化过滤条件
        const inspirationRows = rows.filter(r => 
          r.inspiration_description && 
          r.inspiration_description.trim() !== '' && 
          r.inspiration_description !== '没想法' &&
          r.inspiration_description !== '无灵感记录' &&
          r.inspiration_theme && 
          r.inspiration_theme !== '无'
        )
        

        
        // 直接使用真实数据，不添加占位符
        setInspirationData(inspirationRows)
      } catch (e) {
        console.warn('加载灵感数据失败', e)
        setInspirationData([])
      } finally {
        setLoading(false)
      }
    }
    loadInspirationData()
  }, [dateRange])



  const [inspirationAnalysis, setInspirationAnalysis] = React.useState({
    totalCount: 0,
    mostCategory: '...',
    suggestions: '正在分析...',
    highValueCount: 0,
    difficultyCount: {}
  })

  // 分析灵感数据并生成AI解读
  const analyzeInspirationData = React.useCallback(() => {
    const inspirationDataFiltered = inspirationData.filter(item => item.inspiration_description);
    if (inspirationDataFiltered.length === 0) {
      setInspirationAnalysis({
        totalCount: 0,
        mostCategory: '无',
        suggestions: '“灵感买不来，但它爱光顾勤劳的头脑。” 开始记录吧！',
        highValueCount: 0,
        difficultyCount: {}
      });
      return;
    }

    const totalCount = inspirationDataFiltered.length;
    
    const categoryCount: Record<string, number> = {};
    inspirationDataFiltered.forEach(item => {
      const theme = item.inspiration_theme || '未分类';
      categoryCount[theme] = (categoryCount[theme] || 0) + 1;
    });
    
    const mostCategory = Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0]?.[0] || '未分类';

    const difficultyCount: Record<string, number> = {};
    inspirationDataFiltered.forEach(item => {
      const difficulty = item.inspiration_difficulty || '中';
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });

    const highValueCount = inspirationDataFiltered.filter(item => 
      item.inspiration_difficulty === '高' || 
      (item.inspiration_theme && ['AI工具开发', '金融科技', '自动化流程'].includes(item.inspiration_theme))
    ).length;

    let suggestions = '你的创造力很活跃，继续保持！';
    const highValueRatio = totalCount > 0 ? highValueCount / totalCount : 0;

    if (highValueRatio > 0.5) {
      suggestions = '高价值灵感占比很高，你正走在创新的前沿！建议挑选一两个进行深度可行性分析。';
    } else if (difficultyCount['高'] > 3) {
      suggestions = '你的想法很有挑战性！尝试将这些“大想法”拆解成小步骤，让它们更容易启动。';
    } else if (totalCount > 10 && highValueRatio < 0.2) {
      suggestions = '灵感数量充沛，是时候进行筛选了。思考一下哪些想法能产生最大价值或最让你兴奋。';
    } else if (mostCategory !== '未分类' && (categoryCount[mostCategory] / totalCount) > 0.6) {
      suggestions = `你对“${mostCategory}”领域有非常集中的思考，这可能是一个值得深耕的绝佳机会。`;
    }

    setInspirationAnalysis({
      totalCount,
      mostCategory,
      suggestions,
      highValueCount,
      difficultyCount
    });
  }, [inspirationData])

  React.useEffect(() => {
    analyzeInspirationData()
  }, [analyzeInspirationData])

  const handleDateChange = (from: string, to: string) => setDateRange({ from, to })

  return (
    <Card>
      <SectionHeader title="捕捉灵感" onAIClick={onAIClick} onDateChange={handleDateChange} />

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div>加载灵感数据中...</div>
          </div>
        </div>
      ) : (
                 <TimelineBubbleChart 
                   data={inspirationData} 
                   height={550} 
                   from={dateRange.from} 
                   to={dateRange.to} 
                 />
      )}

      {/* AI 解读和指标面板 */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* AI解读面板 */}
        <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 min-h-[180px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-slate-800">AI解读</h3>
          </div>
          <div className="space-y-3 flex-1 overflow-auto">
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">💡</span>
              <div>
                <div className="text-sm font-medium text-slate-700">灵感总数：{inspirationAnalysis.totalCount}个</div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">🎯</span>
              <div>
                <div className="text-sm font-medium text-slate-700">
                  高价值项目：{inspirationAnalysis.highValueCount}个 
                  {inspirationAnalysis.totalCount > 0 && 
                    ` (${Math.round(inspirationAnalysis.highValueCount / inspirationAnalysis.totalCount * 100)}%)`
                  }
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">📊</span>
              <div>
                <div className="text-sm font-medium text-slate-700">
                  难度分布：
                  {Object.entries(inspirationAnalysis.difficultyCount).map(([difficulty, count]) => 
                    ` ${difficulty}(${count})`
                  ).join(' ')}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="text-sm mt-1">🚀</span>
              <div>
                <div className="text-sm font-medium text-slate-700">AI建议：{inspirationAnalysis.suggestions}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 灵感指标卡片 */}
        <div className="space-y-4 min-h-[180px] flex flex-col justify-between">
          {/* 热门主题卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">热门主题</div>
            <div className="text-lg font-bold text-indigo-600">{inspirationAnalysis.mostCategory}</div>
          </div>

          {/* 实现价值卡片 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1 justify-center mb-2">
              <span className="text-2xl">💎</span>
            </div>
            <div className="text-xs text-slate-500 mb-1">高价值占比</div>
            <div className="text-sm font-bold text-indigo-600">
              {inspirationAnalysis.totalCount > 0 
                ? `${Math.round(inspirationAnalysis.highValueCount / inspirationAnalysis.totalCount * 100)}%`
                : '0%'
              }
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}



// API_BASE_URL 从 config.ts 导入使用

export default function AnalyticsTabsPage() {
  const [active, setActive] = useState<TabId>('emotion')
  const [catOpen, setCatOpen] = useState(true)
  const [dataOpen, setDataOpen] = useState(true)
  const [dataActive, setDataActive] = useState<DataSubTab>('raw')
  const [view, setView] = useState<'category' | 'data'>('category')
  const [aiModalOpen, setAiModalOpen] = useState(false)

  const handleAIClick = () => {
    setAiModalOpen(true)
  }

  const getContextForAI = () => {
    // 根据当前页面返回相关上下文
    if (view === 'category') {
      switch (active) {
        case 'emotion': return '用户正在查看情绪趋势分析页面'
        case 'life': return '用户正在查看休闲娱乐分析页面'
        case 'study': return '用户正在查看学习跟进分析页面'
        case 'work': return '用户正在查看工作完成度分析页面'
        case 'inspiration': return '用户正在查看灵感记录分析页面'
        default: return '用户正在查看数据分析页面'
      }
    } else {
      return dataActive === 'raw' ? '用户正在查看原始数据管理页面' : '用户正在查看AI数据管理页面'
    }
  }

  return (
    <div className="h-[calc(100vh-48px)] grid grid-cols-[280px_minmax(0,1fr)] gap-4 py-6 px-6">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3">
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
                onClick={() => { setView('category'); setActive(t.id) }}
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
              onClick={() => { setView('data'); setDataActive('raw') }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-0 ${
                view === 'data' && dataActive === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>📜</span>
              <span className="whitespace-nowrap">原始数据</span>
            </button>
            <button
              onClick={() => { setView('data'); setDataActive('ai') }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm min-w-0 ${
                view === 'data' && dataActive === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>🤖</span>
              <span className="whitespace-nowrap">AI处理数据</span>
            </button>

          </nav>
        )}
      </aside>

      <section className="h-full px-0">
        {view === 'data' ? (
          <>
            {dataActive === 'raw' && <RawDataPage />}
            {dataActive === 'ai' && <AIDataPage />}
          </>
        ) : (
          <>
            {active === 'emotion' && <EmotionTrend onAIClick={handleAIClick} />}
            {active === 'life' && <LifeTimeline onAIClick={handleAIClick} />}
            {active === 'study' && <StudyTimeDist onAIClick={handleAIClick} />}
            {active === 'work' && <WorkCompletion onAIClick={handleAIClick} />}
            {active === 'inspiration' && <InspirationNotes onAIClick={handleAIClick} />}
          </>
        )}
      </section>

      {/* AI 弹窗 */}
      <AIModal 
        isOpen={aiModalOpen} 
        onClose={() => setAiModalOpen(false)}
        context={getContextForAI()}
      />
    </div>
  )
}