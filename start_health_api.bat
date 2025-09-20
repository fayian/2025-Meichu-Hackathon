@echo off
REM Windows 批次檔用於啟動健康監控 API 服務

echo 正在啟動健康監控 API...
echo 使用 conda 環境: hackathon311

REM 激活 conda 環境
call conda activate hackathon311

REM 檢查環境是否成功激活
if %ERRORLEVEL% neq 0 (
    echo 錯誤: 無法激活 conda 環境 hackathon311
    echo 請確認環境是否存在: conda env list
    pause
    exit /b 1
)

echo 環境已激活: hackathon311

REM 切換到 API 目錄
cd /d "%~dp0"

REM 設定環境變數
set PYTHONPATH=%CD%;%CD%\posture;%CD%\scheduler;%CD%\health_detect

REM 啟動主要 API 服務 (包含健康檢測功能)
echo 正在啟動 API 服務...
python api\main.py

REM 如果上面的命令失敗，嘗試替代方案
if %ERRORLEVEL% neq 0 (
    echo 主要 API 啟動失敗，嘗試啟動獨立的健康檢測 API...
    python posture\main.py
)

pause