// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {NFTMarketplace} from "../src/NFTMarketplace.sol";

contract DeployNFTMarketplace is Script {
    function run() external {
        // Lấy Private Key từ biến môi trường hoặc dùng tạm key số 0 của Anvil
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));

        // Bắt đầu ghi lại các giao dịch để gửi lên mạng
        vm.startBroadcast(deployerPrivateKey);

        // Deploy contract
        NFTMarketplace marketplace = new NFTMarketplace();
        
        // Kết thúc ghi
        vm.stopBroadcast();

        console.log("NFT Marketplace deployed at:", address(marketplace));
    }
}