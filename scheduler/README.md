# 智慧排程小幫手

這是一個利用 Google 日曆 API 打造的 Python 腳本，能自動將你的待辦事項（To-Do List）排入 Google 日曆中。它會根據你的行事曆空檔、工作時間以及任務的優先級和截止日期，尋找最合適的時間來安排任務，甚至能自動處理午休時間。

---

## 功能特色

- **自動排程**: 根據任務的所需時長、優先級和截止日期，自動在你的 Google 日曆中尋找並建立新的事件。
- **尊重空檔**: 程式會讀取你所有 Google 日曆的忙碌時段，確保排程的任務不會與你現有的事件（如會議、行程）衝突。
- **考慮工作時間**: 只在設定的工作時間內（上午 9 點到下午 6 點）進行排程。
- **午休處理**: 聰明地避開你的午休時間（中午 12 點到下午 1 點），如果任務橫跨午休，會自動分割成兩段來安排。
- **高彈性**: 你可以輕鬆地修改工作時間、午休時間，並自訂你的待辦事項清單。

---
## 設定 Google Calendar API
### 步驟一：設定 Google Calendar API

在執行程式碼之前，你必須先授權你的程式存取你的 Google 日曆。

1.  **啟用 Google Calendar API**：

      * 前往 [Google Cloud Console](https://console.cloud.google.com/)。
      * 建立一個新專案（如果沒有的話）。
      * 在左側導覽列選擇 "APIs & Services" \> "Library"。
      * 搜尋 "Google Calendar API" 並啟用它。

2.  **建立憑證 (Credentials)**：

      * 前往 "APIs & Services" \> "Credentials"。
      * 點擊 "+ CREATE CREDENTIALS" \> "OAuth client ID"。
      * 如果需要，先設定 "OAuth consent screen"（使用者類型選 "External"，然後填寫一些基本應用程式資訊即可）。
      * 在 "Application type" 中選擇 "Desktop app"。
      * 建立後，點擊右側的下載圖示，下載一個名為 `credentials.json` 的檔案。

3.  **放置憑證檔案**：

      * 將下載json檔案改名為 `credentials.json` ，並與你的 Python 程式碼放在**同一個資料夾**中。

### 步驟二：安裝必要的 Python 函式庫

打開你的終端機（Terminal 或命令提示字元）並執行以下指令來安裝 Google API 用戶端函式庫：

```bash
pip install --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib
```
