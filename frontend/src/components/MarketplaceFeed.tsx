'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function MarketplaceFeed() {
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()

  // Tự động quét từ Token ID 0 đến 10
  const activeTokenIds = Array.from({ length: 11 }, (_, i) => BigInt(i))

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isConnected) return null

  return (
    <div className="w-full max-w-4xl mt-10 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">NFT Đang Trưng Bày Trên Sàn</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTokenIds.map((id) => (
          <NFTCard key={id.toString()} tokenId={id} />
        ))}
      </div>
    </div>
  )
}

function NFTCard({ tokenId }: { tokenId: bigint }) {
  const { address: currentUserAddress } = useAccount()

  const { data: listingData, refetch: refetchListing } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'listings',
    args: [tokenId],
  })

  const { data: tokenURI } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'tokenURI',
    args: [tokenId],
  })

  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isConfirmed) {
      refetchListing()
    }
  }, [isConfirmed, refetchListing])

  const price = listingData ? (listingData as any)[0] : BigInt(0)
  const seller = listingData ? (listingData as any)[1] : '0x0'

  const isForSale = seller !== '0x0000000000000000000000000000000000000000'
  const isOwner = currentUserAddress && seller && currentUserAddress.toLowerCase() === seller.toLowerCase()

  const handleBuy = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'buyNFT',
      args: [tokenId],
      value: price,
    })
  }

  const handleCancel = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelListing',
      args: [tokenId],
    })
  }

  if (!isForSale) return null

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col p-4">
      <div className="h-40 bg-gray-100 flex items-center justify-center p-2 text-center rounded-lg mb-3">
        <span className="text-xs text-gray-600 font-medium break-all">URI: {tokenURI || 'Loading...'}</span>
      </div>
      
      <div className="flex flex-col flex-grow">
        <span className="text-sm font-semibold text-blue-600 mb-1">Token ID: #{tokenId.toString()}</span>
        <div className="text-lg font-bold text-gray-900 mb-1">
          {formatEther(price)} ETH
        </div>
        <p className="text-xs text-gray-400 truncate mb-4">Người bán: {seller}</p>
        
        {isOwner ? (
          <button 
            onClick={handleCancel}
            disabled={isPending || isConfirming}
            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
          >
            {isPending || isConfirming ? 'Đang xử lý...' : 'Hủy Bán (Cancel)'}
          </button>
        ) : (
          <button 
            onClick={handleBuy}
            disabled={isPending || isConfirming}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
          >
            {isPending || isConfirming ? 'Đang giao dịch...' : 'Mua Ngay'}
          </button>
        )}

        {error && <p className="mt-2 text-xs text-red-600 font-medium">❌ Lỗi: {(error as any).shortMessage || error.message}</p>}
      </div>
    </div>
  )
}