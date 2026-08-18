/**
 * Convert IPFS URI thành HTTP gateway URL để hiển thị ảnh
 * Hỗ trợ: ipfs://Qm..., ipfs/Qm..., Qm... (CID trực tiếp), HTTP URL
 */
export function ipfsToHttp(uri: string): string {
  if (!uri) return ''

  const gateway = 'https://ipfs.io/ipfs/'

  // ipfs://QmXxx...
  if (uri.startsWith('ipfs://')) {
    return gateway + uri.replace('ipfs://', '')
  }

  // ipfs/QmXxx...
  if (uri.startsWith('ipfs/')) {
    return gateway + uri.replace('ipfs/', '')
  }

  // Đã là HTTP URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri
  }

  // CID trực tiếp (Qm... hoặc bafy...)
  if (uri.startsWith('Qm') || uri.startsWith('bafy')) {
    return gateway + uri
  }

  return uri
}
