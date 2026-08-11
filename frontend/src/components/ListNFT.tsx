'use client'

import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseEther } from 'viem'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function ListNFT() {
  const [mounted, setMounted] = useState(false)
  const [tokenId, setTokenId] = useState('')
  const [price, setPrice] = useState('')
  const [step, setStep] = useState<'APPROVE' | 'LIST'>('APPROVE')
  const { isConnected } = useAccount()
  const queryClient = useQueryClient()

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
    // Khi List thành công → invalidate queries để MarketplaceFeed + MyNFTs tự refresh
    if (isConfirmed && step === 'LIST') {
      queryClient.invalidateQueries()
    }
  }, [isConfirmed, step, queryClient])

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tokenId || !price) return

    if (step === 'APPROVE') {
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: 'approve',
        args: [MARKETPLACE_ADDRESS, BigInt(tokenId)],
      })
    } else {
      writeContract({
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: 'listNFT',
        args: [BigInt(tokenId), parseEther(price)],
      })
    }
  }

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="empty-state animate-fadeIn">
        <span className="empty-state__icon">🔗</span>
        <p className="empty-state__title">Chưa kết nối ví</p>
        <p className="empty-state__text">
          Hãy kết nối ví để đăng bán NFT trên sàn.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card form-card" id="list-nft-form">
      <span className="form-card__icon">🏷️</span>
      <h2 className="form-card__title">Đăng Bán NFT</h2>

      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: '1.25rem',
          lineHeight: 1.5,
        }}
      >
        Nhập Token ID từ tab &quot;NFT Của Tôi&quot; và giá bán bạn mong muốn.
      </p>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div
          className={`step-indicator__step ${
            step === 'APPROVE'
              ? 'step-indicator__step--active'
              : 'step-indicator__step--done'
          }`}
        >
          {step === 'LIST' ? '✓' : '1'}
        </div>
        <div
          className={`step-indicator__line ${
            step === 'LIST' ? 'step-indicator__line--active' : ''
          }`}
        />
        <div
          className={`step-indicator__step ${
            step === 'LIST' ? 'step-indicator__step--active' : ''
          }`}
        >
          2
        </div>
      </div>

      <form onSubmit={handleAction} className="form-card__form">
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
            Token ID
          </label>
          <input
            type="number"
            placeholder="VD: 0, 1, 2..."
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            className="input-dark"
            disabled={isPending || isConfirming}
            id="input-list-token-id"
          />
        </div>

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
            Giá bán (ETH)
          </label>
          <input
            type="text"
            placeholder="VD: 0.1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-dark"
            disabled={isPending || isConfirming}
            id="input-list-price"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !tokenId || !price}
          className={`btn ${step === 'APPROVE' ? 'btn-primary' : 'btn-success'} ${
            isPending || isConfirming ? 'btn--loading' : ''
          }`}
          style={{ width: '100%', marginTop: '4px' }}
          id="btn-list-action"
        >
          {isPending ? (
            <>
              <span className="spinner" /> Đang chờ ký ví...
            </>
          ) : isConfirming ? (
            <>
              <span className="spinner" /> Đang xác nhận trên chuỗi...
            </>
          ) : step === 'APPROVE' ? (
            '🔓 Bước 1: Phê duyệt (Approve)'
          ) : (
            '📤 Bước 2: Đăng Bán NFT'
          )}
        </button>
      </form>

      {/* Status messages */}
      {hash && (
        <div className="status-badge status-badge--info">
          📋 Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
        </div>
      )}
      {isConfirmed && step === 'LIST' && (
        <div className="status-badge status-badge--success">
          🎉 Đăng bán thành công! Xem tại tab &quot;Khám Phá&quot;.
        </div>
      )}
      {isConfirmed && step === 'APPROVE' && (
        <div className="status-badge status-badge--warning">
          ✅ Phê duyệt xong! Bấm tiếp để Đăng Bán.
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