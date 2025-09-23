# 健康監控系統啟動指南

## 環境需求

- Windows 系統
- Python 3.11+

## 啟動方式

安裝必要插件

```
conda activate hackathon311
```

設定環境變數 (Windows CMD)

```
set PYTHONPATH=%CD%;%CD%\posture;%CD%\scheduler;%CD%\health_detect
```

啟動 API

```
python api\main.py
```

或

```
python posture\main.py
```

## 功能介紹

- 智能姿勢警告系統 (連續不良姿勢檢測)
- 智能喝水提醒系統 (基於實際喝水間隔)

## API 服務

啟動後，健康監控 API 將在以下地址運行:

- 主服務: http://localhost:8000
- 健康檢測端點:
  - POST /start_posture_test - 開始姿勢檢測
  - POST /stop_posture_test - 停止姿勢檢測
  - GET /get_posture - 獲取當前姿勢狀態
  - POST /start_drinking_test - 開始喝水檢測
  - POST /stop_drinking_test - 停止喝水檢測
  - GET /get_last_drink_time - 獲取上次喝水時間

## 故障排除

1. 確認必要的 Python 套件已安裝 (參考 requirements.txt)
2. 確認攝像頭權限已開啟
3. 檢查防火牆是否阻止了本地端口 8000
