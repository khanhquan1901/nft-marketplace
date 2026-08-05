import { http, createConfig } from 'wagmi'
import { foundry } from 'wagmi/chains'

export const config = createConfig({
  // Hiện tại chỉ cấu hình mạng local, sau này có thể thêm sepolia, mainnet...
  chains: [foundry], 
  transports: {
    [foundry.id]: http(), // Mặc định kết nối tới http://127.0.0.1:8545
  },
})