'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectButton() {
  // 1. Thêm state mounted để check xem app đã chạy trên trình duyệt chưa
  const [mounted, setMounted] = useState(false)
  
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  // 2. useEffect chỉ chạy trên Client (trình duyệt)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 3. Nếu chưa mount xong, không render gì cả (để đồng bộ với Server)
  if (!mounted) return null

  // Trạng thái 1: NẾU ĐÃ KẾT NỐI VÍ
  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <span className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-medium">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
        >
          Disconnect
        </button>
      </div>
    )
  }

  // Trạng thái 2: NẾU CHƯA KẾT NỐI VÍ
  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-md"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  )
}