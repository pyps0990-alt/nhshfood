# 內湖高中熱食部 — 安全與功能稽核（2026-11-10）

> **狀態：** 下列項目已全部在 `feat/liquid-glass-ecpay-security` 分支修正，F6 除外（lint 錯誤多為既有的 React Compiler 規則，不影響建置）。驗證方式見文末。

範圍：`main` @ `822156c`（與 Vercel production 部署相同）。
嚴重度：🔴 嚴重（可直接造成金錢損失或越權）、🟠 高、🟡 中、⚪ 低／功能 bug。

## 一、認證與授權

| # | 嚴重度 | 位置 | 問題 | 修正 |
|---|---|---|---|---|
| A1 | 🔴 | `lib/auth.ts`、`middleware.ts` | 學生 JWT 與管理員 JWT 使用同一把金鑰且管理員驗證不檢查身分種類。學生把自己的 `student_token` 值貼到 `admin_token` cookie 即取得**完整後台權限**（儲值、結清、刪學生、改菜單）。 | 管理員／學生分開衍生金鑰 + `aud` / `kind` 驗證；統一 `requireAdmin()` |
| A2 | 🔴 | `api/analytics`、`api/analytics/reconcile`、`api/settings/app-config` PUT | 只檢查 `admin_token` cookie **是否存在**，任意值即可通過。可關閉定位限制、讀取全校營收。 | 改用 `requireAdmin()` |
| A3 | 🔴 | `api/settings/pickup-slots` PUT | 完全沒有驗證，任何人可改取餐時段。 | `requireAdmin()` |
| A4 | 🔴 | `api/orders` GET | 沒有驗證，回傳今日**所有訂單**（學號、姓名、班級、品項）。 | `requireAdmin()` |
| A5 | 🔴 | `api/student-auth/profile` PATCH | 沒有 session 驗證，以 body 的 `studentId` 為準。任何人可改任何學生的姓名、班級、Email。 | 由 session 取得學號；改 Email 需驗證目前密碼 |
| A6 | 🔴 | `api/push/subscribe` POST/PUT/DELETE | 沒有驗證，可替任何學生註冊推播端點（攔截其訂單通知）或關閉通知。 | 由 session 取得學號 |
| A7 | 🟠 | `api/upload` | 沒有驗證、未限制副檔名與大小；Vercel 檔案系統唯讀，功能在正式站本來就壞掉。 | 管理員限定、僅允許圖片、5MB、改存 Firebase Storage |
| A8 | 🟠 | `middleware.ts` | matcher 漏掉 `/admin/analytics`、`/admin/hub`、`/admin/wallet`、`/admin/pickup-slots`；`JWT_SECRET` 未設定時退回寫死的公開預設值。Next 16 已改名為 `proxy.ts`。 | 改為 `proxy.ts`、`/admin/:path*` 全保護、正式環境缺金鑰直接拒絕 |
| A9 | 🟠 | `api/auth` | 管理員密碼為無鹽 SHA-256；登入限流只看 IP。 | 登入時自動升級為 bcrypt；加帳號層級限流 |
| A10 | 🟠 | `api/students` GET | 回傳內容含學生 `passwordHash`。 | 移除敏感欄位 |
| A11 | 🟡 | `api/orders/lookup` | 輸入 4 碼即可列舉當日全部訂單 ID → 取得他人姓名班級。 | 需登入，且只能查自己的訂單 |
| A12 | 🟡 | `api/student-auth/register` | 無限流。 | 加限流 |
| A13 | 🟠 | Firestore 規則 / 後台即時訂單 | 後台用 client SDK 直接 `onSnapshot` 整個 `orders`，代表正式規則必須開放 `list`，等同任何人可用公開金鑰讀全部訂單。 | 後台改走管理員 API 輪詢；規則可安全關閉 `list` |

## 二、錢包與付款

| # | 嚴重度 | 位置 | 問題 | 修正 |
|---|---|---|---|---|
| P1 | 🔴 | `api/orders/[id]` PATCH | 取消退款不在交易內、也不檢查狀態轉換：同一筆錢包訂單「取消 → 待確認 → 取消」或連點兩次取消，會**重複退款**。 | 單一交易 + 狀態機 + 冪等退款旗標 |
| P2 | 🟠 | `api/orders/[id]` PATCH | 取消訂單不回補庫存。 | 交易內回補 |
| P3 | 🟠 | `api/wallet/pay` | 不需登入，只要學號＋密碼即可扣款；IP 限流在 serverless 可被繞過，形同密碼暴力破解入口。 | 需學生 session + 密碼二次驗證 + Firestore 持久限流 |
| P4 | 🟡 | `api/orders` POST、`api/wallet/pay` | 已結清（closed）的錢包仍可扣款。 | 拒絕 |
| P5 | 🟡 | 錢包代碼 | 以 `Math.random()` 產生。 | 改用 `crypto.randomInt` |
| P6 | 🟡 | CSV 匯出 | 未防範試算表公式注入（備註以 `=`、`+` 開頭）。 | 前綴單引號 |
| P7 | 🟡 | 儲值／結清／重新啟用 | 沒有獨立的管理員操作稽核紀錄。 | 新增 `admin_audit` |

## 三、功能 bug

| # | 位置 | 問題 |
|---|---|---|
| F1 | 訂單編號、今日訂單、分析、對帳 | 用伺服器時區（Vercel = UTC）。台灣早上 8 點前的訂單會算到前一天，訂單編號序號也會在早上 8 點才重置。 |
| F2 | `api/orders` POST | 每個 IP 每 5 分鐘只能下 5 單。全校共用學校 Wi-Fi 對外 IP 時，尖峰時段幾乎所有人都會被擋。 |
| F3 | `/pos` | POS 呼叫一般下單 API，但收銀員沒有學生 session → 現場點餐一律 401 失敗。 |
| F4 | `/settings` 測試通知 | 呼叫不存在的 `/api/notify`。 |
| F5 | 選單圖片上傳 | 見 A7，正式站無法使用。 |
| F6 | lint | 29 個錯誤（React hooks 規則）。 |

## 四、Firestore 規則部署提醒

`firestore.rules` 不會隨 Vercel 部署。本次修改後，後台已不再需要 client 端 `list` 訂單，請在 Firebase Console 或 `firebase deploy --only firestore:rules` 部署新版規則，才能真正關閉 A13。

## 五、驗證

- `npm test`：綠界 CheckMacValue 對官方測試向量（`6C51C9E6…B840`）。
- 金流整合測試（30 項，對訂單 / 付款模組實際執行）：錢包扣款與庫存同交易、重複取消只退一次、取消後不可改回待確認、網路重送冪等、已結清錢包拒絕扣款、綠界金額 / 特店不符拒絕、通知重送不重複入帳、逾時後才付款轉入錢包、兩次付款嘗試都成功時重複款轉錢包、竄改金額的回呼被拒、學生 token 無法當管理員 token。
- HTTP 層：原本開放的 10 個端點皆回 401；學生 token 放進 `admin_token` 回 401；跨站 POST 回 403；綠界回呼仍可跨站送達。
