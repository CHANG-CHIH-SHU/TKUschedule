# AI Context & Project State: ClassCalendar WebApp

## 專案概述 (Project Overview)
這是一個「淡江大學輕量化排課輔助 WebApp」。
本專案為一個純靜態單頁應用程式 (SPA)，透過 Python 將原有的 235 個網頁課表檔案 (Big5編碼) 解析轉換成結構化的 `courses.json`，再藉由 HTML/CSS/JS 實作具互動性的 $10 \times 5$ 動態課表。完全無前後端框架依賴，主打 Glassmorphism (玻璃擬物) 深色風格。

## 專案結構 (Project Structure)
```text
/Users/janus/Project/ClassCalendar
├── data/                  # 包含 235 個尚未處理的原始 HTML 課表檔案 (如 A01.htm, TEAXB.htm)
├── parse_courses.py       # Python 解析引擎：負責讀取 data/ 的 HTML，轉換編碼並萃取欄位，匯出 JSON
├── courses.json           # parse_courses.py 產出的最終資料庫，內含 6448 筆結構化課程資料
├── index.html             # 主應用程式進入點，切面分為左側選單區與右側10x5動態網格區
├── index.css              # 客製化樣式表，支援選課模式、動態展開視覺與空閒篩選特效
├── app.js                 # 核心業務邏輯：包含選單渲染、課程篩選、網格互動與衝突防呆演算法
└── README_AI.md           # 本文件
```

## 功能完成狀態 (Feature Status)

### 1. 資料解析 (Data Parsing Pipeline) - ✅ 完成
- `parse_courses.py` 會自動讀取 `data/*.htm` 中 235 個檔案，將表格剖析為 `courses.json`。
- 支援 utf-8 與 cp950 (Big5) 雙軌編碼相容處理。
- 時間格式 `星期 / 節次 / 教室` 轉化為明確的欄位屬性：`day` (1~5)、`periods` ([1, 2, ...]) 及 `room`。

### 2. $10 \times 5$ 互動式網格 (Interactive Timetable) - ✅ 完成
- **時間維度**：橫軸週一至週五 (`day 1~5`)，縱軸為 1~10 節課 (`period 1~10`)。
- **資料儲存**：在 JavaScript 中由 `gridState` 二維矩陣紀錄排課狀態 (`gridState[day][period]`)，防止超出邊界與管理佔位。

### 3. 排課衝突防呆機制 (Conflict Detection Engine) - ✅ 完成
- 點擊左側課程列表 (Course List) 的課程即會嘗試加入網格。
- 程式會先掃描 `course.schedules` 中包含的 `[day][period]`，若對應 `gridState` 內已存在 `course.id`，則觸發衝突 Modal 阻斷行為，並告知使用者相衝的兩門課名稱。

### 4. 空閒時段篩選功能 (Free Time Filter Mode) - ✅ 完成
- **模式切換**：點擊「🕐 空閒篩選」進入模式被啟動。
- **空白格選擇**：網格區中尚未被課程佔據的方塊可被選定標記 (加上青色的 ✓)，系統會紀錄至 `freeSlots` 變數 (型態為 `Set`)。
- **自動過濾**：左側「課程列表」將即時響應，濾除那些不「完全吻合」目前選定時空的課程。
- 當切換回一般模式時，畫面空閒打勾標誌會暫時隱藏，不過資料狀態不會遺失。

## 潛在限制與已知行為 (Known Behaviors & Limitations)
1. **無後端資料庫**：所有狀態存放於前端記憶體 (`app.js` 變數中)，重整網頁後課表的內容會流失 (若有持久化需求，後續可實作 `localStorage` 保存 `selectedCourses`)。
2. **期間長度**：目前只渲染 1~10 節的網格。部分大學可能有第 11~14 節，資料在 `courses.json` 中都有記錄，但 UI `gridState` 與網格 DOM 皆只實作 `for(p=1; p<=10)`。
3. **佈局行為**：取消了 `#main-content` 的 `flex-direction: column`。此改動能確保左側選單與右側網格各自具有自然高度並呈現自動 Y 軸捲動效果，避免 FlexBox `flex-shrink: 1` 導致在小尺寸螢幕吃掉下方 9、10 節課網格區的問題。

## 下一步開發建議 (Recommended Next Steps if asked by User)
- 導入 `window.localStorage` 保存已選課表，使頁面重載不遺失。
- 新增 PDF / PNG 課表匯出功能。
