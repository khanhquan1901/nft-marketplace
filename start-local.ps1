# ============================================================
# NFT Marketplace - Local Development Startup Script
# ============================================================
# Script này sẽ tự động:
# 1. Tắt Anvil cũ nếu đang chạy
# 2. Khởi động Anvil mới (fresh blockchain)
# 3. Deploy smart contract (luôn ra đúng địa chỉ)
# 4. Chạy frontend
# ============================================================
# CÁCH DÙNG: Mở PowerShell tại thư mục gốc project, chạy:
#   .\start-local.ps1
# ============================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  NFT Marketplace - Local Dev Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Thêm Foundry vào PATH ---
$env:PATH += ";$env:USERPROFILE\.foundry\bin"
$env:FOUNDRY_DISABLE_NIGHTLY_WARNING = "1"

# --- Bước 1: Tắt Anvil cũ nếu đang chạy ---
Write-Host "[1/4] Dang tat Anvil cu..." -ForegroundColor Yellow
$anvilProcesses = Get-Process -Name "anvil" -ErrorAction SilentlyContinue
if ($anvilProcesses) {
    $anvilProcesses | Stop-Process -Force
    Write-Host "  -> Da tat Anvil cu." -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "  -> Khong co Anvil nao dang chay." -ForegroundColor Gray
}

# --- Bước 2: Khởi động Anvil mới ---
Write-Host "[2/4] Dang khoi dong Anvil moi..." -ForegroundColor Yellow
$anvilExe = "$env:USERPROFILE\.foundry\bin\anvil.exe"
if (-not (Test-Path $anvilExe)) {
    # Thử tìm trong PATH
    $anvilExe = (Get-Command anvil -ErrorAction SilentlyContinue).Source
    if (-not $anvilExe) {
        Write-Host "  -> LOI: Khong tim thay anvil! Cai Foundry truoc." -ForegroundColor Red
        exit 1
    }
}

$anvilProc = Start-Process -FilePath $anvilExe -PassThru -WindowStyle Minimized
Write-Host "  -> Anvil da khoi dong (PID: $($anvilProc.Id))" -ForegroundColor Green

# Đợi Anvil sẵn sàng
Write-Host "  -> Dang doi Anvil san sang..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8545" -Method POST `
            -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' `
            -ContentType "application/json" -ErrorAction Stop -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        # Chưa sẵn sàng, thử lại
    }
}

if (-not $ready) {
    Write-Host "  -> LOI: Anvil khong khoi dong duoc!" -ForegroundColor Red
    exit 1
}
Write-Host "  -> Anvil san sang tai http://127.0.0.1:8545" -ForegroundColor Green

# --- Bước 3: Deploy contract ---
Write-Host "[3/4] Dang deploy smart contract..." -ForegroundColor Yellow

# QUAN TRỌNG: Override PRIVATE_KEY để dùng Anvil default account #0
# Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
# 
# Khi Anvil fresh + account #0 (nonce=0):
# Contract LUÔN deploy ra: 0x5FbDB2315678afecb367f032d93F642f64180aa3

$savedPrivateKey = $env:PRIVATE_KEY
$env:PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

$deployResult = & forge script script/DeployNFTMarketplace.s.sol `
    --rpc-url http://127.0.0.1:8545 `
    --broadcast 2>&1

$env:PRIVATE_KEY = $savedPrivateKey

$deployOutput = $deployResult | Out-String
if ($deployOutput -match "deployed at: (0x[a-fA-F0-9]+)") {
    $contractAddress = $Matches[1]
    Write-Host "  -> Contract deployed tai: $contractAddress" -ForegroundColor Green
    
    $expectedAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    if ($contractAddress -eq $expectedAddress) {
        Write-Host "  -> Dung dia chi mong doi!" -ForegroundColor Green
    } else {
        Write-Host "  -> CANH BAO: Dia chi khac voi frontend!" -ForegroundColor Red
        Write-Host "  -> Frontend mong doi: $expectedAddress" -ForegroundColor Red
    }
} else {
    Write-Host "  -> LOI khi deploy contract!" -ForegroundColor Red
    Write-Host $deployOutput -ForegroundColor Red
    Write-Host ""
    Write-Host "Nhan Enter de thoat..." -ForegroundColor Yellow
    Read-Host
    exit 1
}

# --- Bước 4: Khởi động Frontend ---
Write-Host "[4/4] Dang khoi dong frontend..." -ForegroundColor Yellow
$npmProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm", "run", "dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru -WindowStyle Minimized
Write-Host "  -> Frontend dang chay tai http://localhost:3000" -ForegroundColor Green

# --- Hoàn thành ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  KHOI DONG THANH CONG!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Anvil:    http://127.0.0.1:8545" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Contract: $contractAddress" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Anvil Account #0 (dung cho MetaMask):" -ForegroundColor White
Write-Host "  Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" -ForegroundColor Gray
Write-Host "  Key:     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor Gray
Write-Host ""
Write-Host "  LUU Y: Neu MetaMask bi loi nonce sau khi restart Anvil," -ForegroundColor Yellow
Write-Host "  vao MetaMask > Settings > Advanced > Clear activity and nonce data" -ForegroundColor Yellow
Write-Host ""
Write-Host "Nhan Enter de tat tat ca services..." -ForegroundColor Yellow
Read-Host

# Cleanup
Write-Host "Dang tat services..." -ForegroundColor Yellow
Stop-Process -Id $anvilProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $npmProc.Id -Force -ErrorAction SilentlyContinue
Write-Host "Da tat. Tam biet!" -ForegroundColor Green
