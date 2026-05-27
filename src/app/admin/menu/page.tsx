"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useAllMenuItems, addMenuItemDirect, updateMenuItemDirect } from "@/lib/hooks";
import type { MenuItem } from "@/types";

export default function AdminMenuPage() {
  const [dept, setDept] = useState<string>("breakfast");
  const { items } = useAllMenuItems(dept);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName(""); setPrice(""); setCategory(""); setDescription(""); setImageUrl("");
    setEditing(null); setShowForm(false);
  }

  function startEdit(item: MenuItem) {
    setEditing(item); setName(item.name); setPrice(String(item.price));
    setCategory(item.category); setDescription(item.description || "");
    setImageUrl(item.imageUrl || ""); setShowForm(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setImageUrl(data.url);
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name, price: Number(price), category, department: dept,
      description: description || null, imageUrl: imageUrl || null,
    };

    if (editing) {
      await updateMenuItemDirect(editing.id, payload);
    } else {
      await addMenuItemDirect(payload);
    }

    resetForm();
  }

  async function toggleAvailable(item: MenuItem) {
    await updateMenuItemDirect(item.id, { available: !item.available });
  }

  const inputClass = "w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent";

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-xl hover:opacity-80 transition-opacity">←</Link>
        <h1 className="text-lg font-bold tracking-tight">菜單管理</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="ml-auto text-sm bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl font-semibold transition-colors">
          + 新增品項
        </button>
      </header>

      <div className="flex gap-2 px-5 py-4 border-b border-stone-100">
        {["breakfast", "lunch"].map((d) => (
          <button key={d} onClick={() => setDept(d)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${dept === d ? "bg-stone-900 text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
            {d === "breakfast" ? "早餐部" : "午餐部"}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-5 py-5 bg-stone-50 border-b border-stone-100 space-y-4 animate-fade-in">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="品名" required className={inputClass} />
          <div className="flex gap-3">
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="價格" type="number" required className={`w-1/2 ${inputClass}`} />
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="分類（如：主食、飲料）" required className={`w-1/2 ${inputClass}`} />
          </div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述（選填）" className={inputClass} />
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-600 hover:bg-stone-50 bg-white transition-colors">
              {uploading ? "上傳中..." : "上傳圖片"}
            </button>
            {imageUrl && (
              <div className="flex items-center gap-2">
                <img src={imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-500 hover:text-red-600">移除</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-colors">
              {editing ? "更新" : "新增"}
            </button>
            <button type="button" onClick={resetForm} className="px-5 py-2.5 bg-stone-100 rounded-xl text-sm text-stone-600 hover:bg-stone-200 transition-colors">取消</button>
          </div>
        </form>
      )}

      <main className="flex-1 px-5 py-4 space-y-2">
        {items.length === 0 && <p className="text-center text-stone-400 mt-10">沒有品項，點右上角新增</p>}
        {items.map((item) => (
          <div key={item.id} className="card-premium p-4 flex items-center gap-4">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center text-xl">
                {dept === "breakfast" ? "🥪" : "🍱"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate text-stone-900">{item.name}</span>
                <span className="text-xs text-stone-400 shrink-0 bg-stone-100 px-2 py-0.5 rounded-lg">{item.category}</span>
                {!item.available && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-lg shrink-0 font-medium">停售</span>}
              </div>
              <p className="text-sm text-stone-500 mt-0.5">${item.price} {item.description && `· ${item.description}`}</p>
            </div>
            <button onClick={() => startEdit(item)} className="text-sm text-blue-500 shrink-0 hover:text-blue-600 font-medium transition-colors">編輯</button>
            <button onClick={() => toggleAvailable(item)}
              className={`text-sm shrink-0 font-medium transition-colors ${item.available ? "text-red-500 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"}`}>
              {item.available ? "停售" : "上架"}
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
