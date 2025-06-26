import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { DailySpendingConfig } from '../entities/DailySpendingConfig';
import { DailySpendingCache } from '../entities/DailySpendingCache';
import { Goal } from '../entities/Goal';
import { RecurringPayment } from '../entities/RecurringPayment';
import { SalaryPayment } from '../entities/SalaryPayment';
import { AccountService } from './AccountService';

export interface CreateDailySpendingConfigDto {
  name: string;
  periodType: string;
  customDays?: number;
  customEndDate?: Date;
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
  private accountService: AccountService;

  constructor() {
    this.configRepository = AppDataSource.getRepository(DailySpendingConfig);
    this.cacheRepository = AppDataSource.getRepository(DailySpendingCache);
    this.goalRepository = AppDataSource.getRepository(Goal);
    this.recurringPaymentRepository = AppDataSource.getRepository(RecurringPayment);
    this.salaryPaymentRepository = AppDataSource.getRepository(SalaryPayment);
    this.accountService = new AccountService();
  }

  async createConfig(userId: number, configData: CreateDailySpendingConfigDto): Promise<DailySpendingConfig> {
    if (configData.periodType === 'custom_days' && !configData.customDays) {
      throw new Error('Custom days is required when period type is custom_days');
    }

    if (configData.periodType === 'to_date' && !configData.customEndDate) {
      throw new Error('Custom end date is required when period type is to_date');
    }

    const config = this.configRepository.create({
      user_id: userId,
      name: configData.name,
      period_type: configData.periodType,
      custom_days: configData.customDays,
      custom_end_date: configData.customEndDate,
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
        breakdown: cachedResult.calculation_breakdown as any,
      };
    }

    const calculation = await this.performCalculation(userId, config);
    await this.cacheCalculation(userId, config.id, calculation);

    return calculation;
  }

  private async performCalculation(userId: number, config: DailySpendingConfig): Promise<DailySpendingCalculation> {
    const currentBalance = await this.accountService.getTotalBalance(userId);
    
    let expectedSalary = 0;
    let expectedRecurringIncome = 0;
    let expectedRecurringExpenses = 0;
    let goalsReserved = 0;

    const { endDate, daysRemaining } = this.calculatePeriodEnd(config);

    if (config.include_pending_salary) {
      expectedSalary = await this.calculateExpectedSalary(userId, endDate);
    }

    if (config.include_recurring_income) {
      expectedRecurringIncome = await this.calculateRecurringIncome(userId, endDate);
    }

    if (config.include_recurring_expenses) {
      expectedRecurringExpenses = await this.calculateRecurringExpenses(userId, endDate);
    }

    if (config.active_goals.length > 0) {
      goalsReserved = await this.calculateGoalsReserved(config.active_goals, daysRemaining);
    }

    const availableAmount = currentBalance 
      + expectedSalary 
      + expectedRecurringIncome 
      - expectedRecurringExpenses 
      - goalsReserved 
      - config.emergency_buffer;

    const dailyLimit = daysRemaining > 0 ? availableAmount / daysRemaining : 0;

    return {
      dailyLimit,
      currentBalance,
      availableForGoals: Math.max(0, availableAmount),
      daysRemaining,
      breakdown: {
        startingBalance: currentBalance,
        expectedSalary,
        expectedRecurringIncome,
        expectedRecurringExpenses,
        goalsReserved,
        emergencyBuffer: config.emergency_buffer,
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
        endDate = config.custom_end_date!;
        break;
      
      case 'to_salary':
      default:
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
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
      where: { account_id: accountIds as any },
    });

    let totalExpectedSalary = 0;
    const now = new Date();

    for (const salary of salaryPayments) {
      const salaryDate = new Date(now.getFullYear(), now.getMonth(), salary.start_day);
      
      if (salaryDate <= endDate && salaryDate >= now) {
        totalExpectedSalary += salary.expected_amount;
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
        account_id: accountIds as any,
        type: type as any,
      },
    });

    let totalAmount = 0;
    const now = new Date();

    for (const payment of recurringPayments) {
      if (payment.end_date && payment.end_date < now) continue;

      const occurrences = this.calculateOccurrences(payment, now, endDate);
      totalAmount += occurrences * payment.amount;
    }

    return totalAmount;
  }

  private calculateOccurrences(payment: RecurringPayment, startDate: Date, endDate: Date): number {
    const start = new Date(Math.max(startDate.getTime(), payment.start_date.getTime()));
    const end = payment.end_date ? new Date(Math.min(endDate.getTime(), payment.end_date.getTime())) : endDate;

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
      where: { id: goalIds as any },
    });

    let totalReserved = 0;

    for (const goal of goals) {
      if (goal.achieved) continue;

      const daysToTarget = Math.ceil((goal.target_date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      if (daysToTarget > 0) {
        const dailyGoalAmount = (goal.target_amount + goal.min_balance) / daysToTarget;
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
      calculation_breakdown: calculation.breakdown,
      calculated_at: new Date(),
      expires_at: cacheExpiry,
    });

    await this.cacheRepository.save(cache);
  }

  private async clearCache(configId: number): Promise<void> {
    await this.cacheRepository.delete({ config_id: configId });
  }

  async deleteConfig(configId: number, userId: number): Promise<void> {
    const config = await this.getConfigById(configId, userId);
    
    if (!config) {
      throw new Error('Configuration not found');
    }

    await this.clearCache(configId);
    await this.configRepository.remove(config);
  }
}