'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function ConnectButton() {
  const [mounted, setMounted] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Trạng thái: ĐÃ KẾT NỐI VÍ
  if (isConnected) {
    return (
      <div className="wallet-badge">
        <div className="wallet-badge__avatar">
          💎
        </div>
        <span className="wallet-badge__address">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="btn btn-disconnect"
          id="btn-disconnect"
        >
          Ngắt kết nối
        </button>
      </div>
    )
  }

  // Trạng thái: CHƯA KẾT NỐI VÍ
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="btn btn-connect"
          id={`btn-connect-${connector.uid}`}
        >
          <span style={{ fontSize: '1.1rem' }}>🔗</span>
          Kết Nối {connector.name}
        </button>
      ))}
    </div>
  )
}