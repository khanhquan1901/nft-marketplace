/**
 * Danh sách IPFS gateway (ưu tiên nhanh nhất trước)
 */
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
]

const DEFAULT_GATEWAY = IPFS_GATEWAYS[0]

/**
 * Trích xuất CID (và path phía sau nếu có) từ các dạng URI phổ biến
 * Trả về chuỗi CID/path hoặc null nếu không phải IPFS URI
 */
function extractCID(uri: string): string | null {
  if (!uri) return null

  // ipfs://QmXxx.../path
  if (uri.startsWith('ipfs://')) {
    return uri.slice('ipfs://'.length)
  }

  // ipfs/QmXxx...
  if (uri.startsWith('ipfs/')) {
    return uri.slice('ipfs/'.length)
  }

  // /ipfs/QmXxx... (absolute path)
  if (uri.startsWith('/ipfs/')) {
    return uri.slice('/ipfs/'.length)
  }

  // CID trực tiếp: Qm... hoặc bafy...
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{55})/.test(uri)) {
    return uri
  }

  // HTTP URL chứa /ipfs/CID → trích CID
  const ipfsInUrl = uri.match(/\/ipfs\/(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{55}[^\s]*)/)
  if (ipfsInUrl) {
    return ipfsInUrl[1]
  }

  return null
}

/**
 * Convert IPFS URI thành HTTP gateway URL để hiển thị ảnh
 * Hỗ trợ: ipfs://Qm..., ipfs/Qm..., /ipfs/Qm..., Qm... (CID trực tiếp), HTTP URL
 */
export function ipfsToHttp(uri: string, gatewayIndex = 0): string {
  if (!uri) return ''

  // Đã là HTTP URL → giữ nguyên (trừ khi chứa gateway chậm, thì đổi sang nhanh hơn)
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    // Nếu là URL gateway IPFS → có thể đổi gateway
    const cid = extractCID(uri)
    if (cid && gatewayIndex > 0) {
      const gw = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length]
      return gw + cid
    }
    return uri
  }

  const cid = extractCID(uri)
  if (cid) {
    const gw = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length]
    return gw + cid
  }

  return uri
}

/**
 * Tạo danh sách tất cả gateway URLs cho một URI
 */
export function ipfsToHttpAll(uri: string): string[] {
  const cid = extractCID(uri)
  if (!cid) {
    // Không phải IPFS → trả về URL gốc
    const http = ipfsToHttp(uri)
    return http ? [http] : []
  }
  return IPFS_GATEWAYS.map((gw) => gw + cid)
}


/**
 * NFT Metadata theo chuẩn ERC-721
 */
export interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  [key: string]: unknown
}


/**
 * Fetch với fallback qua nhiều gateway
 * Thử lần lượt từng gateway cho đến khi thành công
 */
async function fetchWithGatewayFallback(
  uri: string,
  timeoutMs = 8000
): Promise<Response | null> {
  const cid = extractCID(uri)

  // Nếu không phải IPFS URI → fetch trực tiếp
  if (!cid) {
    const httpUrl = ipfsToHttp(uri)
    if (!httpUrl.startsWith('http')) return null
    try {
      const res = await fetch(httpUrl, { signal: AbortSignal.timeout(timeoutMs) })
      return res.ok ? res : null
    } catch {
      return null
    }
  }

  // Thử từng gateway
  for (const gw of IPFS_GATEWAYS) {
    const url = gw + cid
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (res.ok) return res
    } catch {
      // Gateway này lỗi → thử cái tiếp theo
      continue
    }
  }

  return null
}


/**
 * Fetch NFT metadata từ tokenURI.
 *
 * tokenURI có thể là:
 * 1. URL/CID trỏ tới JSON metadata (chuẩn ERC-721) → fetch JSON → lấy field "image"
 * 2. URL/CID trỏ trực tiếp tới file ảnh → dùng luôn làm image URL
 * 3. Chuỗi không hợp lệ → trả về null
 *
 * Tự động thử nhiều IPFS gateway khi gateway chính bị lỗi/chậm.
 * Trả về { imageUrl, metadata } hoặc null nếu không fetch được.
 */
export async function fetchNFTMetadata(
  tokenURI: string
): Promise<{ imageUrl: string; metadata: NFTMetadata | null } | null> {

  if (!tokenURI) return null

  const httpUrl = ipfsToHttp(tokenURI)

  // Nếu không convert được thành HTTP URL hợp lệ → bỏ qua
  if (!httpUrl.startsWith('http://') && !httpUrl.startsWith('https://')) {
    return null
  }

  const response = await fetchWithGatewayFallback(tokenURI)
  if (!response) return null

  try {
    const contentType = response.headers.get('content-type') || ''

    // Nếu response là ảnh trực tiếp → dùng URL luôn
    if (contentType.startsWith('image/')) {
      return {
        imageUrl: response.url,
        metadata: null,
      }
    }

    // Nếu response là JSON metadata → parse và lấy field "image"
    if (contentType.includes('json') || contentType.includes('text') || contentType.includes('octet-stream')) {
      const text = await response.text()

      try {
        const json: NFTMetadata = JSON.parse(text)

        // Lấy image từ metadata (hỗ trợ nhiều field name phổ biến)
        const rawImage =
          json.image ||
          (json as any).image_url ||
          (json as any).imageUrl ||
          (json as any).animation_url ||
          ''

        // Convert image URI bằng gateway nhanh nhất
        const imageUrl = rawImage ? ipfsToHttp(rawImage) : ''

        return {
          imageUrl,
          metadata: json,
        }
      } catch {
        // Text nhưng không phải JSON → có thể là URL trực tiếp
        return null
      }
    }

    // Content type khác (video, binary...) → thử dùng URL trực tiếp
    return {
      imageUrl: response.url,
      metadata: null,
    }

  } catch {
    // Parse error
    return null
  }
}
