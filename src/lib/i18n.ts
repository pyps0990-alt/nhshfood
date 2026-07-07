"use client";

import { useSettings } from "./settings";

const translations: Record<string, Record<string, string>> = {
  // General
  app_name: { "zh-TW": "內湖高中熱食部", en: "NHSH Cafeteria" },
  app_subtitle: { "zh-TW": "線上訂餐系統", en: "Online Ordering" },
  breakfast: { "zh-TW": "早餐部", en: "Breakfast" },
  lunch: { "zh-TW": "午餐部", en: "Lunch" },
  login: { "zh-TW": "登入", en: "Login" },
  logout: { "zh-TW": "登出", en: "Logout" },
  register: { "zh-TW": "註冊", en: "Register" },
  profile: { "zh-TW": "個人設定", en: "Profile" },
  settings: { "zh-TW": "設定", en: "Settings" },
  wallet: { "zh-TW": "錢包", en: "Wallet" },
  balance: { "zh-TW": "餘額", en: "Balance" },
  top_up: { "zh-TW": "儲值", en: "Top Up" },
  order: { "zh-TW": "訂單", en: "Orders" },
  cart: { "zh-TW": "購物車", en: "Cart" },
  confirm: { "zh-TW": "確認", en: "Confirm" },
  cancel: { "zh-TW": "取消", en: "Cancel" },
  save: { "zh-TW": "儲存", en: "Save" },
  back: { "zh-TW": "返回", en: "Back" },
  home: { "zh-TW": "首頁", en: "Home" },
  all: { "zh-TW": "全部", en: "All" },
  delete: { "zh-TW": "刪除", en: "Remove" },
  clear: { "zh-TW": "清除", en: "Clear" },
  clear_all: { "zh-TW": "清空全部", en: "Clear All" },
  loading: { "zh-TW": "載入中...", en: "Loading..." },
  total: { "zh-TW": "合計", en: "Total" },
  submit: { "zh-TW": "送出", en: "Submit" },

  // Home
  need_login: { "zh-TW": "需登入", en: "Login Required" },
  login_to_order: { "zh-TW": "登入學生帳號開始訂餐", en: "Login to start ordering" },
  breakfast_hours: { "zh-TW": "早上～下午供應", en: "Morning to afternoon" },
  lunch_hours: { "zh-TW": "11:00 ~ 13:00", en: "11:00 ~ 13:00" },
  order_lookup_title: { "zh-TW": "已有訂單？輸入後四碼查詢", en: "Have an order? Enter last 4 digits" },
  order_lookup_placeholder: { "zh-TW": "訂單後四碼，如 0001", en: "Last 4 digits, e.g. 0001" },
  order_lookup_btn: { "zh-TW": "查詢", en: "Search" },
  browse_menu: { "zh-TW": "瀏覽菜單", en: "Browse Menu" },

  // Login / Register
  login_title: { "zh-TW": "登入", en: "Login" },
  login_subtitle: { "zh-TW": "內湖高中熱食部線上訂餐", en: "NHSH Cafeteria Online Ordering" },
  student_id: { "zh-TW": "學號 / 教師編號", en: "Student / Teacher ID" },
  student_id_placeholder: { "zh-TW": "輸入學號或教師編號", en: "Enter your ID" },
  password: { "zh-TW": "密碼", en: "Password" },
  password_placeholder: { "zh-TW": "輸入密碼", en: "Enter password" },
  first_time: { "zh-TW": "第一次使用？", en: "First time?" },
  register_account: { "zh-TW": "註冊帳號", en: "Create Account" },
  back_to_home: { "zh-TW": "返回首頁", en: "Back to Home" },
  login_required_msg: { "zh-TW": "請先登入學生帳號", en: "Please login first" },
  go_login: { "zh-TW": "前往登入", en: "Go to Login" },

  // Cart
  cart_empty: { "zh-TW": "購物車是空的", en: "Your cart is empty" },
  cart_empty_desc: { "zh-TW": "瀏覽早餐部或午餐部的菜單，點擊「加入」即可開始點餐", en: "Browse the menu and tap \"Add\" to start ordering" },
  back_to_menu: { "zh-TW": "回去看菜單", en: "Back to Menu" },
  fill_details: { "zh-TW": "填寫詳細資料", en: "Fill Details" },
  quick_submit: { "zh-TW": "快速送出", en: "Quick Submit" },
  submitting: { "zh-TW": "送出中...", en: "Submitting..." },
  multi_dept_notice: { "zh-TW": "購物車包含多個部門的品項，送出時將自動拆為多筆訂單", en: "Items from multiple departments will be split into separate orders" },

  // Order form
  order_form_title: { "zh-TW": "填寫訂單資料", en: "Order Details" },
  student_name: { "zh-TW": "姓名", en: "Name" },
  student_name_placeholder: { "zh-TW": "選填", en: "Optional" },
  class_name: { "zh-TW": "班級", en: "Class" },
  class_placeholder: { "zh-TW": "例：高二忠班", en: "e.g. Class 2-A" },
  pickup_date: { "zh-TW": "取餐日期", en: "Pickup Date" },
  pickup_time: { "zh-TW": "取餐時段", en: "Pickup Time" },
  payment_method: { "zh-TW": "付款方式", en: "Payment" },
  cash: { "zh-TW": "現金", en: "Cash" },
  wallet_pay: { "zh-TW": "錢包餘額", en: "Wallet" },
  easycard: { "zh-TW": "悠遊卡", en: "EasyCard" },
  coming_soon: { "zh-TW": "即將推出", en: "Soon" },
  note: { "zh-TW": "備註", en: "Note" },
  note_placeholder: { "zh-TW": "例：不要辣、加大飯量", en: "e.g. no spicy, extra rice" },
  order_content: { "zh-TW": "訂單內容", en: "Order Summary" },
  submit_order: { "zh-TW": "送出訂單", en: "Place Order" },
  order_submitting: { "zh-TW": "正在送出訂單...", en: "Placing order..." },
  order_submitting_hint: { "zh-TW": "請勿關閉頁面", en: "Please don't close this page" },
  order_error: { "zh-TW": "訂單送出失敗，請稍後再試", en: "Order failed, please try again" },
  fill_student_id: { "zh-TW": "請填寫學號", en: "Please enter your ID" },

  // Order status
  order_not_found: { "zh-TW": "找不到訂單", en: "Order Not Found" },
  back_home: { "zh-TW": "回首頁", en: "Home" },
  save_order_img: { "zh-TW": "儲存訂單圖", en: "Save Image" },

  // Menu
  add: { "zh-TW": "加入", en: "Add" },
  sold_out: { "zh-TW": "已售罄", en: "Sold Out" },
  remaining: { "zh-TW": "剩", en: "Left" },
  only_left: { "zh-TW": "僅剩", en: "Only" },
  units: { "zh-TW": "份", en: "left" },
  search_menu: { "zh-TW": "搜尋菜單", en: "Search menu" },
  retry: { "zh-TW": "重試", en: "Retry" },
  no_search_results: { "zh-TW": "沒有符合的品項", en: "No matching items" },
  no_items: { "zh-TW": "目前沒有品項", en: "No items available" },
  no_items_desc: { "zh-TW": "管理員尚未上架此分類的餐點，請稍後再來看看", en: "No items in this category yet, please check back later" },
  not_serving: { "zh-TW": "目前非供餐時段", en: "Not serving now" },
  not_serving_desc: { "zh-TW": "午餐部供應時間為 11:00 ~ 13:00，您可以先瀏覽菜單", en: "Lunch is served 11:00 ~ 13:00. You can browse the menu first" },

  // Settings
  dark_mode: { "zh-TW": "深色模式", en: "Dark Mode" },
  language: { "zh-TW": "語言", en: "Language" },
  notifications: { "zh-TW": "通知方式", en: "Notifications" },
  theme_light: { "zh-TW": "淺色", en: "Light" },
  theme_dark: { "zh-TW": "深色", en: "Dark" },
  theme_system: { "zh-TW": "跟隨系統", en: "System" },
  notify_email: { "zh-TW": "Email", en: "Email" },
  notify_push: { "zh-TW": "APP", en: "Push" },
  notify_off: { "zh-TW": "關閉", en: "Off" },

  // Wallet
  wallet_code: { "zh-TW": "錢包代碼", en: "Wallet Code" },
  wallet_balance: { "zh-TW": "錢包餘額", en: "Wallet Balance" },
  insufficient_balance: { "zh-TW": "餘額不足", en: "Insufficient Balance" },
  top_up_history: { "zh-TW": "交易紀錄", en: "Transaction History" },
  contact_admin: { "zh-TW": "聯繫管理員", en: "Contact Admin" },

  // Statuses
  pending: { "zh-TW": "待確認", en: "Pending" },
  confirmed: { "zh-TW": "準備中", en: "Preparing" },
  ready: { "zh-TW": "可取餐", en: "Ready" },
  picked_up: { "zh-TW": "已取餐", en: "Picked Up" },
  cancelled: { "zh-TW": "已取消", en: "Cancelled" },
  order_lookup: { "zh-TW": "訂單查詢", en: "Order Lookup" },

  // Misc
  copyright: { "zh-TW": "內湖高中熱食部", en: "NHSH Cafeteria" },
};

export function useT() {
  const locale = useSettings((s) => s.locale);
  return function t(key: string): string {
    return translations[key]?.[locale] ?? key;
  };
}

const foodDict: Record<string, string> = {
  "蛋餅": "Egg Crepe", "培根蛋餅": "Bacon Egg Crepe", "起司蛋餅": "Cheese Egg Crepe",
  "玉米蛋餅": "Corn Egg Crepe", "鮪魚蛋餅": "Tuna Egg Crepe", "火腿蛋餅": "Ham Egg Crepe",
  "三明治": "Sandwich", "總匯三明治": "Club Sandwich", "火腿三明治": "Ham Sandwich",
  "鮪魚三明治": "Tuna Sandwich", "起司三明治": "Cheese Sandwich",
  "吐司": "Toast", "鮪魚吐司": "Tuna Toast", "火腿吐司": "Ham Toast",
  "漢堡": "Burger", "豬排漢堡": "Pork Burger", "雞腿堡": "Chicken Burger",
  "飯糰": "Rice Ball", "肉鬆飯糰": "Pork Floss Rice Ball",
  "蘿蔔糕": "Radish Cake", "薯餅": "Hash Brown", "雞塊": "Nuggets",
  "熱狗": "Hot Dog", "燒餅": "Sesame Flatbread", "油條": "Fried Dough",
  "蔥抓餅": "Scallion Pancake", "抓餅": "Pancake",
  "紐奧良": "New Orleans Chicken",
  "豆漿": "Soy Milk", "紅茶": "Black Tea", "奶茶": "Milk Tea",
  "綠茶": "Green Tea", "鮮奶茶": "Fresh Milk Tea", "可可": "Cocoa",
  "咖啡": "Coffee", "拿鐵": "Latte", "柳橙汁": "Orange Juice",
  "雞排飯": "Chicken Cutlet Rice", "排骨飯": "Pork Chop Rice",
  "牛肉麵": "Beef Noodle", "滷肉飯": "Braised Pork Rice",
  "便當": "Bento", "炒飯": "Fried Rice", "炒麵": "Fried Noodles",
  "水餃": "Dumplings", "湯麵": "Noodle Soup", "乾麵": "Dry Noodles",
  "咖哩飯": "Curry Rice", "雞腿飯": "Chicken Leg Rice",
  "主食": "Main", "飲料": "Drinks", "點心": "Snacks", "湯品": "Soup",
  "套餐": "Combo", "加購": "Add-on",
};

export function useMenuTranslate() {
  const locale = useSettings((s) => s.locale);
  return function tMenu(name: string): string {
    if (locale === "zh-TW") return name;
    if (foodDict[name]) return foodDict[name];
    for (const [zh, en] of Object.entries(foodDict)) {
      if (name.includes(zh)) return name.replace(zh, en);
    }
    return name;
  };
}
