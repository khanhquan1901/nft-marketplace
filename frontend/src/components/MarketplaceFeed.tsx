'use client'

import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'

export function MarketplaceFeed() {
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()

  // Quét từ Token ID 0 đến 19
  const activeTokenIds = Array.from({ length: 20 }, (_, i) => BigInt(i))

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
          Kết nối ví để xem các NFT đang bán trên sàn.
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="section-header">
        <h2 className="section-header__title">🔥 NFT Đang Bán</h2>
        <p className="section-header__subtitle">
          Khám phá các NFT đang được trưng bày trên sàn giao dịch
        </p>
      </div>

      <div className="nft-grid">
        {activeTokenIds.map((id) => (
          <NFTCard key={id.toString()} tokenId={id} />
        ))}
      </div>

      <MarketplaceEmptyCheck tokenIds={activeTokenIds} />
    </div>
  )
}

/** Kiểm tra xem có NFT nào đang bán không */
function MarketplaceEmptyCheck({ tokenIds }: { tokenIds: bigint[] }) {
  const results = tokenIds.map((id) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useReadContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'listings',
      args: [id],
    })
    return data
  })

  const hasAny = results.some((data) => {
    if (!data) return false
    const seller = (data as any)[1]
    return seller !== '0x0000000000000000000000000000000000000000'
  })

  if (hasAny) return null

  const allLoaded = results.every((r) => r !== undefined)
  if (!allLoaded) return null

  return (
    <div className="empty-state">
      <span className="empty-state__icon">🏜️</span>
      <p className="empty-state__title">Chưa có NFT nào đang bán</p>
      <p className="empty-state__text">
        Hãy mint NFT rồi đăng bán tại tab &quot;Đăng Bán&quot;!
      </p>
    </div>
  )
}

function NFTCard({ tokenId }: { tokenId: bigint }) {
  const { address: currentUserAddress } = useAccount()
  const queryClient = useQueryClient()

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

  // Khi mua/hủy thành công → refresh tất cả data
  useEffect(() => {
    if (isConfirmed) {
      refetchListing()
      queryClient.invalidateQueries()
    }
  }, [isConfirmed, refetchListing, queryClient])

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

  const uriString = tokenURI ? String(tokenURI) : ''

  return (
    <div className="nft-card" id={`nft-card-${tokenId}`}>
      {/* Image area */}
      <div className="nft-card__image">
        <span className="nft-card__image-text">
          {uriString
            ? `${uriString.substring(0, 60)}${uriString.length > 60 ? '...' : ''}`
            : 'Loading...'}
        </span>
      </div>

      {/* Body */}
      <div className="nft-card__body">
        <span className="nft-card__token-id">
          ◆ Token #{tokenId.toString()}
        </span>

        <div className="nft-card__price">
          <span style={{ color: 'var(--accent-cyan)', fontSize: '1rem' }}>Ξ</span>
          {formatEther(price)}
          <span className="nft-card__price-eth">ETH</span>
        </div>

        <div className="nft-card__seller" title={seller}>
          👤 {seller.slice(0, 6)}...{seller.slice(-4)}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
          {isOwner ? (
            <button
              onClick={handleCancel}
              disabled={isPending || isConfirming}
              className={`btn btn-warning ${isPending || isConfirming ? 'btn--loading' : ''}`}
              style={{ width: '100%' }}
              id={`btn-cancel-${tokenId}`}
            >
              {isPending || isConfirming ? (
                <>
                  <span className="spinner" /> Đang xử lý...
                </>
              ) : (
                '🚫 Hủy Bán'
              )}
            </button>
          ) : (
            <button
              onClick={handleBuy}
              disabled={isPending || isConfirming}
              className={`btn btn-success ${isPending || isConfirming ? 'btn--loading' : ''}`}
              style={{ width: '100%' }}
              id={`btn-buy-${tokenId}`}
            >
              {isPending || isConfirming ? (
                <>
                  <span className="spinner" /> Đang giao dịch...
                </>
              ) : (
                '⚡ Mua Ngay'
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="status-badge status-badge--error" style={{ fontSize: '0.75rem' }}>
            ❌ {(error as any).shortMessage || error.message}
          </div>
        )}
      </div>
    </div>
  )
}