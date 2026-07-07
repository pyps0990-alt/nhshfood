import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "@/components/Providers";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#E23D28",
};

export const metadata: Metadata = {
  title: "內湖高中熱食部",
  description: "內湖高中熱食部線上訂餐系統",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "熱食部",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <script dangerouslySetInnerHTML={{ __html: `
          try{const s=JSON.parse(localStorage.getItem('nhsh-settings')||'{}');
          const t=s.state?.theme||'system';
          if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches))
          document.documentElement.classList.add('dark')}catch{}
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-[#FFF8F0] dark:bg-stone-950 font-[family-name:var(--font-geist)] transition-colors duration-300">
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
