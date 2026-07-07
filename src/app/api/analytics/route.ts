import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const jar = await cookies();
  if (!jar.get("admin_token")) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const range = searchParams.get("range") || "7d";
  const dept = searchParams.get("dept") || "all";

  const now = new Date();
  let startDate: Date;
  switch (range) {
    case "1d":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 86400000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 86400000);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 86400000);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 86400000);
      startDate.setHours(0, 0, 0, 0);
  }

  try {
    const snap = await adminDb
      .collection("orders")
      .where("createdAt", ">=", startDate)
      .get();

    interface OrderDoc {
      department: string;
      status: string;
      totalPrice: number;
      createdAt: { toDate(): Date } | Date | string;
      confirmedAt?: { toDate(): Date } | Date | string;
      readyAt?: { toDate(): Date } | Date | string;
      pickedUpAt?: { toDate(): Date } | Date | string;
      className?: string;
      studentId?: string;
      items?: { name: string; quantity: number; price: number; menuItemId: string }[];
    }

    let orders: OrderDoc[] = snap.docs.map((d) => d.data() as OrderDoc);

    if (dept !== "all") {
      orders = orders.filter((o) => o.department === dept);
    }

    const getDate = (o: OrderDoc): Date => {
      const ca = o.createdAt;
      if (ca && typeof ca === "object" && "toDate" in ca) return ca.toDate();
      if (ca instanceof Date) return ca;
      return new Date(ca as string);
    };

    // 1. Overview
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === "picked_up").length;
    const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + (o.totalPrice || 0), 0);
    const avgOrderPrice = completedOrders > 0
      ? Math.round(totalRevenue / (totalOrders - cancelledOrders))
      : 0;

    // 2. Daily revenue trend
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const dateStr = getDate(o).toISOString().split("T")[0];
      const entry = dailyMap.get(dateStr) || { revenue: 0, orders: 0 };
      entry.revenue += o.totalPrice || 0;
      entry.orders += 1;
      dailyMap.set(dateStr, entry);
    }
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Hourly distribution
    const hourly = new Array(24).fill(0);
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      hourly[getDate(o).getHours()] += 1;
    }

    // 4. Top items
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      if (o.status === "cancelled" || !o.items) continue;
      for (const item of o.items) {
        const key = item.menuItemId || item.name;
        const entry = itemMap.get(key) || { name: item.name, qty: 0, revenue: 0 };
        entry.qty += item.quantity;
        entry.revenue += item.price * item.quantity;
        itemMap.set(key, entry);
      }
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // 5. Class ranking
    const classMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      if (o.status === "cancelled" || !o.className) continue;
      const entry = classMap.get(o.className) || { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += o.totalPrice || 0;
      classMap.set(o.className, entry);
    }
    const classRanking = Array.from(classMap.entries())
      .map(([className, data]) => ({ className, ...data }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    // 6. Status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const o of orders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
    }

    // 7. Department split
    const deptSplit: Record<string, { orders: number; revenue: number }> = {};
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      if (!deptSplit[o.department]) deptSplit[o.department] = { orders: 0, revenue: 0 };
      deptSplit[o.department].orders += 1;
      deptSplit[o.department].revenue += o.totalPrice || 0;
    }

    // 8. Unique customers
    const uniqueStudents = new Set(orders.filter(o => o.status !== "cancelled").map(o => o.studentId)).size;

    // 9. Prep time analysis
    const toTs = (v: { toDate(): Date } | Date | string | undefined): number | null => {
      if (!v) return null;
      if (typeof v === "object" && "toDate" in v) return v.toDate().getTime();
      if (v instanceof Date) return v.getTime();
      const t = new Date(v as string).getTime();
      return isNaN(t) ? null : t;
    };

    const prepTimes: { confirmMin: number[]; readyMin: number[]; totalMin: number[]; byHour: Record<number, number[]> } = {
      confirmMin: [], readyMin: [], totalMin: [], byHour: {},
    };

    for (const o of orders) {
      const created = toTs(o.createdAt);
      if (!created) continue;
      const confirmed = toTs(o.confirmedAt);
      const ready = toTs(o.readyAt);
      const pickedUp = toTs(o.pickedUpAt);

      if (confirmed && confirmed > created) {
        prepTimes.confirmMin.push((confirmed - created) / 60000);
      }
      if (ready && confirmed && ready > confirmed) {
        prepTimes.readyMin.push((ready - confirmed) / 60000);
      }
      if (ready && created && ready > created) {
        const total = (ready - created) / 60000;
        prepTimes.totalMin.push(total);
        const hour = new Date(created).getHours();
        if (!prepTimes.byHour[hour]) prepTimes.byHour[hour] = [];
        prepTimes.byHour[hour].push(total);
      }
      if (pickedUp && ready && pickedUp > ready) {
        // pickup delay tracked but not surfaced yet
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;
    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return Math.round((sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
    };
    const p90 = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      return Math.round(sorted[Math.floor(sorted.length * 0.9)] * 10) / 10;
    };

    const prepTimeStats = {
      sampleSize: prepTimes.totalMin.length,
      confirmTime: { avg: avg(prepTimes.confirmMin), median: median(prepTimes.confirmMin), p90: p90(prepTimes.confirmMin), count: prepTimes.confirmMin.length },
      cookTime: { avg: avg(prepTimes.readyMin), median: median(prepTimes.readyMin), p90: p90(prepTimes.readyMin), count: prepTimes.readyMin.length },
      totalPrepTime: { avg: avg(prepTimes.totalMin), median: median(prepTimes.totalMin), p90: p90(prepTimes.totalMin), count: prepTimes.totalMin.length },
      byHour: Object.fromEntries(
        Object.entries(prepTimes.byHour).map(([h, arr]) => [h, { avg: avg(arr), count: arr.length }])
      ),
      distribution: (() => {
        const buckets = [0, 3, 5, 10, 15, 20, 30, 60];
        const counts = new Array(buckets.length).fill(0);
        for (const t of prepTimes.totalMin) {
          for (let i = buckets.length - 1; i >= 0; i--) {
            if (t >= buckets[i]) { counts[i]++; break; }
          }
        }
        return buckets.map((b, i) => ({
          label: i === buckets.length - 1 ? `${b}+` : `${b}-${buckets[i + 1]}`,
          count: counts[i],
        }));
      })(),
    };

    return NextResponse.json({
      overview: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        avgOrderPrice,
        uniqueStudents,
        completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
        cancelRate: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
      },
      dailyTrend,
      hourly,
      topItems,
      classRanking,
      statusBreakdown,
      deptSplit,
      prepTimeStats,
      range,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "分析資料載入失敗" }, { status: 500 });
  }
}
