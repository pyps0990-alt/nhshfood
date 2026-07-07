"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BackButton } from "@/components/BackButton";

interface Student {
  id?: string;
  className: string;
  studentId: string;
  studentName: string;
  email: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [csvPreview, setCsvPreview] = useState<Student[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Single add form
  const [form, setForm] = useState({ className: "", studentId: "", studentName: "", email: "" });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      // Skip header if first line looks like a header
      const startIdx = lines[0]?.match(/班級|class|email/i) ? 1 : 0;
      const parsed: Student[] = [];

      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 4) {
          parsed.push({
            className: cols[0],
            studentId: cols[1],
            studentName: cols[2],
            email: cols[3],
          });
        }
      }

      if (parsed.length === 0) {
        setError("CSV 格式不正確，每行需有：班級,座號,姓名,Email");
        return;
      }

      setCsvPreview(parsed);
    };
    reader.readAsText(file);
  }

  async function uploadCSV() {
    if (csvPreview.length === 0) return;
    setUploading(true);
    setError("");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: csvPreview }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "上傳失敗");
      }
      const data = await res.json();
      setMessage(data.message);
      setCsvPreview([]);
      if (fileRef.current) fileRef.current.value = "";
      fetchStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function addSingle() {
    if (!form.className || !form.studentId || !form.studentName || !form.email) {
      setError("請填寫所有欄位");
      return;
    }
    setAdding(true);
    setError("");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: [form] }),
      });
      if (!res.ok) throw new Error("新增失敗");
      setMessage("已新增 1 筆學生資料");
      setForm({ className: "", studentId: "", studentName: "", email: "" });
      fetchStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增失敗");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("刪除失敗");
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setMessage("已刪除 1 筆學生資料");
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const grouped = students.reduce<Record<string, Student[]>>((acc, s) => {
    (acc[s.className] = acc[s.className] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-3">
        <BackButton href="/admin/hub" variant="light" />
        <h1 className="text-lg font-bold tracking-tight">學生名冊管理</h1>
        <span className="ml-auto text-sm text-stone-400">{students.length} 筆資料</span>
      </header>

      <main className="flex-1 px-5 py-6 space-y-6 pb-10">
        {/* CSV Upload */}
        <div className="card-premium p-5 space-y-4">
          <h2 className="font-bold text-stone-800 dark:text-stone-200">批次匯入（CSV）</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">CSV 格式：<code className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-xs">班級,座號,姓名,Email</code></p>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleCSVFile}
              className="flex-1 text-sm file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-stone-900 file:text-white hover:file:bg-stone-800"
            />
          </div>

          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">預覽（{csvPreview.length} 筆）：</p>
              <div className="max-h-48 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-xl">
                <table className="w-full text-xs dark:text-stone-300">
                  <thead className="bg-stone-50 dark:bg-stone-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">班級</th>
                      <th className="px-3 py-2 text-left">座號</th>
                      <th className="px-3 py-2 text-left">姓名</th>
                      <th className="px-3 py-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 20).map((s, i) => (
                      <tr key={i} className="border-t border-stone-100 dark:border-stone-800">
                        <td className="px-3 py-1.5">{s.className}</td>
                        <td className="px-3 py-1.5">{s.studentId}</td>
                        <td className="px-3 py-1.5">{s.studentName}</td>
                        <td className="px-3 py-1.5">{s.email}</td>
                      </tr>
                    ))}
                    {csvPreview.length > 20 && (
                      <tr><td colSpan={4} className="px-3 py-2 text-stone-400 dark:text-stone-500 text-center">...還有 {csvPreview.length - 20} 筆</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                onClick={uploadCSV}
                disabled={uploading}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {uploading ? "上傳中..." : `確認匯入 ${csvPreview.length} 筆`}
              </button>
            </div>
          )}
        </div>

        {/* Single add */}
        <div className="card-premium p-5 space-y-4">
          <h2 className="font-bold text-stone-800 dark:text-stone-200">單筆新增</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="班級（如 206）" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input placeholder="座號（如 20）" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input placeholder="姓名" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 dark:border-stone-700 rounded-xl text-sm dark:bg-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" />
          </div>
          <button onClick={addSingle} disabled={adding}
            className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors">
            {adding ? "新增中..." : "新增"}
          </button>
        </div>

        {message && <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 rounded-xl">{message}</p>}
        {error && <p className="text-red-600 dark:text-red-400 text-sm font-medium bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">{error}</p>}

        {/* Student list */}
        <div className="card-premium p-5 space-y-4">
          <h2 className="font-bold text-stone-800 dark:text-stone-200">目前名冊</h2>
          {loading ? (
            <p className="text-stone-400 dark:text-stone-500 text-sm">載入中...</p>
          ) : students.length === 0 ? (
            <p className="text-stone-400 dark:text-stone-500 text-sm">尚無學生資料，請匯入 CSV 或單筆新增</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cls, studs]) => (
                <div key={cls}>
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">{cls} 班（{studs.length} 人）</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {studs.sort((a, b) => a.studentId.localeCompare(b.studentId)).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 px-3 py-2 rounded-lg">
                        <span className="font-mono font-semibold text-stone-800 dark:text-stone-200 shrink-0">{s.studentId}</span>
                        <span className="font-medium text-stone-700 dark:text-stone-300 shrink-0">{s.studentName}</span>
                        <span className="text-stone-400 dark:text-stone-500 ml-auto truncate text-right">{s.email}</span>
                        {s.id && (
                          confirmDeleteId === s.id ? (
                            <span className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleDelete(s.id!)}
                                disabled={deletingId === s.id}
                                className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-semibold disabled:opacity-50 transition-colors"
                              >{deletingId === s.id ? "刪除中" : "確認"}</button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 rounded-md text-[11px] transition-colors"
                              >取消</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(s.id!)}
                              className="shrink-0 text-red-400 hover:text-red-500 transition-colors"
                              aria-label="刪除"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
