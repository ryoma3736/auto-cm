import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AutoCM Studio — AI広告動画ジェネレーター",
  description:
    "商品画像をアップロードするだけで、プロ品質のCM動画をAIが自動生成。Sora 2・Veo 3・Kling・Seedance・HeyGen を選んで比較。",
  metadataBase: new URL("https://auto-cm.vercel.app"),
  openGraph: {
    title: "AutoCM Studio",
    description: "画像1枚から、プロ品質のCM動画を。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
