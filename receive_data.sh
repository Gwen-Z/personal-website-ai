#!/bin/bash
# iPhone 数据接收脚本
DATA_FILE="/tmp/daily_data_$(date +%Y%m%d_%H%M%S).json"
echo "等待数据输入..."
cat > "$DATA_FILE"
echo "数据已保存到: $DATA_FILE"
echo "开始处理数据..."

# 调用本地API处理数据
curl -X POST http://localhost:3001/api/raw-entry \
  -H "Content-Type: application/json" \
  -d @"$DATA_FILE" \
  && echo "数据处理成功!" \
  || echo "数据处理失败"
