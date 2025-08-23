import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
  } from 'recharts'
  // 表情映射（按分值可自定义）
const moodEmoji = (v: number) => {
    if (v >= 5) return '😄'
    if (v >= 3) return '🙂'
    if (v >= 1) return '😌'
    if (v >= 0) return '😐'
    if (v >= -1) return '😣'
    return '😫'
  }
  
  // 自定义“贴纸”+emoji 的点样式
  const MoodDot = (props: any) => {
    const { cx, cy, payload } = props
    const emoji = payload.emoji || moodEmoji(payload.score)
    const title = payload.event || ''
    // 估算贴纸宽度
    const padX = 8
    const w = Math.max(48, title.length * 12 + padX * 2)
    const h = 22
    const above = payload.score >= 0 // 正分在上方贴纸
    const stickerY = above ? cy - 36 : cy + 14
    const textY = stickerY + 15
  
    return (
      <g>
        {/* emoji */}
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="18">{emoji}</text>
  
        {/* 贴纸底（圆角矩形） */}
        {title && (
          <>
            <rect
              x={cx - w / 2}
              y={stickerY}
              rx={10}
              ry={10}
              width={w}
              height={h}
              fill="#ffffff"
              stroke="#E5E7EB"
            />
            <text
              x={cx}
              y={textY}
              textAnchor="middle"
              fontSize="12"
              fill="#111827"
            >
              {title}
            </text>
          </>
        )}
  
        {/* 折线上的圆点（玻璃感） */}
        <circle cx={cx} cy={cy} r={3.5} fill="#6366F1" />
      </g>
    )
  }
  
  // 示例数据（周一到周日）；把这里替换成你的接口数据映射即可
  const moodPoints = [
    { day: '周一', score: 1.8, event: '两杯咖啡' },
    { day: '周二', score: -1, event: '加班到晚', emoji: '🥱' },
    { day: '周三', score: 0.7, event: '小聚', emoji: '😊' },
    { day: '周四', score: 5.5, event: '朋友来访' },
    { day: '周五', score: 4.6, event: '散步' },
    { day: '周六', score: 4.8, event: '运动' },
    { day: '周日', score: 3.9, event: '读书' },
  ]
  
  function EmotionTrend() {
    return (
      <Card>
        <SectionHeader title="情绪趋势" />
  
        <div className="h-[260px] md:h-[300px] xl:h-[340px] rounded-xl bg-slate-50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={moodPoints}
              margin={{ top: 16, right: 24, left: 16, bottom: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(v: any, _n: any, p: any) => [`${v}`, '分值']}
                labelFormatter={(l: any) => `${l}`}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#6366F1"
                strokeWidth={3}
                dot={<MoodDot />}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
  
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
            情绪趋势
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">情绪波动指数</div>
            <div className="text-indigo-600 font-semibold">68%</div>
          </div>
        </div>
      </Card>
    )
  }
  