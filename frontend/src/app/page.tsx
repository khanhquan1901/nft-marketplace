'use client'

import { useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { MintNFT } from "@/components/MintNFT";
import { ListNFT } from "@/components/ListNFT";
import { MarketplaceFeed } from "@/components/MarketplaceFeed";
import { MyNFTs } from "@/components/MyNFTs";

type Tab = "explore" | "mint" | "my-nfts" | "list";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "explore", label: "Khám Phá", icon: "🔥" },
  { id: "mint", label: "Mint NFT", icon: "✨" },
  { id: "my-nfts", label: "NFT Của Tôi", icon: "💎" },
  { id: "list", label: "Đăng Bán", icon: "🏷️" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");

  return (
    <div className="main-content">
      {/* ─── Navbar ─── */}
      <nav className="navbar" id="navbar">
        <div className="navbar__logo">
          <span className="navbar__logo-icon">◆</span>
          NFT Marketplace
        </div>
        <ConnectButton />
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="hero" id="hero">
        <h1 className="hero__title">
          Khám phá, sưu tầm &<br />
          <span className="hero__title-gradient">giao dịch NFT độc quyền</span>
        </h1>
        <p className="hero__subtitle">
          Sàn giao dịch phi tập trung nơi bạn có thể mint, mua bán các tác phẩm
          kỹ thuật số được bảo mật bởi blockchain.
        </p>

        {/* ─── Tab Navigation ─── */}
        <div
          className="tabs"
          style={{ display: "inline-flex", margin: "0 auto" }}
          id="tab-navigation"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`tab-button ${
                activeTab === tab.id ? "tab-button--active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Content Area ─── */}
      <section className="container" style={{ paddingBottom: "3rem" }}>
        {activeTab === "explore" && <MarketplaceFeed />}

        {activeTab === "mint" && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              animation: "fadeIn 0.4s ease",
            }}
          >
            <MintNFT />
          </div>
        )}

        {activeTab === "my-nfts" && <MyNFTs />}

        {activeTab === "list" && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              animation: "fadeIn 0.4s ease",
            }}
          >
            <ListNFT />
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer className="footer" id="footer">
        <p>
          Built with 💜 on{" "}
          <a
            href="https://ethereum.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ethereum
          </a>{" "}
          · Powered by{" "}
          <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer">
            Next.js
          </a>{" "}
          &{" "}
          <a
            href="https://book.getfoundry.sh"
            target="_blank"
            rel="noopener noreferrer"
          >
            Foundry
          </a>
        </p>
      </footer>
    </div>
  );
}