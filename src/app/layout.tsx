import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "咸鱼美术组 · 竞赛信息板",
  description: "发现值得参加的设计竞赛",
  openGraph: {
    title: "咸鱼美术组 · 竞赛信息板",
    description: "发现值得参加的设计竞赛",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
