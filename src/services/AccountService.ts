import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account } from '../entities/Account';
import { Transaction } from '../entities/Transaction';

export interface CreateAccountDto {
  name: string;
  balance?: number;
  currency?: string;
}

export interface UpdateAccountDto {
  name?: string;
  currency?: string;
}

export class AccountService {
  private accountRepository: Repository<Account>;
  private transactionRepository: Repository<Transaction>;

  constructor() {
    this.accountRepository = AppDataSource.getRepository(Account);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  async createAccount(userId: number, accountData: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create({
      user_id: userId,
      name: accountData.name,
      balance: accountData.balance || 0,
      currency: accountData.currency || 'USD',
    });

    return this.accountRepository.save(account);
  }

  async getUserAccounts(userId: number): Promise<Account[]> {
    return this.accountRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async getAccountById(accountId: number, userId: number): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { id: accountId, user_id: userId },
    });
  }

  async updateAccount(accountId: number, userId: number, updateData: UpdateAccountDto): Promise<Account> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    Object.assign(account, updateData);
    return this.accountRepository.save(account);
  }

  async deleteAccount(accountId: number, userId: number): Promise<void> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    const transactionCount = await this.transactionRepository.count({
      where: { account_id: accountId },
    });

    if (transactionCount > 0) {
      throw new Error('Cannot delete account with existing transactions');
    }

    await this.accountRepository.remove(account);
  }

  async updateAccountBalance(accountId: number, amount: number): Promise<void>;
  async updateAccountBalance(accountId: number, userId: number, amount: number, type: 'income' | 'expense'): Promise<void>;
  async updateAccountBalance(accountId: number, userIdOrAmount: number, amount?: number, type?: 'income' | 'expense'): Promise<void> {
    if (amount === undefined) {
      // Simple version: updateAccountBalance(accountId, amount)
      await this.accountRepository.update(accountId, {
        balance: () => `balance + ${userIdOrAmount}`,
      });
    } else {
      // Full version: updateAccountBalance(accountId, userId, amount, type)
      const userId = userIdOrAmount;
      // Verify the account belongs to the user
      const account = await this.getAccountById(accountId, userId);
      if (!account) {
        throw new Error('Account not found or does not belong to user');
      }

      const adjustedAmount = type === 'expense' ? -amount : amount;
      await this.accountRepository.update(accountId, {
        balance: () => `balance + ${adjustedAmount}`,
      });
    }
  }

  async getAccountBalance(accountId: number, userId: number): Promise<number> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    return account.balance;
  }

  async getTotalBalance(userId: number): Promise<number> {
    const accounts = await this.getUserAccounts(userId);
    return accounts.reduce((total, account) => total + account.balance, 0);
  }

  async getAccountTransactionSummary(accountId: number, userId: number): Promise<{
    totalIncome: number;
    totalExpenses: number;
    transactionCount: number;
    lastTransaction?: Date;
  }> {
    const account = await this.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    const [incomeResult, expenseResult, transactionCount, lastTransaction] = await Promise.all([
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.account_id = :accountId', { accountId })
        .andWhere('transaction.type = :type', { type: 'income' })
        .getRawOne(),
      
      this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.account_id = :accountId', { accountId })
        .andWhere('transaction.type = :type', { type: 'expense' })
        .getRawOne(),

      this.transactionRepository.count({
        where: { account_id: accountId },
      }),

      this.transactionRepository.findOne({
        where: { account_id: accountId },
        order: { transaction_date: 'DESC' },
      }),
    ]);

    return {
      totalIncome: parseFloat(incomeResult?.total || '0'),
      totalExpenses: parseFloat(expenseResult?.total || '0'),
      transactionCount,
      lastTransaction: lastTransaction?.transaction_date,
    };
  }
}