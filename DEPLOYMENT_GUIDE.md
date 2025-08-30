# HydroCred Deployment Guide

## 🚀 Complete Deployment Instructions

This guide covers deploying the entire HydroCred system from local development to production.

## 📋 Prerequisites

- **Node.js 18+** and npm/yarn
- **Git** for version control
- **MetaMask** wallet with testnet ETH
- **Hardhat** for smart contract deployment
- **MongoDB** (optional, for production)

## 🏗️ Local Development Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd HydroCred
```

### 2. Install Dependencies
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install

# Blockchain dependencies
cd ../blockchain && npm install
```

### 3. Environment Configuration

**Backend (.env)**
```env
PORT=5055
NODE_ENV=development
RPC_URL=https://ethereum-sepolia.publicnode.com
CONTRACT_ADDRESS=0xaA7b945a4Cd4381DcF5D4Bc6e0E5cc76e6A3Fc39
AES_KEY=hydrocred_encryption_key_32_chars_min_2024
MONGODB_URI=mongodb://localhost:27017/hydrocred
```

**Frontend (.env)**
```env
VITE_BACKEND_URL=http://localhost:5055
VITE_CONTRACT_ADDRESS=0xaA7b945a4Cd4381DcF5D4Bc6e0E5cc76e6A3Fc39
VITE_RPC_URL=https://ethereum-sepolia.publicnode.com
```

**Blockchain (.env)**
```env
RPC_URL=https://ethereum-sepolia.publicnode.com
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 4. Start Development Servers

**Terminal 1: Backend**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5055
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# App starts on http://localhost:5173
```

**Terminal 3: Blockchain (Optional)**
```bash
cd blockchain
npx hardhat node
# Local blockchain on http://localhost:8545
```

## 🔗 Testnet Deployment

### 1. Deploy Smart Contracts

```bash
cd blockchain

# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Verify contract on Etherscan
npx hardhat verify --network sepolia <deployed-contract-address>
```

### 2. Update Environment Variables

After deployment, update the contract address in both backend and frontend `.env` files:

```env
CONTRACT_ADDRESS=0x... # Your deployed contract address
```

### 3. Initialize System

```bash
# Initialize default admin
curl http://localhost:5055/api/init

# Check system health
curl http://localhost:5055/api/health
```

## 🌐 Production Deployment

### 1. Smart Contract Deployment

```bash
cd blockchain

# Deploy to mainnet
npx hardhat run scripts/deploy.ts --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet <contract-address>
```

### 2. Backend Deployment

**Option A: Traditional Server**
```bash
cd backend

# Build for production
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start dist/server.js --name hydrocred-backend
```

**Option B: Docker**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5055
CMD ["node", "dist/server.js"]
```

```bash
# Build and run
docker build -t hydrocred-backend .
docker run -p 5055:5055 hydrocred-backend
```

**Option C: Cloud Platforms**

**Heroku**
```bash
# Create app
heroku create hydrocred-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
heroku config:set CONTRACT_ADDRESS=0x...

# Deploy
git push heroku main
```

**Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 3. Frontend Deployment

**Option A: Static Hosting**
```bash
cd frontend

# Build for production
npm run build

# Deploy to Netlify/Vercel/GitHub Pages
# Upload dist/ folder contents
```

**Option B: Docker**
```dockerfile
# Dockerfile
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**Option C: Cloud Platforms**

**Netlify**
```bash
# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

**Vercel**
```bash
# Deploy
vercel --prod
```

## 🔐 Security Configuration

### 1. Environment Security
```bash
# Generate secure keys
openssl rand -hex 32  # AES key
openssl rand -hex 64  # JWT secret

# Set secure environment variables
export NODE_ENV=production
export AES_KEY=generated_aes_key
export JWT_SECRET=generated_jwt_secret
```

### 2. CORS Configuration
```typescript
// backend/src/server.ts
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ],
  credentials: true
}));
```

### 3. Rate Limiting
```bash
# Install rate limiting
npm install express-rate-limit

# Configure in server.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## 📊 Database Setup

### 1. MongoDB (Production)
```bash
# Install MongoDB
sudo apt-get install mongodb

# Create database
mongo
use hydrocred
db.createUser({
  user: "hydrocred_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

### 2. Update Backend Configuration
```typescript
// backend/src/config/env.ts
export const config = {
  // ... other config
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hydrocred',
  mongodbOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    auth: {
      username: process.env.MONGODB_USER,
      password: process.env.MONGODB_PASS
    }
  }
};
```

## 🔍 Monitoring & Logging

### 1. Application Monitoring
```bash
# Install monitoring tools
npm install winston morgan

# Configure logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 2. Health Checks
```typescript
// Add health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

## 🧪 Testing Deployment

### 1. Contract Testing
```bash
cd blockchain

# Run all tests
npx hardhat test

# Test specific network
npx hardhat test --network sepolia
```

### 2. API Testing
```bash
# Test backend endpoints
curl http://localhost:5055/api/health
curl http://localhost:5055/api/init

# Test user registration
curl -X POST http://localhost:5055/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x...","role":"PRODUCER","name":"Test User","organization":"Test Org","location":{"country":"US","state":"CA","city":"SF"}}'
```

### 3. Frontend Testing
```bash
cd frontend

# Run tests
npm test

# Build test
npm run build
npm run preview
```

## 🚨 Troubleshooting

### Common Deployment Issues

**Contract Deployment Fails**
```bash
# Check network configuration
npx hardhat console --network sepolia

# Verify RPC endpoint
curl -X POST https://ethereum-sepolia.publicnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Backend Won't Start**
```bash
# Check port availability
netstat -tulpn | grep :5055

# Check environment variables
echo $NODE_ENV
echo $PORT
echo $RPC_URL
```

**Frontend Build Fails**
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit
```

## 📈 Scaling Considerations

### 1. Load Balancing
```nginx
# nginx.conf
upstream hydrocred_backend {
    server 127.0.0.1:5055;
    server 127.0.0.1:5056;
    server 127.0.0.1:5057;
}

server {
    listen 80;
    location / {
        proxy_pass http://hydrocred_backend;
    }
}
```

### 2. Database Scaling
```bash
# MongoDB replica set
mongo --eval "rs.initiate({
  _id: 'hydrocred',
  members: [
    {_id: 0, host: 'localhost:27017'},
    {_id: 1, host: 'localhost:27018'},
    {_id: 2, host: 'localhost:27019'}
  ]
})"
```

### 3. Caching
```bash
# Install Redis
sudo apt-get install redis-server

# Configure in backend
npm install redis
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy HydroCred

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci
          cd ../frontend && npm ci
          
      - name: Build
        run: |
          cd backend && npm run build
          cd ../frontend && npm run build
          
      - name: Deploy
        run: |
          # Add your deployment commands here
```

## 📞 Support & Maintenance

### 1. Regular Maintenance
```bash
# Update dependencies
npm update

# Security audit
npm audit
npm audit fix

# Database backup
mongodump --db hydrocred --out ./backup
```

### 2. Monitoring Alerts
```bash
# Set up monitoring
npm install node-cron

# Schedule health checks
cron.schedule('*/5 * * * *', async () => {
  try {
    await checkSystemHealth();
  } catch (error) {
    sendAlert('System health check failed');
  }
});
```

---

**Need help?** Check the [README.md](README.md) or create an issue in the repository.