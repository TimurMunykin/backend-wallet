import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Transaction } from '../entities/Transaction';
import { Goal } from '../entities/Goal';
import { AccountService } from './AccountService';
import { GoalService } from './GoalService';

export interface IncomeExpenseTrend {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface SpendingPattern {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentage: number;
}

export interface FinancialSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  accountCount: number;
  activeGoalsCount: number;
  achievedGoalsCount: number;
}

export interface ForecastData {
  projectedBalance: number;
  projectedDate: Date;
  assumptions: {
    averageMonthlyIncome: number;
    averageMonthlyExpense: number;
    currentBalance: number;
  };
}

export class AnalyticsService {
  private transactionRepository: Repository<Transaction>;
  private goalRepository: Repository<Goal>;
  private accountService: AccountService;
  private goalService: GoalService;

  constructor() {
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.goalRepository = AppDataSource.getRepository(Goal);
    this.accountService = new AccountService();
    this.goalService = new GoalService();
  }

  async getIncomeExpenseTrends(userId: number, period: 'daily' | 'weekly' | 'monthly' = 'monthly', months: number = 12): Promise<IncomeExpenseTrend[]> {
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - months);
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - (months * 4 * 7)); // Approximate weeks
    } else {
      startDate.setDate(startDate.getDate() - (months * 30)); // Approximate days
    }

    let groupBy: string;

    switch (period) {
      case 'daily':
        groupBy = 'DATE(t.transaction_date)';
        break;
      case 'weekly':
        groupBy = 'YEARWEEK(t.transaction_date)';
        break;
      case 'monthly':
      default:
        groupBy = 'DATE_FORMAT(t.transaction_date, "%Y-%m")';
        break;
    }

    const results = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select([
        `${groupBy} as period`,
        'SUM(CASE WHEN t.type = "income" THEN t.amount ELSE 0 END) as income',
        'SUM(CASE WHEN t.type = "expense" THEN t.amount ELSE 0 END) as expense',
      ])
      .where('a.user_id = :userId', { userId })
      .andWhere('t.transaction_date >= :startDate', { startDate })
      .andWhere('t.transaction_date <= :endDate', { endDate })
      .groupBy(groupBy)
      .orderBy(groupBy, 'ASC')
      .getRawMany();

    return results.map(result => ({
      period: result.period,
      income: parseFloat(result.income) || 0,
      expense: parseFloat(result.expense) || 0,
      net: (parseFloat(result.income) || 0) - (parseFloat(result.expense) || 0),
    }));
  }

  async getSpendingPatterns(userId: number, months: number = 6): Promise<SpendingPattern[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get spending by description patterns (simplified categorization)
    const results = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select([
        'LOWER(SUBSTRING_INDEX(t.description, " ", 1)) as category',
        'SUM(t.amount) as totalAmount',
        'COUNT(*) as transactionCount',
        'AVG(t.amount) as averageAmount',
      ])
      .where('a.user_id = :userId', { userId })
      .andWhere('t.type = "expense"')
      .andWhere('t.transaction_date >= :startDate', { startDate })
      .andWhere('t.transaction_date <= :endDate', { endDate })
      .groupBy('LOWER(SUBSTRING_INDEX(t.description, " ", 1))')
      .having('COUNT(*) > 1') // Only show categories with multiple transactions
      .orderBy('totalAmount', 'DESC')
      .limit(10)
      .getRawMany();

    const totalExpense = results.reduce((sum, result) => sum + parseFloat(result.totalAmount), 0);

    return results.map(result => ({
      category: result.category || 'Other',
      totalAmount: parseFloat(result.totalAmount),
      transactionCount: parseInt(result.transactionCount),
      averageAmount: parseFloat(result.averageAmount),
      percentage: totalExpense > 0 ? (parseFloat(result.totalAmount) / totalExpense) * 100 : 0,
    }));
  }

  async getFinancialSummary(userId: number): Promise<FinancialSummary> {
    // Get total balance
    const totalBalance = await this.accountService.getTotalBalance(userId);

    // Get account count
    const accounts = await this.accountService.getUserAccounts(userId);
    const accountCount = accounts.length;

    // Get total income and expense
    const transactionSummary = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select([
        'SUM(CASE WHEN t.type = "income" THEN t.amount ELSE 0 END) as totalIncome',
        'SUM(CASE WHEN t.type = "expense" THEN t.amount ELSE 0 END) as totalExpense',
        'COUNT(*) as transactionCount',
      ])
      .where('a.user_id = :userId', { userId })
      .getRawOne();

    // Get goals summary
    const goalsSummary = await this.goalRepository
      .createQueryBuilder('g')
      .select([
        'COUNT(*) as totalGoals',
        'SUM(CASE WHEN g.achieved = true THEN 1 ELSE 0 END) as achievedGoals',
        'SUM(CASE WHEN g.achieved = false THEN 1 ELSE 0 END) as activeGoals',
      ])
      .where('g.user_id = :userId', { userId })
      .getRawOne();

    const totalIncome = parseFloat(transactionSummary?.totalIncome) || 0;
    const totalExpense = parseFloat(transactionSummary?.totalExpense) || 0;

    return {
      totalBalance,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      transactionCount: parseInt(transactionSummary?.transactionCount) || 0,
      accountCount,
      activeGoalsCount: parseInt(goalsSummary?.activeGoals) || 0,
      achievedGoalsCount: parseInt(goalsSummary?.achievedGoals) || 0,
    };
  }

  async getForecast(userId: number, monthsAhead: number = 6): Promise<ForecastData> {
    const currentBalance = await this.accountService.getTotalBalance(userId);

    // Get average monthly income and expense for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyAverages = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.account', 'a')
      .select([
        'AVG(CASE WHEN t.type = "income" THEN t.amount ELSE 0 END) * COUNT(DISTINCT DATE_FORMAT(t.transaction_date, "%Y-%m")) / 6 as avgMonthlyIncome',
        'AVG(CASE WHEN t.type = "expense" THEN t.amount ELSE 0 END) * COUNT(DISTINCT DATE_FORMAT(t.transaction_date, "%Y-%m")) / 6 as avgMonthlyExpense',
      ])
      .where('a.user_id = :userId', { userId })
      .andWhere('t.transaction_date >= :startDate', { startDate: sixMonthsAgo })
      .getRawOne();

    const averageMonthlyIncome = parseFloat(monthlyAverages?.avgMonthlyIncome) || 0;
    const averageMonthlyExpense = parseFloat(monthlyAverages?.avgMonthlyExpense) || 0;
    const netMonthlyFlow = averageMonthlyIncome - averageMonthlyExpense;

    const projectedBalance = currentBalance + (netMonthlyFlow * monthsAhead);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + monthsAhead);

    return {
      projectedBalance,
      projectedDate,
      assumptions: {
        averageMonthlyIncome,
        averageMonthlyExpense,
        currentBalance,
      },
    };
  }

  async getGoalProgressReport(userId: number): Promise<any> {
    const totalBalance = await this.accountService.getTotalBalance(userId);
    const goalsProgress = await this.goalService.getGoalsProgress(userId, totalBalance);

    const report = {
      totalActiveGoals: goalsProgress.length,
      totalTargetAmount: goalsProgress.reduce((sum, g) => sum + g.goal.target_amount, 0),
      totalRemainingAmount: goalsProgress.reduce((sum, g) => sum + g.remainingAmount, 0),
      averageProgress: goalsProgress.length > 0 
        ? goalsProgress.reduce((sum, g) => sum + g.progress, 0) / goalsProgress.length 
        : 0,
      goalsByUrgency: {
        urgent: goalsProgress.filter(g => g.daysRemaining <= 30 && g.daysRemaining > 0).length,
        moderate: goalsProgress.filter(g => g.daysRemaining > 30 && g.daysRemaining <= 90).length,
        longTerm: goalsProgress.filter(g => g.daysRemaining > 90).length,
        overdue: goalsProgress.filter(g => g.daysRemaining <= 0).length,
      },
      topPriorityGoals: goalsProgress
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 5)
        .map(g => ({
          id: g.goal.id,
          title: g.goal.title,
          progress: g.progress,
          remainingAmount: g.remainingAmount,
          daysRemaining: g.daysRemaining,
          dailyTargetAmount: g.dailyTargetAmount,
        })),
    };

    return report;
  }

  async getCashFlowAnalysis(userId: number, months: number = 12): Promise<any> {
    const trends = await this.getIncomeExpenseTrends(userId, 'monthly', months);
    
    const analysis = {
      trends,
      summary: {
        totalIncome: trends.reduce((sum, t) => sum + t.income, 0),
        totalExpense: trends.reduce((sum, t) => sum + t.expense, 0),
        totalNet: trends.reduce((sum, t) => sum + t.net, 0),
        averageMonthlyIncome: trends.length > 0 ? trends.reduce((sum, t) => sum + t.income, 0) / trends.length : 0,
        averageMonthlyExpense: trends.length > 0 ? trends.reduce((sum, t) => sum + t.expense, 0) / trends.length : 0,
        averageMonthlyNet: trends.length > 0 ? trends.reduce((sum, t) => sum + t.net, 0) / trends.length : 0,
        positiveMonths: trends.filter(t => t.net > 0).length,
        negativeMonths: trends.filter(t => t.net < 0).length,
        bestMonth: trends.reduce((max, t) => t.net > max.net ? t : max, trends[0] || { period: '', net: 0 }),
        worstMonth: trends.reduce((min, t) => t.net < min.net ? t : min, trends[0] || { period: '', net: 0 }),
      },
    };

    return analysis;
  }
}