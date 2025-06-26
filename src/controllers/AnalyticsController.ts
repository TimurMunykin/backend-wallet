import { Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     IncomeExpenseTrend:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *         income:
 *           type: number
 *         expense:
 *           type: number
 *         net:
 *           type: number
 *     SpendingPattern:
 *       type: object
 *       properties:
 *         category:
 *           type: string
 *         totalAmount:
 *           type: number
 *         transactionCount:
 *           type: integer
 *         averageAmount:
 *           type: number
 *         percentage:
 *           type: number
 *     FinancialSummary:
 *       type: object
 *       properties:
 *         totalBalance:
 *           type: number
 *         totalIncome:
 *           type: number
 *         totalExpense:
 *           type: number
 *         netIncome:
 *           type: number
 *         transactionCount:
 *           type: integer
 *         accountCount:
 *           type: integer
 *         activeGoalsCount:
 *           type: integer
 *         achievedGoalsCount:
 *           type: integer
 *     ForecastData:
 *       type: object
 *       properties:
 *         projectedBalance:
 *           type: number
 *         projectedDate:
 *           type: string
 *           format: date-time
 *         assumptions:
 *           type: object
 *           properties:
 *             averageMonthlyIncome:
 *               type: number
 *             averageMonthlyExpense:
 *               type: number
 *             currentBalance:
 *               type: number
 */

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  /**
   * @swagger
   * /api/analytics/income-expense-trends:
   *   get:
   *     summary: Get income and expense trends over time
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [daily, weekly, monthly]
   *           default: monthly
   *         description: Time period for grouping data
   *       - in: query
   *         name: months
   *         schema:
   *           type: integer
   *           default: 12
   *         description: Number of months to look back
   *     responses:
   *       200:
   *         description: Trends retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/IncomeExpenseTrend'
   *       401:
   *         description: Unauthorized
   */
  getIncomeExpenseTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const period = (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly';
      const months = req.query.months ? parseInt(req.query.months as string) : 12;

      const trends = await this.analyticsService.getIncomeExpenseTrends(req.user.userId, period, months);

      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch income expense trends',
      });
    }
  };

  /**
   * @swagger
   * /api/analytics/spending-patterns:
   *   get:
   *     summary: Get spending patterns by category
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: months
   *         schema:
   *           type: integer
   *           default: 6
   *         description: Number of months to analyze
   *     responses:
   *       200:
   *         description: Spending patterns retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/SpendingPattern'
   *       401:
   *         description: Unauthorized
   */
  getSpendingPatterns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string) : 6;

      const patterns = await this.analyticsService.getSpendingPatterns(req.user.userId, months);

      res.status(200).json({
        success: true,
        data: patterns,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch spending patterns',
      });
    }
  };

  /**
   * @swagger
   * /api/analytics/financial-summary:
   *   get:
   *     summary: Get overall financial summary
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Financial summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/FinancialSummary'
   *       401:
   *         description: Unauthorized
   */
  getFinancialSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const summary = await this.analyticsService.getFinancialSummary(req.user.userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch financial summary',
      });
    }
  };

  /**
   * @swagger
   * /api/analytics/forecasts:
   *   get:
   *     summary: Get financial forecasts
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: monthsAhead
   *         schema:
   *           type: integer
   *           default: 6
   *         description: Number of months to forecast ahead
   *     responses:
   *       200:
   *         description: Forecast retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/ForecastData'
   *       401:
   *         description: Unauthorized
   */
  getForecast = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const monthsAhead = req.query.monthsAhead ? parseInt(req.query.monthsAhead as string) : 6;

      const forecast = await this.analyticsService.getForecast(req.user.userId, monthsAhead);

      res.status(200).json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forecast',
      });
    }
  };

  /**
   * @swagger
   * /api/analytics/goal-progress:
   *   get:
   *     summary: Get comprehensive goal progress report
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Goal progress report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalActiveGoals:
   *                       type: integer
   *                     totalTargetAmount:
   *                       type: number
   *                     totalRemainingAmount:
   *                       type: number
   *                     averageProgress:
   *                       type: number
   *                     goalsByUrgency:
   *                       type: object
   *                       properties:
   *                         urgent:
   *                           type: integer
   *                         moderate:
   *                           type: integer
   *                         longTerm:
   *                           type: integer
   *                         overdue:
   *                           type: integer
   *                     topPriorityGoals:
   *                       type: array
   *                       items:
   *                         type: object
   *       401:
   *         description: Unauthorized
   */
  getGoalProgressReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const report = await this.analyticsService.getGoalProgressReport(req.user.userId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch goal progress report',
      });
    }
  };

  /**
   * @swagger
   * /api/analytics/cash-flow:
   *   get:
   *     summary: Get cash flow analysis
   *     tags: [Analytics]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: months
   *         schema:
   *           type: integer
   *           default: 12
   *         description: Number of months to analyze
   *     responses:
   *       200:
   *         description: Cash flow analysis retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     trends:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/IncomeExpenseTrend'
   *                     summary:
   *                       type: object
   *                       properties:
   *                         totalIncome:
   *                           type: number
   *                         totalExpense:
   *                           type: number
   *                         totalNet:
   *                           type: number
   *                         averageMonthlyIncome:
   *                           type: number
   *                         averageMonthlyExpense:
   *                           type: number
   *                         averageMonthlyNet:
   *                           type: number
   *                         positiveMonths:
   *                           type: integer
   *                         negativeMonths:
   *                           type: integer
   *                         bestMonth:
   *                           $ref: '#/components/schemas/IncomeExpenseTrend'
   *                         worstMonth:
   *                           $ref: '#/components/schemas/IncomeExpenseTrend'
   *       401:
   *         description: Unauthorized
   */
  getCashFlowAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string) : 12;

      const analysis = await this.analyticsService.getCashFlowAnalysis(req.user.userId, months);

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cash flow analysis',
      });
    }
  };
}