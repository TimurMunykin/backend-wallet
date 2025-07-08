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
    salaryDetails: Array<{date: string, amount: number, description: string}>;
    recurringIncomeDetails: Array<{date: string, amount: number, description: string, frequency: string}>;
    recurringExpenseDetails: Array<{date: string, amount: number, description: string, frequency: string}>;
    upcomingTransactionDetails: Array<{date: string, amount: number, description: string, type: string}>;
    calculationSteps: {
      step1_startingAmount: number;
      step2_afterSalary: number;
      step3_afterRecurringIncome: number;
      step4_afterRecurringExpenses: number;
      step5_afterGoals: number;
      step6_afterEmergencyBuffer: number;
      step7_afterUpcomingTransactions: number;
      finalDailyLimit: number;
      spentToday: number;
      remainingToday: number;
    };
    calculationFormula: string;
    endDate: string;
    calculationDate: string;
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

    // Skip cache for debugging
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

    // Initialize detailed breakdown arrays
    const salaryDetails: Array<{date: string, amount: number, description: string}> = [];
    const recurringIncomeDetails: Array<{date: string, amount: number, description: string, frequency: string}> = [];
    const recurringExpenseDetails: Array<{date: string, amount: number, description: string, frequency: string}> = [];
    const upcomingTransactionDetails: Array<{date: string, amount: number, description: string, type: string}> = [];

    const { endDate, daysRemaining } = this.calculatePeriodEnd(config);

    console.log('=== DAILY SPENDING CALCULATION DEBUG ===');
    console.log('User ID:', userId);
    console.log('Config ID:', config.id);
    console.log('End Date:', endDate);
    console.log('Days Remaining:', daysRemaining);
    console.log('Current Balance:', currentBalance);

    if (config.include_pending_salary) {
      const salaryData = await this.calculateExpectedSalaryDetailed(userId, endDate);
      expectedSalary = salaryData.total;
      salaryDetails.push(...salaryData.details);
      console.log('Expected Salary:', expectedSalary, 'Details:', salaryData.details);
    }

    if (config.include_recurring_income) {
      const recurringIncomeData = await this.calculateRecurringIncomeDetailed(userId, endDate);
      expectedRecurringIncome = recurringIncomeData.total;
      recurringIncomeDetails.push(...recurringIncomeData.details);
      console.log('Expected Recurring Income:', expectedRecurringIncome, 'Details:', recurringIncomeData.details);
    }

    if (config.include_recurring_expenses) {
      const recurringExpenseData = await this.calculateRecurringExpensesDetailed(userId, endDate);
      expectedRecurringExpenses = recurringExpenseData.total;
      recurringExpenseDetails.push(...recurringExpenseData.details);
      console.log('Expected Recurring Expenses:', expectedRecurringExpenses, 'Details:', recurringExpenseData.details);
    }

    if (config.active_goals.length > 0) {
      goalsReserved = Number(await this.calculateGoalsReserved(config.active_goals, daysRemaining)) || 0;
      console.log('Goals Reserved:', goalsReserved);
    }

    const emergencyBuffer = Number(config.emergency_buffer) || 0;
    console.log('Emergency Buffer:', emergencyBuffer);

    // Calculate actual spending for today
    const spentToday = Number(await this.calculateSpentToday(userId)) || 0;
    console.log('Spent Today:', spentToday);
    
    // Calculate upcoming transactions in the period
    const upcomingTransactionsData = await this.calculateUpcomingTransactionsDetailed(userId, endDate);
    const upcomingTransactions = upcomingTransactionsData.total;
    upcomingTransactionDetails.push(...upcomingTransactionsData.details);
    console.log('Upcoming Transactions Total:', upcomingTransactions);
    console.log('Upcoming Transactions Details:', upcomingTransactionsData.details);

    // Calculate step by step
    const step1_startingAmount = currentBalance;
    const step2_afterSalary = step1_startingAmount + expectedSalary;
    const step3_afterRecurringIncome = step2_afterSalary + expectedRecurringIncome;
    const step4_afterRecurringExpenses = step3_afterRecurringIncome - expectedRecurringExpenses;
    const step5_afterGoals = step4_afterRecurringExpenses - goalsReserved;
    const step6_afterEmergencyBuffer = step5_afterGoals - emergencyBuffer;
    const step7_afterUpcomingTransactions = step6_afterEmergencyBuffer - upcomingTransactions;
    const availableAmount = step7_afterUpcomingTransactions;

    console.log('=== CALCULATION STEPS ===');
    console.log('Step 1 - Starting Amount:', step1_startingAmount);
    console.log('Step 2 - After Salary:', step2_afterSalary);
    console.log('Step 3 - After Recurring Income:', step3_afterRecurringIncome);
    console.log('Step 4 - After Recurring Expenses:', step4_afterRecurringExpenses);
    console.log('Step 5 - After Goals:', step5_afterGoals);
    console.log('Step 6 - After Emergency Buffer:', step6_afterEmergencyBuffer);
    console.log('Step 7 - After Upcoming Transactions:', step7_afterUpcomingTransactions);
    console.log('Final Available Amount:', availableAmount);

    const dailyLimit = daysRemaining > 0 ? availableAmount / daysRemaining : 0;
    const remainingToday = Math.max(0, dailyLimit - spentToday);

    console.log('Daily Limit:', dailyLimit);
    console.log('Remaining Today:', remainingToday);
    console.log('=== END DEBUG ===');

    // Create detailed calculation formula
    const calculationFormula = `
      Starting Balance: ${currentBalance.toFixed(2)}
      ${expectedSalary > 0 ? `+ Expected Salary: ${expectedSalary.toFixed(2)}` : ''}
      ${expectedRecurringIncome > 0 ? `+ Recurring Income: ${expectedRecurringIncome.toFixed(2)}` : ''}
      ${expectedRecurringExpenses > 0 ? `- Recurring Expenses: ${expectedRecurringExpenses.toFixed(2)}` : ''}
      ${goalsReserved > 0 ? `- Goals Reserved: ${goalsReserved.toFixed(2)}` : ''}
      ${emergencyBuffer > 0 ? `- Emergency Buffer: ${emergencyBuffer.toFixed(2)}` : ''}
      ${upcomingTransactions > 0 ? `- Upcoming Transactions: ${upcomingTransactions.toFixed(2)}` : ''}
      ------------------------------------------------
      = Available Amount: ${availableAmount.toFixed(2)}
      ÷ Days Remaining: ${daysRemaining}
      = Daily Limit: ${dailyLimit.toFixed(2)}
      - Spent Today: ${spentToday.toFixed(2)}
      = Remaining Today: ${remainingToday.toFixed(2)}
    `.trim();

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
        // Enhanced detailed breakdown
        salaryDetails,
        recurringIncomeDetails,
        recurringExpenseDetails,
        upcomingTransactionDetails,
        calculationSteps: {
          step1_startingAmount,
          step2_afterSalary,
          step3_afterRecurringIncome,
          step4_afterRecurringExpenses,
          step5_afterGoals,
          step6_afterEmergencyBuffer,
          step7_afterUpcomingTransactions,
          finalDailyLimit: dailyLimit,
          spentToday,
          remainingToday
        },
        calculationFormula,
        endDate: endDate.toISOString(),
        calculationDate: new Date().toISOString()
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

  private async calculateExpectedSalaryDetailed(userId: number, endDate: Date): Promise<{
    total: number;
    details: Array<{date: string, amount: number, description: string}>;
  }> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return { total: 0, details: [] };

    const salaryPayments = await this.salaryPaymentRepository.find({
      where: { account_id: In(accountIds) },
    });

    let totalExpectedSalary = 0;
    const details: Array<{date: string, amount: number, description: string}> = [];
    const now = new Date();

    for (const salary of salaryPayments) {
      const salaryDate = new Date(now.getFullYear(), now.getMonth(), salary.start_day);
      
      if (salaryDate <= endDate && salaryDate >= now) {
        const amount = Number(salary.expected_amount) || 0;
        totalExpectedSalary += amount;
        details.push({
          date: salaryDate.toISOString().split('T')[0],
          amount,
          description: `Salary payment on day ${salary.start_day} of month`
        });
      }
    }

    return { total: totalExpectedSalary, details };
  }

  private async calculateRecurringIncomeDetailed(userId: number, endDate: Date): Promise<{
    total: number;
    details: Array<{date: string, amount: number, description: string, frequency: string}>;
  }> {
    return this.calculateRecurringPaymentsDetailed(userId, endDate, 'income');
  }

  private async calculateRecurringExpensesDetailed(userId: number, endDate: Date): Promise<{
    total: number;
    details: Array<{date: string, amount: number, description: string, frequency: string}>;
  }> {
    return this.calculateRecurringPaymentsDetailed(userId, endDate, 'expense');
  }

  private async calculateRecurringPaymentsDetailed(userId: number, endDate: Date, type: 'income' | 'expense'): Promise<{
    total: number;
    details: Array<{date: string, amount: number, description: string, frequency: string}>;
  }> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return { total: 0, details: [] };

    const recurringPayments = await this.recurringPaymentRepository.find({
      where: { 
        account_id: In(accountIds),
        type: type,
      },
    });

    console.log(`=== RECURRING ${type.toUpperCase()} CALCULATION DEBUG ===`);
    console.log('User Accounts:', accountIds);
    console.log('End Date for calculation:', endDate);
    console.log('Current Date:', new Date());
    console.log(`Found ${recurringPayments.length} recurring ${type} payments:`, recurringPayments.map(p => ({
      id: p.id,
      description: p.description,
      amount: p.amount,
      start_date: p.start_date,
      end_date: p.end_date,
      frequency: p.frequency
    })));

    let totalAmount = 0;
    const details: Array<{date: string, amount: number, description: string, frequency: string}> = [];
    const now = new Date();

    for (const payment of recurringPayments) {
      console.log(`\n--- Processing payment: ${payment.description} ---`);
      console.log('Payment start date:', payment.start_date);
      console.log('Payment end date:', payment.end_date);
      console.log('Current date:', now);
      console.log('Period end date:', endDate);
      
      if (payment.end_date && new Date(payment.end_date) < now) {
        console.log('Payment has ended, skipping');
        continue;
      }

      const occurrences = this.calculateOccurrences(payment, now, endDate);
      const amount = Number(payment.amount) || 0;
      const totalForThisPayment = occurrences * amount;
      
      console.log('Calculated occurrences:', occurrences);
      console.log('Amount per occurrence:', amount);
      console.log('Total for this payment:', totalForThisPayment);
      
      totalAmount += totalForThisPayment;

      if (occurrences > 0) {
        details.push({
          date: new Date(payment.start_date).toISOString().split('T')[0],
          amount: totalForThisPayment,
          description: `${payment.description} (${occurrences} occurrences × ${amount.toFixed(2)})`,
          frequency: payment.frequency
        });
      }
    }

    console.log(`=== FINAL ${type.toUpperCase()} TOTALS ===`);
    console.log('Total amount:', totalAmount);
    console.log('Details:', details);
    console.log(`=== END ${type.toUpperCase()} DEBUG ===\n`);

    return { total: totalAmount, details };
  }

  private calculateOccurrences(payment: RecurringPayment, startDate: Date, endDate: Date): number {
    const paymentStartDate = new Date(payment.start_date);
    const paymentEndDate = payment.end_date ? new Date(payment.end_date) : null;
    
    const start = new Date(Math.max(startDate.getTime(), paymentStartDate.getTime()));
    const end = paymentEndDate ? new Date(Math.min(endDate.getTime(), paymentEndDate.getTime())) : endDate;

    console.log(`\n  calculateOccurrences for ${payment.description}:`);
    console.log('  Period start (now):', startDate.toISOString());
    console.log('  Period end:', endDate.toISOString());
    console.log('  Payment start date:', paymentStartDate.toISOString());
    console.log('  Payment end date:', paymentEndDate?.toISOString() || 'No end date');
    console.log('  Effective start:', start.toISOString());
    console.log('  Effective end:', end.toISOString());
    console.log('  start >= end?', start >= end);

    if (start >= end) {
      console.log('  Returning 0 occurrences (start >= end)');
      return 0;
    }

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    console.log('  Days difference:', daysDiff);

    let occurrences = 0;
    switch (payment.frequency) {
      case 'daily':
        occurrences = daysDiff;
        break;
      
      case 'weekly':
        occurrences = Math.floor(daysDiff / 7);
        break;
      
      case 'monthly':
        // Calculate months between start and end
        const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        
        // If start and end are in the same month, check if the payment date falls within the period
        if (monthsDiff === 0) {
          // Same month - check if payment should occur in this month
          const paymentDay = paymentStartDate.getDate();
          const startDay = start.getDate();
          const endDay = end.getDate();
          
          // If the payment day is within the period, count it as 1 occurrence
          if (paymentDay >= startDay && paymentDay <= endDay) {
            occurrences = 1;
          } else {
            occurrences = 0;
          }
          console.log('  Same month calculation:');
          console.log('    Payment day:', paymentDay);
          console.log('    Start day:', startDay);
          console.log('    End day:', endDay);
          console.log('    Payment falls within period:', paymentDay >= startDay && paymentDay <= endDay);
        } else {
          // Different months - use the original logic but add 1 to include the current month
          occurrences = Math.max(0, monthsDiff + 1);
        }
        
        console.log('  Months difference calculation:');
        console.log('    End year/month:', end.getFullYear(), end.getMonth());
        console.log('    Start year/month:', start.getFullYear(), start.getMonth());
        console.log('    Months diff:', monthsDiff);
        break;
      
      default:
        occurrences = 0;
        break;
    }

    console.log(`  Final occurrences for ${payment.frequency} frequency:`, occurrences);
    return occurrences;
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
    const userConfigs = await this.getUserConfigs(userId);
    for (const config of userConfigs) {
      await this.clearCache(config.id);
    }
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

  private async calculateUpcomingTransactionsDetailed(userId: number, endDate: Date): Promise<{
    total: number;
    details: Array<{date: string, amount: number, description: string, type: string}>;
  }> {
    const userAccounts = await this.accountService.getUserAccounts(userId);
    const accountIds = userAccounts.map(account => account.id);

    if (accountIds.length === 0) return { total: 0, details: [] };

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);

    // Get regular upcoming transactions (non-recurring)
    const upcomingTransactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.id IN (:...accountIds)', { accountIds })
      .andWhere('transaction.transaction_date >= :tomorrow', { tomorrow: tomorrowMidnight })
      .andWhere('transaction.transaction_date <= :endDate', { endDate })
      .getMany();

    let totalAmount = 0;
    const details: Array<{date: string, amount: number, description: string, type: string}> = [];

    // Add regular transactions with proper sign handling
    for (const transaction of upcomingTransactions) {
      const amount = Number(transaction.amount) || 0;
      // For the total, expenses are positive (money going out), income is negative (money coming in)
      const totalAmount_adjustment = transaction.type === 'expense' ? amount : -amount;
      totalAmount += totalAmount_adjustment;
      
      details.push({
        date: new Date(transaction.transaction_date).toISOString().split('T')[0],
        amount: amount, // Always show positive amount in the detailed list
        description: transaction.description,
        type: transaction.type
      });
    }

    // Add debug logging
    console.log('Upcoming Transactions Debug:', {
      transactionCount: upcomingTransactions.length,
      totalAmount,
      details
    });

    return { total: totalAmount, details };
  }
}