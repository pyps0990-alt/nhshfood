# 內湖高中熱食部 — 設計系統指南

給 Figma 手動重建使用。所有數值取自實際程式碼，可直接對應。

---

## 1. 色彩 Colors

### 品牌色
| Token | HSL | HEX | 用途 |
|---|---|---|---|
| Primary | hsl(7, 76%, 52%) | `#E23D28` | 主按鈕、強調色、focus ring |
| Primary Hover | — | `#c9321f` | 按鈕 hover |
| Accent | hsl(20, 100%, 60%) | `#FF7733` | 漸層次色 |
| Header 漸層 | — | `#E23D28 → #d63520` | 部門頁 sticky header |

### 文字色（Light / Dark）
| Token | Light HEX | Dark HEX |
|---|---|---|
| Text Primary | `#1D1816` | `#EBE3DF`（hsl 20,14%,92%）|
| Text Secondary | `#776D69` | hsl(20,6%,58%) |
| Text Tertiary | `#A29D9A` | hsl(20,4%,42%) |
| Text Muted | `#C4C1C0` | hsl(20,3%,30%) |

### 背景色
| Token | Light HEX | Dark HEX |
|---|---|---|
| Page 背景 | `#FFF7F0` | `#0F0D0C`（hsl 20,14%,4%）|
| Card 背景 | `#FFFFFF` | `#292522`（hsl 20,6%,15%）|
| Elevated 背景 | `#F7F5F3` | `#302B27`（hsl 20,6%,18%）|
| Cart Sheet 背景 | `#FFF8F0` | stone-950 |

### 中性色（stone 系列，Tailwind 預設）
用於 badge、邊框、次要按鈕：`stone-100/200/400/600/700/800/900`

### 管理後台 Hub 卡片漸層（8 張功能卡各自配色）
| 功能 | 漸層 |
|---|---|
| 訂單管理 | `#E23D28 → #FF6B35` |
| 菜單管理 | `#f97316 → #f59e0b` |
| 取餐時段 | `#0ea5e9 → #3b82f6` |
| 名冊管理 | `#8b5cf6 → #a855f7` |
| 數據分析 | `#2563eb → #6366f1` |
| 錢包管理 | `#f59e0b → #eab308` |
| POS | `#10b981 → #22c55e` |
| 其他/收餐畫面 | `#57534e → #44403c` |

### 狀態色
- 低庫存文字：`text-red-500` / dark `text-red-400`（10px, font-bold）
- 售完遮罩：`bg-black/30` 疊加 + `bg-stone-900/80` 圓角標籤
- Toast 背景：`bg-stone-900` 文字白

---

## 2. 圓角 Radius Scale
| Class | 值 | 用途 |
|---|---|---|
| `rounded-lg` | 0.5rem (8px) | textarea、小元素 |
| `rounded-xl` | 0.75rem (12px) | 輸入框、pill、圖示容器 |
| `rounded-2xl` | 1rem (16px) | 按鈕、卡片、Modal |
| `rounded-3xl` | 1.5rem (24px) | 底部彈出面板（僅上緣）|
| `rounded-full` | 999px | 頭像、圓形按鈕、drag handle |

## 3. 陰影 Shadows
```
--shadow-sm: 0 1px 2px hsl(20 60% 50% / 0.04), 0 2px 8px hsl(20 60% 50% / 0.03)
--shadow-md: 0 2px 6px hsl(20 60% 50% / 0.06), 0 6px 16px hsl(20 60% 50% / 0.04)
--shadow-lg: 0 4px 12px hsl(20 60% 50% / 0.08), 0 12px 28px hsl(20 60% 50% / 0.05)
```
按鈕陰影另用 `shadow-lg shadow-red-200/50`（品牌色暈染）。

## 4. 間距 Spacing
- 卡片內距：`p-3` / `p-4` / `p-5`
- 按鈕內距：`px-4 py-2`（小）、`px-4 py-3`（中）、`px-6 py-4`（大／主要 CTA）
- 元素間距：`gap-1.5` / `gap-2` / `gap-3`
- 區塊垂直間距：`space-y-2.5` / `space-y-4`
- 網格間距：`gap-3` / `gap-4`

## 5. 字體排印 Typography
- 全站字級：Geist 字體，body `14px`（0.875rem）
- 頁面標題：`text-lg font-bold tracking-tight`
- 登入頁大標：`text-2xl font-bold`
- 卡片標題：`font-bold text-sm sm:text-base`
- 價格數字（`.text-value`）：`font-weight: 800`，搭配 `text-xl` / `text-2xl`
- 標籤文字（`.text-label`）：`12px, font-weight 500, letter-spacing 0.01em, 顏色用 text-tertiary`
- 次要說明文字：`.text-sub` / `.text-dim`
- 標題統一 `letter-spacing: -0.02em ~ -0.03em`，`line-height: 1.1~1.15`

---

## 6. 元件規格

### 按鈕 Button
**主要按鈕（CTA）**
```
w-full bg-[#E23D28] hover:bg-[#c9321f] text-white
rounded-2xl px-6 py-4 font-bold text-lg
shadow-lg shadow-red-200/50 hover:shadow-xl
transition-all duration-200 active:scale-[0.98]
disabled:opacity-50
```
**加入購物車（卡片內小按鈕）**
```
px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white
active:scale-90 active:brightness-110
shadow-sm hover:shadow-md
```
**數量加減圓鈕**：`w-8 h-8 rounded-full flex items-center justify-center text-lg active:scale-85`
**售完標籤**：`bg-stone-400 dark:bg-stone-600` 取代主色，文字不變

按下統一回饋：`active:scale-[0.96~0.98]`，過場 `cubic-bezier(0.22,1,0.36,1)`

### 卡片 Card（商品卡）
- 外層：白底、`rounded-2xl`(1rem)、1px 邊框 `hsl(20,10%,90%)`、`shadow-sm`，hover 上浮 1px + `shadow-md`
- 圖片：`aspect-[4/3]`，`object-cover`，售完時 `grayscale` + 黑色遮罩
- 內距：`p-3 sm:p-4`
- 低庫存文字：紅色、10px、粗體
- 標籤 Badge：`text-[10px] px-1.5 py-0.5 rounded-md font-bold`

### 輸入框 Input
```
w-full px-4 py-3 bg-white border border-stone-200
rounded-2xl text-sm font-medium
focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28]
```
搜尋框用 `rounded-xl` + `focus-visible:ring-2 ring-[#E23D28]/40`；備註 textarea 用 `rounded-lg` + `ring-2 focus:ring-[#E23D28]/20`

### 分類篩選 Pill
- 基礎：`px-4 py-2 rounded-xl text-sm font-medium border-2`
- 選中：紅色淺底 `bg-red-50 border-[#E23D28] text-[#E23D28]` + 打勾圖示
- 未選：白底灰邊 `bg-white border-stone-200 text-stone-600`

### 底部彈出面板 Bottom Sheet（購物車）
- 背景遮罩：`bg-black/40 backdrop-blur-sm`
- 面板：`bg-[#FFF8F0] rounded-t-3xl shadow-2xl max-h-[90vh]`
- 拖曳把手：`w-10 h-1 rounded-full bg-white/40`，置中於頂部
- 手勢：下滑超過 100px 觸發關閉；未達門檻則以 `0.25s cubic-bezier(0.22,1,0.36,1)` 彈回原位

### 頁首 Header
- 部門頁（早/午餐）：`sticky top-0` 紅色漸層 `from-[#E23D28] to-[#d63520]`，白字，`px-5 py-4`，`shadow-md shadow-red-200/30`
- 管理後台：純色深色 `bg-stone-900`，同樣 `px-5 py-4`
- 返回鈕：圓形 `w-9 h-9 rounded-full active:scale-90`；深底用白色半透明 `bg-white/20`，淺底用 `bg-stone-100`

### 圖示 Icons
- 統一 `viewBox="0 0 24 24"`，`strokeWidth="2"`（強調用 1.5 或 2.5）
- `strokeLinecap/Linejoin="round"`
- 預設尺寸 18px（部分 16px）

### Toast 提示
```
fixed bottom-6 left-1/2 -translate-x-1/2 z-50
px-5 py-3 bg-stone-900 text-white text-sm font-semibold
rounded-xl shadow-xl animate-fade-in
```
2.5 秒自動消失，進場/退場動畫 `toast-in` / `toast-out`

### 管理後台功能卡（Hub）
```
flex flex-col gap-3 p-4 rounded-2xl bg-gradient-to-br {對應漸層}
shadow-md hover:shadow-lg active:scale-[0.97]
```
- 圖示容器：`w-11 h-11 bg-white/20 rounded-xl`，內含 26px 白色線條圖示
- 標籤：`text-white font-bold text-sm`
- 說明：`text-white/70 text-[11px] leading-snug`

---

## 7. 動效 Animation 原則
- 所有進出場動畫只用 `transform` + `opacity`（GPU 加速），時間落在 0.2~0.4s
- 標準 easing：`cubic-bezier(0.22, 1, 0.36, 1)`（進場較有彈性）／`ease-in`（退場）
- 元件必須成對：有進場動畫就要有對應退場動畫（用 `useExitAnimation` 延遲卸載）
- 清單卡片進場採 stagger：每項延遲 0.03s 遞增，最多到 0.18s
- 按下所有可點擊元件都要有 `active:scale-*` 回饋

---

## 8. Dark Mode 原則
所有背景/文字 token 都有對應深色版本（見上表），卡片邊框在深色模式改為無邊框陰影或 `hsl(20,6%,20%)`，避免死板對比。

---

## 9. Onboarding（新手導覽）— 共 6 步

獨立於全站設計語言之外的「品牌沉浸式」畫面，全螢幕橘紅漸層背景，白色文字為主。截圖見 `05~08-onboarding-*.png`。

### 整體容器
```
fixed inset-0 z-50 flex flex-col
bg-gradient-to-b from-[#E23D28] to-[#FF6B35]
```
- 頂部進度條：`px-6 pt-4 pb-2`，軌道 `h-1.5 bg-white/15 rounded-full`，填充 `bg-white`，`transition-all duration-500 ease-out`
- 右上角「跳過」文字按鈕：`text-white/40 text-xs hover:text-white/70`

### Step 1／2／3｜歡迎 + 手機示範動畫
- 標題：`text-3xl font-black text-white`（主標）+ `text-2xl font-black`（副標）
- 說明文字：`text-white/60 text-sm leading-relaxed`
- 手機示範卡（模擬 App 畫面縮圖）：`w-64 h-[24rem] bg-[#FFFAF5] rounded-[2rem] shadow-2xl border border-white/20 mx-auto`，內部用真實配色（紅色/橘色）重現首頁、菜單卡片，並有 `ob-card-pulse` 呼吸動畫吸引注意
- CTA 按鈕（`FillButton`）：白底紅字 `bg-white text-[#E23D28] rounded-2xl h-14 font-bold text-lg shadow-xl active:scale-[0.97]`；首次進入會強制等待 1.5 秒進度條填滿才能點擊（`bg-white/20 text-white/40 cursor-not-allowed` → 填滿變為可點擊），避免使用者跳過關鍵引導；已看過一次後（`localStorage: nhsh_demo_seen`）不再強制等待

### Step 4｜註冊表單（沉浸式深色輸入框）
- 標題：`text-xl font-black text-white`
- 角色切換 pill（學生/教師）：容器 `bg-white/10 rounded-2xl p-1`；選中 `bg-white text-[#E23D28] shadow-sm`，未選 `text-white/50`
- 輸入框（白色半透明玻璃感，與全站輸入框不同）：
  ```
  w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl
  text-sm font-medium text-white placeholder:text-white/40
  focus:ring-2 focus:ring-white/30 focus:border-white/50
  ```
- Label：`text-sm font-semibold text-white/90 mb-1.5`
- 密碼強度提示 pill：符合 `bg-emerald-500/20 text-emerald-300`，不符合 `bg-white/5 text-white/30`，`text-[10px] rounded-full`
- 錯誤訊息：`bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3`

### Step 5｜權限請求（定位／通知）
- 每個權限一張大卡片：`p-5 rounded-2xl border flex items-center gap-4`
  - 未請求：`bg-white/10 border-white/20 active:scale-[0.98]`
  - 已允許：`bg-emerald-500/20 border-emerald-400/40`
  - 被拒絕：`bg-red-500/10 border-red-400/30`
- 圖示容器：`w-12 h-12 rounded-xl bg-white/15`（狀態對應變色）
- 已允許顯示綠色打勾 icon（`stroke="#10b981"`）

### Step 6｜個人化設定（主題／通知方式）
- 主題選擇：三個迷你畫面預覽卡（`aspect-[3/4] rounded-xl border-2`），選中態 `border-white shadow-lg shadow-white/20 scale-105`，未選 `opacity-50`；卡片內用縮小的色塊模擬淺色/深色/跟隨系統畫面
- 通知方式三選一：`flex-1 py-3 rounded-xl text-sm font-semibold`，選中 `bg-white text-[#E23D28] shadow-lg`，未選 `bg-white/10 text-white/50`
- 完成按鈕同 Step 1 的白底紅字大按鈕樣式

> 設計要點：Onboarding 刻意跳脫全站的米白底色，改用強烈品牌漸層＋白色玻璃感元件（`bg-white/10` ～ `bg-white/20` 系列），營造「歡迎進場」的儀式感，跟主要功能頁的克制、留白風格形成對比。
