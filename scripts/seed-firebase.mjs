/**
 * Firebase 初始化腳本
 * 用法: node scripts/seed-firebase.mjs
 * 需先在 .env.local 中填入 Firebase 設定
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { createHash } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error("❌ 請先在 .env.local 中填入 Firebase 設定");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

async function seed() {
  // 建立管理員帳號
  const adminQuery = query(collection(db, "admins"), where("username", "==", "admin"));
  const adminSnap = await getDocs(adminQuery);
  if (adminSnap.empty) {
    await addDoc(collection(db, "admins"), {
      username: "admin",
      passwordHash: hashPassword("admin123"),
    });
    console.log("✅ 管理員帳號已建立 (admin / admin123)");
  } else {
    console.log("ℹ️  管理員帳號已存在");
  }

  // 早餐菜單
  const breakfastItems = [
    { name: "蛋餅", price: 30, category: "主食", department: "breakfast", description: "原味蛋餅", imageUrl: null, available: true },
    { name: "起司蛋餅", price: 35, category: "主食", department: "breakfast", description: "加起司", imageUrl: null, available: true },
    { name: "培根蛋餅", price: 40, category: "主食", department: "breakfast", description: "培根+蛋餅", imageUrl: null, available: true },
    { name: "火腿三明治", price: 35, category: "主食", department: "breakfast", description: null, imageUrl: null, available: true },
    { name: "總匯三明治", price: 50, category: "主食", department: "breakfast", description: "火腿+蛋+起司+生菜", imageUrl: null, available: true },
    { name: "鮪魚吐司", price: 35, category: "主食", department: "breakfast", description: null, imageUrl: null, available: true },
    { name: "豆漿", price: 15, category: "飲料", department: "breakfast", description: "冰/熱", imageUrl: null, available: true },
    { name: "紅茶", price: 15, category: "飲料", department: "breakfast", description: "大杯", imageUrl: null, available: true },
    { name: "奶茶", price: 20, category: "飲料", department: "breakfast", description: "大杯", imageUrl: null, available: true },
    { name: "薯餅", price: 15, category: "點心", department: "breakfast", description: null, imageUrl: null, available: true },
  ];

  // 午餐菜單
  const lunchItems = [
    { name: "雞腿飯", price: 80, category: "便當", department: "lunch", description: "配三菜一湯", imageUrl: null, available: true },
    { name: "排骨飯", price: 75, category: "便當", department: "lunch", description: "配三菜一湯", imageUrl: null, available: true },
    { name: "控肉飯", price: 70, category: "便當", department: "lunch", description: "配三菜一湯", imageUrl: null, available: true },
    { name: "素食便當", price: 65, category: "便當", department: "lunch", description: "蔬食三菜一湯", imageUrl: null, available: true },
    { name: "炒飯", price: 55, category: "麵飯", department: "lunch", description: "蛋炒飯", imageUrl: null, available: true },
    { name: "炒麵", price: 50, category: "麵飯", department: "lunch", description: null, imageUrl: null, available: true },
    { name: "滷肉飯", price: 40, category: "麵飯", department: "lunch", description: "大碗", imageUrl: null, available: true },
    { name: "味噌湯", price: 15, category: "湯品", department: "lunch", description: null, imageUrl: null, available: true },
    { name: "玉米濃湯", price: 20, category: "湯品", department: "lunch", description: null, imageUrl: null, available: true },
  ];

  const allItems = [...breakfastItems, ...lunchItems];

  // Check if menu items already exist
  const menuSnap = await getDocs(collection(db, "menuItems"));
  if (menuSnap.size > 0) {
    console.log(`ℹ️  菜單已有 ${menuSnap.size} 個品項，跳過`);
  } else {
    for (const item of allItems) {
      await addDoc(collection(db, "menuItems"), {
        ...item,
        createdAt: Timestamp.now(),
      });
    }
    console.log(`✅ 已新增 ${allItems.length} 個菜單品項`);
  }

  console.log("\n🎉 初始化完成！");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ 錯誤:", err);
  process.exit(1);
});
