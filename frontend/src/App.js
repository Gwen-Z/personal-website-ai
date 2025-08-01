import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import './App.css';

// 根据环境选择API地址
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/records`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartOption = () => {
    const typeGroups = {};
    records.forEach(record => {
      if (!typeGroups[record.type]) {
        typeGroups[record.type] = [];
      }
      typeGroups[record.type].push({
        value: record.value,
        date: record.date
      });
    });

    const series = Object.keys(typeGroups).map(type => ({
      name: type,
      type: 'line',
      data: typeGroups[type].map(item => [item.date, item.value]),
      smooth: true
    }));

    return {
      title: {
        text: '数据趋势分析',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: Object.keys(typeGroups),
        top: 30
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          formatter: '{MM-dd}'
        }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 5
      },
      series: series
    };
  };

  const getSummaryStats = () => {
    const typeStats = {};
    records.forEach(record => {
      if (!typeStats[record.type]) {
        typeStats[record.type] = { count: 0, total: 0, avg: 0 };
      }
      typeStats[record.type].count++;
      typeStats[record.type].total += record.value;
    });

    Object.keys(typeStats).forEach(type => {
      typeStats[type].avg = (typeStats[type].total / typeStats[type].count).toFixed(2);
    });

    return typeStats;
  };

  if (loading) {
    return <div className="container">加载中...</div>;
  }

  const stats = getSummaryStats();

  return (
    <div className="container">
      <div className="header">
        <h1>个人数据分析</h1>
        <p>从iPhone快捷指令收集的数据分析</p>
      </div>

      <div className="data-section">
        <h2>数据统计</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {Object.keys(stats).map(type => (
            <div key={type} style={{ textAlign: 'center', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
              <h3>{type}</h3>
              <p>记录数: {stats[type].count}</p>
              <p>平均值: {stats[type].avg}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="data-section">
        <h2>趋势图表</h2>
        <div className="chart-container">
          <ReactECharts option={getChartOption()} style={{ height: '100%' }} />
        </div>
      </div>

      <div className="data-section">
        <h2>最近记录</h2>
        {records.slice(0, 10).map(record => (
          <div key={record.id} className="record-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{record.type}</strong> - {record.value}/5
                {record.note && <p style={{ margin: '5px 0 0 0', color: '#666' }}>{record.note}</p>}
              </div>
              <span style={{ color: '#999' }}>{record.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App; 