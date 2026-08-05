// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {NFTMarketplace} from "../src/NFTMarketplace.sol";

contract NFTMarketplaceTest is Test {
    NFTMarketplace public marketplace;

    // Giả lập 2 ví người dùng
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");  

    string constant TOKEN_URI = "ipfs://QmTestURI123";
    uint256 constant LISTING_PRICE = 1 ether; // 1 ETH = 10^18 wei

    // Hàm setUp() luôn chạy ĐẦU TIÊN trước mỗi kịch bản test
    function setUp() public {
        marketplace = new NFTMarketplace();
        
        // vm.deal là cheatcode của Foundry, nạp 10 ETH vào ví giả lập để test
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    // --- TEST 1: KIỂM TRA MINT NFT ---
    function testMintToken() public {
        vm.prank(alice); // Cheatcode: Giả lập msg.sender là alice trong lệnh tiếp theo
        uint256 tokenId = marketplace.mintToken(TOKEN_URI);

        // Kiểm tra (Assert) xem alice có phải chủ sở hữu không và URI có đúng không
        assertEq(marketplace.ownerOf(tokenId), alice);
        assertEq(marketplace.tokenURI(tokenId), TOKEN_URI);
    }

    // --- TEST 2: KIỂM TRA ĐƯA NFT LÊN SÀN (LIST) ---
    function testListNFT() public {
        vm.startPrank(alice); // Giả lập msg.sender là alice cho đến khi gọi stopPrank
        uint256 tokenId = marketplace.mintToken(TOKEN_URI);

        // BẮT BUỘC: Cấp quyền (approve) cho contract Marketplace
        marketplace.approve(address(marketplace), tokenId);

        // List NFT
        marketplace.listNFT(tokenId, LISTING_PRICE);
        vm.stopPrank();

        // Kiểm tra xem dữ liệu trong mapping listings đã lưu đúng chưa
        (uint256 price, address seller) = marketplace.listings(tokenId);
        assertEq(price, LISTING_PRICE);
        assertEq(seller, alice);
    }

    // --- TEST 3: KIỂM TRA MUA NFT (BUY) ---
    function testBuyNFT() public {
        // 1. Alice mint và list NFT
        vm.startPrank(alice);
        uint256 tokenId = marketplace.mintToken(TOKEN_URI);
        marketplace.approve(address(marketplace), tokenId);
        marketplace.listNFT(tokenId, LISTING_PRICE);
        vm.stopPrank();

        // Ghi nhận số dư của Alice trước khi Bob mua
        uint256 aliceBalanceBefore = alice.balance;

        // 2. Bob tiến hành mua
        vm.prank(bob);
        // Gửi kèm giá trị ETH (value: LISTING_PRICE) vào hàm payable
        marketplace.buyNFT{value: LISTING_PRICE}(tokenId); 

        // 3. Kiểm tra các thay đổi
        // - Bob có NFT chưa?
        assertEq(marketplace.ownerOf(tokenId), bob);
        // - Alice có nhận được 1 ETH không?
        assertEq(alice.balance, aliceBalanceBefore + LISTING_PRICE);
        // - Listing đã bị xóa chưa? (price = 0, seller = address(0))
        (uint256 price, address seller) = marketplace.listings(tokenId);
        assertEq(price, 0);
        assertEq(seller, address(0));
    }

    // --- TEST 4: KIỂM TRA HỦY BÁN (CANCEL) ---
    function testCancelListing() public {
        vm.startPrank(alice);
        uint256 tokenId = marketplace.mintToken(TOKEN_URI);
        marketplace.approve(address(marketplace), tokenId);
        marketplace.listNFT(tokenId, LISTING_PRICE);

        // Alice đổi ý, hủy bán
        marketplace.cancelListing(tokenId);
        vm.stopPrank();

        // Kiểm tra xem listing đã được xóa chưa
        (uint256 price, address seller) = marketplace.listings(tokenId);
        assertEq(price, 0);
        assertEq(seller, address(0));
    }

    // --- TEST 5: KIỂM TRA BẮT LỖI (REVERT) ---
    // Kiểm tra xem contract có báo lỗi nếu list mà chưa approve không
    function testRevertListWithoutApproval() public {
        vm.startPrank(alice);
        uint256 tokenId = marketplace.mintToken(TOKEN_URI);

        // Kỳ vọng lệnh tiếp theo sẽ bị revert với đúng dòng báo lỗi này
        vm.expectRevert("Marketplace is not approved to transfer this NFT");
        marketplace.listNFT(tokenId, LISTING_PRICE); 
        vm.stopPrank();
    }
}