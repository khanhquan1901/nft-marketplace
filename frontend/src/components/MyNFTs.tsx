'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useAccount } from 'wagmi'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function MyNFTs() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()

  // Quét dải token từ 0 đến 19 để tìm các token thuộc sở hữu của ví hiện tại
  const tokenIdsToScan = Array.from({ length: 20 }, (_, i) => BigInt(i))

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  if (!isConnected) {
    return (
      <div className="empty-state animate-fadeIn">
        <span className="empty-state__icon">🔗</span>
        <p className="empty-state__title">Chưa kết nối ví</p>
        <p className="empty-state__text">
          Hãy kết nối ví để xem các NFT bạn đang sở hữu.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="section-header">
        <h2 className="section-header__title">💎 NFT Của Tôi</h2>
        <p className="section-header__subtitle">
          Các NFT bạn đang sở hữu — dùng Token ID ở tab &quot;Đăng Bán&quot; để bán trên sàn
        </p>
      </div>

      <div className="nft-grid">
        {tokenIdsToScan.map((id) => (
          <MyNFTInfoCard
            key={id.toString()}
            tokenId={id}
            userAddress={address}
          />
        ))}
      </div>

      <MyNFTsEmptyCheck tokenIds={tokenIdsToScan} userAddress={address} />
    </div>
  )
}

/** Kiểm tra xem user có NFT nào không */
function MyNFTsEmptyCheck({ tokenIds, userAddress }: { tokenIds: bigint[]; userAddress?: string }) {
  const results = tokenIds.map((id) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useReadContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'ownerOf',
      args: [id],
    })
    return data
  })

  const hasAny = results.some((owner) => {
    if (!owner || !userAddress) return false
    return (owner as string).toLowerCase() === userAddress.toLowerCase()
  })

  if (hasAny) return null

  const allLoaded = results.every((r) => r !== undefined)
  if (!allLoaded) return null

  return (
    <div className="empty-state">
      <span className="empty-state__icon">📦</span>
      <p className="empty-state__title">Bạn chưa có NFT nào</p>
      <p className="empty-state__text">
        Hãy vào tab &quot;Mint NFT&quot; để tạo NFT mới!
      </p>
    </div>
  )
}

/** Card hiển thị thông tin NFT đang sở hữu — chỉ đọc, không có form bán */
function MyNFTInfoCard({
  tokenId,
  userAddress,
}: {
  tokenId: bigint
  userAddress?: string
}) {
  // Kiểm tra chủ sở hữu
  const { data: owner } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
  })

  // Đọc tokenURI
  const { data: tokenURI } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'tokenURI',
    args: [tokenId],
  })

  // Kiểm tra xem có đang listed trên sàn không
  const { data: listingData } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'listings',
    args: [tokenId],
  })

  const isMyNFT =
    owner &&
    userAddress &&
    (owner as string).toLowerCase() === userAddress.toLowerCase()

  if (!isMyNFT) return null

  const listingSeller = listingData ? (listingData as any)[1] : '0x0'
  const isListed =
    listingSeller !== '0x0000000000000000000000000000000000000000'

  const uriString = tokenURI ? String(tokenURI) : ''

  return (
    <div className="nft-card" id={`my-nft-card-${tokenId}`}>
      {/* Image / URI preview area */}
      <div className="nft-card__image" style={{ position: 'relative' }}>
        <span className="owned-badge">
          {isListed ? '📢 ĐANG BÁN' : '✅ SỞ HỮU'}
        </span>
        {uriString ? (
          <span className="nft-card__image-text">
            {uriString.substring(0, 80)}
            {uriString.length > 80 ? '...' : ''}
          </span>
        ) : (
          <span className="nft-card__image-text">Loading...</span>
        )}
      </div>

      {/* Body — hiển thị thông tin */}
      <div className="nft-card__body">
        {/* Token ID — nổi bật */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="nft-card__token-id" style={{ fontSize: '1rem' }}>
            ◆ Token #{tokenId.toString()}
          </span>
          {isListed && (
            <span
              style={{
                fontSize: '0.7rem',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(251, 191, 36, 0.15)',
                color: 'var(--accent-amber)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                fontWeight: 600,
              }}
            >
              Đang trên sàn
            </span>
          )}
        </div>

        {/* Token URI — full display */}
        <div
          style={{
            marginTop: '8px',
            padding: '10px 12px',
            background: 'rgba(12, 12, 36, 0.6)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Token URI
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--accent-cyan)',
              wordBreak: 'break-all',
              lineHeight: 1.5,
              fontFamily: 'monospace',
            }}
          >
            {uriString || '—'}
          </div>
        </div>

        {/* Hướng dẫn */}
        {!isListed && (
          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginTop: '8px',
              lineHeight: 1.5,
            }}
          >
            💡 Dùng <strong style={{ color: 'var(--accent-purple)' }}>Token ID #{tokenId.toString()}</strong> ở tab
            &quot;Đăng Bán&quot; để bán NFT này.
          </p>
        )}
      </div>
    </div>
  )
}