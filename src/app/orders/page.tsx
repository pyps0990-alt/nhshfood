"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/glass/NavBar";
import { Segmented } from "@/components/glass/Segmented";
import { TabBar } from "@/components/glass/TabBar";
import { OrderLookup } from "@/components/OrderLookup";
import { useStudentAuth, useStudentAuthHydrated } from "@/lib/student-auth";

interface MyOrder {
  id: string;
  orderNumber: string;
  department: string;
  status: string;
  totalPrice: number;
  paymentMethod: string;
  pickupTime: string | null;
  itemCount: number;
  firstItem: string;
  createdAt: string | null;
}

const STATUS: Record<string, string> = {
  awaiting_payment: "等待付款", pending: "待確認", confirmed: "準備中", ready: "可取餐",
  picked_up: "已取餐", cancelled: "已取消", payment_failed: "付款未完成",
};
const ACTIVE = new Set(["awaiting_payment", "pending", "confirmed", "ready"]);

export default function MyOrdersPage() {
  const router = useRouter();
  const { student } = useStudentAuth();
  const hydrated = useStudentAuthHydrated();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"active" | "history">("active");

  useEffect(() => {
    if (!hydrated) return;
    if (!student) { router.replace("/login"); return; }
    let alive = true;
    const load = () =>
      fetch("/api/orders/mine", { cache: "no-store" })
        .then(async (r) => {
          if (!alive) return;
          if (r.status === 401) { router.replace("/login"); return; }
          if (!r.ok) throw new Error();
          setOrders(await r.json());
          setError("");
        })
        .catch(() => alive && setError("無法載入訂單，請稍後再試"));
    load();
    const iv = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => { alive = false; clearInterval(iv); };
  }, [hydrated, student, router]);

  const shown = useMemo(
    () => (orders || []).filter((o) => (tab === "active" ? ACTIVE.has(o.status) : !ACTIVE.has(o.status))),
    [orders, tab]
  );

  return (
    <div className="flex-1 flex flex-col has-tabbar">
      <NavBar large title="我的訂單" />
      <main className="flex-1 px-4 max-w-lg mx-auto w-full space-y-4">
        <Segmented
          ariaLabel="訂單篩選"
          value={tab}
          onChange={setTab}
          options={[{ value: "active", label: "進行中" }, { value: "history", label: "歷史紀錄" }]}
        />

        {error && <p className="ios-footnote text-center" style={{ color: "var(--sys-red)" }} role="alert">{error}</p>}

        {orders === null && !error ? (
          <div className="lg-list" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="lg-row h-[72px] animate-pulse" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="ios-card px-6 py-10 text-center">
            <p className="ios-headline lg-ink">{tab === "active" ? "目前沒有進行中的訂單" : "還沒有歷史訂單"}</p>
            <p className="ios-subhead lg-ink-2 mt-1">{tab === "active" ? "到首頁選擇早餐部或午餐部開始點餐" : "完成或取消的訂單會出現在這裡"}</p>
            {tab === "active" && <Link href="/" className="lg-btn lg-tinted mt-5">開始點餐</Link>}
          </div>
        ) : (
          <div className="lg-list">
            {shown.map((o) => (
              <Link key={o.id} href={`/order/${o.id}`} className="lg-row active:bg-[var(--fill-4)] transition-colors">
                <div className="shrink-0 min-w-[64px]">
                  <p className="text-[20px] font-bold lg-ink tabular-nums leading-none" style={{ fontFamily: "var(--font-rounded)" }}>
                    #{String(o.orderNumber).slice(-4)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="ios-body lg-ink truncate">
                    {o.firstItem}{o.itemCount > 1 ? ` 等 ${o.itemCount} 件` : ""}
                  </p>
                  <p className="ios-footnote lg-ink-2 truncate">
                    {o.department === "breakfast" ? "早餐部" : "午餐部"}
                    {o.createdAt && ` · ${new Date(o.createdAt).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="lg-status" data-s={o.status}>{STATUS[o.status] || o.status}</span>
                  <span className="ios-subhead lg-ink tabular-nums">${o.totalPrice}</span>
                </div>
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="lg-ink-3 shrink-0" aria-hidden="true"><path d="M1 1l6 6-6 6" /></svg>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-2">
          <OrderLookup />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
