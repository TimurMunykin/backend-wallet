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
 */

export class DailySpendingController {
  private dailySpendingService: DailySpendingService;

  constructor() {
    this.dailySpendingService = new DailySpendingService();
  }

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