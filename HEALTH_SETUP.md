# 健康監控系統啟動指南

## 環境需求
- Windows 系統
- Conda 環境名稱: `hackathon311`
- Python 3.11+ (在 conda 環境中)

## 啟動方式

### 方式 1: 使用批次檔 (推薦)
```bash
# 雙擊運行或在命令提示字元中執行
start_health_api.bat
```

### 方式 2: 使用 PowerShell 腳本
```powershell
# 在 PowerShell 中執行
.\start_health_api.ps1
```

### 方式 3: 手動啟動
```bash
# 激活 conda 環境
conda activate hackathon311

# 設定環境變數 (Windows CMD)
set PYTHONPATH=%CD%;%CD%\posture;%CD%\scheduler;%CD%\health_detect

# 啟動 API
python api\main.py
# 或
python posture\main.py
```

## 修改內容總結

### 前端修改 (healthReminder.js)
- **坐姿檢測**: 每5秒檢查一次 API，連續2次不良姿勢時發出 alert 警告 (10秒內)
- **喝水提醒**: 每分鐘檢查上次喝水時間，超過設定間隔時發送通知
- **移除功能**: 移除了手動檢查按鈕、間隔設定等不需要的功能
- **增強提醒**: 使用多重提醒方式確保用戶看到警告

### 界面修改 (index.html)
- 簡化了健康功能區塊
- 移除了不需要的按鈕和設定選項
- 保留核心的啟動/停止按鈕

### 新增功能
- 智能姿勢警告系統 (連續不良姿勢檢測)
- 智能喝水提醒系統 (基於實際喝水間隔)
- Windows conda 環境支援

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
1. 確認 conda 環境 `hackathon311` 存在: `conda env list`
2. 確認必要的 Python 套件已安裝 (參考 requirements.txt)
3. 確認攝像頭權限已開啟
4. 檢查防火牆是否阻止了本地端口 8000