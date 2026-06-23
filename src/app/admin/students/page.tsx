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

  const grouped = students.reduce<Record<string, Student[]>>((acc, s) => {
    (acc[s.className] = acc[s.className] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-stone-900 text-white px-5 py-4 flex items-center gap-3">
        <BackButton href="/admin" variant="light" />
        <h1 className="text-lg font-bold tracking-tight">學生名冊管理</h1>
        <span className="ml-auto text-sm text-stone-400">{students.length} 筆資料</span>
      </header>

      <main className="flex-1 px-5 py-6 space-y-6 pb-10">
        {/* CSV Upload */}
        <div className="card-premium p-5 space-y-4">
          <h2 className="font-bold text-stone-800">批次匯入（CSV）</h2>
          <p className="text-sm text-stone-500">CSV 格式：<code className="bg-stone-100 px-2 py-0.5 rounded text-xs">班級,座號,姓名,Email</code></p>
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
              <p className="text-sm font-medium text-stone-700">預覽（{csvPreview.length} 筆）：</p>
              <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">班級</th>
                      <th className="px-3 py-2 text-left">座號</th>
                      <th className="px-3 py-2 text-left">姓名</th>
                      <th className="px-3 py-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 20).map((s, i) => (
                      <tr key={i} className="border-t border-stone-100">
                        <td className="px-3 py-1.5">{s.className}</td>
                        <td className="px-3 py-1.5">{s.studentId}</td>
                        <td className="px-3 py-1.5">{s.studentName}</td>
                        <td className="px-3 py-1.5">{s.email}</td>
                      </tr>
                    ))}
                    {csvPreview.length > 20 && (
                      <tr><td colSpan={4} className="px-3 py-2 text-stone-400 text-center">...還有 {csvPreview.length - 20} 筆</td></tr>
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
          <h2 className="font-bold text-stone-800">單筆新增</h2>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="班級（如 206）" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input placeholder="座號（如 20）" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input placeholder="姓名" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-300" />
          </div>
          <button onClick={addSingle} disabled={adding}
            className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors">
            {adding ? "新增中..." : "新增"}
          </button>
        </div>

        {message && <p className="text-emerald-600 text-sm font-medium bg-emerald-50 px-4 py-3 rounded-xl">{message}</p>}
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

        {/* Student list */}
        <div className="card-premium p-5 space-y-4">
          <h2 className="font-bold text-stone-800">目前名冊</h2>
          {loading ? (
            <p className="text-stone-400 text-sm">載入中...</p>
          ) : students.length === 0 ? (
            <p className="text-stone-400 text-sm">尚無學生資料，請匯入 CSV 或單筆新增</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cls, studs]) => (
                <div key={cls}>
                  <p className="text-sm font-bold text-stone-700 mb-2">{cls} 班（{studs.length} 人）</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {studs.sort((a, b) => a.studentId.localeCompare(b.studentId)).map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded-lg">
                        <span className="font-mono font-semibold text-stone-800 shrink-0">{s.studentId}</span>
                        <span className="font-medium text-stone-700 shrink-0">{s.studentName}</span>
                        <span className="text-stone-400 ml-auto truncate text-right">{s.email}</span>
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
