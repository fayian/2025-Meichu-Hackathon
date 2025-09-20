# PowerShell 腳本用於啟動健康監控 API 服務

Write-Host "正在啟動健康監控 API..." -ForegroundColor Green
Write-Host "使用 conda 環境: hackathon311" -ForegroundColor Yellow

# 激活 conda 環境
try {
    & conda activate hackathon311
    if ($LASTEXITCODE -ne 0) {
        throw "無法激活 conda 環境"
    }
    Write-Host "環境已激活: hackathon311" -ForegroundColor Green
} catch {
    Write-Host "錯誤: 無法激活 conda 環境 hackathon311" -ForegroundColor Red
    Write-Host "請確認環境是否存在: conda env list" -ForegroundColor Yellow
    Read-Host "按任意鍵繼續..."
    exit 1
}

# 切換到腳本目錄
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# 設定環境變數
$env:PYTHONPATH = "$scriptPath;$scriptPath\posture;$scriptPath\scheduler;$scriptPath\health_detect"

# 啟動主要 API 服務
Write-Host "正在啟動 API 服務..." -ForegroundColor Green

try {
    # 使用 conda run 來確保在正確的環境中執行
    & conda run -n hackathon311 python api\main.py
} catch {
    Write-Host "主要 API 啟動失敗，嘗試啟動獨立的健康檢測 API..." -ForegroundColor Yellow
    try {
        & conda run -n hackathon311 python posture\main.py
    } catch {
        Write-Host "API 啟動失敗: $_" -ForegroundColor Red
        Read-Host "按任意鍵繼續..."
        exit 1
    }
}

Read-Host "按任意鍵關閉..."