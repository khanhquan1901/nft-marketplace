'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function MintNFT() {
  const [tokenURI, setTokenURI] = useState('')
  const { isConnected } = useAccount()
  const queryClient = useQueryClient()

  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Khi mint thành công → invalidate tất cả queries để MyNFTs tự động refresh
  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries()
    }
  }, [isConfirmed, queryClient])

  const handleMint = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenURI) return

    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'mintToken',
      args: [tokenURI],
    })
  }

  if (!isConnected) {
    return (
      <div className="empty-state animate-fadeIn">
        <span className="empty-state__icon">🔗</span>
        <p className="empty-state__title">Chưa kết nối ví</p>
        <p className="empty-state__text">
          Hãy kết nối ví để bắt đầu mint NFT của bạn.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card form-card" id="mint-nft-form">
      <span className="form-card__icon">✨</span>
      <h2 className="form-card__title">Mint NFT Mới</h2>

      <form onSubmit={handleMint} className="form-card__form">
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}
          >
            Token URI
          </label>
          <input
            type="text"
            placeholder="ipfs://QmXxx... hoặc URL metadata"
            value={tokenURI}
            onChange={(e) => setTokenURI(e.target.value)}
            className="input-dark"
            disabled={isPending || isConfirming}
            id="input-token-uri"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !tokenURI}
          className={`btn btn-primary ${isPending || isConfirming ? 'btn--loading' : ''}`}
          style={{ width: '100%', marginTop: '4px' }}
          id="btn-mint"
        >
          {isPending ? (
            <>
              <span className="spinner" /> Đang chờ ký trên ví...
            </>
          ) : isConfirming ? (
            <>
              <span className="spinner" /> Đang xác nhận trên chuỗi...
            </>
          ) : (
            '🚀 Mint NFT'
          )}
        </button>
      </form>

      {/* Status messages */}
      {hash && (
        <div className="status-badge status-badge--info">
          📋 Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
        </div>
      )}
      {isConfirmed && (
        <div className="status-badge status-badge--success">
          🎉 Mint NFT thành công! Xem tại tab &quot;NFT Của Tôi&quot;.
        </div>
      )}
      {error && (
        <div className="status-badge status-badge--error">
          ❌ {(error as any).shortMessage || error.message}
        </div>
      )}
    </div>
  )
}