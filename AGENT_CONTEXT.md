# AI Context & Project State: TKUschedule WebApp

## 專案概述 (Project Overview)
這是一個「淡江大學輕量化排課輔助 WebApp」。
本專案為一個純靜態單頁應用程式 (SPA)，透過 Python 將原有的 235 個網頁課表檔案 (Big5編碼) 解析轉換成結構化的 `courses.json`，再藉由 HTML/CSS/JS 實作具互動性的 $10 \times 5$ 動態課表。完全無前後端框架依賴，主打 Glassmorphism (玻璃擬物) 深色風格，搭配 Lucide Icons 與動態背景 Blob 動畫。

## 專案結構 (Project Structure)
```text
/Users/janus/Project/ClassCalendar
├── .agent/               # Agent 相關設定與 Skills
├── data/                 # 包含 235 個尚未處理的原始 HTML 課表檔案 (如 A01.htm, TEAXB.htm)
├── parse_courses.py      # Python 解析引擎：負責讀取 data/ 的 HTML，轉換編碼並萃取欄位，匯出 JSON
├── courses.json          # parse_courses.py 產出的最終資料庫，內含 6085 筆結構化課程資料 (196 個系所)
├── index.html            # 主應用程式進入點，含左側選單區、右側10x5動態網格區、三個 Modal 對話框
├── index.css             # 客製化樣式表，Glassmorphism 風格、動態背景、空閒篩選特效、已選清單表格樣式
├── app.js                # 核心業務邏輯：選單渲染、課程篩選、網格互動、衝突防呆、已選清單、空閒篩選
├── test_logic.js         # 單元測試邏輯
├── test_puppeteer.js     # Puppeteer 端對端測試
├── test_server.py        # 測試用伺服器
├── .gitignore            # Git 忽略規則
└── AGENT_CONTEXT.md      # 本文件 — AI 開發上下文
```

## 功能完成狀態 (Feature Status)

### 1. 資料解析 (Data Parsing Pipeline) - ✅ 完成
- `parse_courses.py` 會自動讀取 `data/*.htm` 中 235 個檔案，將表格剖析為 `courses.json`。
- 支援 utf-8 與 cp950 (Big5) 雙軌編碼相容處理。
- 時間格式 `星期 / 節次 / 教室` 轉化為明確的欄位屬性：`day` (1~7)、`periods` ([1, 2, ...]) 及 `room`。

### 2. $10 \times 5$ 互動式網格 (Interactive Timetable) - ✅ 完成
- **時間維度**：橫軸週一至週五 (`day 1~5`)，縱軸為 1~10 節課 (`period 1~10`)。
- **資料儲存**：在 JavaScript 中由 `gridState` 二維矩陣紀錄排課狀態 (`gridState[day][period]`)，防止超出邊界與管理佔位。
- **課程方塊**：每個方塊顯示課程名稱、開課序號與教室資訊。點擊可查看詳細資料或從課表移除。

### 3. 排課衝突防呆機制 (Conflict Detection Engine) - ✅ 完成
- 點擊左側課程列表 (Course List) 的課程即會嘗試加入網格。
- 程式會先掃描 `course.schedules` 中包含的 `[day][period]`，若對應 `gridState` 內已存在 `course.id`，則觸發衝突 Modal 阻斷行為，並告知使用者相衝的兩門課名稱。

### 4. 空閒時段篩選功能 (Free Time Filter Mode) - ✅ 完成
- **模式切換**：點擊「🕐 空閒篩選」進入模式被啟動。
- **空白格選擇**：網格區中尚未被課程佔據的方塊可被選定標記 (加上青色的 ✓)，系統會紀錄至 `freeSlots` 變數 (型態為 `Set`)。
- **自動過濾**：左側「課程列表」將即時響應，濾除那些不「完全吻合」目前選定時空的課程。
- 超出網格範圍的排課 (day 6/7、period 11+) 會被略過，不影響篩選判定。
- 當切換回一般模式時，畫面空閒打勾標誌會暫時隱藏，不過資料狀態不會遺失。

### 5. 已選課程清單 (Selected Courses List) - ✅ 完成
- 點擊「📋 已選清單」按鈕，開啟 Modal 顯示所有已排入課表的課程。
- 清單以表格形式呈現：課程名稱、開課序號、學分、必/選修、上課時間。
- 每門課皆有「移除」按鈕，可即時從課表移除並自動刷新清單。

### 6. 開課序號顯示 (Course Sequence Number Display) - ✅ 完成
- 左側課程列表的課程卡片會顯示開課序號。
- 課表網格的方塊中顯示開課序號。
- 已選清單表格中顯示開課序號。

### 7. 系所分類置頂 (Pinned Department Categories) - ✅ 完成
- 下拉選單以 `<optgroup>` 分為「⭐ 常用類別」與「📚 所有系所」兩組。
- 核心課程、體育、校共通課程等常用分類固定在最上方，方便快速選取。

### 8. 本地保存已選課表 (LocalStorage Persistence) - ✅ 完成
- 透過 `window.localStorage` 自動保存已選課程 ID 列表 (key: `classCalendar_selectedCourses`)。
- 每次新增、移除、清空課表時自動觸發保存，並顯示 Toast 通知。
- 頁面重載後自動還原已選課表，會跳過與已排課程衝突的項目。
- Toast 通知採用 Glassmorphism 風格、右下角滑入動畫，2 秒後自動消失。

### 9. 匯出 / 匯入課表代碼 (Schedule Code Export/Import) - ✅ 完成
- 點擊「📤 匯出代碼」按鈕，將已選課程 ID 陣列 JSON 化後透過 Unicode-safe Base64 編碼產生分享代碼。
- 匯出 Modal 顯示代碼 textarea（等寬字型）+ 一鍵複製按鈕 + 課程摘要清單。
- 點擊「📥 匯入代碼」按鈕，貼上他人分享的代碼即可還原課表。
- 匯入時會先清空目前課表，逐一加入課程，自動跳過衝突與找不到的課程，並在 Toast 中顯示摘要。

## UI 設計特色 (Design Highlights)
- **Glassmorphism 風格**：半透明毛玻璃面板、模糊背景效果。
- **動態背景**：三個漸層色彩的 Blob 動畫在背景緩緩移動。
- **Lucide Icons**：全站使用 Lucide 圖示庫，優雅且一致的圖示風格。
- **Inter 字型**：Google Fonts Inter 字型，清晰的現代感排版。
- **微動畫**：課程方塊加入時有 `popIn` 動畫，空閒格選取有脈衝光暈特效。

## 潛在限制與已知行為 (Known Behaviors & Limitations)
1. **無後端資料庫**：所有狀態存放於前端記憶體與 `localStorage`。`localStorage` 保存已選課程 ID 列表，頁面重載後自動還原。
2. **期間長度**：目前只渲染 1~10 節的網格。部分課程有第 11~14 節的排課資料，在 `courses.json` 中都有記錄，但 UI `gridState` 與網格 DOM 皆只實作 `for(p=1; p<=10)`。超出範圍的排課在空閒篩選時會被自動略過。
3. **資料筆數**：`courses.json` 包含 6085 筆課程、橫跨 196 個系所/類別。

## 下一步開發建議 (Recommended Next Steps if asked by User)
- 新增 PDF / PNG 課表匯出功能。
- 支援顯示第 11~14 節課程。
- 支援多組課表方案切換 (允許使用者儲存多種排課組合)。
