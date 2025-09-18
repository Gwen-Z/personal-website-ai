import React, { useEffect, useMemo, useState } from 'react'
import apiClient from '../apiClient'

type RawDataItem = {
  id: number
  date: string
  mood_text?: string
  fitness_text?: string
  study_text?: string
  work_text?: string
  inspiration_text?: string
  raw_text_content?: string
  category?: string
  created_at?: string
  processed_at?: string
  raw_text?: string
  life_text?: string
  description?: string
  duration?: string
  intensity?: string
  mood?: string
  notes?: string
  // AI分析字段
  mood_emoji?: string
  mood_event?: string
  mood_score?: number
  mood_category?: string
}

type CategoryKey = 'mood' | 'life' | 'study' | 'work' | 'inspiration'


export default function RawDataPage() {
  const [items, setItems] = useState<RawDataItem[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState<CategoryKey>('mood')

  // 批量选择
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 7

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Partial<RawDataItem>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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
        const firstCommaIndex = line.indexOf(',')
        if (firstCommaIndex !== -1) {
          const date = line.substring(0, firstCommaIndex).trim()
          const description = line.substring(firstCommaIndex + 1).trim()

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
      
      const response = await apiClient.post(`/api/${endpoint}`, { data })
      
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
    setLoading(true)
    try {
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await apiClient.get(`/api/raw-entries`, { params })
      // API返回数组格式
      setItems(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载原始数据失败:', error)
      setItems([]) // 设置为空数组避免渲染错误
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load()
  }, [])

  // 移除学习图表数据处理，专注于原始数据管理

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const displayed = useMemo(() => {
    if (items.length === 0) return []
    return items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  }, [items, currentPage])
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

  function startEdit(item: RawDataItem) {
    setEditingId(item.id)
    setEditing({ ...item })
  }

  async function saveEdit(id: number) {
    const body = {
      date: editing.date,
      mood_text: editing.mood_text || '',
      fitness_text: editing.fitness_text || '',
      study_text: editing.study_text || '',
      work_text: editing.work_text || '',
      inspiration_text: editing.inspiration_text || '',
    }
    const prev = items
    const optimistic = items.map(i => i.id === id ? {
      ...i,
      date: String(body.date || i.date),
      mood_text: body.mood_text,
      fitness_text: body.fitness_text,
      study_text: body.study_text,
      work_text: body.work_text,
      inspiration_text: body.inspiration_text,
    } : i)
    setSavingId(id)
    setItems(optimistic)
    try {
      await apiClient.put(`/raw-entries/${id}`, body)
      setEditingId(null)
      setEditing({})
    } catch (error: any) {
      setItems(prev)
      console.error('保存编辑失败:', error)
      alert('保存失败：' + (error.response?.data?.message || error.response?.data?.error || error.message))
    } finally {
      setSavingId(null)
    }
  }

  async function remove(id: number) {
    if (!window.confirm('确认删除该条记录吗？此操作不可撤销。')) return
    const prev = items
    const optimistic = items.filter(i => i.id !== id)
    setDeletingId(id)
    setItems(optimistic)
    try {
      await apiClient.delete(`/raw-entries/${id}`)
      if (editingId === id) {
        setEditingId(null)
        setEditing({})
      }
    } catch (error: any) {
      setItems(prev)
      console.error('删除失败:', error)
      alert('删除失败：' + (error.response?.data?.message || error.response?.data?.error || error.message))
    } finally {
      setDeletingId(null)
    }
  }

  async function batchDelete() {
    const ids = Array.from(selected)
    if (!ids.length) return
    if (!window.confirm(`确认批量删除选中的 ${ids.length} 条记录吗？此操作不可撤销。`)) return
    const prev = items
    const optimistic = items.filter(i => !ids.includes(i.id))
    setItems(optimistic)
    try {
      await apiClient.delete('/raw-entries/batch', { data: { ids } })
      setSelected(new Set())
      setSelectAll(false)
    } catch (error: any) {
      setItems(prev)
      console.error('批量删除失败:', error)
      alert('批量删除失败：' + (error.response?.data?.message || error.response?.data?.error || error.message))
    }
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
          
          <button className="h-9 rounded-xl bg-slate-900 text-white px-3 text-sm mt-4 hover:bg-slate-800 transition-colors" onClick={load} disabled={loading}>查询</button>
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
          <div className="font-medium">原始数据录入列表（显示：{catLabel(category)}）</div>
          <div className="flex items-center gap-3">
            <button 
              onClick={batchDelete} 
              className="h-8 rounded-xl border text-sm px-3 transition-colors active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={selected.size === 0}
            >
              批量删除
            </button>
            <div className="text-sm text-slate-500">{loading ? '加载中...' : `共 ${items.length} 条`}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-600 border-b bg-slate-50">
                <th className="px-3 py-2 whitespace-nowrap"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(e.target.checked)} /></th>
                  <th className="px-3 py-2 whitespace-nowrap">日期</th>
                  <th className="px-3 py-2 whitespace-nowrap">{catDescLabel(category)}</th>
                  {category === 'mood' && (
                    <>
                      <th className="px-3 py-2 whitespace-nowrap text-center">Emoji(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">心情事件(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap text-center">分值(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">分类(AI)</th>
                    </>
                  )}
                  {category === 'life' && (
                    <>
                      <th className="px-3 py-2 whitespace-nowrap">强度(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">时长(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">消耗(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">运动类型(AI)</th>
                    </>
                  )}
                  {category === 'study' && (
                    <>
                      <th className="px-3 py-2 whitespace-nowrap">学习时长(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">学习类别(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">难度(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">进度(AI)</th>
                    </>
                  )}
                  {category === 'work' && (
                    <>
                      <th className="px-3 py-2 whitespace-nowrap">任务类型(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">优先级(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">完成度(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">影响范围(AI)</th>
                    </>
                  )}
                  {category === 'inspiration' && (
                    <>
                      <th className="px-3 py-2 whitespace-nowrap">主题(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">产品形态(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">难度(AI)</th>
                      <th className="px-3 py-2 whitespace-nowrap">可行性(AI)</th>
                    </>
                  )}
                <th className="px-3 py-2 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2"><input type="checkbox" checked={selected.has(item.id)} onChange={e=>toggle(item.id, e.target.checked)} /></td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {editingId === item.id ? (
                      <input type="date" value={editing.date as string} onChange={e=>setEditing(prev=>({...prev, date: e.target.value}))} className="h-7 rounded border px-2 text-xs" />
                    ) : item.date}
                  </td>
                  <td className="px-3 py-2 max-w-[150px] text-xs">
                    <div className="truncate cursor-help" title={item.mood_text || '无'}>
                      {item.mood_text || '无'}
                    </div>
                  </td>
                  {category === 'mood' && (
                    <>
                      <td className="px-3 py-2 text-center text-xs">
                        <span className="text-sm" title={item.mood_emoji || '无'}>
                          {item.mood_emoji || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[150px] text-xs">
                        <div className="truncate cursor-help" title={item.mood_event || '无'}>
                          {item.mood_event || '无'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        <span className="font-medium" title={item.mood_score?.toString() || '无'}>
                          {item.mood_score !== null && item.mood_score !== undefined ? item.mood_score : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[150px] text-xs">
                        <div className="truncate cursor-help" title={item.mood_category || '无'}>
                          {item.mood_category || '无'}
                        </div>
                      </td>
                    </>
                  )}
                  {category === 'life' && (
                    <>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.intensity || '无'}>
                          {item.intensity || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.duration || '无'}>
                          {item.duration || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.notes || '无'}>
                          {item.notes || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.category || '无'}>
                          {item.category || '—'}
                        </span>
                      </td>
                    </>
                  )}
                  {category === 'study' && (
                    <>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.duration || '无'}>
                          {item.duration || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.category || '无'}>
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.notes || '无'}>
                          {item.notes || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.description || '无'}>
                          {item.description || '—'}
                        </span>
                      </td>
                    </>
                  )}
                  {category === 'work' && (
                    <>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.category || '无'}>
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.intensity || '无'}>
                          {item.intensity || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.notes || '无'}>
                          {item.notes || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.description || '无'}>
                          {item.description || '—'}
                        </span>
                      </td>
                    </>
                  )}
                  {category === 'inspiration' && (
                    <>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.category || '无'}>
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.description || '无'}>
                          {item.description || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.notes || '无'}>
                          {item.notes || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span title={item.intensity || '无'}>
                          {item.intensity || '—'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <>
                        <button className="h-7 rounded bg-indigo-600 text-white px-2 mr-1 text-xs" onClick={()=>saveEdit(item.id)} disabled={savingId === item.id}>
                          {savingId === item.id ? '保存中...' : '保存'}
                        </button>
                        <button className="h-7 rounded border px-2 text-xs" onClick={()=>{setEditingId(null); setEditing({})}} disabled={savingId === item.id}>取消</button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="h-7 rounded border px-2 mr-1 text-xs transition-colors active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={()=>startEdit(item)} 
                          disabled={deletingId === item.id}
                        >
                          编辑
                        </button>
                        <button 
                          className="h-7 rounded border px-2 text-xs transition-colors active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={()=>remove(item.id)} 
                          disabled={deletingId === item.id}
                        >
                          {deletingId === item.id ? '删除中...' : '删除'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!displayed.length && (
                <tr><td className="px-3 py-6 text-slate-500 text-xs text-center" colSpan={8}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="text-xs text-slate-500">
              第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 rounded-xl border text-sm px-3 transition-colors active:scale-95 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-8 rounded-xl border text-sm px-3 transition-colors active:scale-95 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {null}
    </div>
  )
}


