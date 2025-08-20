import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface RawDataItem {
  id: number;
  date: string;
  mood_text: string;
  life_text: string;
  study_text: string;
  work_text: string;
  inspiration_text: string;
  created_at: string;
}

interface AIDataItem {
  id: number;
  raw_entry_id: number;
  date: string;
  mood_score: number;
  mood_emoji: string;
  mood_description: string;
  life_score: number;
  study_score: number;
  work_score: number;
  inspiration_score: number;
  summary: string;
  ai_model: string;
  processed_at: string;
}

interface ChartDataItem {
  date: string;
  mood: number;
  life: number;
  study: number;
  work: number;
  inspiration: number;
}

interface DashboardData {
  rawData: RawDataItem[];
  aiData: AIDataItem[];
  chartData: ChartDataItem[];
  stats: {
    totalRecords: number;
    aiProcessedRecords: number;
    dateRange: {
      start: string;
      end: string;
    } | null;
    averageScores: {
      mood: number;
      life: number;
      study: number;
      work: number;
      inspiration: number;
    } | null;
  };
}

export default function DataDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'raw' | 'ai'>('chart');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard-data');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.message || '获取数据失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('获取仪表板数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-500 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-semibold">数据加载失败</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <button 
              onClick={fetchDashboardData}
              className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">数据仪表板</h1>
        <p className="text-gray-600">个人数据分析与可视化</p>
      </div>

      {/* 统计卡片 */}
      {data.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">总记录数</div>
            <div className="text-2xl font-bold text-blue-600">{data.stats.totalRecords}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">AI 处理数</div>
            <div className="text-2xl font-bold text-green-600">{data.stats.aiProcessedRecords}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">数据范围</div>
            <div className="text-sm text-gray-700">
              {data.stats.dateRange ? `${data.stats.dateRange.start} 至 ${data.stats.dateRange.end}` : '无数据'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">平均心情</div>
            <div className="text-2xl font-bold text-purple-600">
              {data.stats.averageScores ? `${data.stats.averageScores.mood}/5` : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'chart', label: '📊 图表分析', count: data.chartData.length },
            { id: 'raw', label: '📝 原始数据', count: data.rawData.length },
            { id: 'ai', label: '🤖 AI 分析', count: data.aiData.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      {activeTab === 'chart' && (
        <div className="space-y-8">
          {data.chartData.length > 0 ? (
            <>
              {/* 折线图 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">趋势分析</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="mood" stroke="#8b5cf6" name="心情" strokeWidth={2} />
                    <Line type="monotone" dataKey="life" stroke="#10b981" name="生活" strokeWidth={2} />
                    <Line type="monotone" dataKey="study" stroke="#3b82f6" name="学习" strokeWidth={2} />
                    <Line type="monotone" dataKey="work" stroke="#f59e0b" name="工作" strokeWidth={2} />
                    <Line type="monotone" dataKey="inspiration" stroke="#ef4444" name="灵感" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 柱状图 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">评分对比</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="mood" fill="#8b5cf6" name="心情" />
                    <Bar dataKey="life" fill="#10b981" name="生活" />
                    <Bar dataKey="study" fill="#3b82f6" name="学习" />
                    <Bar dataKey="work" fill="#f59e0b" name="工作" />
                    <Bar dataKey="inspiration" fill="#ef4444" name="灵感" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无图表数据</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">原始数据记录</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">心情</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生活</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学习</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工作</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">灵感</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.rawData.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.mood_text || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.life_text || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.study_text || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.work_text || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.inspiration_text || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">AI 分析结果</h3>
          </div>
          {data.aiData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">心情</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生活</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">学习</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">工作</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">灵感</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总结</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.aiData.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <span className="mr-1">{item.mood_emoji}</span>
                          <span>{item.mood_score}/5</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.life_score}/5
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.study_score}/5
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.work_score}/5
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.inspiration_score}/5
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {item.summary || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">暂无 AI 分析数据</p>
              <p className="text-sm text-gray-400 mt-2">数据正在处理中，请稍后刷新</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
