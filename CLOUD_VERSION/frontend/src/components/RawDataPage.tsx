import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

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
  mood_score?: number
  mood_category?: string
  fitness_intensity?: string
  fitness_duration?: string
  fitness_calories?: string
  fitness_type?: string
  study_duration?: string
  study_category?: string
  work_summary?: string
  work_task_type?: string
  work_priority?: string
  work_complexity?: string
  work_estimated_hours?: number
  inspiration_theme?: string
  inspiration_product?: string
  inspiration_difficulty?: string
  created_at?: string
}

type CategoryKey = 'mood' | 'life' | 'study' | 'work' | 'inspiration'


export default function RawDataPage() {
  const [items, setItems] = useState<SimpleRecordItem[]>([])
  // Removed loading state as requested
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState<CategoryKey>('mood')

  // 批量选择
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Partial<SimpleRecordItem>>({})

  // 移除学习图表相关状态，原始数据页面专注于数据管理

  // 数据输入相关状态
  const [inputData, setInputData] = useState('')
  const [uploading, setUploading] = useState(false)

  // 上传数据到后端并进行AI分析
  const uploadData = async () => {
    if (!inputData.trim()) {
      alert('请输入数据')
      return
    }

    setUploading(true)
    try {
      // 解析输入数据
      const lines = inputData.trim().split('\n').filter(line => line.trim())
      const data: { date: string; description: string }[] = []

      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim())
        if (parts.length >= 2) {
          const date = parts[0]
          const description = parts[1]
          
          if (date && description) {
            data.push({ date, description })
          }
        }
      }

      if (data.length === 0) {
        alert('请输入有效的数据格式：日期,描述（每行一条）')
        return
      }

      // 根据当前分类发送到不同的API端点
      const endpoint = `${category}-data/batch`
      
      const response = await axios.post(`/api/${endpoint}`, { data })
      
      if (response.data.success) {
        alert(`成功上传并分析了 ${data.length} 条数据`)
        setInputData('')
        await load() // 重新加载数据
      } else {
        alert('上传失败：' + (response.data.message || '未知错误'))
      }
    } catch (error: any) {
      console.error('上传数据失败:', error)
      alert('上传失败：' + (error.response?.data?.message || error.message || '网络错误'))
    } finally {
      setUploading(false)
    }
  }

  async function load() {
    try {
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await axios.get(`/api/simple-records`, { params })
      // 处理Turso API返回的数据格式 {records, stats, source}
      const records = data.records || data || []
      setItems(Array.isArray(records) ? records : [])
      console.log(`✅ 从Turso加载了 ${records.length} 条数据`, data.source)
    } catch (error) {
      console.error('加载原始数据失败:', error)
      setItems([]) // 设置为空数组避免渲染错误
    }
  }

  useEffect(() => { 
    load()
  }, [])

  // 移除学习图表数据处理，专注于原始数据管理

  const displayed = useMemo(() => items, [items])
  const allChecked = useMemo(() => items.length > 0 && selected.size === items.length, [items, selected])

  function toggleAll(checked: boolean) {
    setSelectAll(checked)
    if (checked) {
      setSelected(new Set(items.map(i => i.id)))
    } else {
      setSelected(new Set())
    }
  }

  function toggle(id: number, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(id); else next.delete(id)
    setSelected(next)
  }

  function startEdit(item: SimpleRecordItem) {
    setEditingId(item.id)
    setEditing({ ...item })
  }

  async function saveEdit(id: number) {
    const body = {
      date: editing.date,
      mood_description: editing.mood_description || '',
      life_description: editing.life_description || '',
      study_description: editing.study_description || '',
      work_description: editing.work_description || '',
      inspiration_description: editing.inspiration_description || '',
    }
    await axios.put(`/api/simple-records/${id}`, body)
    setEditingId(null)
    setEditing({})
    await load()
  }

  async function remove(id: number) {
    await axios.delete(`/api/simple-records/${id}`)
    await load()
  }

  async function batchDelete() {
    const ids = Array.from(selected)
    if (!ids.length) return
    await axios.delete('/api/simple-records/batch', { data: { ids } })
    setSelected(new Set())
    setSelectAll(false)
    await load()
  }

  const catLabel = (k: CategoryKey) => ({
    mood: '心情',
    life: '健身打卡',
    study: '学习',
    work: '工作',
    inspiration: '灵感',
  }[k])

  const catDescLabel = (k: CategoryKey) => ({
    mood: '心情描述',
    life: '健身打卡描述',
    study: '学习描述',
    work: '工作描述',
    inspiration: '灵感描述',
  }[k])

  // 移除学习图表相关函数，专注于数据管理

  // 取消图表展示，专注于列表 CRUD

  return (
    <div className="space-y-4">



      {/* 数据输入上传区域 */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">📝 {catLabel(category)}数据上传</h3>
          <div className="text-sm text-slate-500">
            支持批量上传{catLabel(category)}数据，AI自动分析
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {catLabel(category)}数据 (格式：日期,{catDescLabel(category).replace('描述', '')} 每行一条)
            </label>
            <textarea
              className="w-full h-32 rounded-xl border border-slate-300 p-3 text-sm focus:border-slate-500 focus:outline-none resize-none"
              placeholder={`示例：
2025-01-01,${category === 'mood' ? '今天心情很好，完成了重要的项目' : 
                 category === 'life' ? '晨跑30分钟，感觉很棒' :
                 category === 'study' ? '学习React hooks，做了练习项目' :
                 category === 'work' ? '完成了API接口开发，修复了3个bug' :
                 '有了一个很棒的产品创意想法'}
2025-01-02,${category === 'mood' ? '有点紧张，明天要面试' : 
                 category === 'life' ? '去健身房做力量训练1小时' :
                 category === 'study' ? '阅读技术文档，学习新框架' :
                 category === 'work' ? '参加项目会议，讨论新功能' :
                 '设计了新的用户界面原型'}
2025-01-03,${category === 'mood' ? '很开心，和朋友聚餐了' : 
                 category === 'life' ? '瑜伽课程45分钟，放松身心' :
                 category === 'study' ? '完成在线课程一个章节' :
                 category === 'work' ? '代码review，优化性能' :
                 '想到了解决用户痛点的方案'}`}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={uploadData}
              disabled={uploading || !inputData.trim()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm hover:bg-slate-800 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {uploading ? '上传并分析中...' : '上传并分析'}
            </button>
            <button
              onClick={() => setInputData('')}
              disabled={uploading}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              清空
            </button>
          </div>
          
          <div className="text-xs text-slate-500">
            💡 AI会自动分析每条{catLabel(category)}数据，生成对应的{
              category === 'mood' ? 'Emoji、事件、分值和分类' :
              category === 'life' ? '强度、时长、消耗和运动类型' :
              category === 'study' ? '学习时长和类别' :
              category === 'work' ? '任务类型和优先级' :
              '主题、潜在产品形态和难度'
            }
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">时间</div>
          
          {/* 开始日期 */}
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">开始日期</label>
            <input 
              type="date" 
              className="h-9 w-[140px] rounded-xl border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none" 
              value={from} 
              onChange={e=>setFrom(e.target.value)}
              min="2025-06-01"
              max="2099-12-31"
            />
          </div>
          
          <span className="text-slate-500 mt-4">至</span>
          
          {/* 结束日期 */}
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">结束日期</label>
            <input 
              type="date" 
              className="h-9 w-[140px] rounded-xl border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none" 
              value={to} 
              onChange={e=>setTo(e.target.value)}
              min={from || "2025-06-01"}
              max="2099-12-31"
            />
          </div>
          
          <button className="h-9 rounded-xl bg-slate-900 text-white px-3 text-sm mt-4 hover:bg-slate-800 transition-colors" onClick={load}>查询</button>
          <button 
            className="h-9 rounded-xl border border-slate-300 text-slate-600 px-3 text-sm mt-4 hover:bg-slate-50 transition-colors" 
            onClick={() => {
              setFrom('')
              setTo('')
            }}
          >
            清空
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">类别</span>
          <select className="h-9 rounded-xl border px-2 text-sm" value={category} onChange={e=>setCategory(e.target.value as CategoryKey)}>
            <option value="mood">心情</option>
            <option value="life">健身打卡</option>
            <option value="study">学习</option>
            <option value="work">工作</option>
            <option value="inspiration">灵感</option>
          </select>
        </div>
      </div>

      {/* 列表 */}
      <div className="rounded-2xl border bg-white">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">AI处理数据列表（显示：{catLabel(category)}）</div>
          <div className="flex items-center gap-3">
            <button onClick={batchDelete} className="h-8 rounded-xl border text-sm px-3" disabled={selected.size === 0}>批量删除</button>
            <div className="text-sm text-slate-500">共 {displayed.length} 条</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="px-4 py-2"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(e.target.checked)} /></th>
                <th className="px-4 py-2">日期</th>
                <th className="px-4 py-2">{catDescLabel(category)}</th>
                {category === 'mood' && (
                  <>
                    <th className="px-4 py-2">Emoji(AI总结)</th>
                    <th className="px-4 py-2">心情事件(AI总结)</th>
                    <th className="px-4 py-2">分值(AI总结)</th>
                    <th className="px-4 py-2">分类(AI总结)</th>
                  </>
                )}
                {category === 'life' && (
                  <>
                    <th className="px-4 py-2">强度(AI总结)</th>
                    <th className="px-4 py-2">运动总时间(AI总结)</th>
                    <th className="px-4 py-2">运动消耗预估(AI总结)</th>
                    <th className="px-4 py-2">运动种类(AI总结)</th>
                  </>
                )}
                {category === 'study' && (
                  <>
                    <th className="px-4 py-2">学习时长(AI总结)</th>
                    <th className="px-4 py-2">类别(AI总结)</th>
                  </>
                )}
                {category === 'work' && (
                  <>
                    <th className="px-4 py-2">类型(AI总结)</th>
                    <th className="px-4 py-2">优先级(AI总结)</th>
                  </>
                )}
                {category === 'inspiration' && (
                  <>
                    <th className="px-4 py-2">主题（AI提炼）</th>
                    <th className="px-4 py-2">潜在产品形态（AI总结）</th>
                    <th className="px-4 py-2">难度（AI总结）</th>
                  </>
                )}
                <th className="px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(item => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2"><input type="checkbox" checked={selected.has(item.id)} onChange={e=>toggle(item.id, e.target.checked)} /></td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <input type="date" value={editing.date as string} onChange={e=>setEditing(prev=>({...prev, date: e.target.value}))} className="h-8 rounded border px-2" />
                    ) : item.date}
                  </td>
                  <td className="px-4 py-2 max-w-[420px]">
                    {editingId === item.id ? (
                      <input 
                        type="text" 
                        value={editing[`${category}_description` as keyof SimpleRecordItem] as string || ''} 
                        onChange={e=>setEditing(prev=>({...prev, [`${category}_description`]: e.target.value}))} 
                        className="h-8 w-full rounded border px-2" 
                      />
                    ) : (
                      <span className="truncate inline-block max-w-full" title={item[`${category}_description` as keyof SimpleRecordItem] as string}>
                        {item[`${category}_description` as keyof SimpleRecordItem] as string}
                      </span>
                    )}
                  </td>
                  {category === 'mood' && (
                    <>
                      <td className="px-4 py-2 text-center">
                        <span className="text-lg">{item.mood_emoji || '😐'}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-sm text-slate-600">{item.mood_event || '无事件'}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-sm font-medium ${(item.mood_score || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.mood_score !== undefined ? item.mood_score : 0}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                          {item.mood_category || '未分类'}
                        </span>
                      </td>
                    </>
                  )}
                  {category === 'life' && (
                    <>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.fitness_intensity || '中强度'}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.fitness_duration || '30分钟'}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.fitness_calories || '200卡'}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.fitness_type || '综合训练'}</span>
                      </td>
                    </>
                  )}
                  {category === 'study' && (
                    <>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.study_duration || '未提及'}</span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.study_category || '其他'}</span>
                      </td>
                    </>
                  )}
                  {category === 'work' && (
                    <>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          item.work_task_type === '规划' ? 'bg-blue-100 text-blue-800' :
                          item.work_task_type === '开发' ? 'bg-green-100 text-green-800' :
                          item.work_task_type === 'UI/UX设计' ? 'bg-purple-100 text-purple-800' :
                          item.work_task_type === '部署' ? 'bg-orange-100 text-orange-800' :
                          item.work_task_type === '功能集成' ? 'bg-yellow-100 text-yellow-800' :
                          item.work_task_type === '测试/收尾' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.work_task_type || '开发'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          item.work_priority === '高' ? 'bg-red-100 text-red-800' :
                          item.work_priority === '中' ? 'bg-yellow-100 text-yellow-800' :
                          item.work_priority === '低' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.work_priority || '中'}
                        </span>
                      </td>
                    </>
                  )}
                  {category === 'inspiration' && (
                    <>
                      <td className="px-4 py-2 text-center">
                        <span className="text-sm text-slate-600">{item.inspiration_theme || '—'}</span>
                      </td>
                      <td className="px-4 py-2 max-w-[320px]">
                        <span className="text-sm text-slate-600" title={item.inspiration_product || '—'}>
                          {item.inspiration_product || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          item.inspiration_difficulty === '高' ? 'bg-red-100 text-red-800' :
                          item.inspiration_difficulty === '中' ? 'bg-yellow-100 text-yellow-800' :
                          item.inspiration_difficulty === '低' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.inspiration_difficulty || '中'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <>
                        <button className="h-8 rounded bg-indigo-600 text-white px-3 mr-2" onClick={()=>saveEdit(item.id)}>保存</button>
                        <button className="h-8 rounded border px-3" onClick={()=>{setEditingId(null); setEditing({})}}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className="h-8 rounded border px-3 mr-2" onClick={()=>startEdit(item)}>编辑</button>
                        <button className="h-8 rounded border px-3" onClick={()=>remove(item.id)}>删除</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!displayed.length && (
                <tr><td className="px-4 py-6 text-slate-500" colSpan={category === 'mood' ? 8 : category === 'life' ? 8 : category === 'study' ? 6 : category === 'work' ? 6 : category === 'inspiration' ? 7 : 4}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {null}
    </div>
  )
}


