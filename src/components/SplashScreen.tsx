"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 350);
    const t2 = setTimeout(() => setPhase("gone"), 650);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#E23D28] to-[#FF6B35]"
      style={{
        opacity: phase === "fade" ? 0 : 1,
        transition: "opacity 500ms ease-out",
      }}
    >
      <div
        className="flex flex-col items-center"
        style={{
          animation: "splash-logo 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-5 backdrop-blur-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">內湖高中熱食部</h1>
        <p className="text-white/70 text-sm mt-2">線上訂餐系統</p>
      </div>

      <div className="absolute bottom-16">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>

      <style>{`
        @keyframes splash-logo {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
