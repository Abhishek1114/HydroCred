import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  port: process.env.PORT || 5055,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Blockchain configuration
  rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  mainAdminAddress: process.env.MAIN_ADMIN_ADDRESS || '',
  privateKey: process.env.PRIVATE_KEY || '',
  
  // Database configuration
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hydrocred',
  
  // Security configuration
  jwtSecret: process.env.JWT_SECRET || 'hydrocred_jwt_secret_change_in_production',
  aesKey: process.env.AES_KEY || 'hydrocred_encryption_key_32_chars_min',
  
  // File upload configuration
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  
  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
};

export function validateConfig() {
  const required = [
    'MAIN_ADMIN_ADDRESS',
    'PRIVATE_KEY',
    'JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`);
    console.warn('The application may not work properly without these variables.');
    return false;
  }

  // Validate wallet address format
  if (config.mainAdminAddress && !config.mainAdminAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    console.warn('⚠️  MAIN_ADMIN_ADDRESS is not a valid Ethereum address');
    return false;
  }

  // Validate private key format
  if (config.privateKey && !config.privateKey.match(/^0x[a-fA-F0-9]{64}$/)) {
    console.warn('⚠️  PRIVATE_KEY is not a valid Ethereum private key');
    return false;
  }
  
  return true;
}