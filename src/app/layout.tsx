import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const rounded = M_PLUS_Rounded_1c({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const roundedHeading = M_PLUS_Rounded_1c({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "auto-cm — AIと一緒に、ワクワクするCMを作ろう！",
  description:
    "商品画像をアップロードするだけで、プロ品質のCM動画をAIが自動生成。Sora 2・Veo 3・Kling・Seedance・HeyGen を選んで比較。",
  metadataBase: new URL("https://auto-cm-flame.vercel.app"),
  openGraph: {
    title: "auto-cm",
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
      className={`${rounded.variable} ${roundedHeading.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
