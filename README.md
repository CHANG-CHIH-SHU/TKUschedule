# 📅 ClassCalendar — 淡江大學互動式排課輔助系統

> 一個無需後端、純靜態的輕量化排課 WebApp，搭配 

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🗓️ **10×5 互動式課表** | 週一到週五、第 1～10 節的動態網格，點擊即可排入或移除課程 |
| 🔍 **系所篩選＋關鍵字搜尋** | 下拉選單選擇系所，輸入框可搜尋課程名稱或教師 |
| ⭐ **常用分類置頂** | 核心課程、體育、校共通課程等常用類別固定在選單最上方 |
| ⚠️ **衝突自動偵測** | 時段相撞時自動彈出警告，防止重複排課 |
| 🕐 **空閒時段篩選** | 標記空閒格子，系統自動過濾出能完全塞入的課程 |
| 📋 **已選課程清單** | 一鍵查看所有已選課程的總覽表格，支援直接移除 |
| 🏷️ **開課序號顯示** | 課程列表、課表方塊、已選清單皆顯示開課序號 |
| 🎨 **Glassmorphism UI** | 毛玻璃面板、動態漸層背景、Lucide 圖示、微動畫特效 |

---

## 🚀 快速開始

### 前置需求

- **Python 3.x**（僅用於資料解析與本地伺服器）
- 現代瀏覽器（Chrome / Edge / Firefox / Safari）

### 1. 克隆專案

```bash
git clone https://github.com/your-username/ClassCalendar.git
cd ClassCalendar
```

### 2. 解析課程資料（可選）

如果需要重新解析原始 HTML 課表：

```bash
python3 parse_courses.py
```

這會讀取 `data/` 目錄下的 235 個 `.htm` 檔案，產生 `courses.json`。

> 專案已附帶預先產生的 `courses.json`，可直接跳到下一步。

### 3. 啟動本地伺服器

```bash
python3 -m http.server 8000
```

### 4. 開啟瀏覽器

前往 [http://localhost:8000](http://localhost:8000) 即可使用。

---

## 📁 專案結構

```
ClassCalendar/
├── data/               # 235 個原始 HTML 課表檔案 (Big5 編碼)
├── parse_courses.py    # Python 解析引擎 (HTML → JSON)
├── courses.json        # 結構化課程資料 (6085 筆 / 196 個系所)
├── index.html          # 主應用程式頁面
├── index.css           # Glassmorphism 深色風格樣式表
├── app.js              # 核心業務邏輯 (篩選 / 排課 / 衝突偵測)
└── AGENT_CONTEXT.md    # AI 開發上下文文件
```

---

## 🎯 使用說明

### 排課流程

1. 從左上方下拉選單**選擇系所**（常用類別已置頂）
2. 瀏覽課程卡片，或透過搜尋框**搜尋課程名稱 / 教師**
3. **點擊課程卡片**將其加入右側課表
4. 若發生時段衝突，系統會自動彈出警告
5. 點擊課表上的課程方塊可查看詳細資訊或**移除課程**

### 空閒時段篩選

1. 點擊右上方「**空閒篩選**」按鈕進入篩選模式
2. 在課表上**點擊空白格子**標記有空的時段（會出現青色 ✓）
3. 左側課程列表會**自動過濾**，僅顯示能完全塞入所標記時段的課程
4. 點擊「**清除空閒**」可重置所有標記

### 已選課程清單

- 點擊「**已選清單**」按鈕可查看所有已加入課表的課程列表
- 表格內可直接點擊「移除」操作個別課程

---

## 🛠️ 技術細節

### 資料解析 (`parse_courses.py`)

- 支援 **UTF-8** 與 **CP950 (Big5)** 雙軌編碼自動偵測
- 將 HTML `<table>` 結構化為 JSON 物件
- 時間格式轉換：`星期/節次/教室` → `{ day, periods[], room }`

### 前端架構 (`app.js`)

- **零框架依賴**：純 Vanilla JS，無 React / Vue / Angular
- **狀態管理**：`selectedCourses` 物件 + `gridState[day][period]` 二維陣列
- **衝突偵測**：加入前掃描 `gridState` 是否已被佔用
- **空閒篩選**：`freeSlots` Set 搭配 `.every()` 確保課程完全吻合

### UI 設計

- **Glassmorphism**：`backdrop-filter: blur()` 搭配半透明背景
- **字型**：Google Fonts — Inter
- **圖示**：Lucide Icons（SVG）
- **動畫**：CSS `@keyframes` 實現 popIn、slotPulse、背景 Blob 緩動

---

## ⚠️ 已知限制

| 限制 | 說明 |
|------|------|
| 📦 無持久化 | 重新整理網頁後課表會清空（未來可加 `localStorage`） |
| 🔢 僅顯示 1~10 節 | 第 11~14 節的課程資料存在，但 UI 未渲染 |
| 🌐 純靜態 | 無後端 API，資料來自預先產生的 JSON 檔案 |

---

## 📜 License

本專案僅供學術用途與個人排課輔助使用。
