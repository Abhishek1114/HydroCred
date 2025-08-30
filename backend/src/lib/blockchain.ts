import { ethers } from 'ethers';
import Web3 from 'web3';
import { config } from '../config/env';
import contractABI from '../abi/HydroCredToken.json';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private signer: ethers.Wallet;
  private web3: Web3;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.contract = new ethers.Contract(config.contractAddress, contractABI, this.signer);
    this.web3 = new Web3(config.rpcUrl);
  }

  // Contract interaction methods
  async getUserRole(address: string): Promise<string> {
    try {
      return await this.contract.getUserRole(address);
    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;
    }
  }

  async appointCountryAdmin(adminAddress: string): Promise<{ txHash: string; countryId: number }> {
    try {
      const tx = await this.contract.appointCountryAdmin(adminAddress);
      const receipt = await tx.wait();
      
      // Parse events to get countryId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'CountryAdminAppointed';
        } catch {
          return false;
        }
      });

      let countryId = 0;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        countryId = parsed?.args?.countryId || 0;
      }

      return { txHash: tx.hash, countryId };
    } catch (error) {
      console.error('Error appointing country admin:', error);
      throw error;
    }
  }

  async appointStateAdmin(adminAddress: string, countryId: number): Promise<{ txHash: string; stateId: number }> {
    try {
      const tx = await this.contract.appointStateAdmin(adminAddress, countryId);
      const receipt = await tx.wait();
      
      // Parse events to get stateId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'StateAdminAppointed';
        } catch {
          return false;
        }
      });

      let stateId = 0;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        stateId = parsed?.args?.stateId || 0;
      }

      return { txHash: tx.hash, stateId };
    } catch (error) {
      console.error('Error appointing state admin:', error);
      throw error;
    }
  }

  async appointCityAdmin(adminAddress: string, stateId: number): Promise<{ txHash: string; cityId: number }> {
    try {
      const tx = await this.contract.appointCityAdmin(adminAddress, stateId);
      const receipt = await tx.wait();
      
      // Parse events to get cityId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'CityAdminAppointed';
        } catch {
          return false;
        }
      });

      let cityId = 0;
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        cityId = parsed?.args?.cityId || 0;
      }

      return { txHash: tx.hash, cityId };
    } catch (error) {
      console.error('Error appointing city admin:', error);
      throw error;
    }
  }

  async registerProducer(producerAddress: string, cityId: number): Promise<string> {
    try {
      const tx = await this.contract.registerProducer(producerAddress, cityId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error registering producer:', error);
      throw error;
    }
  }

  async certifyRequest(requestHash: string, cityId: number): Promise<string> {
    try {
      const tx = await this.contract.certifyRequest(requestHash, cityId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error certifying request:', error);
      throw error;
    }
  }

  async batchIssueCredits(
    producerAddress: string, 
    amount: number, 
    requestHash: string
  ): Promise<{ txHash: string; tokenIds: number[] }> {
    try {
      const tx = await this.contract.batchIssue(producerAddress, amount, requestHash);
      const receipt = await tx.wait();
      
      // Parse events to get token IDs
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'CreditsIssued';
        } catch {
          return false;
        }
      });

      let tokenIds: number[] = [];
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        const fromId = parsed?.args?.fromId || 0;
        const toId = parsed?.args?.toId || 0;
        tokenIds = Array.from({ length: toId - fromId + 1 }, (_, i) => fromId + i);
      }

      return { txHash: tx.hash, tokenIds };
    } catch (error) {
      console.error('Error issuing credits:', error);
      throw error;
    }
  }

  async retireCredit(tokenId: number): Promise<string> {
    try {
      const tx = await this.contract.retire(tokenId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error retiring credit:', error);
      throw error;
    }
  }

  async transferCredit(fromAddress: string, toAddress: string, tokenId: number): Promise<string> {
    try {
      const tx = await this.contract.transferFrom(fromAddress, toAddress, tokenId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error transferring credit:', error);
      throw error;
    }
  }

  async getTokensOfOwner(ownerAddress: string): Promise<number[]> {
    try {
      return await this.contract.tokensOfOwner(ownerAddress);
    } catch (error) {
      console.error('Error getting tokens of owner:', error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<number> {
    try {
      return await this.contract.totalSupply();
    } catch (error) {
      console.error('Error getting total supply:', error);
      throw error;
    }
  }

  async getActiveSupply(): Promise<number> {
    try {
      return await this.contract.activeSupply();
    } catch (error) {
      console.error('Error getting active supply:', error);
      throw error;
    }
  }

  async isTokenRetired(tokenId: number): Promise<boolean> {
    try {
      return await this.contract.isRetired(tokenId);
    } catch (error) {
      console.error('Error checking if token is retired:', error);
      throw error;
    }
  }

  // Utility methods
  generateRequestHash(data: any): string {
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(data)));
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  async getTransaction(txHash: string) {
    return await this.provider.getTransaction(txHash);
  }

  async getTransactionReceipt(txHash: string) {
    return await this.provider.getTransactionReceipt(txHash);
  }
}

export const blockchainService = new BlockchainService();