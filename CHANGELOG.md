# Bus ETA Changelog

所有 update 記錄（日期由新到舊）。每個版本對應一次 deploy 到
https://bus-eta.rexmaopenclaw.workers.dev

---

## 2026-08-16 — v34ccb73
### 🐛 Fix: 轉乘 icon 顯示問題
- **empty state header 漏咗 ⇄ icon** — 之前 batch edit 失敗 atomic rollback，只加咗 main header；今次補返兩邊都有
- **SW cache bump `buseta-v2` → `buseta-v3`** — stale-while-revalidate 會 serve 舊版 JS bundle，bump cache 名逼 browser 重新載入新版本（930X 同類問題）

## 2026-08-16 — ve4f18e6
### ✨ 新功能: 轉乘查詢 V1
- 新 screen `app/transfer.tsx`：揀兩條路線（KMB + CTB，揀埋方向）→ 自動搵共同轉車站（同公司 stop ID 匹配、跨公司站名去括號匹配）→ 揀站對照兩線 ETA（每 30 秒自動更新）
- Home 頂 bar 加 ⇄ 轉乘 icon（empty state + main 兩個 header）
- 實測：299X + 43X → 6 個共同站（石門轉車站-濱景花園 ST148、亞公角、沙田醫院、沙田第一城等）
- V1 唔包接駁分析（Rex 決定）

## 2026-08-16 — v8e1c210
### ✨ 新功能: 分組收藏車站可改順序
- 每個收藏車站卡加 ↑↓ chevron 掣，group 內上/下移一格
- 邊界自動 disabled（第一個冇 ↑、最後一個冇 ↓）
- Store 加 `moveFavorite(favId, direction)`，順序存 AsyncStorage
- Native + Web 都支援

## 2026-08-15 — v2a0ee2f
### 🐛 Fix: 地圖 popup 跳位
- map popup autoPan off — 拖地圖唔再跳去 current location

## 2026-08-15 — v28bffde
### 🐛 Fix: worker proxy
- 補返 worker 缺失嘅 `KMB_STATIC` 定義

## 2026-08-15 — v435b811
### ✨ 新功能: 版本檢查
- 移除 API URL 設定（Settings modal），改為版本檢查（檢查更新 icon → 有新版本提示重新載入）

## 2026-08-15 — v90e6308
### ✨ 新功能: 群組改名 + 排序（web + native）
- GroupHeader 加 ↑↓ 排序掣 + ✏️ 改名掣
- ✏️ 掣：rename modal；↑↓ 掣：moveGroup(idx, idx±1)；「預設」群組唔顯示 ✏️

## 2026-08-15 — va54dabc
### 🐛 Fix: refresh 掣 + SW cache bug（930X 冇 data 根源）
- 加返 refresh 掣 — 首頁 header + stop 頁 header
- SW cross-origin 由 cache-first 改為 passthrough（ETA 必須 live）；bump cache 至 `buseta-v2`
- ctb.ts/kmb.ts ETA URL 加 `?t=Date.now()` cache-buster
- 背景：SW cache 咗空 ETA response，之後永遠 show 空 data

## 2026-08-15 — vbc1200e
### ✨ 新功能: PWA（可安裝 App）
- manifest + service worker + icons（installable app）

## 2026-08-14 — v3c38609
### ✨ 新功能: 真路線圖 polyline
- `/api/route-shape` 由空 stub 改為 proxy 官方 hkbus route-waypoints（每日 sync CSDI 行車線）
- `worker/route-shape-map.js`：route → GTFS ID mapping
- 修復：dedupe consecutive duplicates（v047dbfd）

## 2026-08-12 — v49f44dc
### 🐛 Fix: Search 頁亂碼
- Search.tsx UTF-8 mojibake 修復（PowerShell ANSI 讀寫搞壞 UTF-8，重寫咗）

## 2026-08-12 — v5a7df9a
### ✨ UI: SeaCast 深藍主題
- theme.ts：bg `#0a1628` / card `#0f1c30` / primary `#60b0f4` / teal `#4ecdc4`
- RouteBadge 公司色保留

## 2026-08-10 — v155f6d4
### 🐛 Fix: 路線詳情 / 車站頁 / auth 更新

## 2026-08-05 — v8d32175
### 🚀 Web build for GitHub Pages + 初期版本
- Initial commit：Bus ETA app（star button、settings modal、configurable API URL）
- 支援 KMB + CTB、收藏、ETA、附近車站、地圖
