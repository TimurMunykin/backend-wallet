import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Transaction } from '../entities/Transaction';
import { AccountService } from './AccountService';
import { DailySpendingService } from './DailySpendingService';

export interface CreateTransactionDto {
  accountId: number;
  amount: number;
  type: string;
  description: string;
  transactionDate?: Date;
}

export interface UpdateTransactionDto {
  accountId?: number;
  amount?: number;
  type?: string;
  description?: string;
  transactionDate?: Date;
}

export interface TransactionFilters {
  accountId?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TransactionService {
  private transactionRepository: Repository<Transaction>;
  private accountService: AccountService;
  private dailySpendingService: DailySpendingService;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.accountService = new AccountService();
    this.dailySpendingService = new DailySpendingService();
  }

  async createTransaction(userId: number, transactionData: CreateTransactionDto): Promise<Transaction> {
    const account = await this.accountService.getAccountById(transactionData.accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    const transactionDate = transactionData.transactionDate || new Date();
    const transaction = this.transactionRepository.create({
      account_id: transactionData.accountId,
      amount: Math.abs(transactionData.amount),
      type: transactionData.type,
      description: transactionData.description,
      transaction_date: transactionDate,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Only update account balance if transaction is for today or in the past
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
    
    if (transactionDateOnly <= todayMidnight) {
      const balanceChange = transactionData.type === 'income' 
        ? Math.abs(transactionData.amount)
        : -Math.abs(transactionData.amount);

      await this.accountService.updateAccountBalance(transactionData.accountId, balanceChange);
    }

    await this.dailySpendingService.clearUserCaches(userId);

    return savedTransaction;
  }

  async getTransactionById(transactionId: number, userId: number): Promise<Transaction | null> {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .where('transaction.id = :transactionId', { transactionId })
      .andWhere('account.user_id = :userId', { userId })
      .getOne();
  }

  async updateTransaction(transactionId: number, userId: number, updateData: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.getTransactionById(transactionId, userId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const oldTransactionDate = new Date(transaction.transaction_date);
    const oldAmount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
    
    // Check if old transaction affected balance (was in past or today)
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const oldDateOnly = new Date(oldTransactionDate.getFullYear(), oldTransactionDate.getMonth(), oldTransactionDate.getDate());
    const oldWasInPast = oldDateOnly <= todayMidnight;
    
    Object.assign(transaction, updateData);
    
    if (updateData.amount !== undefined) {
      transaction.amount = Math.abs(updateData.amount);
    }

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Check if new transaction affects balance (is in past or today)
    const newTransactionDate = new Date(savedTransaction.transaction_date);
    const newDateOnly = new Date(newTransactionDate.getFullYear(), newTransactionDate.getMonth(), newTransactionDate.getDate());
    const newIsInPast = newDateOnly <= todayMidnight;
    
    const newAmount = savedTransaction.type === 'income' ? savedTransaction.amount : -savedTransaction.amount;

    // Calculate balance changes based on date transitions
    let balanceChange = 0;
    
    if (oldWasInPast && newIsInPast) {
      // Both old and new are in past - normal update
      balanceChange = newAmount - oldAmount;
    } else if (oldWasInPast && !newIsInPast) {
      // Old was in past, new is in future - reverse old transaction
      balanceChange = -oldAmount;
    } else if (!oldWasInPast && newIsInPast) {
      // Old was in future, new is in past - apply new transaction
      balanceChange = newAmount;
    }
    // If both old and new are in future, no balance change needed

    if (balanceChange !== 0) {
      await this.accountService.updateAccountBalance(savedTransaction.account_id, balanceChange);
    }

    await this.dailySpendingService.clearUserCaches(userId);

    return savedTransaction;
  }

  async deleteTransaction(transactionId: number, userId: number): Promise<void> {
    const transaction = await this.getTransactionById(transactionId, userId);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Only reverse balance change if transaction was in past or today
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const transactionDate = new Date(transaction.transaction_date);
    const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
    
    if (transactionDateOnly <= todayMidnight) {
      const balanceChange = transaction.type === 'income' 
        ? -transaction.amount
        : transaction.amount;

      await this.accountService.updateAccountBalance(transaction.account_id, balanceChange);
    }

    await this.transactionRepository.remove(transaction);
    await this.dailySpendingService.clearUserCaches(userId);
  }

  async getTransactions(
    userId: number,
    filters: TransactionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedTransactions> {
    const { page = 1, limit = 20, sortBy = 'transaction_date', sortOrder = 'DESC' } = pagination;
    const skip = (page - 1) * limit;

    let query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .where('account.user_id = :userId', { userId });

    if (filters.accountId) {
      query = query.andWhere('transaction.account_id = :accountId', { accountId: filters.accountId });
    }

    if (filters.type) {
      query = query.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters.startDate) {
      query = query.andWhere('transaction.transaction_date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query = query.andWhere('transaction.transaction_date <= :endDate', { endDate: filters.endDate });
    }

    if (filters.minAmount) {
      query = query.andWhere('transaction.amount >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount) {
      query = query.andWhere('transaction.amount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.description) {
      query = query.andWhere('transaction.description ILIKE :description', { 
        description: `%${filters.description}%` 
      });
    }

    const total = await query.getCount();

    const transactions = await query
      .orderBy(`transaction.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionsByAccount(
    accountId: number,
    userId: number,
    pagination: PaginationOptions = {}
  ): Promise<PaginatedTransactions> {
    const account = await this.accountService.getAccountById(accountId, userId);
    
    if (!account) {
      throw new Error('Account not found');
    }

    return this.getTransactions(userId, { accountId }, pagination);
  }

  async getTransactionSummary(userId: number, filters: TransactionFilters = {}): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
  }> {
    let query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.account', 'account')
      .where('account.user_id = :userId', { userId });

    if (filters.accountId) {
      query = query.andWhere('transaction.account_id = :accountId', { accountId: filters.accountId });
    }

    if (filters.startDate) {
      query = query.andWhere('transaction.transaction_date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query = query.andWhere('transaction.transaction_date <= :endDate', { endDate: filters.endDate });
    }

    const [incomeResult, expenseResult, transactionCount] = await Promise.all([
      query
        .clone()
        .andWhere('transaction.type = :type', { type: 'income' })
        .select('SUM(transaction.amount)', 'total')
        .getRawOne(),
      
      query
        .clone()
        .andWhere('transaction.type = :type', { type: 'expense' })
        .select('SUM(transaction.amount)', 'total')
        .getRawOne(),

      query.getCount(),
    ]);

    const totalIncome = parseFloat(incomeResult?.total || '0');
    const totalExpenses = parseFloat(expenseResult?.total || '0');

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount,
    };
  }

  async bulkCreateTransactions(userId: number, transactions: CreateTransactionDto[]): Promise<Transaction[]> {
    const createdTransactions: Transaction[] = [];

    for (const transactionData of transactions) {
      const transaction = await this.createTransaction(userId, transactionData);
      createdTransactions.push(transaction);
    }

    return createdTransactions;
  }
}