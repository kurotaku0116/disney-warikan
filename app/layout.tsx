import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ワリカサイト",
  description: "ディズニー向け割り勘アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-sky-50 text-gray-800">{children}</body>
    </html>
  );
}
