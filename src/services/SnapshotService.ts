import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Snapshot } from '../entities/Snapshot';
import { Transaction } from '../entities/Transaction';
import { AccountService } from './AccountService';
import { GoalService } from './GoalService';

export interface CreateSnapshotDto {
  accountId: number;
  notes?: string;
}

export interface SnapshotData {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionsCount: number;
  recentTransactions: any[];
  goalsProgress: any[];
}

export interface SnapshotFilters {
  accountId?: number;
  startDate?: Date;
  endDate?: Date;
}

export class SnapshotService {
  private snapshotRepository: Repository<Snapshot>;
  private transactionRepository: Repository<Transaction>;
  private accountService: AccountService;
  private goalService: GoalService;

  constructor() {
    this.snapshotRepository = AppDataSource.getRepository(Snapshot);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.accountService = new AccountService();
    this.goalService = new GoalService();
  }

  async createSnapshot(userId: number, data: CreateSnapshotDto): Promise<Snapshot> {
    // Verify the account belongs to the user
    const account = await this.accountService.getAccountById(data.accountId, userId);
    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    // Gather snapshot data
    const snapshotData = await this.gatherSnapshotData(data.accountId, userId);

    const snapshot = this.snapshotRepository.create({
      account_id: data.accountId,
      balance: snapshotData.balance,
      total_income: snapshotData.totalIncome,
      total_expense: snapshotData.totalExpense,
      transactions_count: snapshotData.transactionsCount,
      recent_transactions: snapshotData.recentTransactions,
      goals_progress: snapshotData.goalsProgress,
      snapshot_date: new Date(),
      notes: data.notes,
    });

    return this.snapshotRepository.save(snapshot);
  }

  async createAutomaticDailySnapshots(userId: number): Promise<Snapshot[]> {
    const accounts = await this.accountService.getUserAccounts(userId);
    const snapshots: Snapshot[] = [];

    for (const account of accounts) {
      // Check if we already have a snapshot for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingSnapshot = await this.snapshotRepository.findOne({
        where: {
          account_id: account.id,
          snapshot_date: {
            gte: today,
            lt: tomorrow,
          } as any,
        },
      });

      if (!existingSnapshot) {
        const snapshot = await this.createSnapshot(userId, { accountId: account.id });
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  async getSnapshots(userId: number, filters?: SnapshotFilters): Promise<Snapshot[]> {
    let query = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .innerJoin('snapshot.account', 'account')
      .leftJoinAndSelect('snapshot.account', 'accountData')
      .where('account.user_id = :userId', { userId });

    if (filters?.accountId) {
      query = query.andWhere('snapshot.account_id = :accountId', { accountId: filters.accountId });
    }

    if (filters?.startDate) {
      query = query.andWhere('snapshot.snapshot_date >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query = query.andWhere('snapshot.snapshot_date <= :endDate', { endDate: filters.endDate });
    }

    return query
      .orderBy('snapshot.snapshot_date', 'DESC')
      .getMany();
  }

  async getSnapshotById(id: number, userId: number): Promise<Snapshot | null> {
    return this.snapshotRepository
      .createQueryBuilder('snapshot')
      .innerJoin('snapshot.account', 'account')
      .leftJoinAndSelect('snapshot.account', 'accountData')
      .where('snapshot.id = :id AND account.user_id = :userId', { id, userId })
      .getOne();
  }

  async deleteSnapshot(id: number, userId: number): Promise<void> {
    const snapshot = await this.getSnapshotById(id, userId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    await this.snapshotRepository.delete(id);
  }

  async getSnapshotTrends(userId: number, accountId?: number, days: number = 30): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = this.snapshotRepository
      .createQueryBuilder('snapshot')
      .innerJoin('snapshot.account', 'account')
      .select([
        'DATE(snapshot.snapshot_date) as date',
        'SUM(snapshot.balance) as total_balance',
        'SUM(snapshot.total_income) as total_income',
        'SUM(snapshot.total_expense) as total_expense',
        'SUM(snapshot.transactions_count) as total_transactions',
      ])
      .where('account.user_id = :userId', { userId })
      .andWhere('snapshot.snapshot_date >= :startDate', { startDate })
      .andWhere('snapshot.snapshot_date <= :endDate', { endDate })
      .groupBy('DATE(snapshot.snapshot_date)')
      .orderBy('DATE(snapshot.snapshot_date)', 'ASC');

    if (accountId) {
      query = query.andWhere('snapshot.account_id = :accountId', { accountId });
    }

    return query.getRawMany();
  }

  async compareSnapshots(snapshotId1: number, snapshotId2: number, userId: number): Promise<{
    snapshot1: Snapshot;
    snapshot2: Snapshot;
    comparison: {
      balanceDiff: number;
      incomeDiff: number;
      expenseDiff: number;
      transactionsDiff: number;
      timeDiff: number; // in days
    };
  }> {
    const snapshot1 = await this.getSnapshotById(snapshotId1, userId);
    const snapshot2 = await this.getSnapshotById(snapshotId2, userId);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    if (snapshot1.account_id !== snapshot2.account_id) {
      throw new Error('Snapshots must be from the same account');
    }

    const timeDiff = Math.abs(
      (snapshot2.snapshot_date.getTime() - snapshot1.snapshot_date.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      snapshot1,
      snapshot2,
      comparison: {
        balanceDiff: snapshot2.balance - snapshot1.balance,
        incomeDiff: snapshot2.total_income - snapshot1.total_income,
        expenseDiff: snapshot2.total_expense - snapshot1.total_expense,
        transactionsDiff: snapshot2.transactions_count - snapshot1.transactions_count,
        timeDiff: Math.round(timeDiff),
      },
    };
  }

  private async gatherSnapshotData(accountId: number, userId: number): Promise<SnapshotData> {
    const account = await this.accountService.getAccountById(accountId, userId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Get account summary for totals
    const accountSummary = await this.accountService.getAccountTransactionSummary(accountId, userId);

    // Get recent transactions (last 10)
    const recentTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.account_id = :accountId', { accountId })
      .orderBy('transaction.transaction_date', 'DESC')
      .limit(10)
      .getMany();

    // Get goals progress
    const totalBalance = await this.accountService.getTotalBalance(userId);
    const goalsProgress = await this.goalService.getGoalsProgress(userId, totalBalance);

    return {
      balance: account.balance,
      totalIncome: accountSummary.totalIncome,
      totalExpense: accountSummary.totalExpenses,
      transactionsCount: accountSummary.transactionCount,
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        date: t.transaction_date,
      })),
      goalsProgress: goalsProgress.map(g => ({
        goalId: g.goal.id,
        title: g.goal.title,
        progress: g.progress,
        remainingAmount: g.remainingAmount,
        daysRemaining: g.daysRemaining,
      })),
    };
  }
}