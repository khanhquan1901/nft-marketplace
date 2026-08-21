'use client'

import { useState, useEffect } from 'react'
import { fetchNFTMetadata, ipfsToHttp, type NFTMetadata } from '../utils/ipfs'


/**
 * Custom hook: Fetch NFT metadata từ tokenURI
 *
 * Tự động phân biệt:
 * - tokenURI → JSON metadata → lấy image
 * - tokenURI → ảnh trực tiếp → dùng luôn
 *
 * @returns { imageUrl, metadata, isLoading, error }
 */
export function useNFTMetadata(tokenURI: string | undefined) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenURI) {
      setImageUrl('')
      setMetadata(null)
      return
    }

    const uriString = String(tokenURI)

    // Nếu tokenURI không phải CID / URL hợp lệ → thử dùng trực tiếp
    const httpUrl = ipfsToHttp(uriString)
    const isValidUrl =
      httpUrl.startsWith('http://') || httpUrl.startsWith('https://')

    if (!isValidUrl) {
      // Không thể fetch → dùng nguyên URI (sẽ fallback ở component)
      setImageUrl('')
      setMetadata(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetchNFTMetadata(uriString)
      .then((result) => {
        if (cancelled) return

        if (result) {
          setImageUrl(result.imageUrl)
          setMetadata(result.metadata)
        } else {
          // Fetch thất bại → thử dùng URL trực tiếp làm ảnh (fallback)
          setImageUrl(httpUrl)
          setMetadata(null)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Không thể tải metadata')
        // Fallback: dùng URL trực tiếp
        setImageUrl(httpUrl)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tokenURI])

  return { imageUrl, metadata, isLoading, error }
}
