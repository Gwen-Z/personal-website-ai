import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Progress } from "./ui/progress"
import { Badge } from "./ui/badge"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

const moodData = [
  { day: '周一', mood: 6.5 },
  { day: '周二', mood: 7.2 },
  { day: '周三', mood: 8.1 },
  { day: '周四', mood: 5.8 },
  { day: '周五', mood: 7.5 },
  { day: '周六', mood: 8.0 },
  { day: '周日', mood: 7.2 }
]

const studyData = [
  { subject: '前端', hours: 30, color: '#8884d8' },
  { subject: 'AI', hours: 50, color: '#82ca9d' },
  { subject: '其他', hours: 20, color: '#ffc658' }
]

const lifeBalanceData = [
  { category: '健康', hours: 8, color: '#8884d8' },
  { category: '社交', hours: 2, color: '#82ca9d' },
  { category: '娱乐', hours: 1.5, color: '#ffc658' }
]

const workData = [
  { task: '项目提案', status: 'completed' },
  { task: '代码审查', status: 'completed' },
  { task: '会议纪要', status: 'completed' },
  { task: '产品设计', status: 'pending' },
  { task: '测试报告', status: 'pending' }
]

export function OverviewPanel() {
  const [dashboard, setDashboard] = useState<{ moodTrend: { date: string; score: number; emoji?: string; event?: string }[]; latest?: any }>({ moodTrend: [] })
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/dashboard')
        const data = await res.json()
        if (mounted) {
          setDashboard({ 
            moodTrend: data.moodTrend || [], 
            latest: data.latest,
            stats: data.stats 
          })
          console.log(`✅ 从Turso加载仪表板数据，包含 ${data.moodTrend?.length || 0} 天趋势`, data.source)
        }
      } catch (e) {
        if (mounted) setError('数据加载失败')
        console.error('仪表板数据加载失败:', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  // 将 -3..3 分值线性映射到 0..10 分
  const moodAvg10 = useMemo(() => {
    if (!dashboard.moodTrend.length) return 0
    const avg = dashboard.moodTrend.reduce((s, p) => s + (Number(p.score) || 0), 0) / dashboard.moodTrend.length
    return Math.round((((avg + 3) / 6) * 10) * 10) / 10
  }, [dashboard.moodTrend])

  const moodSpark = useMemo(() => {
    return dashboard.moodTrend.map(p => ({ day: p.date?.slice(5) || '', mood: ((Number(p.score) || 0) + 3) / 6 * 10 }))
  }, [dashboard.moodTrend])

  const completedTasks = workData.filter(task => task.status === 'completed').length
  const totalTasks = workData.length
  const completionRate = Math.round((completedTasks / totalTasks) * 100)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl mb-2">欢迎回来！{dashboard.latest?.date ? `今日是${dashboard.latest.date}` : ''}</h1>
        <p className="text-muted-foreground">你的个人数据概览{error ? `（${error}）` : ''}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* 心情指数 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              心情指数
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                ↑12%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-2xl">⭐⭐⭐⭐☆</span>
              <span className="text-xl">{moodAvg10}分</span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodSpark}>
                  <Line type="monotone" dataKey="mood" stroke="#8884d8" strokeWidth={2} dot={false} />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 学习进度 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>学习进度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Progress value={85} className="h-2" />
              <span className="text-sm text-muted-foreground">本周目标: 85%</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>前端</span>
                <span>30%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>AI</span>
                <span>50%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>其他</span>
                <span>20%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 工作效能 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>工作效能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-xl">●●●○○</span>
              <span>完成{completedTasks}/{totalTasks}任务</span>
            </div>
            <div className="mb-3">
              <Progress value={completionRate} className="h-2" />
              <span className="text-sm text-muted-foreground">完成率: {completionRate}%</span>
            </div>
            <div className="text-sm text-muted-foreground">
              今日剩余任务: 2个
            </div>
          </CardContent>
        </Card>

        {/* 生活平衡 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>生活平衡</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span>健康</span>
                <span>8h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>社交</span>
                <span>2h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>娱乐</span>
                <span>1.5h</span>
              </div>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lifeBalanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={25}
                    dataKey="hours"
                  >
                    {lifeBalanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>心情波动趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.moodTrend.map(p => ({ date: p.date?.slice(5) || '', score: Number(p.score) || 0 }))}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[-3, 3]} />
                  <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>学习时间分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyData}>
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Bar dataKey="hours" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}