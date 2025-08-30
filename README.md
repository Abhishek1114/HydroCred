# HydroCred - Blockchain-based Green Hydrogen Credit System

<div align="center">
  <img src="logo/hydrocred.png" alt="HydroCred Logo" width="200"/>
  <h3>Track, certify, and trade green hydrogen credits transparently using blockchain</h3>
</div>

## 🌟 Project Overview

HydroCred is a comprehensive blockchain-based system for tracking, certifying, and trading green hydrogen credits (H2 tokens). Each credit represents 1 kg of certified green hydrogen production, ensuring transparency and trust in the renewable energy sector.

### 🎯 Key Features

- **Role-Based Access Control**: Hierarchical admin system (Country → State → City → Producers/Buyers)
- **Gasless H2 Tokens**: ERC-721 tokens with admin-controlled generation
- **Production Certification**: Secure workflow for hydrogen production verification
- **Marketplace**: Transparent trading of certified credits
- **Fraud Prevention**: On-chain verification and double-certification prevention
- **Audit Trail**: Complete transaction history and compliance reporting

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Hardhat)     │
│                 │    │                 │    │                 │
│ • User Dashboards│   │ • User Mgmt     │    │ • Smart Contracts│
│ • Marketplace   │   │ • Production    │    │ • Token System  │
│ • Analytics     │   │ • Marketplace   │    │ • Role Control  │
└─────────────────┘    │ • Audit API     │    └─────────────────┘
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask wallet
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd HydroCred
npm install
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will start on `http://localhost:5055`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

### 4. Blockchain Setup

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat test
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**Backend (.env)**
```env
PORT=5055
NODE_ENV=development
RPC_URL=https://ethereum-sepolia.publicnode.com
CONTRACT_ADDRESS=0xaA7b945a4Cd4381DcF5D4Bc6e0E5cc76e6A3Fc39
AES_KEY=hydrocred_encryption_key_32_chars_min_2024
```

**Frontend (.env)**
```env
VITE_BACKEND_URL=http://localhost:5055
VITE_CONTRACT_ADDRESS=0xaA7b945a4Cd4381DcF5D4Bc6e0E5cc76e6A3Fc39
VITE_RPC_URL=https://ethereum-sepolia.publicnode.com
```

## 👥 User Roles & Hierarchy

### Role Structure
```
Country Admin
├── State Admin
│   ├── City Admin (Certifier)
│   │   ├── Producer
│   │   ├── Buyer
│   │   └── Auditor
│   └── Producer/Buyer/Auditor
└── Producer/Buyer/Auditor
```

### Role Permissions

| Role | Can Verify | Can Mint | Can Trade | Can Audit |
|------|------------|----------|-----------|-----------|
| **Country Admin** | All roles | ✅ | ❌ | ✅ |
| **State Admin** | City Admin, Producer, Buyer, Auditor | ✅ | ❌ | ✅ |
| **City Admin** | Producer, Buyer, Auditor | ✅ | ❌ | ✅ |
| **Producer** | ❌ | ❌ | ✅ (Sell) | ❌ |
| **Buyer** | ❌ | ❌ | ✅ (Buy) | ❌ |
| **Auditor** | ❌ | ❌ | ❌ | ✅ |

## 🔄 Workflow

### 1. Producer Onboarding
1. Producer connects wallet
2. Selects role and location
3. Submits organization details
4. Verified by upper-level admin

### 2. Production Certification
1. Producer submits hydrogen production data
2. Uploads supporting documents
3. City Admin reviews and certifies
4. System mints H2 tokens to producer

### 3. Credit Trading
1. Producer lists credits on marketplace
2. Buyer browses available credits
3. Purchase transaction executed
4. Credits transferred to buyer's wallet

### 4. Credit Retirement
1. Buyer retires credits for compliance
2. Tokens become non-transferable
3. Retirement verified by admin
4. Audit trail maintained

## 🛡️ Security Features

### Smart Contract Security
- **Role-based access control** using OpenZeppelin AccessControl
- **Request certification** required before minting
- **Self-minting prevention** - admins cannot mint for themselves
- **Double certification prevention** via blockchain state
- **Pausable functionality** for emergency stops

### Backend Security
- **CORS protection** with whitelisted origins
- **Input validation** using Zod schemas
- **File upload restrictions** and size limits
- **Rate limiting** and request validation
- **Secure file storage** with encryption

## 📊 API Endpoints

### User Management
- `POST /api/users/register` - Register new user
- `GET /api/users/:walletAddress` - Get user details

### Production Requests
- `POST /api/production/request` - Submit production request
- `GET /api/production/requests` - Get production requests
- `POST /api/production/approve/:requestId` - Approve request

### Marketplace
- `GET /api/marketplace/listings` - Get credit listings
- `POST /api/marketplace/listing` - Create listing
- `POST /api/marketplace/purchase/:listingId` - Purchase credits

### Analytics & Audit
- `GET /api/analytics/overview` - System overview
- `GET /api/audit/export` - Export audit data

## 🧪 Testing

### Smart Contract Tests
```bash
cd blockchain
npx hardhat test
```

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Local Development
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: Blockchain
cd blockchain && npx hardhat node
```

### Production Deployment
```bash
# Build backend
cd backend && npm run build && npm start

# Build frontend
cd frontend && npm run build

# Deploy contracts
cd blockchain && npx hardhat deploy --network mainnet
```

## 🔍 Troubleshooting

### Common Issues

**CORS Errors**
- Ensure backend is running on correct port
- Check CORS configuration in `backend/src/server.ts`

**RPC Connection Issues**
- Verify RPC URL in environment variables
- Use fallback RPC endpoints in `frontend/src/lib/chain.ts`

**Contract Interaction Failures**
- Check contract address configuration
- Ensure MetaMask is connected to correct network
- Verify user has required role permissions

### Debug Commands
```bash
# Check backend health
curl http://localhost:5055/api/health

# Test blockchain connection
cd blockchain && npx hardhat console --network sepolia

# View contract events
npx hardhat verify --network sepolia <contract-address>
```

## 📈 Future Enhancements

- **IPFS Integration** for document storage
- **Mobile App** development
- **Advanced Analytics** dashboard
- **Multi-chain Support** (Polygon, BSC)
- **Carbon Footprint Tracking**
- **Regulatory Compliance** reporting
- **AI-powered** fraud detection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin** for secure smart contract libraries
- **Hardhat** for Ethereum development framework
- **React** and **Vite** for frontend development
- **Node.js** and **Express** for backend framework

## 📞 Support

- **Documentation**: [Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discord**: [Community Server](link-to-discord)
- **Email**: support@hydrocred.com

---

<div align="center">
  <p>Built with ❤️ for a sustainable future</p>
  <p><strong>HydroCred</strong> - Making Green Hydrogen Transparent</p>
</div>