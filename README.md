# Inlisted - 智能生產力管理系統

2025 梅竹黑客松 - 羅技題目參賽作品

Inlisted 是一個全方位的智能生產力管理系統，專為現代工作者設計。結合了任務管理、番茄鐘計時、健康監控和 AI 輔助功能，配合 Logitech Loupedeck 硬體控制，打造無縫的生產力體驗。

![Inlisted Logo](https://img.shields.io/badge/Inlisted-Smart%20Productivity-blue?style=for-the-badge)

## 專案概述

Inlisted 整合了四個核心模組，透過統一的 API 和 WebSocket 通訊，提供完整的生產力管理解決方案：

- **InlistedDesktop**: 基於 Electron 的主要桌面應用程式
- **InlistedLogiPlugin**: Logitech Loupedeck 硬體整合插件
- **電腦視覺模組**: Python 基於的姿勢和健康監控系統
- **API 服務**: FastAPI 後端服務，連接所有模組

## 主要功能

### 智能任務管理

- **死線壓力算法**: 根據截止日期和重要程度自動排程任務
- **Google Calendar 整合**: 自動將任務安排到空閒時段
- **三級優先級系統**: 高、中、低優先級任務分類
- **實時狀態追蹤**: 未開始、進行中、已完成狀態管理
- **抬頭顯示器**: 隨時追蹤當前最緊急的任務

### 智能番茄鐘

- **可自定義計時**: 15、25、45、60 分鐘預設選項
- **智能調整時間**: 根據使用者回饋調整計時時長
- **硬體控制整合**: 透過 Loupedeck 直接操控及顯示

### 健康監控系統

- **智能姿勢檢測**: 使用 YOLOv5 進行實時姿勢分析
- **喝水提醒**: 基於實際行為的智能提醒系統

### AI 圖片問答

WIP

## 系統架構

Inlisted 採用模組化架構設計，各組件透過 API 和 WebSocket 進行通訊：

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│                 │ ◄─────────────► │                 │
│ InlistedDesktop │                 │ InlistedLogi    │
│   (Electron)    │                 │    Plugin       │
│                 │                 │  (C# .NET 8)    │
└─────────┬───────┘                 └─────────────────┘
          │
          │ HTTP API
          ▼
┌─────────────────┐    Python API    ┌─────────────────┐
│                 │ ◄─────────────► │                 │
│   API Service   │                 │  Posture & CV   │
│   (FastAPI)     │                 │   (YOLOv5)      │
│                 │                 │                 │
└─────────┬───────┘                 └─────────────────┘
          │
          │ Google API
          ▼
┌─────────────────┐
│                 │
│ Google Calendar │
│   Integration   │
│                 │
└─────────────────┘
```

### 核心模組說明

#### InlistedDesktop

- **技術棧**: Electron 38.x + Vanilla JavaScript + HTML5/CSS3
- **主要功能**: 用戶界面、任務管理、番茄鐘、健康提醒
- **通訊**: WebSocket 伺服器 (port 7777)
- **儲存**: LocalStorage + 準備雲端同步

#### InlistedLogiPlugin

- **技術棧**: C# .NET 8 + Logitech Loupedeck SDK
- **主要功能**: 硬體按鈕控制、實時狀態顯示
- **通訊**: WebSocket 客戶端連接到主程式
- **支援設備**: Loupedeck CT/Live/Live S, Razer Stream Controller

#### 電腦視覺模組 (posture)

- **技術棧**: Python 3.11+ + YOLOv5 + OpenCV
- **主要功能**: 姿勢檢測、喝水行為識別
- **API**: RESTful endpoints
- **模型**: 預訓練 YOLOv5 人體檢測模型

#### API 服務 (api)

- **技術棧**: FastAPI + Python 3.11+
- **主要功能**: 模組間通訊橋樑、資料整合
- **端口**: HTTP 服務 (port 8000)
- **CORS**: 支援跨域請求

#### 排程模組 (scheduler)

- **技術棧**: Python + Google Calendar API
- **主要功能**: 智能任務排程、日曆整合
- **演算法**: 死線壓力 + 空檔檢測
- **OAuth**: Google API 認證

## 建置與啟動

### 系統需求

- **作業系統**: Windows 10/11, macOS 10.15+, Linux
- **Node.js**: 16.0 或更新版本
- **Python**: 3.11 或更新版本
- **硬體**: Logitech Loupedeck 設備 (可選)
- **攝影機**: 用於姿勢檢測

### 建置專案

詳細的建置說明請參考各模組的 README 文件：

- **主程式**: [InlistedDesktop/README.md](./InlistedDesktop/README.md)
- **Logi 插件**: [InlistedLogiPlugin/README.md](./InlistedLogiPlugin/README.md)
- **健康監控**: [posture/README.md](./posture/README.md)
- **排程服務**: [scheduler/README.md](./scheduler/README.md)

### 啟動順序

為確保所有模組正常通訊，請按以下順序啟動：

1. **API 服務** - `python api/main.py`
2. **姿勢檢測** - `python posture/main.py` (可選)
3. **主程式** - `npm start` (在 InlistedDesktop 目錄)
4. **Logi 插件** - 透過 Visual Studio 或已安裝的 .lplug4 文件

## 授權

此專案為 2025 年梅竹黑客松參賽作品，採用 MIT 授權。

---

**Inlisted** - 讓生產力管理更智能、更健康！ 🚀
