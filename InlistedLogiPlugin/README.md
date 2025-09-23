# Inlisted Logitech Plugin

一個為 Inlisted 生產力應用程式設計的 Logitech Loupedeck 插件，提供快速操作和番茄鐘計時器功能。

## 功能介紹

### 主要功能

- **番茄鐘計時器**: 在 Loupedeck 設備上直接顯示和控制番茄鐘計時器
- **任務管理**: 快速新增和完成任務
- **HUD 切換**: 切換任務顯示介面

### 技術特性

- **WebSocket 整合**: 透過 WebSocket (ws://localhost:7777) 與 Inlisted 主應用程式即時通訊
- **自動重連**: 連線中斷時自動嘗試重新連接
- **即時更新**: 計時器狀態即時更新顯示
- **錯誤處理**: 完善的錯誤記錄和例外處理

## 開發環境

根據 [Logitech Actions SDK 說明文件](https://logitech.github.io/actions-sdk-docs/Getting-started/)

- Visual Studio 2022 或更新版本
- .NET 8.0 SDK
- Logitech Logi Plugin Service
- 支援的 Loupedeck 設備

## 安裝插件

此插件需要與 Inlisted 主應用程式配合使用。以下說明如何打包插件並協助架設完整的 Inlisted 應用程式環境：

### 1. 建置插件

在 Visual Studio 中建置為 Release 配置

或使用命令列：

```powershell
dotnet build --configuration Release
```

### 2. 打包為可安裝檔案

#### 使用 Logi Plugin Tool 打包

從 [Logitech 開發者網站](https://logitech.github.io/actions-sdk-docs/) 下載並安裝 `logiplugintool`。

```powershell
logiplugintool pack ./bin/Release/ ./Inlisted_1_0.lplug4
```

#### 驗證套件

```powershell
logiplugintool verify ./Inlisted_1_0.lplug4
```

#### 安裝 Logitech 插件

雙擊安裝打包好的 .lplug4 檔案即可

## 故障排除

### 1. **WebSocket 連線失敗**

- 確認 InlistedDesktop 應用程式已啟動
- 檢查 port 7777 是否被佔用
- 查看防火牆設定

### 2. **插件無法載入**

- 確認 Logi Plugin Service 版本相容性
- 檢查插件檔案完整性
- 重新安裝插件

### 3. **功能無法正常運作**

- 檢查所有相關服務是否已啟動
- 查看各模組的日誌檔案
- 確認網路連線狀態

## WebSocket API 協定

插件透過 WebSocket 與 Inlisted 主應用程式通訊：

### 連線資訊

- **URL**: `ws://localhost:7777`
- **協定**: JSON 訊息格式

```json
{
  "command": string,
  "data": object
}
```
