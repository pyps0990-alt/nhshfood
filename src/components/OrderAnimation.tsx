"use client";

import { useEffect, useState, useMemo } from "react";

type Phase = "receipt" | "cooking" | "ready";

export function OrderAnimation({
  onDone,
  orderNumbers,
}: {
  onDone: () => void;
  orderNumbers: { dept: string; displayNum: string }[];
}) {
  const [phase, setPhase] = useState<Phase>("receipt");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("cooking"), 1400);
    const t2 = setTimeout(() => setPhase("ready"), 3800);
    const t3 = setTimeout(() => onDone(), 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const confetti = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      left: 5 + (i * 37 + 13) % 90,
      delay: i * 0.035,
      dur: 0.9 + (i % 4) * 0.15,
      color: ["#E23D28", "#FF6B35", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"][i % 8],
      size: 4 + (i % 4) * 1.5,
      rotate: (i * 73) % 360,
    })),
  []);

  return (
    <div className="fixed inset-0 z-[70] bg-[#FFF8F0] dark:bg-stone-950 flex items-center justify-center overflow-hidden animate-backdrop-in">

      <button
        onClick={onDone}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-stone-200/60 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
        aria-label="返回"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Phase 1: Receipt */}
      {phase === "receipt" && (
        <div className="flex flex-col items-center oa2-fade-in">
          <div className="relative mb-6">
            <div className="oa2-receipt-slide">
              <svg width="130" height="170" viewBox="0 0 130 170" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="10" y="0" width="110" height="158" rx="6" fill="white" stroke="#e7e5e4" strokeWidth="1.5"/>
                <path d="M10 158 L18 163 L26 158 L34 163 L42 158 L50 163 L58 158 L66 163 L74 158 L82 163 L90 158 L98 163 L106 158 L114 163 L120 158" fill="white" stroke="#e7e5e4" strokeWidth="1.5"/>
                {/* Header gradient bar */}
                <defs>
                  <linearGradient id="oa2-hdr" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#E23D28"/>
                    <stop offset="1" stopColor="#FF6B35"/>
                  </linearGradient>
                </defs>
                <rect x="22" y="14" width="86" height="6" rx="3" fill="url(#oa2-hdr)"/>
                <line x1="26" y1="32" x2="104" y2="32" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="3 2"/>
                {/* Item lines */}
                <rect x="26" y="42" width="52" height="3" rx="1.5" fill="#d6d3d1"/>
                <rect x="88" y="42" width="16" height="3" rx="1.5" fill="#a8a29e"/>
                <rect x="26" y="54" width="42" height="3" rx="1.5" fill="#d6d3d1"/>
                <rect x="88" y="54" width="16" height="3" rx="1.5" fill="#a8a29e"/>
                <rect x="26" y="66" width="48" height="3" rx="1.5" fill="#d6d3d1"/>
                <rect x="88" y="66" width="16" height="3" rx="1.5" fill="#a8a29e"/>
                <line x1="26" y1="82" x2="104" y2="82" stroke="#e7e5e4" strokeWidth="1" strokeDasharray="3 2"/>
                {/* Total */}
                <rect x="26" y="94" width="32" height="5" rx="2.5" fill="#78716c"/>
                <rect x="78" y="94" width="26" height="5" rx="2.5" fill="#E23D28"/>
                {/* Stamp */}
                <circle cx="65" cy="130" r="18" fill="none" stroke="#E23D28" strokeWidth="2.5" opacity="0" className="oa2-stamp"/>
                <text x="65" y="134" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#E23D28" opacity="0" className="oa2-stamp">OK</text>
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-stone-200 oa2-text-fade">
            接收訂單中...
          </p>
          <div className="flex gap-1.5 mt-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#E23D28] oa2-dot" style={{ animationDelay: `${i * 0.18}s` }}/>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: Cooking */}
      {phase === "cooking" && (
        <div className="flex flex-col items-center oa2-fade-in">
          <div className="relative mb-6">
            <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Stove surface */}
              <ellipse cx="100" cy="155" rx="80" ry="8" fill="#292524" opacity="0.2"/>

              {/* Fire glow */}
              <ellipse cx="100" cy="140" rx="40" ry="10" fill="#fbbf24" opacity="0.15" className="oa2-glow"/>

              {/* Flames under wok — layered for depth */}
              <g className="oa2-flame">
                <ellipse cx="72" cy="138" rx="6" ry="12" fill="#fbbf24" opacity="0.5"/>
                <ellipse cx="85" cy="136" rx="7" ry="14" fill="#f59e0b" opacity="0.6"/>
                <ellipse cx="100" cy="134" rx="8" ry="16" fill="#E23D28" opacity="0.65"/>
                <ellipse cx="115" cy="136" rx="7" ry="14" fill="#FF6B35" opacity="0.6"/>
                <ellipse cx="128" cy="138" rx="6" ry="12" fill="#fbbf24" opacity="0.5"/>
              </g>
              <g className="oa2-flame2">
                <ellipse cx="78" cy="137" rx="4" ry="9" fill="#fef3c7" opacity="0.5"/>
                <ellipse cx="100" cy="135" rx="5" ry="11" fill="#fef3c7" opacity="0.4"/>
                <ellipse cx="122" cy="137" rx="4" ry="9" fill="#fef3c7" opacity="0.5"/>
              </g>

              {/* Wok body with gradient */}
              <defs>
                <linearGradient id="oa2-wok" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#78716c"/>
                  <stop offset="0.5" stopColor="#57534e"/>
                  <stop offset="1" stopColor="#44403c"/>
                </linearGradient>
                <radialGradient id="oa2-wok-inner" cx="0.5" cy="0.3" r="0.6">
                  <stop offset="0" stopColor="#78716c"/>
                  <stop offset="1" stopColor="#44403c"/>
                </radialGradient>
              </defs>
              <path d="M30 110 Q30 145 100 150 Q170 145 170 110" fill="url(#oa2-wok)"/>
              <ellipse cx="100" cy="110" rx="70" ry="14" fill="url(#oa2-wok-inner)"/>
              {/* Wok rim highlight */}
              <ellipse cx="100" cy="110" rx="70" ry="14" fill="none" stroke="#a8a29e" strokeWidth="1.5" opacity="0.4"/>

              {/* Handle left */}
              <rect x="6" y="104" width="28" height="5" rx="2.5" fill="#a8a29e"/>
              <circle cx="8" cy="106.5" r="4" fill="#78716c" stroke="#a8a29e" strokeWidth="1"/>
              {/* Handle right */}
              <rect x="166" y="104" width="28" height="5" rx="2.5" fill="#a8a29e"/>
              <circle cx="192" cy="106.5" r="4" fill="#78716c" stroke="#a8a29e" strokeWidth="1"/>

              {/* Food items bouncing — more variety */}
              <g className="oa2-food-bounce">
                {/* Rice */}
                <ellipse cx="82" cy="98" rx="8" ry="5" fill="#fef3c7" stroke="#fbbf24" strokeWidth="0.5"/>
                {/* Tomato */}
                <circle cx="65" cy="95" r="7" fill="#ef4444" opacity="0.9"/>
                <path d="M63 89 Q65 87 67 89" stroke="#22c55e" strokeWidth="1.5" fill="none"/>
                {/* Egg */}
                <ellipse cx="100" cy="94" rx="9" ry="6" fill="#fef9c3" stroke="#fbbf24" strokeWidth="0.8"/>
                <circle cx="100" cy="93" r="3" fill="#f59e0b"/>
                {/* Green veggie */}
                <ellipse cx="120" cy="96" rx="6" ry="8" fill="#22c55e" opacity="0.85"/>
                <line x1="120" y1="88" x2="120" y2="104" stroke="#16a34a" strokeWidth="1"/>
                {/* Meat slice */}
                <rect x="88" y="100" width="10" height="6" rx="3" fill="#dc2626" opacity="0.7"/>
              </g>

              {/* Flying food particles */}
              <g className="oa2-food-fly">
                <circle cx="58" cy="80" r="2.5" fill="#fbbf24" opacity="0.7"/>
                <circle cx="135" cy="75" r="2" fill="#22c55e" opacity="0.6"/>
                <circle cx="75" cy="70" r="1.8" fill="#ef4444" opacity="0.5"/>
                <circle cx="125" cy="82" r="2.2" fill="#f59e0b" opacity="0.6"/>
              </g>

              {/* Oil splash particles */}
              <g className="oa2-oil-splash">
                <circle cx="70" cy="88" r="1.5" fill="#fbbf24" opacity="0.6"/>
                <circle cx="130" cy="90" r="1.2" fill="#fbbf24" opacity="0.5"/>
                <circle cx="90" cy="85" r="1" fill="#fef3c7" opacity="0.5"/>
                <circle cx="110" cy="86" r="1.3" fill="#fef3c7" opacity="0.4"/>
              </g>

              {/* Steam wisps — more organic curves */}
              <g opacity="0.35">
                <path d="M60 90 Q55 72 62 52 Q65 42 60 32" stroke="#a8a29e" strokeWidth="2" fill="none" strokeLinecap="round" className="oa2-steam" style={{ animationDelay: "0s" }}/>
                <path d="M80 85 Q85 65 78 45 Q75 35 80 25" stroke="#a8a29e" strokeWidth="2.5" fill="none" strokeLinecap="round" className="oa2-steam" style={{ animationDelay: "0.4s" }}/>
                <path d="M100 82 Q96 60 102 40 Q105 30 100 20" stroke="#a8a29e" strokeWidth="2" fill="none" strokeLinecap="round" className="oa2-steam" style={{ animationDelay: "0.8s" }}/>
                <path d="M120 85 Q125 68 118 48 Q115 38 120 28" stroke="#a8a29e" strokeWidth="1.8" fill="none" strokeLinecap="round" className="oa2-steam" style={{ animationDelay: "0.2s" }}/>
                <path d="M140 90 Q135 75 140 58" stroke="#a8a29e" strokeWidth="1.5" fill="none" strokeLinecap="round" className="oa2-steam" style={{ animationDelay: "0.6s" }}/>
              </g>

              {/* Spatula — more detailed */}
              <g className="oa2-spatula">
                <rect x="38" y="42" width="5" height="52" rx="2.5" fill="#d6d3d1"/>
                <rect x="35" y="36" width="11" height="10" rx="3" fill="#a8a29e"/>
                {/* Slots in spatula head */}
                <rect x="38" y="39" width="5" height="1.5" rx="0.75" fill="#78716c" opacity="0.4"/>
                <rect x="38" y="42" width="5" height="1.5" rx="0.75" fill="#78716c" opacity="0.4"/>
              </g>
            </svg>
          </div>
          <p className="text-lg font-bold text-stone-800 dark:text-stone-200 oa2-text-fade">
            大廚料理中...
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1.5 oa2-text-fade" style={{ animationDelay: "0.3s" }}>美味即將完成</p>
          {/* Cooking progress dots */}
          <div className="flex gap-1 mt-4">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full oa2-cook-dot" style={{ animationDelay: `${i * 0.4}s` }}/>
            ))}
          </div>
        </div>
      )}

      {/* Phase 3: Ready */}
      {phase === "ready" && (
        <div className="flex flex-col items-center oa2-fade-in">
          {/* Confetti */}
          <div className="absolute top-0 left-0 right-0 h-full pointer-events-none overflow-hidden">
            {confetti.map((c, i) => (
              <div key={i} className="absolute oa2-confetti"
                style={{
                  left: `${c.left}%`, top: "-2%",
                  width: c.size, height: c.size * 1.5,
                  backgroundColor: c.color,
                  borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.dur}s`,
                  transform: `rotate(${c.rotate}deg)`,
                }} />
            ))}
          </div>

          <div className="relative mb-5">
            {/* Success circle with checkmark */}
            <div className="oa2-bell-ring">
              <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer ring pulse */}
                <circle cx="44" cy="44" r="42" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.3" className="oa2-outer-ring"/>
                {/* Main circle */}
                <circle cx="44" cy="44" r="38" fill="#10b981" className="oa2-circle-pop"/>
                {/* Bell icon */}
                <path d="M44 22 C35 22 28 29 28 37 L28 46 L23 52 L65 52 L60 46 L60 37 C60 29 53 22 44 22Z" fill="white" opacity="0.95"/>
                <rect x="40" y="52" width="8" height="4" rx="2" fill="white" opacity="0.9"/>
                <circle cx="44" cy="58" r="3" fill="white" opacity="0.85"/>
                {/* Sparkle lines */}
                <path d="M16 30 L11 25" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" className="oa2-ring-line"/>
                <path d="M72 30 L77 25" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" className="oa2-ring-line"/>
                <path d="M12 44 L7 44" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" className="oa2-ring-line"/>
                <path d="M76 44 L81 44" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" className="oa2-ring-line"/>
              </svg>
            </div>
          </div>

          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 oa2-pop-up">
            訂單完成！
          </p>

          <div className="mt-3 space-y-1.5 oa2-pop-up" style={{ animationDelay: "0.12s" }}>
            {orderNumbers.map((o, i) => (
              <div key={i} className="text-center">
                {orderNumbers.length > 1 && (
                  <span className="text-xs text-stone-400 dark:text-stone-500">
                    {o.dept === "breakfast" ? "早餐部" : "午餐部"}
                  </span>
                )}
                <p className="text-4xl font-black tracking-tight oa2-number-reveal" style={{ color: "#E23D28", animationDelay: `${i * 0.08 + 0.15}s` }}>
                  #{o.displayNum}
                </p>
              </div>
            ))}
          </div>

          <p className="text-stone-500 dark:text-stone-400 mt-2 text-sm oa2-pop-up" style={{ animationDelay: "0.25s" }}>
            請記住你的取餐號碼
          </p>
        </div>
      )}

      <style>{`
        .oa2-fade-in { animation: oa2-fi 0.3s ease-out both; }
        @keyframes oa2-fi { from { opacity: 0; } to { opacity: 1; } }

        .oa2-receipt-slide { animation: oa2-rs 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes oa2-rs {
          0% { transform: translateY(-100px) scale(0.7) rotate(-3deg); opacity: 0; }
          60% { transform: translateY(5px) scale(1.02) rotate(1deg); }
          100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
        }

        .oa2-stamp { animation: oa2-st 0.35s ease-out 0.6s both; }
        @keyframes oa2-st {
          0% { opacity: 0; transform: scale(2.5) rotate(-20deg); }
          50% { opacity: 1; transform: scale(0.85) rotate(5deg); }
          70% { transform: scale(1.05) rotate(-2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        .oa2-text-fade { animation: oa2-tf 0.4s ease-out 0.2s both; }
        @keyframes oa2-tf { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .oa2-dot { animation: oa2-dt 0.9s ease-in-out infinite; }
        @keyframes oa2-dt { 0%, 100% { opacity: 0.3; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.4); } }

        .oa2-glow { animation: oa2-glow 0.5s ease-in-out infinite alternate; }
        @keyframes oa2-glow { from { opacity: 0.1; } to { opacity: 0.25; } }

        .oa2-flame { animation: oa2-fl 0.25s ease-in-out infinite alternate; transform-origin: center bottom; }
        @keyframes oa2-fl { from { transform: scaleY(1) scaleX(1); } to { transform: scaleY(1.2) scaleX(0.92); } }

        .oa2-flame2 { animation: oa2-fl2 0.3s ease-in-out 0.12s infinite alternate; transform-origin: center bottom; }
        @keyframes oa2-fl2 { from { transform: scaleY(1.1) scaleX(0.95); } to { transform: scaleY(0.9) scaleX(1.05); } }

        .oa2-food-bounce { animation: oa2-fb 0.55s cubic-bezier(0.36, 0, 0.66, -0.56) infinite alternate; transform-origin: center 100px; }
        @keyframes oa2-fb {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-18px) rotate(-4deg); }
        }

        .oa2-food-fly { animation: oa2-ff 0.7s ease-in-out infinite alternate; }
        @keyframes oa2-ff {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          100% { transform: translateY(-14px) scale(0.6); opacity: 0; }
        }

        .oa2-oil-splash { animation: oa2-os 0.4s ease-out infinite; }
        @keyframes oa2-os {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-8px) scale(1.3); opacity: 0.8; }
          100% { transform: translateY(-2px) scale(0.8); opacity: 0.2; }
        }

        .oa2-steam { animation: oa2-sm 1.5s ease-out infinite; }
        @keyframes oa2-sm {
          0% { opacity: 0; transform: translateY(0) scaleX(1); }
          20% { opacity: 0.45; }
          100% { opacity: 0; transform: translateY(-25px) scaleX(1.5); }
        }

        .oa2-spatula { animation: oa2-sp 0.65s ease-in-out infinite; transform-origin: 40px 94px; }
        @keyframes oa2-sp {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(10deg); }
        }

        .oa2-cook-dot {
          width: 6px; height: 6px; background: #d6d3d1; border-radius: 50%;
          animation: oa2-cd 2s ease-in-out infinite;
        }
        @keyframes oa2-cd {
          0%, 100% { background: #d6d3d1; transform: scale(1); }
          50% { background: #E23D28; transform: scale(1.3); }
        }

        .oa2-bell-ring { animation: oa2-br 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes oa2-br {
          0% { transform: scale(0) rotate(-25deg); }
          50% { transform: scale(1.15) rotate(8deg); }
          75% { transform: scale(0.95) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .oa2-circle-pop { animation: oa2-cp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes oa2-cp {
          0% { r: 0; }
          100% { r: 38; }
        }

        .oa2-outer-ring { animation: oa2-or 1.2s ease-out infinite; }
        @keyframes oa2-or {
          0% { r: 38; opacity: 0.4; }
          100% { r: 52; opacity: 0; }
        }

        .oa2-ring-line { animation: oa2-rl 0.7s ease-out 0.2s infinite; }
        @keyframes oa2-rl {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.3); }
          100% { opacity: 0.3; transform: scale(1); }
        }

        .oa2-pop-up { animation: oa2-pu 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes oa2-pu {
          from { opacity: 0; transform: translateY(15px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .oa2-number-reveal { animation: oa2-nr 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes oa2-nr {
          0% { transform: translateY(100%) scale(0.7); opacity: 0; filter: blur(6px); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
        }

        .oa2-confetti { animation: oa2-cf 1.2s ease-out both; }
        @keyframes oa2-cf {
          0% { transform: translateY(-10px) rotate(0deg) scale(0); opacity: 0; }
          12% { opacity: 1; transform: translateY(0) rotate(90deg) scale(1); }
          100% { transform: translateY(120vh) rotate(720deg) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
