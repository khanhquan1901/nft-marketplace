'use client'

import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function MintNFT() {
  // Quản lý state của ô nhập link ảnh (Token URI)
  const [tokenURI, setTokenURI] = useState('')
  const { isConnected } = useAccount()

  // 1. Hook để gửi giao dịch ghi lên Smart Contract
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  // 2. Hook để lắng nghe xem giao dịch đã được đào (mine) xong chưa
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Hàm xử lý khi bấm nút Mint
  const handleMint = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenURI) return

    writeContract({
      address: MARKETPLACE_ADDRESS, // Địa chỉ contract bạn đã lưu ở file constants
      abi: MARKETPLACE_ABI,         // ABI của contract
      functionName: 'mintToken',    // Tên hàm trong Solidity
      args: [tokenURI],             // Tham số truyền vào hàm
    })
  }

  // Ẩn form nếu chưa kết nối ví
  if (!isConnected) return null

  return (
    <div className="w-full max-w-md mt-10 p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Mint NFT Mới</h2>
      
      <form onSubmit={handleMint} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nhập Token URI (VD: ipfs://Qm...)"
          value={tokenURI}
          onChange={(e) => setTokenURI(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending || isConfirming}
        />
        
        <button
          type="submit"
          disabled={isPending || isConfirming || !tokenURI}
          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:bg-gray-400"
        >
          {isPending ? 'Đang chờ ký trên ví...' : isConfirming ? 'Đang xác nhận trên chuỗi...' : 'Mint NFT'}
        </button>
      </form>

      {/* Hiển thị thông báo trạng thái */}
      {hash && <p className="mt-4 text-sm text-gray-500 break-all">Mã giao dịch: {hash}</p>}
      {isConfirmed && <p className="mt-2 text-sm text-green-600 font-medium">🎉 Mint NFT thành công!</p>}
      {error && <p className="mt-2 text-sm text-red-600 font-medium">❌ Lỗi: {(error as any).shortMessage || error.message}</p>}
    </div>
  )
}