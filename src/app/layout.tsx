import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Providers from "@/components/Providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0b0a" },
  ],
};

export const metadata: Metadata = {
  title: "內湖高中熱食部",
  description: "內湖高中熱食部線上訂餐系統",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "熱食部",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <script dangerouslySetInnerHTML={{ __html: `
          try{const s=JSON.parse(localStorage.getItem('nhsh-settings')||'{}');
          const t=s.state?.theme||'system';
          document.documentElement.dataset.glass=s.state?.glass||'regular';
          if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches))
          document.documentElement.classList.add('dark')}catch{}
        `}} />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-300">
        <div className="lg-backdrop" aria-hidden="true" />
        <Providers>{children}</Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
