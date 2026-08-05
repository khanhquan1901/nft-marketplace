'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function MyNFTs() {
  const [mounted, setMounted] = useState(false)
  const [priceInput, setPriceInput] = useState<{ [key: string]: string }>({})
  const { address, isConnected } = useAccount()

  // Quét dải token từ 0 đến 10 để tìm các token thuộc sở hữu của ví hiện tại
  const tokenIdsToScan = Array.from({ length: 11 }, (_, i) => BigInt(i))

  useEffect(() => {
    setMounted(true)
  }, [],)

  if (!mounted || !isConnected) return null

  return (
    <div className="w-full max-w-4xl mt-10 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">NFT Trong Ví Của Tôi</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tokenIdsToScan.map((id) => (
          <MyNFTCard 
            key={id.toString()} 
            tokenId={id} 
            userAddress={address}
            priceValue={priceInput[id.toString()] || ''}
            onPriceChange={(val) => setPriceInput(prev => ({ ...prev, [id.toString()]: val }))}
          />
        ))}
      </div>
    </div>
  )
}

function MyNFTCard({ 
  tokenId, 
  userAddress, 
  priceValue, 
  onPriceChange 
}: { 
  tokenId: bigint; 
  userAddress?: string; 
  priceValue: string; 
  onPriceChange: (val: string) => void 
}) {
  const [step, setStep] = useState<'APPROVE' | 'LIST'>('APPROVE')

  // 1. Kiểm tra chủ sở hữu của Token ID này
  const { data: owner, refetch: refetchOwner } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  })

  // 2. Đọc tokenURI
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

  // Khi giao dịch Approve xong thì tự chuyển sang bước List
  useEffect(() => {
    if (isConfirmed && step === 'APPROVE') {
      setStep('LIST')
    } else if (isConfirmed && step === 'LIST') {
      refetchOwner()
    }
  }, [isConfirmed, step, refetchOwner])

  const isMyNFT = owner && userAddress && owner.toLowerCase() === userAddress.toLowerCase()

  if (!isMyNFT) return null // Nếu không phải chủ sở hữu thì ẩn đi

  const handleAction = () => {
    if (!priceValue) return

    if (step === 'APPROVE') {
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: 'approve',
        args: [MARKETPLACE_ADDRESS, tokenId],
      })
    } else {
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [tokenId, BigInt(Number(priceValue) * 1e18)], // Chuyển sang Wei
      })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 flex flex-col">
      <div className="h-36 bg-gray-100 flex items-center justify-center p-2 rounded-lg mb-3 text-center">
        <span className="text-xs text-gray-600 break-all">URI: {tokenURI || 'Loading...'}</span>
      </div>

      <span className="text-sm font-semibold text-purple-600 mb-2">Token ID: #{tokenId.toString()}</span>

      <input
        type="text"
        placeholder="Giá bán (ETH) VD: 0.1"
        value={priceValue}
        onChange={(e) => onPriceChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
        disabled={isPending || isConfirming}
      />

      <button
        onClick={handleAction}
        disabled={isPending || isConfirming || !priceValue}
        className={`w-full py-2 text-white text-sm font-semibold rounded-lg transition-colors disabled:bg-gray-400 ${
          step === 'APPROVE' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isPending 
          ? 'Đang chờ ký...' 
          : isConfirming 
          ? 'Đang xử lý...' 
          : step === 'APPROVE' 
          ? '1. Phê duyệt (Approve)' 
          : '2. Đăng Bán Ngay'}
      </button>

      {error && <p className="mt-2 text-xs text-red-600 font-medium">❌ Lỗi: {(error as any).shortMessage || error.message}</p>}
    </div>
  )
}