# 🚀 HydroCred Deployment Guide

## 📋 Pre-deployment Checklist

- [ ] Node.js 18+ installed
- [ ] MetaMask extension installed
- [ ] Git repository cloned
- [ ] Environment variables configured
- [ ] Test ETH available for deployment

## 🔧 Local Development Setup

### 1. Quick Setup (Recommended)

```bash
# Clone and setup everything
git clone <repository-url>
cd hydrocred

# Initialize demo environment
node scripts/init-demo.js

# Install all dependencies and compile contracts
npm run setup

# Start all services
npm run start
```

### 2. Manual Setup

```bash
# Install dependencies
npm run install:all

# Compile smart contracts
cd blockchain
npx hardhat compile
node scripts/copy-abi.js
cd ..

# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2) 
cd frontend
npm run dev
```

### 3. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5055
- **Health Check**: http://localhost:5055/api/health

## 🌐 Testnet Deployment

### 1. Get Test ETH

Visit [Sepolia Faucet](https://sepoliafaucet.com/) and get test ETH for:
- Admin wallet: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

### 2. Deploy Smart Contract

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network sepolia
```

### 3. Update Environment Variables

Update `.env` and `frontend/.env` with the new contract address from deployment.

## 🏭 Production Deployment

### Backend Deployment (Node.js)

**Using PM2:**
```bash
# Install PM2
npm install -g pm2

# Build and start backend
cd backend
npm run build
pm2 start dist/server.js --name hydrocred-backend

# Monitor
pm2 logs hydrocred-backend
pm2 monit
```

**Using Docker:**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5055
CMD ["node", "dist/server.js"]
```

### Frontend Deployment (Static)

**Build for Production:**
```bash
cd frontend
npm run build
```

**Deploy to Netlify/Vercel:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Deploy to AWS S3:**
```bash
# Install AWS CLI and configure
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Smart Contract Deployment

**Mainnet Deployment:**
```bash
# Update hardhat.config.ts with mainnet configuration
cd blockchain
npx hardhat run scripts/deploy.ts --network mainnet
```

## ⚙️ Environment Configuration

### Production Environment Variables

**Backend (.env):**
```env
PORT=5055
NODE_ENV=production
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
PRIVATE_KEY=0xYOUR_ADMIN_PRIVATE_KEY
AES_KEY=your_secure_32_character_encryption_key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hydrocred
```

**Frontend (.env.production):**
```env
VITE_BACKEND_URL=https://api.hydrocred.com
VITE_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
VITE_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
VITE_CHAIN_ID=1
```

## 🔒 Security Considerations

### Production Security

1. **Private Key Management**
   - Use hardware wallets or secure key management systems
   - Never commit private keys to version control
   - Use environment variables or secure vaults

2. **API Security**
   - Enable rate limiting
   - Use HTTPS in production
   - Implement API key authentication
   - Add request validation and sanitization

3. **Smart Contract Security**
   - Audit contracts before mainnet deployment
   - Use multi-signature wallets for admin functions
   - Implement emergency pause functionality
   - Monitor for unusual activity

### Infrastructure Security

```bash
# Enable firewall
ufw enable
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS

# Setup SSL certificates
certbot --nginx -d api.hydrocred.com
```

## 📊 Monitoring & Maintenance

### Health Monitoring

**Backend Health Check:**
```bash
curl https://api.hydrocred.com/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "HydroCred Backend API"
}
```

### Log Management

**PM2 Logs:**
```bash
pm2 logs hydrocred-backend --lines 100
pm2 flush  # Clear logs
```

**Application Logs:**
```bash
# Backend logs
tail -f backend/logs/app.log

# Error logs  
tail -f backend/logs/error.log
```

### Database Backup

**File-based Backup:**
```bash
# Backup user data
tar -czf backup-$(date +%Y%m%d).tar.gz backend/data/
```

**MongoDB Backup (if using MongoDB):**
```bash
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/hydrocred"
```

## 🔄 Updates & Maintenance

### Application Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm run install:all

# Rebuild and restart
npm run build
pm2 restart hydrocred-backend
```

### Smart Contract Updates

```bash
# Deploy new contract version
cd blockchain
npx hardhat run scripts/deploy.ts --network mainnet

# Update environment variables with new address
# Notify users of contract migration
```

## 🆘 Troubleshooting

### Common Issues

**1. "Cannot connect to blockchain"**
- Check RPC URL and network configuration
- Verify contract address is correct
- Ensure sufficient ETH for gas fees

**2. "User registration failed"**
- Check backend logs for detailed error
- Verify wallet connection
- Ensure all required fields are provided

**3. "Transaction failed"**
- Check gas price and limit
- Verify wallet has sufficient ETH
- Confirm contract permissions

### Debug Commands

```bash
# Check contract deployment
npx hardhat verify --network sepolia CONTRACT_ADDRESS

# Test RPC connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://ethereum-sepolia.publicnode.com

# Test backend endpoints
curl -X GET http://localhost:5055/api/health
curl -X GET http://localhost:5055/api/ledger
```

## 📈 Scaling Considerations

### Performance Optimization

1. **Frontend Optimization**
   - Code splitting and lazy loading
   - Image optimization and CDN
   - Caching strategies

2. **Backend Optimization**
   - Database indexing
   - API response caching
   - Connection pooling

3. **Blockchain Optimization**
   - Batch operations
   - Gas optimization
   - Event filtering

### Horizontal Scaling

```bash
# Load balancer configuration (nginx)
upstream hydrocred_backend {
    server 127.0.0.1:5055;
    server 127.0.0.1:5056;
    server 127.0.0.1:5057;
}

server {
    listen 80;
    server_name api.hydrocred.com;
    
    location / {
        proxy_pass http://hydrocred_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📞 Support

For deployment issues or questions:
- **Documentation**: [README.md](README.md)
- **Issues**: GitHub Issues
- **Email**: support@hydrocred.com

---

**🌱 Happy deploying! Building a sustainable future with blockchain technology.**