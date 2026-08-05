'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function ListNFT() {
  const [mounted, setMounted] = useState(false)
  const [tokenId, setTokenId] = useState('')
  const [price, setPrice] = useState('')
  const [step, setStep] = useState<'APPROVE' | 'LIST'>('APPROVE')
  const { isConnected } = useAccount()

  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Khi giao dịch Approve thành công, tự chuyển sang bước List
  useEffect(() => {
    if (isConfirmed && step === 'APPROVE') {
      setStep('LIST')
    }
  }, [isConfirmed, step])

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenId || !price) return

    if (step === 'APPROVE') {
      // Gọi hàm approve cho phép Marketplace chuyển tokenId này
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: 'approve',
        args: [MARKETPLACE_ADDRESS, BigInt(tokenId)],
      })
    } else {
      // Gọi hàm listNFT sau khi đã approve xong
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [BigInt(tokenId), parseEther(price)],
      })
    }
  }

  if (!mounted || !isConnected) return null

  return (
    <div className="w-full max-w-md mt-6 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Đăng Bán NFT</h2>
      
      <form onSubmit={handleAction} className="flex flex-col gap-4">
        <input
          type="number"
          placeholder="Nhập Token ID (VD: 0)"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending || isConfirming}
        />
        <input
          type="text"
          placeholder="Giá bán (ETH) (VD: 0.1)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending || isConfirming}
        />
        
        <button
          type="submit"
          disabled={isPending || isConfirming || !tokenId || !price}
          className={`px-4 py-3 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400 ${
            step === 'APPROVE' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isPending 
            ? 'Đang chờ ký ví...' 
            : isConfirming 
            ? 'Đang xác nhận trên chuỗi...' 
            : step === 'APPROVE' 
            ? 'Bước 1: Phê duyệt (Approve)' 
            : 'Bước 2: Đăng Bán NFT'}
        </button>
      </form>

      {/* Thông báo trạng thái */}
      {hash && <p className="mt-4 text-sm text-gray-500 break-all">Mã giao dịch: {hash}</p>}
      {isConfirmed && step === 'LIST' && <p className="mt-2 text-sm text-green-600 font-medium">🎉 Đăng bán thành công lên sàn!</p>}
      {isConfirmed && step === 'APPROVE' && <p className="mt-2 text-sm text-blue-600 font-medium">✅ Phê duyệt thành công! Bây giờ bấm Đăng Bán.</p>}
      {error && <p className="mt-2 text-sm text-red-600 font-medium">❌ Lỗi: {(error as any).shortMessage || error.message}</p>}
    </div>
  )
}