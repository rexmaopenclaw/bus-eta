# 巴士到站 App 🚌

**即時巴士到站時間 | Expo + React Native | 九巴 KMB OpenData**

---

## 技術棧

| 層級 | 選用技術 | 原因 |
|------|---------|------|
| 跨平台框架 | **Expo (React Native)** | 一套 Code 出 iOS + Android + Web |
| 頁面路由 | **Expo Router** | 基於檔案系統嘅路由，類似 Next.js |
| 狀態管理 | **Zustand** | 輕量、無 Boilerplate，適合收藏等少量 Client State |
| 資料 Fetching | **TanStack React Query** | 自動 Cache、Stale-While-Revalidate、Background Refetch、Retry |
| 持久化 | **AsyncStorage** | 收藏路線本地儲存 |
| API 來源 | **香港九巴 KMB OpenData** | `data.etabus.gov.hk/v1/transport/kmb` |
| 地圖/GPS | **expo-location** | 定位附近車站 |

---

## 架構設計：Data Flow

```
┌─────────────────────────────────────────────────────┐
│                     UI Layer                         │
│  (tabs)/index.tsx  ← 收藏路線首頁（自動倒數）        │
│  (tabs)/search.tsx ← 路線搜尋                        │
│  (tabs)/nearby.tsx ← GPS 附近車站                    │
│  route/[route].tsx ← 路線車站列表                    │
│  stop/[stopId].tsx ← 車站 ETA 倒數                   │
└──────────────────────┬──────────────────────────────┘
                       │ useQuery / useMutation
┌──────────────────────▼──────────────────────────────┐
│                  TanStack React Query                │
│   • staleTime: 30s (ETA) / 5min (routes) / 24h (stops) │
│   • refetchInterval: 30s (automatically refresh ETA) │
│   • retry: 2 次，1s 間隔                             │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                 API Client (src/api/kmb.ts)           │
│   • Timeout: 8s (AbortController)                    │
│   • Retry: 最多 2 次                                 │
│   • Error Handling: 自訂 KMBAPIError                │
│   • Base URL: https://data.etabus.gov.hk             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────┐
│           香港九巴 KMB OpenData API                   │
│  GET /route /route/{no} /route/{no}/{b}/{st}/stop   │
│  GET /eta/{route}/{bound}/{serviceType}              │
│  GET /stop/{stopId} /stop  (全港車站)                │
└─────────────────────────────────────────────────────┘
```

### 快取策略

| 資料類型 | staleTime | gcTime | 自動刷新 |
|---------|-----------|--------|---------|
| 路線列表 | 5 min | 30 min | 手動拉下 |
| 車站順序 | 5 min | 30 min | 手動拉下 |
| 車站資料 | 24 h | 24 h | 極少變動 |
| **ETA 到站時間** | **30 秒** | 1 min | **每 30 秒自動 polling** |
| 全港車站 (GPS) | 24 h | 24 h | 手動 |

---

## 快速開始

```bash
# 1. Install dependencies
npm install

# 2. Start Expo dev server
npx expo start

# 3. 掃 QR Code 用 Expo Go 開 / 按 a 開 Android / i 開 iOS
```

---

## 專案結構

```
bus-app/
├── app/                          # Expo Router 頁面
│   ├── _layout.tsx               # Root Layout（QueryClientProvider）
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 底部 Tab 導航
│   │   ├── index.tsx             # 首頁（收藏路線 + 倒數）
│   │   ├── search.tsx            # 搜尋路線
│   │   └── nearby.tsx            # GPS 附近車站
│   ├── route/[route].tsx         # 路線車站列表
│   └── stop/[stopId].tsx         # 車站 ETA 倒數
├── src/
│   ├── api/kmb.ts                # KMB API Client（Timeout + Retry）
│   ├── types/index.ts            # TypeScript 型別定義
│   ├── store/favorites.ts        # Zustand 收藏 Store
│   ├── hooks/useETA.ts           # React Query Hooks
│   ├── components/
│   │   ├── RouteBadge.tsx        # 路線號碼徽章
│   │   ├── ETACard.tsx           # ETA 倒數卡片
│   │   └── StopListItem.tsx      # 車站列表 Item
│   └── utils/
│       ├── theme.ts              # Dark Mode 主題
│       ├── time.ts               # ETA 時間計算
│       └── location.ts           # 距離計算 (Haversine)
├── package.json
└── app.json
```

---

## 核心功能

### 1️⃣ 路線搜尋
- 輸入路線號碼（如 `1A`）即時顯示結果
- 展開後選擇去程 (O) / 回程 (I)
- 點擊進入車站順序列表

### 2️⃣ 即時 ETA 倒數
- 顯示未來 3 班車預計到站時間
- 自動計算剩餘分鐘
- 顏色區分：🟢 >10 min / 🟡 3-10 min / 🔴 ≤3 min
- 加班車 ⚠️ / 尾班車 🕐 標記

### 3️⃣ GPS 附近車站
- 請求位置權限後自動掃描
- 顯示最近 5 個車站及距離
- 列出各站行經路線（最多 5 條）

### 4️⃣ 收藏路線
- 點擊星形圖示加入首頁收藏
- 首頁自動顯示各站 ETA 倒數
- 每 30 秒自動刷新數據
- 支援拉下更新 (Pull-to-refresh)

### 5️⃣ UI/UX
- Dark Mode 自動跟隨系統
- 下拉刷新
- 載入錯誤處理 + 友好提示
- 車站編號連線（視覺化車站順序）

---

## API Rate Limit 與效能優化

### 減少 API Call 次數
1. **React Query Cache**：ETA 以外嘅數據最少 cache 5 分鐘，避免重複請求
2. **staleTime 控制**：ETA 30s / 路線 5min / 車站 24h
3. **refetchInterval**：ETA 用 30 秒 polling，離開頁面自動 stop（React Query 嘅 `enabled` 控制）
4. **全港車站一次過 Load**：GPS 附近車站功能用 `/stop` 一次 load 晒所有站，Client Side 做 Haversine 計算，唔使逐個 request

### 背景自動更新
- 首頁收藏路線：每個收藏獨立 `useRouteETA` query，React Query 嘅 `refetchInterval: 30s` 自動 polling
- 離開頁面／App 進入背景：React Query 喺 `AppState` 變 background 時自動暫停 refresh
- 用戶打開 App 即時見到最新數據（stale-while-revalidate）

### 建議下一步
- 加入 **SWR 快取優先**：顯示舊數據同時背景刷新
- **本地持久化 ETA**：用 AsyncStorage 暫存最後一次 ETA 數據，冇網絡時顯示
- **Push Notification**：當收藏路線嘅 ETA 少於 5 分鐘時發推送
- **城巴 CTB 合併**：香港政府 OpenData 仲有城巴 API，可合併顯示

---

## API 參考

| Endpoint | 說明 |
|---------|------|
| `GET /route` | 所有路線 |
| `GET /route/{route}` | 指定路線 |
| `GET /route/{route}/{bound}/{st}/stop` | 路線車站順序 |
| `GET /stop/{stopId}` | 車站資料 |
| `GET /stop` | 所有車站 |
| `GET /stop/{stopId}/route` | 車站經過路線 |
| `GET /eta/{route}/{bound}/{st}` | 路線 ETA |

Base URL: `https://data.etabus.gov.hk/v1/transport/kmb`