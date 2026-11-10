# 綠界 ECPay 金流整合

## 付款流程

```
學生選「線上付款」送出
  └─ POST /api/orders  → 訂單 awaiting_payment（先保留庫存）+ payments/{MerchantTradeNo}
       └─ 瀏覽器 → /api/payments/ecpay/redirect/{mtn} → 自動 POST 到綠界付款頁
            ├─ 綠界伺服器 → POST /api/payments/ecpay/notify   （ReturnURL，主要入帳管道）
            └─ 學生瀏覽器 → POST /api/payments/ecpay/result   （OrderResultURL，303 轉回訂單頁）
付款成功 → 訂單變 pending，店家才看得到，並寄出訂單確認
```

- 兩個回呼都會驗證 **CheckMacValue（SHA256、定時比較）**、**特店編號**、**金額與建立時相符**，並以 Firestore 交易冪等入帳；綠界重送不會重複入帳。
- 學生若漏收回呼，訂單頁的「我已付款，重新確認」會呼叫 `/api/payments/ecpay/sync`，直接向綠界 `QueryTradeInfo` 查詢。
- 20 分鐘未付款的訂單會改為 `payment_failed` 並釋放庫存（後台訂單頁載入時自動處理，不需排程）。
- 逾時後才完成付款、或同一訂單兩次付款嘗試都成功時，多出的款項會**轉入學生校園錢包**，不會遺失。
- 線上付款的訂單被取消時，款項退回**校園錢包**（`ecpay_to_wallet`）。若要退回信用卡，需在綠界廠商後台手動刷退。
- 只開放即時付款方式（信用卡、Apple Pay、TWQR、WebATM），排除 ATM / 超商代碼，因為是當天取餐。
- 錢包頁新增「線上儲值」（$50～$5,000，錢包上限 $20,000；尚未完成付款的儲值也會計入上限）。

## 上線設定

| 環境變數 | 說明 |
|---|---|
| `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` | 綠界正式特店資料。**正式站沒設定時，線上付款選項不會出現。** |
| `ECPAY_MODE` | `production` 或 `stage`；在 Vercel 上預設為 production |
| `ECPAY_STAGE_ISOLATED_DB` | 設為 `1` 表示這個部署使用**獨立的** Firebase 專案，才允許在 Vercel 上用測試模式 |
| `APP_BASE_URL` | 綠界回呼用的公開網址，例如 `https://food.nhsh.tp.edu.tw` |

**測試模式的安全限制：** 綠界測試特店（2000132）的 HashKey/IV 是公開的，任何人都能偽造「付款成功」通知。所以測試模式絕不能接到正式資料庫：
- 本機開發（不在 Vercel 上）預設使用測試特店。
- Vercel Preview 預設和正式站共用 Firestore，因此**預設關閉線上付款**。要在 Preview 測試，請讓 Preview 指向另一個 Firebase 專案，再設定 `ECPAY_MODE=stage` 與 `ECPAY_STAGE_ISOLATED_DB=1`。
- Vercel Production 永遠不會進入測試模式；把公開測試金鑰填成正式金鑰也會被拒絕。
- 每筆付款記錄建立時的模式，回呼必須在相同模式下驗證才會入帳。

測試卡號 `4311-9522-2222-2222`，有效期限任意未來日期，CVV `222`，3D 驗證碼 `1234`。

測試環境下，可在綠界測試後台用「模擬付款」觸發 ReturnURL；**正式環境會忽略模擬付款（`SimulatePaid=1`）**。

## 對帳

後台「數據分析 → 每日對帳」新增：
- 綠界訂單總額 (C) vs 綠界實收訂單款 (D)，差額不為 0 時標示異常
- 綠界線上儲值總額
- 所有回呼原始資料保存在 `payment_events`，付款狀態在 `payments`

## 部署前檢查清單

1. Vercel 設定 `JWT_SECRET`（32 字元以上）。**本次更新會讓所有人重新登入一次**（金鑰分離）。
2. 設定 `FIREBASE_STORAGE_BUCKET`（或 `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`），菜單圖片上傳才能用。
3. 在 Firebase 部署新版 `firestore.rules`（`firebase deploy --only firestore:rules`），關閉 client 端列出全部訂單的權限。
4. 建議在 Firestore 對 `rate_limits.expireAt`、`order_idempotency.expireAt`、`topup_idempotency.expireAt` 啟用 TTL 自動清除。
5. 取得綠界正式特店資料後設定上表三個變數與 `APP_BASE_URL`，先用小額實際刷一筆確認。
