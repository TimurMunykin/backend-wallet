import { Repository, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { DailySpendingConfig } from '../entities/DailySpendingConfig';
import { DailySpendingCache } from '../entities/DailySpendingCache';
import { Goal } from '../entities/Goal';
import { RecurringPayment } from '../entities/RecurringPayment';
import { SalaryPayment } from '../entities/SalaryPayment';
import { Transaction } from '../entities/Transaction';
import { AccountService } from './AccountService';

export interface CreateDailySpendingConfigDto {
  name: string;
  periodType: string;
  customDays?: number;
  customEndDate?: Date;
  salaryDate?: Date;
  includePendingSalary?: boolean;
  includeRecurringIncome?: boolean;
  includeRecurringExpenses?: boolean;
  activeGoals?: number[];
  goalPriorities?: Record<string, number>;
  emergencyBuffer?: number;
}

export interface DailySpendingCalculation {
  dailyLimit: number;
  currentBalance: number;
  availableForGoals: number;
  daysRemaining: number;
  spentToday: number;
  remainingToday: number;
  upcomingTransactions: number;
  breakdown: {
    startingBalance: number;
    expectedSalary: number;
    expectedRecurringIncome: number;
    expectedRecurringExpenses: number;
    goalsReserved: number;
    emergencyBuffer: number;
    availableAmount: number;
    periodDays: number;
  };
}

export class DailySpendingService {
  private configRepository: Repository<DailySpendingConfig>;
  private cacheRepository: Repository<DailySpendingCache>;
  private goalRepository: Repository<Goal>;
  private recurringPaymentRepository: Repository<RecurringPayment>;
  private salaryPaymentRepository: Repository<SalaryPayment>;
  private transactionRepository: Repository<Transaction>;
  private accountService: AccountService;

  constructor() {
    this.configRepository = AppDataSource.getRepository(DailySpendingConfig);
    this.cacheRepository = AppDataSource.getRepository(DailySpendingCache);
    this.goalRepository = AppDataSource.getRepository(Goal);
    this.recurringPaymentRepository = AppDataSource.getRepository(RecurringPayment);
    this.salaryPaymentRepository = AppDataSource.getRepository(SalaryPayment);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.accountService = new AccountService();
  }

  async createConfig(userId: number, configData: CreateDailySpendingConfigDto): Promise<DailySpendingConfig> {
    if (configData.periodType === 'custom_days' && !configData.customDays) {
      throw new Error('Custom days is required when period type is custom_days');
    }

    if (configData.periodType === 'to_date' && !configData.customEndDate) {
      throw new Error('Custom end date is required when period type is to_date');
    }

    if (configData.periodType === 'to_salary' && !configData.salaryDate) {
      throw new Error('Salary date is required when period type is to_salary');
    }

    const config = this.configRepository.create({
      user_id: userId,
      name: configData.name,
      period_type: configData.periodType,
      custom_days: configData.customDays,
      custom_end_date: configData.customEndDate,
      salary_date: configData.salaryDate,
      include_pending_salary: configData.includePendingSalary ?? true,
      include_recurring_income: configData.includeRecurringIncome ?? true,
      include_recurring_expenses: configData.includeRecurringExpenses ?? true,
      active_goals: configData.activeGoals || [],
      goal_priorities: configData.goalPriorities || {},
      emergency_buffer: configData.emergencyBuffer || 0,
    });

    return this.configRepository.save(config);
  }

  async getUserConfigs(userId: number): Promise<DailySpendingConfig[]> {
    return this.configRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async getConfigById(configId: number, userId: number): Promise<DailySpendingConfig | null> {
    return this.configRepository.findOne({
      where: { id: configId, user_id: userId },
    });
  }

  async updateConfig(configId: number, userId: number, updateData: Partial<CreateDailySpendingConfigDto>): Promise<DailySpendingConfig> {
    const config = await this.getConfigById(configId, userId);
    
    if (!config) {
      throw new Error('Configuration not found');
    }

    Object.assign(config, {
      name: updateData.name ?? config.name,
      period_type: updateData.periodType ?? config.period_type,
      custom_days: updateData.customDays ?? config.custom_days,
      custom_end_date: updateData.customEndDate ?? config.custom_end_date,
      include_pending_salary: updateData.includePendingSalary ?? config.include_pending_salary,
      include_recurring_income: updateData.includeRecurringIncome ?? config.include_recurring_income,
      include_recurring_expenses: updateData.includeRecurringExpenses ?? config.include_recurring_expenses,
      active_goals: updateData.activeGoals ?? config.active_goals,
      goal_priorities: updateData.goalPriorities ?? config.goal_priorities,
      emergency_buffer: updateData.emergencyBuffer ?? config.emergency_buffer,
    });

    await this.clearCache(configId);
    return this.configRepository.save(config);
  }

  async activateConfig(configId: number, userId: number): Promise<void> {
    const config = await this.getConfigById(configId, userId);
    
    if (!config) {
      throw new Error('Configuration not found');
    }

    await this.configRepository.update(
      { user_id: userId },
      { is_active: false }
    );

    await this.configRepository.update(configId, { is_active: true });
  }

  async getActiveConfig(userId: number): Promise<DailySpendingConfig | null> {
    return this.configRepository.findOne({
      where: { user_id: userId, is_active: true },
    });
  }

  async calculateDailySpending(userId: number, configId?: number): Promise<DailySpendingCalculation> {
    let config: DailySpendingConfig | null;

    if (configId) {
      config = await this.getConfigById(configId, userId);
    } else {
      config = await this.getActiveConfig(userId);
    }

    if (!config) {
      throw new Error('No configuration found');
    }

    const cachedResult = await this.getCachedCalculation(config.id);
    if (cachedResult && cachedResult.expires_at > new Date()) {
      return {
        dailyLimit: cachedResult.daily_limit,
        currentBalance: cachedResult.current_balance,
        availableForGoals: cachedResult.available_for_goals,
        daysRemaining: cachedResult.days_remaining,
        spentToday: cachedResult.spent_today,
        remainingToday: cachedResult.remaining_today,
        upcomingTransactions: cachedResult.upcoming_transactions,
        breakdown: cachedResult.calculation_breakdown as any,
      };
    }

    const calculation = await this.performCalculation(userId, config);
    await this.cacheCalculation(userId, config.id, calculation);

    return calculation;
  }

  private async performCalculation(userId: number, config: DailySpendingConfig): Promise<DailySpendingCalculation> {
    const currentBalance = Number(await this.accountService.getTotalBalance(userId)) || 0;
    
    let expectedSalary = 0;
    let expectedRecurringIncome = 0;
    let expectedRecurringExpenses = 0;
    let goalsReserved = 0;

    const { endDate, daysRemaining } = this.calculatePeriodEnd(config);

    if (config.include_pending_salary) {
      expectedSalary = Number(await this.calculateExpectedSalary(userId, endDate)) || 0;
    }

    if (config.include_recurring_income) {
      expectedRecurringIncome = Number(await this.calculateRecurringIncome(userId, endDate)) || 0;
    }

    if (config.include_recurring_expenses) {
      expectedRecurringExpenses = Number(await this.calculateRecurringExpenses(userId, endDate)) || 0;
    }

    if (config.active_goals.length > 0) {
      goalsReserved = Number(await this.calculateGoalsReserved(config.active_goals, daysRemaining)) || 0;
    }

    const emergencyBuffer = Number(config.emergency_buffer) || 0;

    // Calculate actual spending for today
    const spentToday = Number(await this.calculateSpentToday(userId)) || 0;
    
    // Calculate upcoming transactions in the period
    const upcomingTransactions = Number(await this.calculateUpcomingTransactions(userId, endDate)) || 0;

    // Debug logging
    console.log('Daily Spending Calculation Debug:', {
      currentBalance,
      expectedSalary,
      expectedRecurringIncome,
      expectedRecurringExpenses,
      goalsReserved,
      emergencyBuffer,
      daysRemaining,
      spentToday,
      upcomingTransactions
    });

    const availableAmount = currentBalance 
      + expectedSalary 
      + expectedRecurringIncome 
      - expectedRecurringExpenses 
      - goalsReserved 
      - emergencyBuffer
      - upcomingTransactions; // Subtract upcoming transactions

    const dailyLimit = daysRemaining > 0 ? availableAmount / daysRemaining : 0;
    const remainingToday = Math.max(0, dailyLimit - spentToday);

    return {
      dailyLimit,
      currentBalance,
      availableForGoals: Math.max(0, availableAmount),
      daysRemaining,
      spentToday,
      remainingToday,
      upcomingTransactions,
      breakdown: {
        startingBalance: currentBalance,
        expectedSalary,
        expectedRecurringIncome,
        expectedRecurringExpenses,
        goalsReserved,
        emergencyBuffer,
        availableAmount,
        periodDays: daysRemaining,
      },
    };
  }

  private calculatePeriodEnd(config: DailySpendingConfig): { endDate: Date; daysRemaining: number } {
    const now = new Date();
    let endDate: Date;

    switch (config.period_type) {
      case 'to_month_end':
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      
      case 'custom_days':
        endDate = new Date(now.getTime() + (config.custom_days! * 24 * 60 * 60 * 1000));
        break;
      
      case 'to_date':
        endDate = new Date(config.custom_end_date!);
        break;
      
      case 'to_salary':
        if (config.salary_date) {
          endDate = new Date(config.salary_date);
        } else {
          // Fallback to 2 weeks from now if no salary date specified
          endDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
        }
        break;
      
      default:
        // Default to 2 weeks from now
        endDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
        break;
    }

    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return { endDate, daysRemaining };
  }

  private async calculateExpectedSalary(userId: number, endDate: Date): Promise<number> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return 0;

    const salaryPayments = await this.salaryPaymentRepository.find({
      where: { account_id: In(accountIds) },
    });

    let totalExpectedSalary = 0;
    const now = new Date();

    for (const salary of salaryPayments) {
      const salaryDate = new Date(now.getFullYear(), now.getMonth(), salary.start_day);
      
      if (salaryDate <= endDate && salaryDate >= now) {
        totalExpectedSalary += Number(salary.expected_amount) || 0;
      }
    }

    return totalExpectedSalary;
  }

  private async calculateRecurringIncome(userId: number, endDate: Date): Promise<number> {
    return this.calculateRecurringPayments(userId, endDate, 'income');
  }

  private async calculateRecurringExpenses(userId: number, endDate: Date): Promise<number> {
    return this.calculateRecurringPayments(userId, endDate, 'expense');
  }

  private async calculateRecurringPayments(userId: number, endDate: Date, type: 'income' | 'expense'): Promise<number> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return 0;

    const recurringPayments = await this.recurringPaymentRepository.find({
      where: { 
        account_id: In(accountIds),
        type: type,
      },
    });

    let totalAmount = 0;
    const now = new Date();

    for (const payment of recurringPayments) {
      if (payment.end_date && new Date(payment.end_date) < now) continue;

      const occurrences = this.calculateOccurrences(payment, now, endDate);
      totalAmount += occurrences * (Number(payment.amount) || 0);
    }

    return totalAmount;
  }

  private calculateOccurrences(payment: RecurringPayment, startDate: Date, endDate: Date): number {
    const paymentStartDate = new Date(payment.start_date);
    const paymentEndDate = payment.end_date ? new Date(payment.end_date) : null;
    
    const start = new Date(Math.max(startDate.getTime(), paymentStartDate.getTime()));
    const end = paymentEndDate ? new Date(Math.min(endDate.getTime(), paymentEndDate.getTime())) : endDate;

    if (start >= end) return 0;

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

    switch (payment.frequency) {
      case 'daily':
        return daysDiff;
      
      case 'weekly':
        return Math.floor(daysDiff / 7);
      
      case 'monthly':
        const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return Math.max(0, monthsDiff);
      
      default:
        return 0;
    }
  }

  private async calculateGoalsReserved(goalIds: number[], daysRemaining: number): Promise<number> {
    if (goalIds.length === 0) return 0;

    const goals = await this.goalRepository.find({
      where: { id: In(goalIds) },
    });

    let totalReserved = 0;

    for (const goal of goals) {
      if (goal.achieved) continue;

      const goalTargetDate = new Date(goal.target_date);
      const daysToTarget = Math.ceil((goalTargetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      if (daysToTarget > 0) {
        const targetAmount = Number(goal.target_amount) || 0;
        const minBalance = Number(goal.min_balance) || 0;
        const dailyGoalAmount = (targetAmount + minBalance) / daysToTarget;
        totalReserved += dailyGoalAmount * Math.min(daysRemaining, daysToTarget);
      }
    }

    return totalReserved;
  }

  private async getCachedCalculation(configId: number): Promise<DailySpendingCache | null> {
    return this.cacheRepository.findOne({
      where: { config_id: configId },
      order: { created_at: 'DESC' },
    });
  }

  private async cacheCalculation(userId: number, configId: number, calculation: DailySpendingCalculation): Promise<void> {
    const cacheExpiry = new Date(Date.now() + 30 * 60 * 1000);

    const cache = this.cacheRepository.create({
      user_id: userId,
      config_id: configId,
      daily_limit: calculation.dailyLimit,
      current_balance: calculation.currentBalance,
      available_for_goals: calculation.availableForGoals,
      days_remaining: calculation.daysRemaining,
      spent_today: calculation.spentToday,
      remaining_today: calculation.remainingToday,
      upcoming_transactions: calculation.upcomingTransactions,
      calculation_breakdown: calculation.breakdown,
      calculated_at: new Date(),
      expires_at: cacheExpiry,
    });

    await this.cacheRepository.save(cache);
  }

  private async clearCache(configId: number): Promise<void> {
    await this.cacheRepository.delete({ config_id: configId });
  }

  async clearUserCaches(userId: number): Promise<void> {
    await this.cacheRepository.delete({ user_id: userId });
  }

  async deleteConfig(configId: number, userId: number): Promise<void> {
    const config = await this.getConfigById(configId, userId);
    
    if (!config) {
      throw new Error('Configuration not found');
    }

    await this.clearCache(configId);
    await this.configRepository.remove(config);
  }

  private async calculateSpentToday(userId: number): Promise<number> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return 0;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .select('SUM(transaction.amount)', 'total')
      .where('account.id IN (:...accountIds)', { accountIds })
      .andWhere('transaction.type = :type', { type: 'expense' })
      .andWhere('transaction.transaction_date >= :startOfDay', { startOfDay })
      .andWhere('transaction.transaction_date <= :endOfDay', { endOfDay })
      .getRawOne();

    return Number(result?.total) || 0;
  }

  private async calculateUpcomingTransactions(userId: number, endDate: Date): Promise<number> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return 0;

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get upcoming expense transactions between tomorrow and end date
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .select('SUM(transaction.amount)', 'total')
      .where('account.id IN (:...accountIds)', { accountIds })
      .andWhere('transaction.type = :type', { type: 'expense' })
      .andWhere('transaction.transaction_date >= :tomorrow', { tomorrow })
      .andWhere('transaction.transaction_date <= :endDate', { endDate })
      .getRawOne();

    return Number(result?.total) || 0;
  }
}