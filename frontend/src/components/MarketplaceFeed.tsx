'use client'

import { useState, useEffect, useRef } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { formatEther } from 'viem'
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from '../constants'
import { ipfsToHttp } from '../utils/ipfs'
import { useNFTMetadata } from '../hooks/useNFTMetadata'

export function MarketplaceFeed() {
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()

  // Đọc danh sách tất cả token đã mint từ contract
  const { data: allTokens } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'getAllTokens',
    query: { refetchOnMount: 'always' },
  })

  const activeTokenIds: bigint[] = allTokens ? (allTokens as bigint[]) : []

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

/** Kiểm tra xem có NFT nào đang bán không — tách thành sub-component để không vi phạm Rules of Hooks */
function MarketplaceEmptyCheck({ tokenIds }: { tokenIds: bigint[] }) {
  const [listedCount, setListedCount] = useState(0)
  const [loadedCount, setLoadedCount] = useState(0)

  // Reset khi danh sách token thay đổi
  useEffect(() => {
    setListedCount(0)
    setLoadedCount(0)
  }, [tokenIds.length])

  const allLoaded = tokenIds.length > 0 && loadedCount >= tokenIds.length

  return (
    <>
      {tokenIds.map((id) => (
        <SingleListingCheck
          key={id.toString()}
          tokenId={id}
          onResult={(isListed) => {
            setLoadedCount((c) => c + 1)
            if (isListed) setListedCount((c) => c + 1)
          }}
        />
      ))}
      {allLoaded && listedCount === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">🏜️</span>
          <p className="empty-state__title">Chưa có NFT nào đang bán</p>
          <p className="empty-state__text">
            Hãy mint NFT rồi đăng bán tại tab &quot;Đăng Bán&quot;!
          </p>
        </div>
      )}
    </>
  )
}

/** Sub-component kiểm tra listing của từng token — mỗi component có hook riêng (hợp lệ) */
function SingleListingCheck({
  tokenId,
  onResult,
}: {
  tokenId: bigint
  onResult: (isListed: boolean) => void
}) {
  const { data } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'listings',
    args: [tokenId],
    query: { refetchOnMount: 'always' },
  })

  const reported = useRef(false)

  useEffect(() => {
    if (data !== undefined && !reported.current) {
      reported.current = true
      const seller = (data as any)[1]
      onResult(seller !== '0x0000000000000000000000000000000000000000')
    }
  }, [data, onResult])

  return null
}

function NFTCard({ tokenId }: { tokenId: bigint }) {
  const { address: currentUserAddress } = useAccount()
  const queryClient = useQueryClient()

  const { data: listingData, refetch: refetchListing } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'listings',
    args: [tokenId],
    query: { refetchOnMount: 'always' },
  })

  const { data: tokenURI } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'tokenURI',
    args: [tokenId],
    query: { refetchOnMount: 'always' },
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

  // Hook phải được gọi TRƯỚC bất kỳ early return nào (Rules of Hooks)
  const uriString = tokenURI ? String(tokenURI) : ''
  const { imageUrl, metadata, isLoading: isLoadingMeta } = useNFTMetadata(tokenURI ? String(tokenURI) : undefined)

  // Tên NFT từ metadata (nếu có)
  const nftName = metadata?.name || `NFT #${tokenId.toString()}`

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
    <div className="nft-card" id={`nft-card-${tokenId}`}>
      {/* Image area */}
      <div className="nft-card__image" style={{ position: 'relative', overflow: 'hidden' }}>
        {isLoadingMeta ? (
          <span className="nft-card__image-text">⏳ Đang tải metadata...</span>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={nftName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
              const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
              if (fallback) fallback.style.display = 'block'
            }}
          />
        ) : null}
        <span
          className="nft-card__image-text"
          style={{ display: (!isLoadingMeta && !imageUrl) ? 'block' : (imageUrl ? 'none' : 'block') }}
        >
          {uriString
            ? `${uriString.substring(0, 60)}${uriString.length > 60 ? '...' : ''}`
            : 'Không có metadata'}
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