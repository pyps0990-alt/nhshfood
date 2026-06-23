"use client";

import { useState, useRef } from "react";
import { useAllMenuItems, addMenuItemSecure, updateMenuItemSecure, deleteMenuItemSecure } from "@/lib/hooks";
import { BackButton } from "@/components/BackButton";
import type { MenuItem, MenuTag } from "@/types";
import { MENU_TAG_LABELS, MENU_TAG_COLORS } from "@/types";

const ALL_TAGS: MenuTag[] = ["promotion", "seasonal", "daily_special"];

export default function AdminMenuPage() {
  const [dept, setDept] = useState<string>("breakfast");
  const { items } = useAllMenuItems(dept);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState<MenuTag[]>([]);
  const [stockEnabled, setStockEnabled] = useState(false);
  const [stockQty, setStockQty] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  function resetForm() {
    setName(""); setPrice(""); setCategory(""); setDescription(""); setImageUrl("");
    setTags([]); setStockEnabled(false); setStockQty("");
    setEditing(null); setShowForm(false); setError(null);
  }

  function startEdit(item: MenuItem) {
    setEditing(item); setName(item.name); setPrice(String(item.price));
    setCategory(item.category); setDescription(item.description || "");
    setImageUrl(item.imageUrl || "");
    setTags(item.tags || []);
    setStockEnabled(item.stock !== null && item.stock !== undefined);
    setStockQty(item.stock !== null && item.stock !== undefined ? String(item.stock) : "");
    setShowForm(true); setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleTag(tag: MenuTag) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      setImageUrl(data.url);
    } catch { /* ignore */ } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        price: Number(price),
        category,
        department: dept,
        description: description || null,
        imageUrl: imageUrl || null,
        tags,
        stock: stockEnabled && stockQty !== "" ? Number(stockQty) : null,
      };
      if (editing) {
        await updateMenuItemSecure(editing.id, {
          ...payload,
          soldOut: stockEnabled && Number(stockQty) <= 0,
        });
      } else {
        await addMenuItemSecure(payload);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失敗，請重試");
      console.error("Menu save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailable(item: MenuItem) {
    try {
      await updateMenuItemSecure(item.id, { available: !item.available, soldOut: false });
    } catch (err) {
      console.error("Toggle error:", err);
    }
  }

  async function resetStock(item: MenuItem) {
    const newStock = prompt("設定新庫存數量：", String(item.stock ?? 50));
    if (newStock === null) return;
    const n = Number(newStock);
    if (isNaN(n) || n < 0) return;
    try {
      await updateMenuItemSecure(item.id, {
        stock: n,
        soldOut: n <= 0,
        available: n > 0,
      });
    } catch (err) {
      console.error("Reset stock error:", err);
    }
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`確定要刪除「${item.name}」嗎？此操作無法復原。`)) return;
    try {
      await deleteMenuItemSecure(item.id);
    } catch (err) {
      console.error("Delete error:", err);
      alert("刪除失敗");
    }
  }

  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "未分類";
    (acc[cat] = acc[cat] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-3">
        <BackButton href="/admin" variant="light" />
        <h1 className="text-lg font-bold tracking-tight">菜單管理</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="ml-auto flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl font-semibold transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {showForm ? "收起" : "新增品項"}
        </button>
      </header>

      <div className="flex gap-2 px-5 py-4 border-b border-stone-100">
        {["breakfast", "lunch"].map((d) => (
          <button key={d} onClick={() => setDept(d)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${dept === d ? "bg-stone-900 text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
            {d === "breakfast" ? "早餐部" : "午餐部"}
          </button>
        ))}
        <span className="ml-auto text-sm text-stone-400 self-center">{items.length} 項品項</span>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="px-5 py-5 bg-gradient-to-b from-stone-50 to-white border-b border-stone-200 animate-fade-in">
          <div className="flex items-center gap-2 mb-5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${editing ? "bg-blue-500" : "bg-emerald-500"}`}>
              {editing ? "✎" : "+"}
            </div>
            <h2 className="font-bold text-stone-800 text-lg">{editing ? "編輯品項" : "新增品項"}</h2>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image upload + name/price */}
            <div className="flex items-start gap-4">
              <div
                onClick={() => fileRef.current?.click()}
                className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                  imageUrl ? "border-transparent" : "border-stone-300 hover:border-stone-400 bg-stone-50"
                }`}
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                ) : imageUrl ? (
                  <img src={imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-[10px] text-stone-400 mt-1 block">上傳圖片</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

              <div className="flex-1 space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="品名（必填）"
                  required
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <div className="relative w-1/2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="價格"
                      type="number"
                      required
                      className="w-full pl-7 pr-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                    />
                  </div>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="描述（選填）"
                    className="w-1/2 px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Category — quick select or type */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-2">分類</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {existingCategories.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      category === c
                        ? "bg-stone-900 text-white border-stone-900"
                        : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                    }`}>
                    {c}
                  </button>
                ))}
                <button type="button" onClick={() => setCategory("")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-stone-300 text-stone-400 hover:text-stone-600 hover:border-stone-400 transition-all">
                  + 自訂
                </button>
              </div>
              {(category === "" || !existingCategories.includes(category)) && (
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="輸入分類名稱（如：主食、飲料）"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                />
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-2">特殊標籤</label>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      tags.includes(tag)
                        ? MENU_TAG_COLORS[tag] + " border-transparent shadow-sm"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                    }`}>
                    {MENU_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-2">庫存管理</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { setStockEnabled(!stockEnabled); if (stockEnabled) setStockQty(""); }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${stockEnabled ? "bg-emerald-500" : "bg-stone-200"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${stockEnabled ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm text-stone-600">{stockEnabled ? "限量供應" : "不限量"}</span>
                {stockEnabled && (
                  <input
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="數量"
                    type="number"
                    min="0"
                    className="w-24 px-3 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
                  />
                )}
              </div>
            </div>

            {imageUrl && (
              <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-500 hover:text-red-600 transition-colors">
                移除圖片
              </button>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
                  editing ? "bg-blue-500 hover:bg-blue-600" : "bg-emerald-500 hover:bg-emerald-600"
                }`}>
                {saving ? "儲存中..." : editing ? "更新品項" : "新增品項"}
              </button>
              <button type="button" onClick={resetForm}
                className="px-6 py-3 rounded-xl text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Item list — grouped by category */}
      <main className="flex-1 px-5 py-4 space-y-6 pb-8">
        {items.length === 0 && (
          <div className="text-center mt-16 space-y-3">
            <p className="text-4xl">{dept === "breakfast" ? "🥪" : "🍱"}</p>
            <p className="text-stone-400">沒有品項，點右上角新增</p>
          </div>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h3 className="text-sm font-bold text-stone-500 mb-2 flex items-center gap-2">
              <span>{cat}</span>
              <span className="text-xs font-normal text-stone-400">{catItems.length} 項</span>
            </h3>
            <div className="space-y-2">
              {catItems.map((item) => (
                <div key={item.id}
                  className={`card-premium p-4 flex items-center gap-4 transition-opacity ${!item.available || item.soldOut ? "opacity-50" : ""}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center text-xl shrink-0">
                      {dept === "breakfast" ? "🥪" : "🍱"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate text-stone-900">{item.name}</span>
                      {(item.tags || []).map((tag) => (
                        <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${MENU_TAG_COLORS[tag]}`}>
                          {MENU_TAG_LABELS[tag]}
                        </span>
                      ))}
                      {item.soldOut && (
                        <span className="text-[10px] bg-stone-800 text-white px-2 py-0.5 rounded-md shrink-0 font-bold">售罄</span>
                      )}
                      {!item.available && !item.soldOut && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-md shrink-0 font-bold">停售</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5">
                      <span className="font-semibold text-stone-700">${item.price}</span>
                      {item.stock !== null && item.stock !== undefined && (
                        <span className="ml-1.5 text-xs">庫存: {item.stock}</span>
                      )}
                      {item.description && <span className="ml-1.5">· {item.description}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {item.stock !== null && item.stock !== undefined && (
                      <button onClick={() => resetStock(item)}
                        className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-colors text-xs font-bold">
                        補
                      </button>
                    )}
                    <button onClick={() => startEdit(item)}
                      className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button onClick={() => toggleAvailable(item)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        item.available
                          ? "bg-red-50 text-red-500 hover:bg-red-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}>
                      {item.available ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                    <button onClick={() => handleDelete(item)}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
