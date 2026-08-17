// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage, ERC721} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract NFTMarketplace is ERC721URIStorage, ReentrancyGuard {
    uint256 private _nextTokenId;

    // Cấu trúc dữ liệu cho một NFT đang được bán
    struct Listing {
        uint256 price;
        address seller;
    }

    // Ánh xạ từ Token ID sang thông tin Listing
    mapping(uint256 => Listing) public listings;

    // Các sự kiện (Events) để Frontend (Next.js) có thể lắng nghe và cập nhật UI
    event TokenMinted(uint256 indexed tokenId, string tokenURI, address indexed minter);
    event TokenListed(uint256 indexed tokenId, uint256 price, address indexed seller);
    event TokenSold(uint256 indexed tokenId, uint256 price, address indexed seller, address indexed buyer);
    event ListingCanceled(uint256 indexed tokenId, address indexed seller);

    constructor() ERC721("DApp NFT", "DNFT") {}
    uint256[] public allTokens;

    /**x
     * @dev 1. Mint (Tạo) NFT mới
     * Người dùng truyền vào tokenURI (link IPFS chứa hình ảnh và metadata)
     */
    function mintToken(string memory tokenURI) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit TokenMinted(tokenId, tokenURI, msg.sender);
        allTokens.push(tokenId);
        return tokenId;
    }
    function getAllTokens() public view returns (uint256[] memory) {
        return allTokens;
    }

    /**
     * @dev 2. Đưa NFT lên sàn (List)
     */
    function listNFT(uint256 tokenId, uint256 price) public {
        require(price > 0, "Price must be greater than 0");
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        
        // Đảm bảo người dùng đã gọi hàm setApprovalForAll() hoặc approve() cho contract này
        require(
            getApproved(tokenId) == address(this) || isApprovedForAll(msg.sender, address(this)),
            "Marketplace is not approved to transfer this NFT"
        );

        listings[tokenId] = Listing(price, msg.sender);
        emit TokenListed(tokenId, price, msg.sender);
    }

    /**
     * @dev 3. Mua NFT
     * Sử dụng nonReentrant để ngăn chặn tấn công Reentrancy
     */
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.price > 0, "This NFT is not for sale");
        require(msg.value == listing.price, "Incorrect ETH value sent");

        // Nguyên tắc: Checks-Effects-Interactions
        // Xóa listing (Effect) TRƯỚC KHI chuyển tiền/token (Interaction)
        delete listings[tokenId];

        // Chuyển ETH cho người bán
        (bool success, ) = payable(listing.seller).call{value: msg.value}("");
        require(success, "Transfer failed");

        // Chuyển NFT từ người bán sang người mua
        _transfer(listing.seller, msg.sender, tokenId);

        emit TokenSold(tokenId, listing.price, listing.seller, msg.sender);
    }

    /**
     * @dev 4. Hủy bán (Cancel)
     */
    function cancelListing(uint256 tokenId) public {
        Listing memory listing = listings[tokenId];
        require(listing.price > 0, "This NFT is not for sale");
        require(listing.seller == msg.sender, "You are not the seller");

        delete listings[tokenId];
        emit ListingCanceled(tokenId, msg.sender);
    }
}