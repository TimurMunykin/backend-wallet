import { Response } from 'express';
import { DailySpendingService } from '../services/DailySpendingService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     DailySpendingCalculation:
 *       type: object
 *       properties:
 *         dailyLimit:
 *           type: number
 *           description: Daily spending limit
 *         currentBalance:
 *           type: number
 *           description: Current total balance
 *         availableForGoals:
 *           type: number
 *           description: Amount available for goals
 *         daysRemaining:
 *           type: number
 *           description: Days remaining in period
 *         breakdown:
 *           type: object
 *           description: Detailed calculation breakdown
 *     DailySpendingConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         periodType:
 *           type: string
 *           enum: [toSalary, toMonthEnd, customDays, toSpecificDate]
 *         periodValue:
 *           type: integer
 *         includeSalary:
 *           type: boolean
 *         includeRecurringIncome:
 *           type: boolean
 *         includeRecurringExpenses:
 *           type: boolean
 *         selectedGoalIds:
 *           type: array
 *           items:
 *             type: integer
 *         emergencyBuffer:
 *           type: number
 *         isActive:
 *           type: boolean
 *         user_id:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export class DailySpendingController {
  private dailySpendingService: DailySpendingService;

  constructor() {
    this.dailySpendingService = new DailySpendingService();
  }

  /**
   * @swagger
   * /api/daily-spending/configs:
   *   post:
   *     summary: Create daily spending configuration
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - periodType
   *             properties:
   *               name:
   *                 type: string
   *               periodType:
   *                 type: string
   *                 enum: [toSalary, toMonthEnd, customDays, toSpecificDate]
   *               periodValue:
   *                 type: integer
   *               includeSalary:
   *                 type: boolean
   *                 default: true
   *               includeRecurringIncome:
   *                 type: boolean
   *                 default: true
   *               includeRecurringExpenses:
   *                 type: boolean
   *                 default: true
   *               selectedGoalIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *               emergencyBuffer:
   *                 type: number
   *                 default: 0
   *     responses:
   *       201:
   *         description: Configuration created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/DailySpendingConfig'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configData = req.body;

      if (!configData.name || !configData.periodType) {
        res.status(400).json({
          success: false,
          message: 'Name and period type are required',
        });
        return;
      }

      const config = await this.dailySpendingService.createConfig(req.user.userId, configData);

      res.status(201).json({
        success: true,
        message: 'Configuration created successfully',
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Configuration creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/daily-spending/configs:
   *   get:
   *     summary: Get user's daily spending configurations
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Configurations retrieved successfully
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
   *                     $ref: '#/components/schemas/DailySpendingConfig'
   *       401:
   *         description: Unauthorized
   */
  getConfigs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configs = await this.dailySpendingService.getUserConfigs(req.user.userId);

      res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configurations',
      });
    }
  };

  /**
   * @swagger
   * /api/daily-spending/configs/{id}:
   *   get:
   *     summary: Get daily spending configuration by ID
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Configuration ID
   *     responses:
   *       200:
   *         description: Configuration retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DailySpendingConfig'
   *       400:
   *         description: Invalid configuration ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Configuration not found
   */
  getConfigById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configId = parseInt(req.params['id'] as string);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration ID',
        });
        return;
      }

      const config = await this.dailySpendingService.getConfigById(configId, req.user.userId);

      if (!config) {
        res.status(404).json({
          success: false,
          message: 'Configuration not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configuration',
      });
    }
  };

  /**
   * @swagger
   * /api/daily-spending/configs/{id}:
   *   put:
   *     summary: Update daily spending configuration
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Configuration ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               periodType:
   *                 type: string
   *                 enum: [toSalary, toMonthEnd, customDays, toSpecificDate]
   *               periodValue:
   *                 type: integer
   *               includeSalary:
   *                 type: boolean
   *               includeRecurringIncome:
   *                 type: boolean
   *               includeRecurringExpenses:
   *                 type: boolean
   *               selectedGoalIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *               emergencyBuffer:
   *                 type: number
   *     responses:
   *       200:
   *         description: Configuration updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/DailySpendingConfig'
   *       400:
   *         description: Validation error or invalid configuration ID
   *       401:
   *         description: Unauthorized
   */
  updateConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configId = parseInt(req.params['id'] as string);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration ID',
        });
        return;
      }

      const config = await this.dailySpendingService.updateConfig(configId, req.user.userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully',
        data: config,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Configuration update failed',
      });
    }
  };

  /**
   * @swagger
   * /api/daily-spending/configs/{id}:
   *   delete:
   *     summary: Delete daily spending configuration
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Configuration ID
   *     responses:
   *       200:
   *         description: Configuration deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid configuration ID or deletion failed
   *       401:
   *         description: Unauthorized
   */
  deleteConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configId = parseInt(req.params['id'] as string);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration ID',
        });
        return;
      }

      await this.dailySpendingService.deleteConfig(configId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Configuration deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Configuration deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/daily-spending/configs/{id}/activate:
   *   post:
   *     summary: Activate daily spending configuration
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Configuration ID
   *     responses:
   *       200:
   *         description: Configuration activated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid configuration ID or activation failed
   *       401:
   *         description: Unauthorized
   */
  activateConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configId = parseInt(req.params['id'] as string);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration ID',
        });
        return;
      }

      await this.dailySpendingService.activateConfig(configId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Configuration activated successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Configuration activation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/daily-spending/calculate:
   *   get:
   *     summary: Calculate daily spending limit
   *     description: Calculate daily spending limit based on current balance, goals, and configuration
   *     tags: [Daily Spending]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: configId
   *         schema:
   *           type: integer
   *         description: Optional configuration ID (uses active config if not provided)
   *     responses:
   *       200:
   *         description: Daily spending calculation successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/DailySpendingCalculation'
   *       401:
   *         description: Unauthorized
   */
  calculateDailySpending = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const configId = req.query['configId'] ? parseInt(req.query['configId'] as string) : undefined;

      const calculation = await this.dailySpendingService.calculateDailySpending(req.user.userId, configId);

      res.status(200).json({
        success: true,
        data: calculation,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Daily spending calculation failed',
      });
    }
  };
}