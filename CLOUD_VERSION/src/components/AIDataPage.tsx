import React, { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../apiClient'

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
  inspiration_category?: string
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


export default function AIDataPage() {
  const [items, setItems] = useState<SimpleRecordItem[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [keyword, setKeyword] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 7

  // 新增数据的状态
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: ''
  })
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Partial<SimpleRecordEdit>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { 
    load() 
  }, [load])

  // 窗口聚焦自动刷新
  useEffect(() => {
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // 15秒轮询刷新
  useEffect(() => {
    const t = setInterval(() => load(), 15000)
    return () => clearInterval(t)
  }, [])

  const filteredItems = useMemo(() => {
    if (!keyword) return items;
    const k = keyword.trim().toLowerCase();
    return items.filter(i =>
      (i.mood_description || '').toLowerCase().includes(k) ||
      (i.life_description || '').toLowerCase().includes(k) ||
      (i.fitness_description || '').toLowerCase().includes(k) ||
      (i.study_description || '').toLowerCase().includes(k) ||
      (i.work_description || '').toLowerCase().includes(k) ||
      (i.inspiration_description || '').toLowerCase().includes(k) ||
      (i.mood_category || '').toLowerCase().includes(k) ||
      i.date.toLowerCase().includes(k)
    );
  }, [items, keyword]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const displayed = useMemo(() => {
    if (filteredItems.length === 0) return [];
    return filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredItems, currentPage]);

  async function addEntry() {
    if (!newEntry.description.trim()) {
      alert('请输入描述内容')
      return
    }
    
    // 解析文本内容
    const lines = newEntry.description.split('\n');
    const data = {
      date: newEntry.date,
      mood_description: lines.find(l => l.startsWith('心情:'))?.replace('心情:', '').trim() || '',
      fitness_description: lines.find(l => l.startsWith('健身:'))?.replace('健身:', '').trim() || '',
      study_description: lines.find(l => l.startsWith('学习:'))?.replace('学习:', '').trim() || '',
      work_description: lines.find(l => l.startsWith('工作:'))?.replace('工作:', '').trim() || '',
      inspiration_description: lines.find(l => l.startsWith('灵感:'))?.replace('灵感:', '').trim() || '',
    };
    
    // 验证至少有一个字段有内容
    if (!data.mood_description && !data.fitness_description && !data.study_description && !data.work_description && !data.inspiration_description) {
      alert('请至少输入一个维度的内容（心情、健身、学习、工作或灵感）')
      return
    }
    
    setAdding(true)
    try {
      await apiClient.post('/api/raw-entries', data)
      setNewEntry({
        date: new Date().toISOString().slice(0, 10),
        description: ''
      })
      await load()
    } catch (error: any) {
      console.error('添加数据失败:', error)
      alert('添加失败：' + (error.response?.data?.message || error.response?.data?.error || error.message))
    } finally {
      setAdding(false)
    }
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
    if (!window.confirm('确认删除这条原始记录吗？此操作不可撤销。')) return
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

  return (
    <div className="space-y-4">
      {/* 新增数据表单 - 放在最前面 */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-3">📝 新增AI分析数据</div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">日期</label>
              <input 
                type="date" 
                className="h-9 rounded-xl border px-3 text-sm w-full" 
                value={newEntry.date} 
                onChange={e=>setNewEntry({...newEntry, date: e.target.value})} 
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-500 mb-1">描述内容</label>
              <textarea
                className="w-full h-20 rounded-xl border px-3 py-2 text-sm resize-none"
                placeholder="输入你的日常记录，例如：
心情：今天很开心，完成了重要项目
健身：晨跑30分钟，感觉很棒
学习：学习React hooks，做了练习
工作：开发新功能，修复了几个bug
灵感：有了一个很棒的产品想法"
                value={newEntry.description}
                onChange={e=>setNewEntry({...newEntry, description: e.target.value})}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="h-8 rounded-xl bg-indigo-600 text-white px-3 text-xs hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed" 
              onClick={addEntry}
              disabled={adding || !newEntry.description.trim()}
            >
              {adding ? '添加中...' : '添加数据'}
            </button>
            <button 
              className="h-8 rounded-xl border border-slate-300 text-slate-600 px-3 text-xs hover:bg-slate-50 transition-colors" 
              onClick={() => setNewEntry({date: new Date().toISOString().slice(0, 10), description: ''})}
              disabled={adding}
            >
              清空
            </button>
          </div>
          <div className="text-xs text-slate-500">
            💡 系统会自动解析文本内容并进行AI分析，生成心情、健身、学习、工作、灵感等各类数据
          </div>
        </div>
      </div>

      {/* 查询筛选条件 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">时间</div>
          <input type="date" className="h-9 rounded-xl border px-2 text-sm" value={from} onChange={e=>setFrom(e.target.value)} />
          <span className="text-slate-500">至</span>
          <input type="date" className="h-9 rounded-xl border px-2 text-sm" value={to} onChange={e=>setTo(e.target.value)} />
          <button className="h-9 rounded-xl bg-slate-900 text-white px-3 text-sm" onClick={load} disabled={loading}>查询</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 ml-2">关键词</span>
          <input placeholder="搜索内容" className="h-9 rounded-xl border px-2 text-sm" value={keyword} onChange={e=>setKeyword(e.target.value)} />
          <button className="h-9 rounded-xl border px-3 text-sm" onClick={load}>同步</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">AI分析结果列表</div>
          <div className="text-sm text-slate-500">{loading ? '加载中...' : `共 ${filteredItems.length} 条`}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 border-b">
                <th className="px-4 py-2">日期</th>
                <th className="px-4 py-2">心情</th>
                <th className="px-4 py-2">健身</th>
                <th className="px-4 py-2">学习</th>
                <th className="px-4 py-2">工作</th>
                <th className="px-4 py-2">灵感</th>
                <th className="px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(item => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <input type="date" value={editing.date as string} onChange={e=>setEditing(prev=>({...prev, date: e.target.value}))} className="h-8 rounded border px-2" />
                    ) : item.date}
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    <span className="truncate inline-block max-w-full" title={item.mood_description}>{item.mood_description || '—'}</span>
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    <span className="truncate inline-block max-w-full" title={item.fitness_description || item.life_description}>
                      {item.fitness_description || item.life_description || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    <span className="truncate inline-block max-w-full" title={item.study_description}>{item.study_description || '—'}</span>
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    <span className="truncate inline-block max-w-full" title={item.work_description}>{item.work_description || '—'}</span>
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    <span className="truncate inline-block max-w-full" title={item.inspiration_description}>{item.inspiration_description || '—'}</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {editingId === item.id ? (
                      <>
                        <button className="h-8 rounded bg-indigo-600 text-white px-3 mr-2" onClick={()=>saveEdit(item.id)} disabled={savingId === item.id}>
                          {savingId === item.id ? '保存中...' : '保存'}
                        </button>
                        <button className="h-8 rounded border px-3" onClick={()=>{setEditingId(null); setEditing({})}} disabled={savingId === item.id}>取消</button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="h-8 rounded border px-3 mr-2 transition-colors active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={()=>startEdit(item)} 
                          disabled={deletingId === item.id}
                        >
                          编辑
                        </button>
                        <button 
                          className="h-8 rounded border px-3 transition-colors active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed" 
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
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>暂无数据</td></tr>
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
    </div>
  )
}


