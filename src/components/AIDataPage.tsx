import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type RawTextItem = {
  id: number
  date: string
  mood_text?: string
  fitness_text?: string
  study_text?: string
  work_text?: string
  inspiration_text?: string
  created_at?: string
}


export default function AIDataPage() {
  const [items, setItems] = useState<RawTextItem[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [keyword, setKeyword] = useState('')

  // 新增数据的状态
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: ''
  })
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Partial<RawTextItem>>({})

  // AI批处理相关状态
  const [processing, setProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<{
    success: boolean;
    message: string;
    processed: number;
    total: number;
  } | null>(null)

  // AI批处理函数
  async function processBatch() {
    if (processing) return;
    
    if (!confirm('确定要开始AI批处理吗？这将处理所有未处理的原始数据，可能需要一些时间。')) {
      return;
    }

    setProcessing(true);
    setProcessResult(null);
    
    try {
      const response = await axios.post('/api/ai-batch-process', { limit: 20 });
      
      if (response.data.success) {
        setProcessResult({
          success: true,
          message: response.data.message,
          processed: response.data.processed,
          total: response.data.total
        });
        
        // 刷新数据列表
        await load();
      } else {
        setProcessResult({
          success: false,
          message: response.data.error || '处理失败',
          processed: 0,
          total: 0
        });
      }
    } catch (error: any) {
      console.error('AI批处理失败:', error);
      setProcessResult({
        success: false,
        message: error.response?.data?.message || error.message || 'AI批处理失败',
        processed: 0,
        total: 0
      });
    } finally {
      setProcessing(false);
    }
  }

  async function load() {
    setLoading(true)
    try {
      const params: any = {}
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await axios.get(`/api/raw-entries`, { params })
      setItems(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load() 
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const displayed = useMemo(() => {
    if (!keyword) return items
    const k = keyword.trim().toLowerCase()
    return items.filter(i =>
      (i.mood_text || '').toLowerCase().includes(k) ||
      (i.fitness_text || '').toLowerCase().includes(k) ||
      (i.study_text || '').toLowerCase().includes(k) ||
      (i.work_text || '').toLowerCase().includes(k) ||
      (i.inspiration_text || '').toLowerCase().includes(k) ||
      i.date.toLowerCase().includes(k)
    )
  }, [items, keyword])

  async function addEntry() {
    if (!newEntry.description.trim()) {
      alert('请输入描述内容')
      return
    }
    
    setAdding(true)
    try {
      const rawText = `日期：${newEntry.date}\n${newEntry.description}`
      await axios.post('/api/parse-raw-text', { raw_text: rawText })
      setNewEntry({
        date: new Date().toISOString().slice(0, 10),
        description: ''
      })
      await load()
    } catch (error: any) {
      console.error('添加数据失败:', error)
      alert('添加失败：' + (error.response?.data?.message || error.message))
    } finally {
      setAdding(false)
    }
  }

  function startEdit(item: RawTextItem) {
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
    await axios.put(`/api/raw-entries/${id}`, body)
    setEditingId(null)
    setEditing({})
    await load()
  }

  async function remove(id: number) {
    await axios.delete(`/api/raw-entries/${id}`)
    await load()
  }

  return (
    <div className="space-y-4">
      {/* AI批处理区域 */}
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              🤖 AI批处理原始数据
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              将原始数据通过AI分析后存储到AI处理数据表中
            </p>
          </div>
          <button
            onClick={processBatch}
            disabled={processing}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
              processing 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {processing ? '🔄 AI处理中...' : '🚀 开始AI批处理'}
          </button>
        </div>
        
        {/* 处理结果显示 */}
        {processResult && (
          <div className={`p-4 rounded-xl mb-4 ${
            processResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`flex items-center gap-2 text-sm font-medium ${
              processResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              <span>{processResult.success ? '✅' : '❌'}</span>
              <span>{processResult.message}</span>
            </div>
            {processResult.success && processResult.total > 0 && (
              <div className="mt-2 text-xs text-green-700">
                成功处理 {processResult.processed} 条，共 {processResult.total} 条数据
              </div>
            )}
          </div>
        )}

        {/* 处理进度指示器 */}
        {processing && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-slate-700">正在进行AI分析，请稍候...</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              💡 系统正在调用AI接口分析原始数据，生成心情、健身、学习、工作、灵感等结构化数据
            </div>
          </div>
        )}
        
        <div className="text-xs text-slate-500">
          💡 AI会自动分析原始文本，提取并生成：心情分值和表情、运动类型和消耗、学习时长和类别、工作优先级和复杂度、灵感主题和难度等信息
        </div>
      </div>

      {/* 新增数据表单 - 放在最前面 */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="font-medium mb-3">📝 新增原始数据</div>
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
              className="h-9 rounded-xl bg-indigo-600 text-white px-4 text-sm hover:bg-indigo-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed" 
              onClick={addEntry}
              disabled={adding || !newEntry.description.trim()}
            >
              {adding ? '添加中...' : '添加数据'}
            </button>
            <button 
              className="h-9 rounded-xl border border-slate-300 text-slate-600 px-4 text-sm hover:bg-slate-50 transition-colors" 
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
        </div>
      </div>

      <div className="rounded-2xl border bg-white">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-medium">原始数据列表</div>
          <div className="text-sm text-slate-500">{loading ? '加载中...' : `共 ${displayed.length} 条`}</div>
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
                    {editingId === item.id ? (
                      <input value={editing.mood_text || ''} onChange={e=>setEditing(prev=>({...prev, mood_text: e.target.value}))} className="h-8 rounded border px-2 w-full" />
                    ) : <span className="truncate inline-block max-w-full" title={item.mood_text}>{item.mood_text || '—'}</span>}
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    {editingId === item.id ? (
                      <input value={editing.fitness_text || ''} onChange={e=>setEditing(prev=>({...prev, fitness_text: e.target.value}))} className="h-8 rounded border px-2 w-full" />
                    ) : <span className="truncate inline-block max-w-full" title={item.fitness_text}>{item.fitness_text || '—'}</span>}
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    {editingId === item.id ? (
                      <input value={editing.study_text || ''} onChange={e=>setEditing(prev=>({...prev, study_text: e.target.value}))} className="h-8 rounded border px-2 w-full" />
                    ) : <span className="truncate inline-block max-w-full" title={item.study_text}>{item.study_text || '—'}</span>}
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    {editingId === item.id ? (
                      <input value={editing.work_text || ''} onChange={e=>setEditing(prev=>({...prev, work_text: e.target.value}))} className="h-8 rounded border px-2 w-full" />
                    ) : <span className="truncate inline-block max-w-full" title={item.work_text}>{item.work_text || '—'}</span>}
                  </td>
                  <td className="px-4 py-2 max-w-[180px]">
                    {editingId === item.id ? (
                      <input value={editing.inspiration_text || ''} onChange={e=>setEditing(prev=>({...prev, inspiration_text: e.target.value}))} className="h-8 rounded border px-2 w-full" />
                    ) : <span className="truncate inline-block max-w-full" title={item.inspiration_text}>{item.inspiration_text || '—'}</span>}
                  </td>
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
                <tr><td className="px-4 py-6 text-slate-500" colSpan={7}>暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


