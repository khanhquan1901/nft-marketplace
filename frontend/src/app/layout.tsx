import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "NFT Marketplace — Mua Bán & Sưu Tầm NFT",
  description:
    "Sàn giao dịch NFT phi tập trung. Mint, mua bán và sưu tầm các tác phẩm kỹ thuật số độc quyền trên blockchain.",
  keywords: ["NFT", "Marketplace", "Web3", "Blockchain", "Ethereum", "DeFi"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <Web3Provider>
          {/* Background orbs */}
          <div className="bg-orb bg-orb--purple" aria-hidden="true" />
          <div className="bg-orb bg-orb--cyan" aria-hidden="true" />
          <div className="bg-orb bg-orb--pink" aria-hidden="true" />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}