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
  // 主题类别映射到Y轴位置（增加间距以避免标签重叠）
  const themeCategories = useMemo(() => {
    const themes = [...new Set(data.map(item => item.inspiration_theme).filter(Boolean))];
    return themes.reduce((acc, theme, index) => {
      // 使用间距为6的等距分布，从6开始，为Y轴标签留出更多空间
      acc[theme] = (index + 1) * 6;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  // 转换数据为气泡图格式
  const bubbleData = useMemo(() => {
    // 生成完整的日期范围（从from到to的所有日期）
    const generateDateRange = (from: string, to: string): string[] => {
      const dates: string[] = [];
      const startDate = new Date(from);
      const endDate = new Date(to);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
      return dates;
    };

    // 如果有from和to参数，使用完整日期范围；否则使用数据中的日期
    const allDates = from && to 
      ? generateDateRange(from, to)
      : data
          .filter(item => item.date)
          .map(item => item.date)
          .filter((date, index, self) => self.indexOf(date) === index)
          .sort();
    
    const dateToIndex = new Map(allDates.map((date, index) => [date, index]));
    
    return data
      .filter(item => 
        item.inspiration_description && 
        item.inspiration_theme && 
        item.inspiration_difficulty && // 过滤掉空难度值
        item.inspiration_difficulty.trim() !== '' // 过滤掉空字符串
      )
      .map((item, index): BubbleData => {
        // 将日期转换为固定间隔的索引用于X轴（从1开始，与情绪趋势图表保持一致）
        const dateValue = (dateToIndex.get(item.date) || 0) + 1;
        
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
        
        // 使用紫色系配色风格 - 增强对比度
        let color = '#8b5cf6'; // 默认紫色
        switch (item.inspiration_difficulty) {
          case '高':
            color = '#4c1d95'; // 深紫色，表示高难度 - 更深的紫色
            break;
          case '中':
            color = '#7c3aed'; // 中紫色，表示中难度 - 中等深度
            break;
          case '低':
            color = '#c084fc'; // 浅紫色，表示低难度 - 更浅的紫色
            break;
          default:
            color = '#8b5cf6'; // 默认紫色
        }
        
        return {
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
          <div className="bg-purple-50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-800">产品难度</span>
              <span 
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{
                  backgroundColor: data.difficulty === '高' ? '#4c1d95' :
                                  data.difficulty === '中' ? '#7c3aed' :
                                  data.difficulty === '低' ? '#c084fc' :
                                  '#6b7280'
                }}
              >
                {data.difficulty || '未知'}
              </span>
            </div>
            <div className="text-xs text-purple-600">
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
  // 自定义X轴标签（日期）- 参考情绪趋势图表的实现
  const formatXAxisLabel = (tickItem: number) => {
    const idx = Number(tickItem) - 1; // 转换为0基索引
    const item = dateLabels[idx];
    
    if (item?.date) {
      const dateStr = item.date;
      if (dateStr.length >= 10 && dateStr.includes('-')) {
        const date = new Date(dateStr);
        // 使用UTC时间避免时区问题
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${month}/${day}`;
      }
      return dateStr;
    }
    
    // 当没有数据时，生成日期标签（参考情绪趋势图表）
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - (dateLabels.length - 1 - idx));
    return targetDate.toISOString().slice(5, 10);
  };

  // 自定义Y轴标签（主题类别）
  const formatYAxisLabel = (tickItem: number) => {
    const roundedTick = Math.round(tickItem);
    
    // 在边距区域不显示标签
    if (roundedTick < 0 || roundedTick > themeCount * 6) return '';
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

  // 生成X轴ticks - 参考情绪趋势图表的实现，确保每个日期宽度相等
  const { xAxisTicks, xAxisDomain, dateLabels } = useMemo(() => {
    // 生成完整的日期范围（从from到to的所有日期）
    const generateDateRange = (from: string, to: string): string[] => {
      const dates: string[] = [];
      const startDate = new Date(from);
      const endDate = new Date(to);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
      return dates;
    };

    // 如果有from和to参数，使用完整日期范围；否则使用数据中的日期
    const allDates = from && to 
      ? generateDateRange(from, to)
      : data
          .filter(item => item.date)
          .map(item => item.date)
          .filter((date, index, self) => self.indexOf(date) === index)
          .sort();

    if (allDates.length === 0) {
      return { xAxisTicks: [], xAxisDomain: [0, 1], dateLabels: [] };
    }

    // 参考情绪趋势图表：使用从1开始的索引，确保每个日期宽度相等
    const fixedTicks = allDates.map((_, index) => index + 1);
    
    // 生成日期标签映射
    const dateLabels = allDates.map((date, index) => ({
      xValue: index + 1,
      date: date
    }));

    // 设置X轴域范围，参考情绪趋势图表的实现
    const domainStart = 0;
    const domainEnd = Math.max(allDates.length + 1, 7); // 至少显示7天，与情绪趋势图表保持一致

    return { 
      xAxisTicks: fixedTicks, 
      xAxisDomain: [domainStart, domainEnd],
      dateLabels: dateLabels
    };
  }, [bubbleData, data, from, to]);

  // 获取Y轴范围 - 确保每个主题类别之间的间距完全相等，并添加上下边距
  const themeCount = Object.keys(themeCategories).length;
  const bottomMargin = 3; // 底部边距
  const topMargin = 3; // 顶部边距
  const yAxisDomain = [-bottomMargin, themeCount * 6 + topMargin]; // 添加上下边距
  
  // 生成均匀分布的Y轴刻度（不包含边距区域）
  const yAxisTicks = [0, ...Object.values(themeCategories).map(v => Number(v))];

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">灵感时间线气泡图</h3>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full" style={{backgroundColor: '#4c1d95'}}></div>
                <span>高难度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full" style={{backgroundColor: '#7c3aed'}}></div>
                <span>中难度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{backgroundColor: '#c084fc'}}></div>
                <span>低难度</span>
              </div>
            </div>
          <div className="text-xs text-gray-500 border-l border-gray-300 pl-4">
            <div>颜色：紫色系渐变配色</div>
            <div>大小：气泡大小代表产品难度</div>
          </div>
        </div>
      </div>
      
      <div className="rounded-xl bg-slate-50 p-6" style={{ height: `${height}px` }}>
        <div className="w-full h-full flex items-center justify-center px-4">
          <div className="w-full h-full max-w-full">
            <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 60,
              right: 20,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="x"
              type="number"
              domain={xAxisDomain}
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              interval={0}
              axisLine={true}
              tickLine={true}
              ticks={xAxisTicks}
              tickFormatter={formatXAxisLabel}
              angle={-45}
              textAnchor="end"
              height={55}
              scale="linear"
            />
            <YAxis 
              type="number" 
              dataKey="y"
              domain={yAxisDomain}
              ticks={yAxisTicks}
              tickFormatter={formatYAxisLabel}
              tick={{ fontSize: 12 }}
              width={80}
              tickCount={themeCount + 1}
              label={{ value: '主题类别', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', x: -20 } }}
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
        </div>
      </div>
      
      {/* 数据统计 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-3 rounded-2xl border border-purple-200">
          <div className="text-gray-500">总计灵感</div>
          <div className="text-xl font-bold text-purple-600">{bubbleData.length}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-purple-200">
          <div className="text-gray-500">主题类别</div>
          <div className="text-xl font-bold text-purple-600">{Object.keys(themeCategories).length}</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-purple-200">
          <div className="text-gray-500">高难度项目</div>
          <div className="text-xl font-bold" style={{color: '#4c1d95'}}>
            {bubbleData.filter(item => item.difficulty === '高').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-purple-200">
          <div className="text-gray-500">平均难度</div>
          <div className="text-xl font-bold text-purple-600">
            {(() => {
              const diffCounts = { '高': 0, '中': 0, '低': 0 };
              bubbleData.forEach(item => {
                if (Object.prototype.hasOwnProperty.call(diffCounts, item.difficulty)) {
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
