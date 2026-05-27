"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { MenuItem } from "@/types";

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [dept, setDept] = useState<string>("breakfast");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  function fetchItems() {
    fetch(`/api/menu?department=${dept}`)
      .then((r) => r.json())
      .then(setItems);
  }

  useEffect(() => {
    fetchItems();
  }, [dept]);

  function resetForm() {
    setName("");
    setPrice("");
    setCategory("");
    setDescription("");
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(item: MenuItem) {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.price));
    setCategory(item.category);
    setDescription(item.description || "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      price: Number(price),
      category,
      department: dept,
      description: description || null,
    };

    if (editing) {
      await fetch(`/api/menu/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    fetchItems();
  }

  async function toggleAvailable(item: MenuItem) {
    await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    fetchItems();
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-4">
        <Link href="/admin" className="text-xl">←</Link>
        <h1 className="text-lg font-bold">菜單管理</h1>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="ml-auto text-sm bg-green-600 px-3 py-1 rounded-lg"
        >
          + 新增
        </button>
      </header>

      <div className="flex gap-2 px-4 py-3 border-b border-gray-200">
        {["breakfast", "lunch"].map((d) => (
          <button
            key={d}
            onClick={() => setDept(d)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              dept === d ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {d === "breakfast" ? "早餐部" : "午餐部"}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-4 py-4 bg-gray-50 border-b border-gray-200 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="品名"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="flex gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="價格"
              type="number"
              required
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="分類（如：主食、飲料）"
              required
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述（選填）"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
              {editing ? "更新" : "新增"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">
              取消
            </button>
          </div>
        </form>
      )}

      <main className="flex-1 px-4 py-3 space-y-2">
        {items.length === 0 && (
          <p className="text-center text-gray-400 mt-10">沒有品項，點右上角新增</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{item.name}</span>
                <span className="text-xs text-gray-400">{item.category}</span>
                {!item.available && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">停售</span>
                )}
              </div>
              <p className="text-sm text-gray-500">${item.price} {item.description && `· ${item.description}`}</p>
            </div>
            <button onClick={() => startEdit(item)} className="text-sm text-blue-500">編輯</button>
            <button
              onClick={() => toggleAvailable(item)}
              className={`text-sm ${item.available ? "text-red-500" : "text-green-500"}`}
            >
              {item.available ? "停售" : "上架"}
            </button>
          </div>
        ))}
      </main>
    </div>
  );
}
