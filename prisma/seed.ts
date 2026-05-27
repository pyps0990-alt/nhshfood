import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.menuItem.deleteMany();

  const items = [
    // 早餐部
    { name: "蛋餅", price: 30, category: "主食", department: "breakfast", description: "原味蛋餅" },
    { name: "起司蛋餅", price: 35, category: "主食", department: "breakfast", description: "加起司" },
    { name: "火腿蛋餅", price: 35, category: "主食", department: "breakfast", description: "加火腿" },
    { name: "培根蛋餅", price: 40, category: "主食", department: "breakfast", description: "加培根" },
    { name: "鮪魚三明治", price: 40, category: "主食", department: "breakfast", description: "鮪魚沙拉口味" },
    { name: "火腿三明治", price: 35, category: "主食", department: "breakfast" },
    { name: "總匯三明治", price: 50, category: "主食", department: "breakfast", description: "火腿＋起司＋蛋" },
    { name: "蘿蔔糕", price: 25, category: "點心", department: "breakfast" },
    { name: "薯餅", price: 20, category: "點心", department: "breakfast" },
    { name: "奶茶（大）", price: 30, category: "飲料", department: "breakfast" },
    { name: "紅茶（大）", price: 20, category: "飲料", department: "breakfast" },
    { name: "豆漿", price: 20, category: "飲料", department: "breakfast" },
    { name: "米漿", price: 25, category: "飲料", department: "breakfast" },

    // 午餐部
    { name: "排骨飯", price: 85, category: "便當", department: "lunch", description: "附湯、三樣配菜" },
    { name: "雞腿飯", price: 90, category: "便當", department: "lunch", description: "附湯、三樣配菜" },
    { name: "魚排飯", price: 80, category: "便當", department: "lunch", description: "附湯、三樣配菜" },
    { name: "滷肉飯", price: 50, category: "飯類", department: "lunch", description: "附湯" },
    { name: "炒飯", price: 60, category: "飯類", department: "lunch" },
    { name: "乾麵", price: 40, category: "麵食", department: "lunch" },
    { name: "餛飩麵", price: 55, category: "麵食", department: "lunch" },
    { name: "牛肉麵", price: 100, category: "麵食", department: "lunch", description: "紅燒口味" },
    { name: "貢丸湯", price: 25, category: "湯品", department: "lunch" },
    { name: "味噌湯", price: 20, category: "湯品", department: "lunch" },
  ];

  for (const item of items) {
    await prisma.menuItem.create({ data: item });
  }

  console.log(`Seeded ${items.length} menu items`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
