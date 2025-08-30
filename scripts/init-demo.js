#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing HydroCred Demo Environment...\n');

// Check if .env exists
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  const envContent = `# HydroCred Environment Configuration

# Server Configuration
PORT=5055
NODE_ENV=development

# Blockchain Configuration
RPC_URL=https://ethereum-sepolia.publicnode.com
CONTRACT_ADDRESS=0xaA7b945a4Cd4381DcF5D4Bc6e0E5cc76e6A3Fc39
PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# Security
AES_KEY=hydrocred_encryption_key_32_chars_minimum_length_required

# Demo Wallet Private Keys (for testing only)
ADMIN_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
PRODUCER_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
BUYER_PRIVATE_KEY=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created');
}

// Check if frontend/.env exists
const frontendEnvPath = path.join(__dirname, '../frontend/.env');
if (!fs.existsSync(frontendEnvPath)) {
  console.log('📝 Creating frontend/.env file...');
  const frontendEnvContent = `# Frontend Environment Configuration
VITE_BACKEND_URL=http://localhost:5055
VITE_CONTRACT_ADDRESS=0xaA7b945a4Cd4381DcF5D4Bc6e0E5cc76e6A3Fc39
VITE_RPC_URL=https://ethereum-sepolia.publicnode.com
VITE_CHAIN_ID=11155111
`;
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('✅ frontend/.env file created');
}

console.log('\n🎉 Demo environment initialized successfully!');
console.log('\n📋 Next steps:');
console.log('1. Run: npm run setup');
console.log('2. Run: npm run start');
console.log('3. Open: http://localhost:5173');
console.log('4. Import demo wallets into MetaMask');
console.log('\n🔑 Demo Wallet Addresses:');
console.log('Admin/Certifier: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
console.log('Producer: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
console.log('Buyer: 0x90F79bf6EB2c4f870365E785982E1f101E93b906');
console.log('\n⚠️  Remember: These are test wallets only - never use on mainnet!');