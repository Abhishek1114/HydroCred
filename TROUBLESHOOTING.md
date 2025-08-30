# HydroCred Troubleshooting Guide

## 🚨 Common Issues & Solutions

This guide addresses the most common problems you'll encounter while setting up and running HydroCred.

## 🔗 CORS & RPC Connection Issues

### Problem: CORS Policy Blocked
```
Access to fetch at 'https://eth-sepolia.g.alchemy.com/v2/demo' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Solution:**
1. **Use Backend API Instead**: The frontend should communicate with the backend, not directly with RPC endpoints
2. **Check Backend CORS Configuration**:
   ```typescript
   // backend/src/server.ts
   app.use(cors({
     origin: [
       'http://localhost:5173', 
       'http://127.0.0.1:5173',
       'http://localhost:3000',
       'http://127.0.0.1:3000'
     ],
     credentials: true
   }));
   ```
3. **Ensure Backend is Running**: Backend must be running on port 5055
4. **Use Environment Variables**: Set `VITE_BACKEND_URL=http://localhost:5055` in frontend

### Problem: RPC Rate Limiting
```
POST https://eth-sepolia.g.alchemy.com/v2/demo net::ERR_FAILED 429 (Too Many Requests)
```

**Solution:**
1. **Use Reliable RPC Endpoints**: Update your environment variables with reliable RPC URLs
   ```env
   VITE_RPC_URL=https://ethereum-sepolia.publicnode.com
   ```
2. **Use Fallback RPCs**: The system includes fallback RPC endpoints
3. **Get Your Own RPC**: Sign up for free RPC services:
   - [Infura](https://infura.io/) - Free tier available
   - [Alchemy](https://alchemy.com/) - Free tier available
   - [QuickNode](https://quicknode.com/) - Free tier available

## 🏗️ System Setup Issues

### Problem: Backend Won't Start
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
cd backend
npm install
npm run dev
```

### Problem: Frontend Build Fails
```
TypeScript compilation errors
```

**Solution:**
```bash
cd frontend
npm install
npm run build
```

### Problem: Smart Contract Compilation Fails
```
Hardhat compilation errors
```

**Solution:**
```bash
cd blockchain
npm install
npx hardhat compile
```

## 🔐 Wallet Connection Issues

### Problem: MetaMask Not Found
```
MetaMask not found. Please install MetaMask.
```

**Solution:**
1. Install [MetaMask](https://metamask.io/) browser extension
2. Create or import wallet
3. Switch to Sepolia testnet
4. Get testnet ETH from [faucets](https://sepoliafaucet.com/)

### Problem: Wrong Network
```
Transaction failed: wrong network
```

**Solution:**
1. In MetaMask, click network dropdown
2. Select "Sepolia Testnet"
3. If not listed, add custom network:
   - Network Name: Sepolia
   - RPC URL: https://sepolia.infura.io/v3/YOUR_KEY
   - Chain ID: 11155111
   - Currency Symbol: ETH

### Problem: Insufficient Funds
```
Transaction failed: insufficient funds
```

**Solution:**
1. Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Wait for confirmation (usually 1-2 minutes)
3. Check balance in MetaMask

## 📱 Frontend Issues

### Problem: Page Not Loading
```
Cannot connect to backend
```

**Solution:**
1. Ensure backend is running: `cd backend && npm run dev`
2. Check backend URL in frontend environment
3. Verify CORS configuration
4. Check browser console for errors

### Problem: Components Not Rendering
```
React component errors
```

**Solution:**
1. Check browser console for JavaScript errors
2. Verify all dependencies are installed
3. Clear browser cache and refresh
4. Check if wallet is connected

### Problem: API Calls Failing
```
Failed to fetch API endpoint
```

**Solution:**
1. Check backend health: `curl http://localhost:5055/api/health`
2. Verify API endpoints in `backend/src/routes/api.ts`
3. Check request/response in browser Network tab
4. Ensure proper request headers

## ⛓️ Blockchain Issues

### Problem: Contract Not Found
```
Contract address not configured
```

**Solution:**
1. Deploy contract first: `cd blockchain && npx hardhat run scripts/deploy.ts --network sepolia`
2. Update contract address in environment variables
3. Verify contract on [Sepolia Etherscan](https://sepolia.etherscan.io/)

### Problem: Transaction Fails
```
Transaction reverted
```

**Solution:**
1. Check gas limit and gas price
2. Verify wallet has sufficient ETH
3. Check contract state and permissions
4. Review transaction in Etherscan

### Problem: Role Permission Denied
```
AccessControl: account 0x... is missing role 0x...
```

**Solution:**
1. Check if wallet has required role
2. Verify role assignment in contract
3. Use admin wallet for privileged operations
4. Check role hierarchy in smart contract

## 🗄️ Database Issues

### Problem: MongoDB Connection Failed
```
MongoDB connection error
```

**Solution:**
1. Install MongoDB: `sudo apt-get install mongodb`
2. Start MongoDB service: `sudo systemctl start mongodb`
3. Check connection string in environment
4. Verify database permissions

### Problem: Data Not Persisting
```
Data lost after restart
```

**Solution:**
1. Check if using in-memory storage (development mode)
2. Configure MongoDB for production
3. Verify data persistence configuration
4. Check database connection status

## 🔍 Debugging Commands

### Backend Debug
```bash
# Check backend health
curl http://localhost:5055/api/health

# Test API endpoints
curl http://localhost:5055/api/users/0x123...

# Check backend logs
cd backend && npm run dev
```

### Frontend Debug
```bash
# Check build
cd frontend && npm run build

# Run tests
npm test

# Check dependencies
npm ls
```

### Blockchain Debug
```bash
# Test RPC connection
curl -X POST https://ethereum-sepolia.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check contract
cd blockchain && npx hardhat console --network sepolia

# Verify contract
npx hardhat verify --network sepolia <contract-address>
```

## 🛠️ Environment Issues

### Problem: Environment Variables Not Loading
```
process.env is undefined
```

**Solution:**
1. Create `.env` files in correct directories
2. Restart development servers after changes
3. Check file naming (no spaces in `.env`)
4. Verify environment variable names

### Problem: Port Already in Use
```
EADDRINUSE: address already in use :::5055
```

**Solution:**
```bash
# Find process using port
lsof -i :5055

# Kill process
kill -9 <PID>

# Or use different port
PORT=5056 npm run dev
```

## 📊 Performance Issues

### Problem: Slow Loading
```
Page takes too long to load
```

**Solution:**
1. Check RPC endpoint response time
2. Use local blockchain for development
3. Implement caching strategies
4. Optimize database queries

### Problem: High Gas Costs
```
Transaction gas too expensive
```

**Solution:**
1. Use testnet for development
2. Optimize smart contract functions
3. Batch operations when possible
4. Use gas estimation tools

## 🚀 Production Issues

### Problem: Build Fails in Production
```
Production build errors
```

**Solution:**
1. Check Node.js version compatibility
2. Verify all dependencies are in `package.json`
3. Clear build cache
4. Check environment variables for production

### Problem: SSL/HTTPS Issues
```
Mixed content warnings
```

**Solution:**
1. Use HTTPS in production
2. Update CORS origins to HTTPS
3. Configure SSL certificates
4. Use secure WebSocket connections

## 📞 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Review error messages carefully
3. Check browser console and network tab
4. Verify environment configuration
5. Test with minimal setup

### When Asking for Help
1. Include error messages
2. Describe your setup (OS, Node version, etc.)
3. Share relevant code snippets
4. Explain what you've already tried
5. Provide steps to reproduce the issue

### Useful Resources
- [HydroCred README](README.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [GitHub Issues](link-to-issues)
- [Community Discord](link-to-discord)

---

**Remember**: Most issues can be resolved by checking the basics first - environment variables, dependencies, and service status.
