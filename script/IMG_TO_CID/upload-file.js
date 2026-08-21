import fs from "fs";
import { openAsBlob } from "fs"; // Sử dụng API chuyển đổi file sang Blob tối ưu nhất của Node.js
import dotenv from "dotenv";

dotenv.config({ path: '../../.env' });

async function uploadImageToIPFS() {
  const imageName = "gojo.png"; 

  // 1. Kiểm tra file tồn tại trước khi xử lý
  if (!fs.existsSync(imageName)) {
    console.error(`Ảnh không tồn tại tại đường dẫn: ${imageName}`);
    return;
  }

  try {
    console.log("Đang chuẩn bị tệp tin để tải lên...");

    // 2. Mở file trực tiếp dưới dạng Blob (Không tốn RAM để load Buffer)
    const fileBlob = await openAsBlob(imageName, { type: "image/png" });

    // 3. Đưa vào FormData đúng chuẩn Web API
    const formData = new FormData();
    formData.append("file", fileBlob, imageName);

    console.log("Đang gửi yêu cầu tới Pinata IPFS...");

    // 4. Thực hiện Fetch yêu cầu
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        // Lưu ý: Tuyệt đối KHÔNG tự đặt Content-Type là multipart/form-data ở đây.
        // Hãy để fetch tự động tính toán boundary cho FormData của bạn.
        Authorization: `Bearer ${process.env.PINATA_JWT}`, 
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.details || result.error || "Lỗi không xác định từ Pinata");
    }

    const cid = result.IpfsHash; 
    console.log("\n🎉 Tải lên IPFS thành công!");
    console.log(`🔑 Mã định danh ảnh (CID): ${cid}`);
    console.log(`🌐 Link xem ảnh: https://gateway.pinata.cloud/ipfs/${cid}`);
      
  } catch (error) { 
    console.error("\n❌ Upload file thất bại:", error.message);
  }
}

uploadImageToIPFS();