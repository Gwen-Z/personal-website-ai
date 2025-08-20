import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InspirationData {
  id: number;
  date: string;
  inspiration_description: string;
  inspiration_theme: string;
  inspiration_product: string;
  inspiration_difficulty: string;
  inspiration_progress: string;
}

interface BubbleData {
  x: number; // 日期转换为数字
  y: number; // 主题类别对应的Y轴位置
  z: number; // 气泡大小（产品价值潜力）
  date: string;
  theme: string;
  product: string;
  difficulty: string;
  description: string;
  color: string;
}

interface TimelineBubbleChartProps {
  data: InspirationData[];
  width?: number;
  height?: number;
  from?: string;
  to?: string;
}

const TimelineBubbleChart: React.FC<TimelineBubbleChartProps> = ({ 
  data, 
  width = 800, 
  height = 400,
  from,
  to,
}) => {
  // 主题类别映射到Y轴位置（大幅增加间距以容纳大气泡）
  const themeCategories = useMemo(() => {
    const themes = [...new Set(data.map(item => item.inspiration_theme).filter(Boolean))];
    console.log('所有主题:', themes);
    const categories = themes.reduce((acc, theme, index) => {
      // 使用间距为4的等距分布，从4开始，确保大气泡不重叠
      acc[theme] = (index + 1) * 4;
      return acc;
    }, {} as Record<string, number>);
    console.log('主题Y轴映射:', categories);
    return categories;
  }, [data]);

  // 转换数据为气泡图格式
  const bubbleData = useMemo(() => {
    console.log('TimelineBubbleChart 原始数据:', data);
    const filteredData = data
      .filter(item => 
        item.inspiration_description && 
        item.inspiration_theme && 
        item.inspiration_difficulty && // 过滤掉空难度值
        item.inspiration_difficulty.trim() !== '' // 过滤掉空字符串
      );
    console.log('TimelineBubbleChart 过滤后数据:', filteredData);
    
    return filteredData
      .map((item, index): BubbleData => {
        // 将日期转换为时间戳用于X轴
        const dateValue = new Date(item.date).getTime();
        
        // 获取主题对应的Y轴位置
        const yValue = themeCategories[item.inspiration_theme] || 0;
        
        // 根据产品难度计算气泡大小（适配更大的Y轴间距）
        let bubbleSize = 40; // 基础大小
        switch (item.inspiration_difficulty) {
          case '高':
            bubbleSize = 120; // 大气泡 - 高难度
            break;
          case '中':
            bubbleSize = 80; // 中气泡 - 中难度
            break;
          case '低':
            bubbleSize = 40; // 小气泡 - 低难度
            break;
          default:
            bubbleSize = 80; // 默认大小
        }
        
        // 使用按钮配色风格（indigo蓝色系）
        let color = '#6366f1'; // 默认 indigo-600
        switch (item.inspiration_difficulty) {
          case '高':
            color = '#4338ca'; // indigo-700 - 深蓝色，表示高难度
            break;
          case '中':
            color = '#6366f1'; // indigo-600 - 标准蓝色，表示中难度
            break;
          case '低':
            color = '#818cf8'; // indigo-400 - 浅蓝色，表示低难度
            break;
          default:
            color = '#6366f1'; // 默认 indigo-600
        }
        
        const bubblePoint = {
          x: dateValue,
          y: yValue,
          z: bubbleSize, // 直接使用根据难度计算的气泡大小
          date: item.date,
          theme: item.inspiration_theme,
          product: item.inspiration_product,
          difficulty: item.inspiration_difficulty,
          description: item.inspiration_description,
          color
        };
        console.log('生成气泡点:', bubblePoint);
        return bubblePoint;
      });
  }, [data, themeCategories]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <div className="font-semibold text-gray-800 mb-2">{data.theme}</div>
          <div className="text-sm text-gray-600 mb-2">{data.date}</div>
          <div className="text-sm mb-3">{data.description}</div>
          
          {/* 突出显示难度信息 */}
          <div className="bg-indigo-50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-800">产品难度</span>
              <span 
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.difficulty === '高' ? 'bg-indigo-700 text-white' :
                  data.difficulty === '中' ? 'bg-indigo-600 text-white' :
                  data.difficulty === '低' ? 'bg-indigo-400 text-white' :
                  'bg-gray-500 text-white'
                }`}
              >
                {data.difficulty || '未知'}
              </span>
            </div>
            <div className="text-xs text-indigo-600">
              {data.difficulty === '高' && '🔥 高难度项目，需要深入技术研发'}
              {data.difficulty === '中' && '⚡ 中等难度，平衡创新与可行性'}
              {data.difficulty === '低' && '✨ 低难度项目，易于快速实现'}
              {(!data.difficulty || data.difficulty.trim() === '') && '❓ 难度待评估'}
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            <div>产品形态: {data.product}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 自定义X轴标签格式（日期）
  const formatXAxisLabel = (tickItem: number) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  // 自定义Y轴标签（主题类别）
  const formatYAxisLabel = (tickItem: number) => {
    const roundedTick = Math.round(tickItem);
    if (roundedTick === 0) return ''; // 0坐标不显示标签
    const theme = Object.keys(themeCategories).find(key => themeCategories[key] === roundedTick);
    return theme || '';
  };

  // 自定义气泡点组件
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const radius = Math.max(8, payload.z / 6); // 调整为z值除以6，最小半径8px，适配更大间距
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={radius} 
        fill={payload.color} 
        stroke={payload.color}
        strokeWidth={1}
        opacity={0.8}
      />
    );
  };

  // 生成X轴ticks - 显示连续的日期（包括没有数据的日期）
  const { xAxisTicks, xAxisDomain } = useMemo(() => {
    // 确定时间范围：优先使用父组件传入的 from/to
    let minDateMs: number | null = null;
    let maxDateMs: number | null = null;

    if (from && to) {
      minDateMs = new Date(from).getTime();
      maxDateMs = new Date(to).getTime();
    } else if (bubbleData.length > 0) {
      const dataDateValues = bubbleData.map(item => item.x);
      minDateMs = Math.min(...dataDateValues);
      maxDateMs = Math.max(...dataDateValues);
    } else {
      return { xAxisTicks: [], xAxisDomain: [0, 1] };
    }

    // 生成连续日期 ticks（包含起止日期）
    const ticks: number[] = [];
    const currentDate = new Date(minDateMs);
    const endDate = new Date(maxDateMs);
    while (currentDate <= endDate) {
      ticks.push(currentDate.getTime());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 计算 domain，确保视觉边距
    const dayInMs = 24 * 60 * 60 * 1000;
    const domainStart = minDateMs - dayInMs * 0.5;
    const domainEnd = maxDateMs + dayInMs * 0.5;

    return { xAxisTicks: ticks, xAxisDomain: [domainStart, domainEnd] };
  }, [bubbleData, from, to]);

  // 获取Y轴范围 - 从0开始，等距分布，增加顶部边距
  const maxY = Math.max(...Object.values(themeCategories), 0);
  const yAxisDomain = [0, maxY + 4];

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">灵感时间线气泡图</h3>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-700 rounded-full"></div>
                <span>高难度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-full"></div>
                <span>中难度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-indigo-400 rounded-full"></div>
                <span>低难度</span>
              </div>
            </div>
          <div className="text-xs text-gray-500 border-l border-gray-300 pl-4">
            <div>颜色：按钮配色风格（蓝色系）</div>
            <div>大小：气泡大小代表产品难度</div>
          </div>
        </div>
      </div>
      
      <div className="rounded-xl bg-slate-50 p-4" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 20,
              right: 40,
              bottom: 60,
              left: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              type="number" 
              dataKey="x"
              domain={xAxisDomain}
              ticks={xAxisTicks}
              tickFormatter={formatXAxisLabel}
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={55}
              padding={{ left: 15, right: 15 }}
              allowDuplicatedCategory={false}
              interval={0}
            />
            <YAxis 
              type="number" 
              dataKey="y"
              domain={yAxisDomain}
              ticks={[0, ...Object.values(themeCategories)]}
              tickFormatter={formatYAxisLabel}
              tick={{ fontSize: 12 }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              data={bubbleData} 
              fill="#8884d8"
              shape={<CustomDot />}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* 数据统计 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-3 rounded-lg border border-indigo-200">
          <div className="text-gray-500">总计灵感</div>
          <div className="text-xl font-bold text-indigo-600">{bubbleData.length}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-indigo-200">
          <div className="text-gray-500">主题类别</div>
          <div className="text-xl font-bold text-indigo-600">{Object.keys(themeCategories).length}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-indigo-200">
          <div className="text-gray-500">高难度项目</div>
          <div className="text-xl font-bold text-indigo-700">
            {bubbleData.filter(item => item.difficulty === '高').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-indigo-200">
          <div className="text-gray-500">平均难度</div>
          <div className="text-xl font-bold text-indigo-600">
            {(() => {
              const diffCounts = { '高': 0, '中': 0, '低': 0 };
              bubbleData.forEach(item => {
                if (diffCounts.hasOwnProperty(item.difficulty)) {
                  diffCounts[item.difficulty as keyof typeof diffCounts]++;
                }
              });
              const maxDiff = Object.entries(diffCounts).reduce((a, b) => diffCounts[a[0] as keyof typeof diffCounts] > diffCounts[b[0] as keyof typeof diffCounts] ? a : b);
              return maxDiff[0];
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineBubbleChart;
