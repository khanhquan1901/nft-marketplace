import "dotenv/config";

import {
    createPublicClient,
    http,
    parseAbiItem
} from "viem";

import { foundry } from "viem/chains";

import fs from "fs";
import path from "path";

// =====================================================
// 1. CẤU HÌNH
// =====================================================

const RPC_URL = process.env.SEPOLIA_RPC_URL;

const CONTRACT_ADDRESS =
    process.env.CONTRACT_ADDRESS;

const INDEX_FROM_BLOCK =
    BigInt(process.env.INDEX_FROM_BLOCK || "0");

// Số block mỗi lần đọc
const CHUNK_SIZE = 10n;


// =====================================================
// 2. KIỂM TRA ENV
// =====================================================

if (!RPC_URL) {
    throw new Error(
        "Thiếu SEPOLIA_RPC_URL trong file .env"
    );
}

if (!CONTRACT_ADDRESS) {
    throw new Error(
        "Thiếu CONTRACT_ADDRESS trong file .env"
    );
}

if (INDEX_FROM_BLOCK === 0n) {
    throw new Error(
        "Thiếu INDEX_FROM_BLOCK trong file .env"
    );
}


// =====================================================
// 3. VIEM CLIENT
// =====================================================

const client = createPublicClient({
    chain: foundry,
    transport: http(RPC_URL)
});


// =====================================================
// 4. ABI EVENTS
// =====================================================

const TokenMintedEvent = parseAbiItem(
    "event TokenMinted(uint256 indexed tokenId, string tokenURI, address indexed minter)"
);

const TokenListedEvent = parseAbiItem(
    "event TokenListed(uint256 indexed tokenId, uint256 price, address indexed seller)"
);

const TokenSoldEvent = parseAbiItem(
    "event TokenSold(uint256 indexed tokenId, uint256 price, address indexed seller, address indexed buyer)"
);

const ListingCanceledEvent = parseAbiItem(
    "event ListingCanceled(uint256 indexed tokenId, address indexed seller)"
);


// =====================================================
// 5. DATABASE
// =====================================================

const database = {
    nfts: [],
    listings: [],
    transactions: []
};


// =====================================================
// 6. LƯU DATABASE
// =====================================================

function saveDatabase() {

    const dataDir = "./data";

    // Nếu chưa có folder data thì tạo
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {
            recursive: true
        });
    }

    fs.writeFileSync(
        path.join(dataDir, "database.json"),

        JSON.stringify(
            database,

            (_, value) =>
                typeof value === "bigint"
                    ? value.toString()
                    : value,

            2
        )
    );

    console.log(
        "Database đã được lưu."
    );
}


// =====================================================
// 7. KIỂM TRA BLOCKCHAIN
// =====================================================

async function checkBlockchain() {

    console.log("");
    console.log("================================");
    console.log("KIỂM TRA BLOCKCHAIN");
    console.log("================================");

    // Chain ID
    const chainId =
        await client.getChainId();

    console.log(
        "Chain ID:",
        chainId
    );

    if (chainId !== 31337) {

        throw new Error(
            `Sai network! Chain ID hiện tại: ${chainId}. Anvil/Foundry phải là 31337.`
        );
    }

    // Latest block
    const latestBlock =
        await client.getBlockNumber();

    console.log(
        "Latest block:",
        latestBlock.toString()
    );

    console.log(
        "Index from block:",
        INDEX_FROM_BLOCK.toString()
    );

    // Kiểm tra block bắt đầu
    if (INDEX_FROM_BLOCK > latestBlock) {

        throw new Error(
            `INDEX_FROM_BLOCK (${INDEX_FROM_BLOCK}) lớn hơn latest block (${latestBlock})`
        );
    }

    // Kiểm tra contract
    console.log(
        "Contract:",
        CONTRACT_ADDRESS
    );

    const bytecode =
        await client.getBytecode({
            address: CONTRACT_ADDRESS
        });

    if (!bytecode) {

        throw new Error(
            "Không tìm thấy contract tại CONTRACT_ADDRESS. Hãy kiểm tra lại address và network."
        );
    }

    console.log(
        "Contract bytecode: CÓ"
    );

    console.log(
        "Blockchain OK."
    );

    console.log(
        "================================"
    );

    return latestBlock;
}


// =====================================================
// 8. ĐỌC LOG THEO CHUNK
// =====================================================

async function getLogsInChunks(event) {

    const latestBlock =
        await client.getBlockNumber();

    let fromBlock =
        INDEX_FROM_BLOCK;

    const allLogs = [];

    while (fromBlock <= latestBlock) {

        const toBlock =
            fromBlock + CHUNK_SIZE - 1n <= latestBlock
                ? fromBlock + CHUNK_SIZE - 1n
                : latestBlock;

        console.log(
            `Đang đọc block ${fromBlock} -> ${toBlock}`
        );

        try {

            const logs =
                await client.getLogs({

                    address: CONTRACT_ADDRESS,

                    event,

                    fromBlock,

                    toBlock
                });

            console.log(
                `  -> Tìm thấy ${logs.length} log`
            );

            allLogs.push(
                ...logs
            );

        } catch (error) {

            console.error(
                `Lỗi khi đọc block ${fromBlock} -> ${toBlock}`
            );

            console.error(error);

            throw error;
        }

        fromBlock =
            toBlock + 1n;
    }

    return allLogs;
}


// =====================================================
// 9. ĐỌC TOKEN MINTED
// =====================================================

async function getMintedEvents() {

    console.log("");
    console.log("================================");
    console.log("Đang đọc TokenMinted...");
    console.log("================================");

    const logs =
        await getLogsInChunks(
            TokenMintedEvent
        );

    console.log(
        `Tổng TokenMinted: ${logs.length}`
    );

    return logs;
}


// =====================================================
// 10. ĐỌC TOKEN LISTED
// =====================================================

async function getListedEvents() {

    console.log("");
    console.log("================================");
    console.log("Đang đọc TokenListed...");
    console.log("================================");

    const logs =
        await getLogsInChunks(
            TokenListedEvent
        );

    console.log(
        `Tổng TokenListed: ${logs.length}`
    );

    return logs;
}


// =====================================================
// 11. ĐỌC TOKEN SOLD
// =====================================================

async function getSoldEvents() {

    console.log("");
    console.log("================================");
    console.log("Đang đọc TokenSold...");
    console.log("================================");

    const logs =
        await getLogsInChunks(
            TokenSoldEvent
        );

    console.log(
        `Tổng TokenSold: ${logs.length}`
    );

    return logs;
}


// =====================================================
// 12. ĐỌC LISTING CANCELED
// =====================================================

async function getCanceledEvents() {

    console.log("");
    console.log("================================");
    console.log("Đang đọc ListingCanceled...");
    console.log("================================");

    const logs =
        await getLogsInChunks(
            ListingCanceledEvent
        );

    console.log(
        `Tổng ListingCanceled: ${logs.length}`
    );

    return logs;
}


// =====================================================
// 13. ĐỌC TẤT CẢ EVENTS
// =====================================================

async function getAllEvents() {

    const mintedLogs =
        await getMintedEvents();

    const listedLogs =
        await getListedEvents();

    const soldLogs =
        await getSoldEvents();

    const canceledLogs =
        await getCanceledEvents();


    const events = [

        ...mintedLogs.map(
            log => ({
                type: "MINT",
                log
            })
        ),

        ...listedLogs.map(
            log => ({
                type: "LIST",
                log
            })
        ),

        ...soldLogs.map(
            log => ({
                type: "SALE",
                log
            })
        ),

        ...canceledLogs.map(
            log => ({
                type: "CANCEL",
                log
            })
        )
    ];


    // Sắp xếp theo block
    events.sort((a, b) => {

        if (
            a.log.blockNumber <
            b.log.blockNumber
        ) {
            return -1;
        }

        if (
            a.log.blockNumber >
            b.log.blockNumber
        ) {
            return 1;
        }

        // Nếu cùng block
        if (
            a.log.logIndex <
            b.log.logIndex
        ) {
            return -1;
        }

        if (
            a.log.logIndex >
            b.log.logIndex
        ) {
            return 1;
        }

        return 0;
    });


    return events;
}


// =====================================================
// 14. TÌM NFT
// =====================================================

function findNFT(tokenId) {

    return database.nfts.find(
        nft =>
            nft.tokenId ===
            tokenId.toString()
    );
}


// =====================================================
// 15. XỬ LÝ MINT
// =====================================================

function processMint(log) {

    const {
        tokenId,
        tokenURI,
        minter
    } = log.args;


    const tokenIdString =
        tokenId.toString();


    console.log(
        `MINT NFT #${tokenIdString}`
    );


    // Kiểm tra duplicate
    const existingNFT =
        findNFT(tokenId);


    if (existingNFT) {

        console.log(
            `NFT #${tokenIdString} đã tồn tại`
        );

        return;
    }


    // Thêm NFT
    database.nfts.push({

        tokenId:
            tokenIdString,

        tokenURI:
            tokenURI,

        minter:
            minter,

        owner:
            minter,

        status:
            "NOT_LISTED"
    });


    // Transaction
    database.transactions.push({

        tokenId:
            tokenIdString,

        type:
            "MINT",

        from:
            null,

        to:
            minter,

        price:
            "0",

        blockNumber:
            log.blockNumber.toString(),

        transactionHash:
            log.transactionHash
    });
}


// =====================================================
// 16. XỬ LÝ LIST
// =====================================================

function processList(log) {

    const {
        tokenId,
        price,
        seller
    } = log.args;


    const tokenIdString =
        tokenId.toString();


    console.log(
        `LIST NFT #${tokenIdString}`
    );


    const nft =
        findNFT(tokenId);


    if (!nft) {

        console.log(
            `Không tìm thấy NFT #${tokenIdString}`
        );

        return;
    }


    // Cập nhật NFT
    nft.status =
        "LISTED";


    // Xóa listing cũ
    database.listings =
        database.listings.filter(

            listing =>
                listing.tokenId !==
                tokenIdString
        );


    // Thêm listing mới
    database.listings.push({

        tokenId:
            tokenIdString,

        seller:
            seller,

        price:
            price.toString(),

        status:
            "ACTIVE"
    });


    // Transaction
    database.transactions.push({

        tokenId:
            tokenIdString,

        type:
            "LIST",

        from:
            seller,

        to:
            null,

        price:
            price.toString(),

        blockNumber:
            log.blockNumber.toString(),

        transactionHash:
            log.transactionHash
    });
}


// =====================================================
// 17. XỬ LÝ SALE
// =====================================================

function processSale(log) {

    const {
        tokenId,
        price,
        seller,
        buyer
    } = log.args;


    const tokenIdString =
        tokenId.toString();


    console.log(
        `SALE NFT #${tokenIdString}`
    );


    const nft =
        findNFT(tokenId);


    if (!nft) {

        console.log(
            `Không tìm thấy NFT #${tokenIdString}`
        );

        return;
    }


    // Owner mới
    nft.owner =
        buyer;


    // Status
    nft.status =
        "SOLD";


    // Xóa listing
    database.listings =
        database.listings.filter(

            listing =>
                listing.tokenId !==
                tokenIdString
        );


    // Transaction
    database.transactions.push({

        tokenId:
            tokenIdString,

        type:
            "SALE",

        from:
            seller,

        to:
            buyer,

        price:
            price.toString(),

        blockNumber:
            log.blockNumber.toString(),

        transactionHash:
            log.transactionHash
    });
}


// =====================================================
// 18. XỬ LÝ CANCEL
// =====================================================

function processCancel(log) {

    const {
        tokenId,
        seller
    } = log.args;


    const tokenIdString =
        tokenId.toString();


    console.log(
        `CANCEL NFT #${tokenIdString}`
    );


    const nft =
        findNFT(tokenId);


    if (!nft) {

        console.log(
            `Không tìm thấy NFT #${tokenIdString}`
        );

        return;
    }


    // NFT không còn bán
    nft.status =
        "NOT_LISTED";


    // Xóa listing
    database.listings =
        database.listings.filter(

            listing =>
                listing.tokenId !==
                tokenIdString
        );


    // Transaction
    database.transactions.push({

        tokenId:
            tokenIdString,

        type:
            "CANCEL",

        from:
            seller,

        to:
            null,

        price:
            "0",

        blockNumber:
            log.blockNumber.toString(),

        transactionHash:
            log.transactionHash
    });
}


// =====================================================
// 19. XỬ LÝ EVENTS
// =====================================================

function processEvents(events) {

    console.log("");
    console.log("================================");
    console.log("Đang xử lý events...");
    console.log("================================");


    for (const event of events) {

        switch (event.type) {

            case "MINT":

                processMint(
                    event.log
                );

                break;


            case "LIST":

                processList(
                    event.log
                );

                break;


            case "SALE":

                processSale(
                    event.log
                );

                break;


            case "CANCEL":

                processCancel(
                    event.log
                );

                break;


            default:

                console.log(
                    "Event không xác định:",
                    event.type
                );
        }
    }
}


// =====================================================
// 20. REAL-TIME WATCHING
// =====================================================

function startWatching() {

    console.log("");
    console.log("================================");
    console.log("REAL-TIME WATCHING STARTED");
    console.log("================================");
    console.log(
        "Đang lắng nghe events mới từ blockchain..."
    );


    // -------------------------------------------------
    // Watch TokenMinted
    // -------------------------------------------------

    const unwatchMint =
        client.watchContractEvent({

            address: CONTRACT_ADDRESS,

            abi: [TokenMintedEvent],

            eventName: "TokenMinted",

            onLogs: (logs) => {

                for (const log of logs) {

                    console.log("");
                    console.log(
                        "[REALTIME] TokenMinted detected!"
                    );

                    processMint(log);
                }

                saveDatabase();

                printStats();
            },

            onError: (error) => {

                console.error(
                    "[REALTIME] Lỗi watch TokenMinted:",
                    error.message
                );
            }
        });


    // -------------------------------------------------
    // Watch TokenListed
    // -------------------------------------------------

    const unwatchList =
        client.watchContractEvent({

            address: CONTRACT_ADDRESS,

            abi: [TokenListedEvent],

            eventName: "TokenListed",

            onLogs: (logs) => {

                for (const log of logs) {

                    console.log("");
                    console.log(
                        "[REALTIME] TokenListed detected!"
                    );

                    processList(log);
                }

                saveDatabase();

                printStats();
            },

            onError: (error) => {

                console.error(
                    "[REALTIME] Lỗi watch TokenListed:",
                    error.message
                );
            }
        });


    // -------------------------------------------------
    // Watch TokenSold
    // -------------------------------------------------

    const unwatchSold =
        client.watchContractEvent({

            address: CONTRACT_ADDRESS,

            abi: [TokenSoldEvent],

            eventName: "TokenSold",

            onLogs: (logs) => {

                for (const log of logs) {

                    console.log("");
                    console.log(
                        "[REALTIME] TokenSold detected!"
                    );

                    processSale(log);
                }

                saveDatabase();

                printStats();
            },

            onError: (error) => {

                console.error(
                    "[REALTIME] Lỗi watch TokenSold:",
                    error.message
                );
            }
        });


    // -------------------------------------------------
    // Watch ListingCanceled
    // -------------------------------------------------

    const unwatchCancel =
        client.watchContractEvent({

            address: CONTRACT_ADDRESS,

            abi: [ListingCanceledEvent],

            eventName: "ListingCanceled",

            onLogs: (logs) => {

                for (const log of logs) {

                    console.log("");
                    console.log(
                        "[REALTIME] ListingCanceled detected!"
                    );

                    processCancel(log);
                }

                saveDatabase();

                printStats();
            },

            onError: (error) => {

                console.error(
                    "[REALTIME] Lỗi watch ListingCanceled:",
                    error.message
                );
            }
        });


    // Trả về hàm để dừng watching
    return () => {

        unwatchMint();
        unwatchList();
        unwatchSold();
        unwatchCancel();

        console.log("");
        console.log("Đã dừng real-time watching.");
    };
}


// =====================================================
// 21. THỐNG KÊ
// =====================================================

function printStats() {

    console.log("");
    console.log("--- Thống kê ---");

    console.log(
        `NFTs: ${database.nfts.length}`
    );

    console.log(
        `Listings: ${database.listings.length}`
    );

    console.log(
        `Transactions: ${database.transactions.length}`
    );
}


// =====================================================
// 22. MAIN
// =====================================================

async function main() {

    console.log("");
    console.log("================================");
    console.log("NFT INDEXER START");
    console.log("================================");


    console.log(
        "Contract:",
        CONTRACT_ADDRESS
    );


    console.log(
        "Index from block:",
        INDEX_FROM_BLOCK.toString()
    );


    try {

        // ---------------------------------------------
        // Kiểm tra blockchain
        // ---------------------------------------------

        const latestBlock =
            await checkBlockchain();


        // ---------------------------------------------
        // Đọc tất cả events (historical sync)
        // ---------------------------------------------

        console.log("");
        console.log("Đang đọc blockchain (historical sync)...");


        const events =
            await getAllEvents();


        console.log("");
        console.log(
            `Tổng events: ${events.length}`
        );


        // ---------------------------------------------
        // Xử lý events
        // ---------------------------------------------

        processEvents(events);


        // ---------------------------------------------
        // Lưu database
        // ---------------------------------------------

        saveDatabase();


        // ---------------------------------------------
        // Thống kê sau historical sync
        // ---------------------------------------------

        console.log("");
        console.log("================================");
        console.log("HISTORICAL SYNC HOÀN THÀNH");
        console.log("================================");

        console.log(
            `Đã quét từ block ${INDEX_FROM_BLOCK} đến ${latestBlock}`
        );

        printStats();


        // ---------------------------------------------
        // Bắt đầu real-time watching
        // ---------------------------------------------

        const stopWatching =
            startWatching();


        // ---------------------------------------------
        // Xử lý tắt chương trình (graceful shutdown)
        // ---------------------------------------------

        process.on("SIGINT", () => {

            console.log("");
            console.log("================================");
            console.log("ĐANG TẮT INDEXER...");
            console.log("================================");

            stopWatching();

            saveDatabase();

            console.log("Indexer đã tắt.");

            process.exit(0);
        });


        process.on("SIGTERM", () => {

            stopWatching();

            saveDatabase();

            process.exit(0);
        });


        console.log("");
        console.log("================================");
        console.log("INDEXER ĐANG CHẠY");
        console.log("================================");
        console.log(
            "Nhấn Ctrl+C để dừng."
        );


    } catch (error) {

        console.error("");
        console.error("================================");
        console.error("INDEXER LỖI");
        console.error("================================");

        console.error(
            error
        );

        process.exit(1);
    }
}


// =====================================================
// 23. START
// =====================================================

main();