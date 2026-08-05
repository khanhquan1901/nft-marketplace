import { ConnectButton } from "@/components/ConnectButton";
import { MintNFT } from "@/components/MintNFT";
import { ListNFT } from "@/components/ListNFT";
import { MarketplaceFeed } from "@/components/MarketplaceFeed"; // Import component mới

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center pt-20 px-4 pb-20">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          NFT Marketplace
        </h1>
        <p className="text-gray-500 text-lg">
          Mua, bán và sưu tầm các NFT độc quyền
        </p>
      </div>

      <ConnectButton />
      
      {/* Khu vực thao tác (Mint & List) */}
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-start">
        <MintNFT />
        <ListNFT />
      </div>

      {/* Feed hiển thị các NFT đang bán trên sàn */}
      <MarketplaceFeed />
      
    </main>
  );
}