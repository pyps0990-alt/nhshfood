"use client";

import { useState, useEffect } from "react";
import { BackButton } from "@/components/BackButton";

interface Slots {
  breakfast: string[];
  lunch: string[];
}

export default function PickupSlotsPage() {
  const [slots, setSlots] = useState<Slots | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newSlot, setNewSlot] = useState({ breakfast: "", lunch: "" });

  useEffect(() => {
    fetch("/api/settings/pickup-slots")
      .then((r) => r.json())
      .then((data) => { setSlots(data); setLoading(false); })
      .catch(() => {
        setSlots({
          breakfast: ["盡快取餐", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"],
          lunch: ["11:30", "12:00", "12:10", "12:20", "12:30", "12:40", "12:50", "13:00"],
        });
        setLoading(false);
      });
  }, []);

  function addSlot(dept: "breakfast" | "lunch") {
    if (!slots || !newSlot[dept].trim()) return;
    const val = newSlot[dept].trim();
    if (slots[dept].includes(val)) return;
    setSlots({ ...slots, [dept]: [...slots[dept], val] });
    setNewSlot({ ...newSlot, [dept]: "" });
  }

  function removeSlot(dept: "breakfast" | "lunch", index: number) {
    if (!slots) return;
    setSlots({ ...slots, [dept]: slots[dept].filter((_, i) => i !== index) });
  }

  function moveSlot(dept: "breakfast" | "lunch", index: number, dir: -1 | 1) {
    if (!slots) return;
    const arr = [...slots[dept]];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setSlots({ ...slots, [dept]: arr });
  }

  async function handleSave() {
    if (!slots) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/settings/pickup-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slots),
      });
      if (!res.ok) throw new Error();
      setMessage("儲存成功");
    } catch {
      setMessage("儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#E23D28] border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!slots) return null;

  function SlotEditor({ dept, label }: { dept: "breakfast" | "lunch"; label: string }) {
    return (
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200 mb-4">{label}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {slots![dept].map((slot, i) => (
            <div
              key={`${slot}-${i}`}
              className="flex items-center gap-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-1.5 text-sm"
            >
              <button
                onClick={() => moveSlot(dept, i, -1)}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 text-xs"
                title="往前"
              >
                ◀
              </button>
              <span className="font-medium text-stone-700 dark:text-stone-300 mx-1">{slot}</span>
              <button
                onClick={() => moveSlot(dept, i, 1)}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 text-xs"
                title="往後"
              >
                ▶
              </button>
              <button
                onClick={() => removeSlot(dept, i)}
                className="text-red-400 hover:text-red-600 ml-1"
                title="移除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSlot[dept]}
            onChange={(e) => setNewSlot({ ...newSlot, [dept]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSlot(dept))}
            placeholder="新增時段，例：12:15"
            className="flex-1 px-4 py-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#E23D28]/30 focus:border-[#E23D28] transition-all"
          />
          <button
            onClick={() => addSlot(dept)}
            className="px-4 py-2.5 bg-[#E23D28] text-white rounded-xl text-sm font-bold hover:bg-[#c9321f] transition-colors"
          >
            新增
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <BackButton href="/admin/hub" />
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">取餐時段設定</h1>
      </div>

      <div className="space-y-5">
        <SlotEditor dept="breakfast" label="早餐部時段" />
        <SlotEditor dept="lunch" label="午餐部時段" />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-[#E23D28] hover:bg-[#c9321f] text-white rounded-2xl px-6 py-3.5 font-bold shadow-lg shadow-red-200/50 dark:shadow-red-950/50 transition-all disabled:opacity-50"
        >
          {saving ? "儲存中..." : "儲存設定"}
        </button>
        {message && (
          <span className={`text-sm font-medium ${message.includes("成功") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {message}
          </span>
        )}
      </div>
    </main>
  );
}
