import React, { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../apiClient'

// 统一的数据类型定义
type SimpleRecordItem = {
  id: number
  date: string
  mood_description?: string
  mood_score?: number
  mood_category?: string
  fitness_description?: string
  fitness_calories?: number
  fitness_duration?: number
  fitness_type?: string
  study_description?: string
  study_duration?: number
  study_subject?: string
  work_description?: string
  work_task_type?: string
  work_priority?: string
  work_complexity?: string
  work_estimated_hours?: number
  inspiration_description?: string
  inspiration_theme?: string
  inspiration_product?: string
  inspiration_difficulty?: string
  life_description?: string
  created_at?: string
}

type SimpleRecordEdit = {
  date?: string
  mood_description?: string
  fitness_description?: string
  study_description?: string
  work_description?: string
  inspiration_description?: string
}

type CategoryKey = 'mood' | 'life' | 'study' | 'work' | 'inspiration'

export default function AIDataPage() {
  // 数据状态
  const [items, setItems] = useState<SimpleRecordItem[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<CategoryKey>('mood')

  // 批量选择
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 7

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Partial<SimpleRecordEdit>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // 批量管理模式状态
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await apiClient.get(`/api/simple-records`, { params })
      // API返回格式: {records: [...], stats: {...}}
      const records = data?.records || []
      setItems(Array.isArray(records) ? records : [])
    } catch (error) {
      console.error('加载数据失败:', error)
      setItems([]) // 设置为空数组避免渲染错误
    } finally {
      setLoading(false)
    }
  }, [from, to, category])

  useEffect(() => { 
    load()
  }, [load])

  // 窗口聚焦自动刷新
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  // 15秒轮询刷新
  useEffect(() => {
    const t = setInterval(() => load(), 15000)
    return () => clearInterval(t)
  }, [load])

  // 搜索过滤功能
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // 根据类别过滤数据
    filtered = filtered.filter(i => {
      if (category === 'life') {
        // life类别包含life_description和fitness_description，过滤掉空内容和"无"
        const hasLifeDesc = i.life_description && 
                           i.life_description.trim() !== '' && 
                           i.life_description.trim() !== '无';
        const hasFitnessDesc = i.fitness_description && 
                              i.fitness_description.trim() !== '' && 
                              i.fitness_description.trim() !== '无';
        return hasLifeDesc || hasFitnessDesc;
      } else {
        const categoryField = `${category}_description` as keyof SimpleRecordItem;
        const fieldValue = i[categoryField] as string;
        return fieldValue && 
               fieldValue.trim() !== '' && 
               fieldValue.trim() !== '无';
      }
    });
    
    // 关键词搜索
    if (keyword) {
      const k = keyword.trim().toLowerCase();
      filtered = filtered.filter(i => {
        if (category === 'life') {
          // life类别搜索life_description和fitness_description
          return (i.life_description || '').toLowerCase().includes(k) ||
                 (i.fitness_description || '').toLowerCase().includes(k) ||
                 i.date.toLowerCase().includes(k);
        } else {
          const categoryField = `${category}_description` as keyof SimpleRecordItem;
          return (i[categoryField] as string || '').toLowerCase().includes(k) ||
                 i.date.toLowerCase().includes(k);
        }
      });
    }
    
    return filtered;
  }, [items, keyword, category]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE)
  const displayed = useMemo(() => {
    if (filteredItems.length === 0) return []
    return filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  }, [filteredItems, currentPage])
  const allChecked = useMemo(() => filteredItems.length > 0 && selected.size === filteredItems.length, [filteredItems, selected])

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
    const body: SimpleRecordEdit = {
      date: editing.date,
      mood_description: editing.mood_description || '',
      fitness_description: editing.fitness_description || '',
      study_description: editing.study_description || '',
      work_description: editing.work_description || '',
      inspiration_description: editing.inspiration_description || '',
    }
    setSavingId(id)
    try {
      await apiClient.put(`/api/simple-records/${id}`, body)
      setEditingId(null)
      setEditing({})
      await load()
    } catch (error: any) {
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
      await apiClient.delete(`/api/simple-records/${id}`)
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
      await apiClient.delete('/api/simple-records/batch', { data: { ids } })
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

  return (
    <div className="space-y-4">

      {/* 批量上传区域 */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-slate-800">🤖上传数据，AI生成分析</h3>
          <div className="text-xs text-slate-500">
            支持批量上传{catLabel(category)}数据，AI自动分析
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              {category === 'mood' ? '示例(每行一条): 2025-09-19,心情非常好' :
               category === 'life' ? '示例(每行一条): 2025-09-19,健身1小时' :
               category === 'study' ? '示例(每行一条): 2025-09-19,学习React' :
               category === 'work' ? '示例(每行一条): 2025-09-19,完成项目' :
               category === 'inspiration' ? '示例(每行一条): 2025-09-19,新想法' :
               `${catLabel(category)}数据 (格式：日期,${catDescLabel(category).replace('描述', '')} 每行一条)`}
            </label>
            <textarea
              className="w-full h-32 rounded-xl border border-slate-300 p-3 text-xs focus:border-slate-500 focus:outline-none resize-none"
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
              className="h-7 rounded-lg bg-purple-600 text-white text-xs px-3 transition-colors active:scale-95 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? '上传并分析中...' : '上传并分析'}
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

      {/* 查询筛选条件 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-600">时间</div>
          <input type="date" className="h-8 rounded-lg border-2 border-slate-300 px-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500" style={{borderRadius: '0.5rem', border: '2px solid #cbd5e1'}} value={from} onChange={e=>setFrom(e.target.value)} />
          <span className="text-xs text-slate-500">至</span>
          <input type="date" className="h-8 rounded-lg border-2 border-slate-300 px-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500" style={{borderRadius: '0.5rem', border: '2px solid #cbd5e1'}} value={to} onChange={e=>setTo(e.target.value)} />
          <button className="h-8 rounded-lg bg-purple-600 text-white px-3 text-xs hover:bg-purple-700 transition-colors" onClick={load} disabled={loading}>查询</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 ml-2">类别</span>
          <select 
            className="h-8 rounded-lg border px-2 text-xs" 
            value={category} 
            onChange={e=>setCategory(e.target.value as CategoryKey)}
          >
            <option value="mood">心情</option>
            <option value="life">健身</option>
            <option value="study">学习</option>
            <option value="work">工作</option>
            <option value="inspiration">灵感</option>
          </select>
          <span className="text-xs text-slate-600 ml-2">关键词</span>
          <input placeholder="搜索内容" className="h-8 rounded-lg border px-2 text-xs" value={keyword} onChange={e=>setKeyword(e.target.value)} />
          <button className="h-8 rounded-lg bg-purple-600 text-white px-3 text-xs hover:bg-purple-700 transition-colors" onClick={load}>搜索</button>
        </div>
      </div>

      {/* AI分析结果列表 */}
      <div className="rounded-2xl border bg-white">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-medium text-slate-800">AI分析结果列表 (显示: {catLabel(category)})</div>
          <div className="flex items-center gap-3">
            <button 
              onClick={batchDelete} 
              className="h-7 rounded-lg bg-purple-600 text-white text-xs px-3 transition-colors active:scale-95 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={selected.size === 0}
            >
              批量删除
            </button>
            <div className="text-xs text-slate-500">{loading ? '加载中...' : `共 ${filteredItems.length} 条`}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-600 border-b text-xs font-medium">
                <th className="px-3 py-2 whitespace-nowrap">
                  <input type="checkbox" checked={allChecked} onChange={e=>toggleAll(e.target.checked)} className="w-4 h-4 rounded-md border-2 border-slate-300 text-purple-600 focus:ring-purple-500 focus:ring-2" />
                </th>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">{catLabel(category)}</th>
                {category === 'mood' && (
                  <>
                    <th className="px-3 py-2">Emoji</th>
                    <th className="px-3 py-2">分值</th>
                    <th className="px-3 py-2">分类</th>
                  </>
                )}
                {category === 'life' && (
                  <>
                    <th className="px-3 py-2">强度</th>
                    <th className="px-3 py-2">时长</th>
                    <th className="px-3 py-2">消耗</th>
                    <th className="px-3 py-2">类型</th>
                  </>
                )}
                {category === 'study' && (
                  <>
                    <th className="px-3 py-2">时长</th>
                    <th className="px-3 py-2">科目</th>
                  </>
                )}
                {category === 'work' && (
                  <>
                    <th className="px-3 py-2">任务类型</th>
                    <th className="px-3 py-2">优先级</th>
                    <th className="px-3 py-2">复杂度</th>
                    <th className="px-3 py-2">预估时长</th>
                  </>
                )}
                {category === 'inspiration' && (
                  <>
                    <th className="px-3 py-2">主题</th>
                    <th className="px-3 py-2">产品形态</th>
                    <th className="px-3 py-2">难度</th>
                  </>
                )}
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(item => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(item.id)} onChange={e=>toggle(item.id, e.target.checked)} className="w-4 h-4 rounded-md border-2 border-slate-300 text-purple-600 focus:ring-purple-500 focus:ring-2" />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <input type="date" value={editing.date as string} onChange={e=>setEditing(prev=>({...prev, date: e.target.value}))} className="h-7 rounded-lg border-2 border-slate-300 px-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500" style={{borderRadius: '0.5rem', border: '2px solid #cbd5e1'}} />
                    ) : item.date}
                  </td>
                  <td className="px-3 py-2 max-w-[180px]">
                    {editingId === item.id ? (
                      <input 
                        type="text" 
                        value={category === 'life' ? (editing.fitness_description || '') : (editing[`${category}_description` as keyof SimpleRecordEdit] || '')} 
                        onChange={e=>setEditing(prev=>({...prev, [category === 'life' ? 'fitness_description' : `${category}_description`]: e.target.value}))} 
                        className="h-7 w-full rounded border px-2 text-xs" 
                        placeholder={`${catLabel(category)}描述`}
                      />
                    ) : (
                      <span className="truncate inline-block max-w-full" title={category === 'life' ? item.fitness_description : item[`${category}_description` as keyof SimpleRecordItem] as string}>
                        {category === 'life' ? item.fitness_description : item[`${category}_description` as keyof SimpleRecordItem] || '—'}
                      </span>
                    )}
                  </td>
                  {category === 'mood' && (
                    <>
                      <td className="px-3 py-2">{item.mood_score ? '😊' : '—'}</td>
                      <td className="px-3 py-2">{item.mood_score || '—'}</td>
                      <td className="px-3 py-2">{item.mood_category || '—'}</td>
                    </>
                  )}
                  {category === 'life' && (
                    <>
                      <td className="px-3 py-2">{item.fitness_calories || '—'}</td>
                      <td className="px-3 py-2">{item.fitness_duration ? `${item.fitness_duration}分钟` : '—'}</td>
                      <td className="px-3 py-2">{item.fitness_calories ? `${item.fitness_calories}卡` : '—'}</td>
                      <td className="px-3 py-2">{item.fitness_type || '—'}</td>
                    </>
                  )}
                  {category === 'study' && (
                    <>
                      <td className="px-3 py-2">{item.study_duration ? `${item.study_duration}分钟` : '—'}</td>
                      <td className="px-3 py-2">{item.study_subject || '—'}</td>
                    </>
                  )}
                  {category === 'work' && (
                    <>
                      <td className="px-3 py-2">{item.work_task_type || '—'}</td>
                      <td className="px-3 py-2">{item.work_priority || '—'}</td>
                      <td className="px-3 py-2">{item.work_complexity || '—'}</td>
                      <td className="px-3 py-2">{item.work_estimated_hours ? `${item.work_estimated_hours}小时` : '—'}</td>
                    </>
                  )}
                  {category === 'inspiration' && (
                    <>
                      <td className="px-3 py-2">{item.inspiration_theme || '—'}</td>
                      <td className="px-3 py-2">{item.inspiration_product || '—'}</td>
                      <td className="px-3 py-2">{item.inspiration_difficulty || '—'}</td>
                    </>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <>
                        <button className="h-7 rounded bg-indigo-600 text-white px-2 mr-2 text-xs" onClick={()=>saveEdit(item.id)} disabled={savingId === item.id}>
                          {savingId === item.id ? '保存中...' : '保存'}
                        </button>
                        <button className="h-7 rounded border px-2 text-xs" onClick={()=>{setEditingId(null); setEditing({})}} disabled={savingId === item.id}>取消</button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="h-7 rounded border px-2 mr-2 text-xs transition-colors active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" 
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
                <tr><td className="px-4 py-6 text-slate-500" colSpan={8}>暂无数据</td></tr>
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
                className="h-7 rounded-lg border text-xs px-2 transition-colors active:scale-95 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="h-7 rounded-lg border text-xs px-2 transition-colors active:scale-95 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
