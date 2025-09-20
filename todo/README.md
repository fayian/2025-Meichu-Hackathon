# MX Creative Console Assistant

一個專為 Logitech MX Creative Console 設計的智能創作助手，提供專注時間管理、任務追蹤、健康監測和 AI 智能建議等功能。

![MX Console Assistant](assets/screenshots/main-dashboard.png)

## ✨ 主要功能

### 🎯 專注助手
- **番茄工作法計時器**：25/45/60分鐘可選擇的專注時間
- **智能休息提醒**：根據工作習慣自動建議休息時間
- **專注統計**：追蹤每日、每週的專注時間和效率
- **環境音效**：可選的白噪音和自然音效

### 📋 任務管理
- **智能任務排程**：根據優先級和截止時間自動排序
- **標籤系統**：使用標籤組織和分類任務
- **進度追蹤**：視覺化的任務完成進度
- **成就系統**：完成任務解鎖各種成就

### 🎮 MX Console 整合
- **旋鈕控制**：三個旋鈕分別控制時間軸、專注強度、健康設定
- **快捷按鍵**：六個可自定義的快捷按鍵
- **LED 狀態指示**：實時顯示當前工作狀態
- **觸覺反饋**：按鍵按壓的視覺和聲音反饋

### 💊 健康監測
- **工作時間統計**：每日、每週工作時間追蹤
- **休息提醒**：定時的眼部休息和水分補充提醒
- **健康分數**：基於工作習慣的健康評分
- **趨勢分析**：工作效率和健康狀況趨勢圖表

### 🤖 AI 智能助手
- **個性化建議**：基於工作習慣的智能建議
- **時間分析**：分析最佳工作時段
- **效率優化**：提供工作節奏優化建議
- **健康提醒**：智能健康管理建議

## 🚀 快速開始

### 系統需求

- **作業系統**：Windows 10/11, macOS 10.14+, 或 Ubuntu 18.04+
- **Node.js**：16.0 或更高版本
- **記憶體**：至少 4GB RAM
- **儲存空間**：500MB 可用空間
- **Logitech MX Creative Console**（可選，用於完整功能體驗）

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone https://github.com/your-username/mx-console-assistant.git
   cd mx-console-assistant
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **開發模式運行**
   ```bash
   npm run dev
   ```

4. **建構應用程式**
   ```bash
   # Windows
   npm run build-win
   
   # macOS
   npm run build-mac
   
   # Linux
   npm run build-linux
   ```

### 配置 MX Console

1. 確保 Logitech Options+ 已安裝並運行
2. 連接 MX Creative Console 到電腦
3. 在應用程式中檢查連接狀態
4. 按照設定精靈配置旋鈕和按鍵功能

## 🎨 自定義設定

### 主題自定義

應用程式支援自定義主題色彩：

```css
:root {
  --primary-color: #4ecdc4;    /* 主要色彩 */
  --secondary-color: #ff6b6b;  /* 次要色彩 */
  --accent-color: #ffe66d;     /* 強調色彩 */
}
```

### 旋鈕配置

```javascript
const knobConfig = {
  knob1: {
    name: '時間軸控制',
    values: ['今日視圖', '本週視圖', '本月視圖'],
    default: '今日視圖'
  },
  knob2: {
    name: '專注強度',
    values: ['輕度專注', '中度專注', '深度專注'],
    default: '深度專注'
  },
  knob3: {
    name: '健康設定',
    values: ['低頻提醒', '標準提醒', '高頻提醒'],
    default: '標準提醒'
  }
};
```

### 按鍵映射

```javascript
const buttonMapping = {
  button1: { action: 'startFocus', icon: 'play', label: '開始' },
  button2: { action: 'pauseFocus', icon: 'pause', label: '暫停' },
  button3: { action: 'takeBreak', icon: 'coffee', label: '休息' },
  button4: { action: 'addTask', icon: 'plus', label: '新任務' },
  button5: { action: 'showStats', icon: 'chart-line', label: '統計' },
  button6: { action: 'openSettings', icon: 'cog', label: '設定' }
};
```

## 🛠️ 開發指南

### 專案結構

```
mx-console-assistant/
├── main.js                 # Electron 主程序
├── preload.js             # 預載腳本
├── package.json           # 專案配置
├── assets/                # 資源檔案
│   └── icons/            # 應用程式圖示
├── src/                   # 原始碼
│   ├── index.html        # 主介面
│   ├── css/              # 樣式檔案
│   │   ├── styles.css    # 主要樣式
│   │   └── animations.css # 動畫效果
│   └── js/               # JavaScript 檔案
│       ├── renderer.js   # 渲染程序主邏輯
│       └── enhanced-features.js # 進階功能
└── dist/                  # 建構輸出目錄
```

### 新增功能

1. **新增 UI 組件**
   ```javascript
   // 在 src/js/renderer.js 中新增
   function createNewComponent() {
     // 組件邏輯
   }
   ```

2. **新增 CSS 樣式**
   ```css
   /* 在 src/css/styles.css 中新增 */
   .new-component {
     /* 樣式定義 */
   }
   ```

3. **新增 MX Console 互動**
   ```javascript
   // 在 handleKnobRotation 或 handleButtonPress 中新增邏輯
   function handleNewConsoleEvent(data) {
     // 處理邏輯
   }
   ```

### 測試

```bash
# 運行測試
npm test

# 運行 linting
npm run lint

# 運行類型檢查
npm run type-check
```

## 🎯 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl/Cmd + F` | 開始/暫停專注 |
| `Ctrl/Cmd + N` | 新增任務 |
| `Ctrl/Cmd + B` | 開始休息 |
| `Ctrl/Cmd + ,` | 開啟設定 |
| `Ctrl/Cmd + R` | 重新載入 |
| `F11` | 全螢幕模式 |

## 🐛 疑難排解

### 常見問題

**Q: MX Console 沒有連接？**
A: 請確認：
- Logitech Options+ 已安裝
- MX Console 已透過 USB 或 Bluetooth 連接
- 已授予應用程式必要權限

**Q: 計時器沒有聲音？**
A: 請檢查：
- 系統音量設定
- 應用程式音效設定
- 音效檔案是否存在

**Q: 資料沒有儲存？**
A: 請確認：
- 應用程式有寫入權限
- 儲存路徑可用
- 磁碟空間充足

### 性能優化

1. **記憶體使用**
   - 應用程式正常使用約 150-200MB 記憶體
   - 如果超過 500MB，請重新啟動應用程式

2. **CPU 使用率**
   - 正常情況下 CPU 使用率應低於 5%
   - 高 CPU 使用可能由動畫效果引起，可在設定中關閉

3. **磁碟空間**
   - 資料檔案通常小於 10MB
   - 定期清理舊的備份檔案

## 🤝 貢獻指南

我們歡迎社群貢獻！請遵循以下步驟：

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 開發規範

- 使用 ESLint 和 Prettier 進行程式碼格式化
- 遵循 [Conventional Commits](https://conventionalcommits.org/) 規範
- 為新功能撰寫測試
- 更新相關文件

## 📝 更新日誌

### v1.0.0 (2024-XX-XX)
- 🎉 初始版本發布
- ✨ 完整的專注計時器功能
- 📋 任務管理系統
- 🎮 MX Console 整合
- 💊 健康監測功能
- 🤖 AI 智能助手

### 計劃功能

- [ ] 雲端同步功能
- [ ] 多語言支援
- [ ] 插件系統
- [ ] 團隊協作功能
- [ ] 資料匯出功能
- [ ] 第三方應用整合

## 📄 授權條款

本專案使用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。

## 🙏 致謝

- [Electron](https://electronjs.org/) - 跨平台桌面應用框架
- [Logitech](https://www.logitech.com/) - MX Creative Console 硬體
- [Font Awesome](https://fontawesome.com/) - 圖示庫
- [Inter Font](https://rsms.me/inter/) - 字型
- 所有貢獻者和測試人員

## 📞 聯絡資訊

- **專案首頁**：https://github.com/your-username/mx-console-assistant
- **議題回報**：https://github.com/your-username/mx-console-assistant/issues
- **電子郵件**：your-email@example.com
- **Discord**：MX Console Community

---

**讓我們一起打造更高效的創作環境！** 🚀