import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function main() {
  console.log("🚀 Deploying HydroCredToken...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Get main admin address from environment
  const mainAdminAddress = process.env.MAIN_ADMIN_ADDRESS;
  if (!mainAdminAddress) {
    throw new Error("MAIN_ADMIN_ADDRESS must be set in .env file");
  }

  if (!ethers.isAddress(mainAdminAddress)) {
    throw new Error("MAIN_ADMIN_ADDRESS is not a valid Ethereum address");
  }

  console.log("👑 Main Admin Address:", mainAdminAddress);

  // Deploy the contract
  const HydroCredToken = await ethers.getContractFactory("HydroCredToken");
  const hydroCredToken = await HydroCredToken.deploy(mainAdminAddress);
  
  await hydroCredToken.waitForDeployment();
  const contractAddress = await hydroCredToken.getAddress();
  
  console.log("✅ HydroCredToken deployed to:", contractAddress);
  console.log("👑 Main Admin Address:", mainAdminAddress);
  console.log("🚀 Deployer Address:", deployer.address);
  
  // Save contract address to file
  const net = await ethers.provider.getNetwork();
  const contractInfo = {
    address: contractAddress,
    network: net.name,
    chainId: net.chainId.toString(),
    deployer: deployer.address,
    mainAdmin: mainAdminAddress,
    deployedAt: new Date().toISOString()
  };

  // Save to multiple locations for convenience
  const contractInfoPath = path.join(__dirname, "../contract-address.json");
  const frontendAbiPath = path.join(__dirname, "../../frontend/src/abi/HydroCredToken.json");
  const backendAbiPath = path.join(__dirname, "../../backend/src/abi/HydroCredToken.json");

  fs.writeFileSync(contractInfoPath, JSON.stringify(contractInfo, null, 2));

  // Copy ABI to frontend and backend
  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/HydroCredToken.sol/HydroCredToken.json"),
      "utf8"
    )
  );

  // Ensure directories exist
  fs.mkdirSync(path.dirname(frontendAbiPath), { recursive: true });
  fs.mkdirSync(path.dirname(backendAbiPath), { recursive: true });

  fs.writeFileSync(frontendAbiPath, JSON.stringify(artifact.abi, null, 2));
  fs.writeFileSync(backendAbiPath, JSON.stringify(artifact.abi, null, 2));
  
  console.log("📄 Contract info saved to contract-address.json");
  console.log("📋 ABI copied to frontend and backend");
  
  // Update .env file with contract address
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    
    // Update or add CONTRACT_ADDRESS
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${contractAddress}`);
    } else {
      envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("📝 Updated .env with contract address");
  }
  
  // Verify contract deployment
  try {
    const name = await hydroCredToken.name();
    const symbol = await hydroCredToken.symbol();
    const mainAdmin = await hydroCredToken.hasRole(await hydroCredToken.DEFAULT_ADMIN_ROLE(), mainAdminAddress);
    
    console.log(`📋 Contract verified: ${name} (${symbol})`);
    console.log(`👑 Main Admin role verified: ${mainAdmin}`);
    
    // Display important information
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log(`📄 Contract Address: ${contractAddress}`);
    console.log(`👑 Main Admin: ${mainAdminAddress}`);
    console.log(`🌐 Network: ${net.name} (Chain ID: ${net.chainId})`);
    console.log(`🚀 Deployer: ${deployer.address}`);
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });