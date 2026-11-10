# 設計系統：對照 Apple HIG / iOS 27 Liquid Glass

依據：Apple HIG〈Materials〉、〈Adopting Liquid Glass〉，以及 WWDC26 公布的 iOS 27 Liquid Glass 調整。

| HIG / iOS 27 規則 | 本站實作 |
|---|---|
| Liquid Glass 只用在功能層（導覽、Tab Bar、工具列、Sheet），**不用在內容層** | 卡片、列表、菜單卡改為不透明的 `ios-card` / `lg-list`（系統分組背景色）；玻璃只出現在 `lg-nav` 按鈕、`TabBar`、`MenuToolbar`、Sheet、對話框 |
| 少量使用玻璃 | 每個畫面只有頂部控制、底部浮動列兩組玻璃 |
| Regular 變體：模糊＋亮度調整，確保可讀 | `.lg-glass`：`blur(40px) saturate(190%) brightness()`，亮色提亮、深色壓暗 |
| Clear 變體只用在豐富媒體上，亮背景加 35% 暗化層 | `.lg-glass-clear`（菜單照片上的「已售罄」） |
| 主要動作用 glassProminent | `.lg-glass-prominent`：購物車、送出並付款 |
| iOS 27：玻璃外緣加暗色描邊、高光更亮、背景擴散更強 | `--glass-edge` 0.5px 暗邊、`--glass-spec` 頂部高光、模糊加強到 40–48px |
| iOS 27：內容捲到工具列下時出現一致的霧面頂欄 | `NavBar` 靜止時透明，捲動後 `data-scrolled` 變成霧面＋柔和的 scroll edge |
| iOS 27：「超透明 ↔ 完全著色」滑桿 | 設定頁「玻璃效果」滑桿（透明／標準／著色）＋「關閉透明效果」開關，寫入 `html[data-glass]` |
| 降低透明度、增加對比 | `prefers-reduced-transparency` 改不透明；`prefers-contrast: more` 加深邊線與次要文字、提高玻璃不透明度 |
| 浮動 Tab Bar，往下捲自動縮小 | `TabBar`（首頁／訂單／錢包／設定），捲動時縮成只有圖示的小膠囊 |
| iPhone 搜尋放在底部 | 菜單頁底部工具列：購物車＋搜尋按鈕，點開變成搜尋欄 |
| 工具列按鈕依功能分組、同組共用背景 | `NavGroup`；首頁頂部只留頭像與錢包兩顆獨立玻璃按鈕 |
| 半高 Sheet 與螢幕邊緣內縮、圓角與裝置同心；展開時更不透明 | `.lg-sheet`：左右下各內縮 8px、圓角 38px（≈ 裝置圓角 − 內縮）、背景 90% 不透明 |
| 同心圓角、分組區塊圓角加大 | `--r-device` 48 / `--r-sheet` 38 / `--r-card` 26 / 控制項膠囊 |
| 列表列高與留白加大 | `lg-row` 最小高度 52px、分隔線從 16px 內縮開始 |
| 控制項互動時變成玻璃、按下放大變亮 | 分段控制的滑塊按住時變玻璃；玻璃按鈕 `:active` 放大 1.06 並提亮；內容按鈕維持輕微縮小 |
| 玻璃以透鏡效果出現，而非淡入 | `.lg-materialize`（縮放＋模糊收斂） |
| 系統語意色、色彩要有亮／暗／高對比三種 | `--label`、`--fill`、`--separator`、`--sys-*`；品牌紅為 tint，三種變體皆有定義 |
| SF 字級 | `.ios-large-title`（34）、`title1–3`、`headline`（17 semibold）、`body`（17）、`subhead`、`footnote`、`caption` |

後台與 POS 使用同一套 token；廚房端（POS／收餐畫面）固定深色系統介面。
