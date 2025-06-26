import { Response } from 'express';
import { GoalService, CreateGoalDto, UpdateGoalDto } from '../services/GoalService';
import { AccountService } from '../services/AccountService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     Goal:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         parent_goal_id:
 *           type: integer
 *           nullable: true
 *         title:
 *           type: string
 *         target_amount:
 *           type: number
 *         min_balance:
 *           type: number
 *         target_date:
 *           type: string
 *           format: date
 *         description:
 *           type: string
 *           nullable: true
 *         achieved:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     GoalProgress:
 *       type: object
 *       properties:
 *         goal:
 *           $ref: '#/components/schemas/Goal'
 *         progress:
 *           type: number
 *           description: Progress percentage (0-100)
 *         remainingAmount:
 *           type: number
 *         daysRemaining:
 *           type: integer
 *         dailyTargetAmount:
 *           type: number
 */

export class GoalController {
  private goalService: GoalService;
  private accountService: AccountService;

  constructor() {
    this.goalService = new GoalService();
    this.accountService = new AccountService();
  }

  /**
   * @swagger
   * /api/goals:
   *   get:
   *     summary: Get user's goals
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: hierarchical
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Return only top-level goals with children nested
   *     responses:
   *       200:
   *         description: Goals retrieved successfully
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
   *                     $ref: '#/components/schemas/Goal'
   *       401:
   *         description: Unauthorized
   */
  getGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const hierarchical = req.query.hierarchical === 'true';

      const goals = hierarchical
        ? await this.goalService.getHierarchicalGoals(req.user.userId)
        : await this.goalService.getUserGoals(req.user.userId);

      res.status(200).json({
        success: true,
        data: goals,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch goals',
      });
    }
  };

  /**
   * @swagger
   * /api/goals:
   *   post:
   *     summary: Create a new goal
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - targetAmount
   *               - targetDate
   *             properties:
   *               title:
   *                 type: string
   *               targetAmount:
   *                 type: number
   *               minBalance:
   *                 type: number
   *                 default: 0
   *               targetDate:
   *                 type: string
   *                 format: date
   *               description:
   *                 type: string
   *               parentGoalId:
   *                 type: integer
   *                 description: ID of parent goal for sub-goals
   *     responses:
   *       201:
   *         description: Goal created successfully
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
   *                   $ref: '#/components/schemas/Goal'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { title, targetAmount, minBalance, targetDate, description, parentGoalId } = req.body;

      if (!title || !targetAmount || !targetDate) {
        res.status(400).json({
          success: false,
          message: 'Title, target amount, and target date are required',
        });
        return;
      }

      if (targetAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Target amount must be greater than 0',
        });
        return;
      }

      const goalData: CreateGoalDto = {
        title,
        targetAmount,
        minBalance,
        targetDate: new Date(targetDate),
        description,
        parentGoalId,
      };

      const goal = await this.goalService.createGoal(req.user.userId, goalData);

      res.status(201).json({
        success: true,
        message: 'Goal created successfully',
        data: goal,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Goal creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/goals/{id}:
   *   get:
   *     summary: Get goal by ID
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Goal ID
   *     responses:
   *       200:
   *         description: Goal retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Goal'
   *       400:
   *         description: Invalid goal ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Goal not found
   */
  getGoalById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid goal ID',
        });
        return;
      }

      const goal = await this.goalService.getGoalById(goalId, req.user.userId);

      if (!goal) {
        res.status(404).json({
          success: false,
          message: 'Goal not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch goal',
      });
    }
  };

  /**
   * @swagger
   * /api/goals/{id}:
   *   put:
   *     summary: Update goal
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Goal ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               targetAmount:
   *                 type: number
   *               minBalance:
   *                 type: number
   *               targetDate:
   *                 type: string
   *                 format: date
   *               description:
   *                 type: string
   *               achieved:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Goal updated successfully
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
   *                   $ref: '#/components/schemas/Goal'
   *       400:
   *         description: Validation error or invalid goal ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Goal not found
   */
  updateGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid goal ID',
        });
        return;
      }

      const { title, targetAmount, minBalance, targetDate, description, achieved } = req.body;
      const updateData: UpdateGoalDto = {};

      if (title) updateData.title = title;
      if (targetAmount !== undefined) {
        if (targetAmount <= 0) {
          res.status(400).json({
            success: false,
            message: 'Target amount must be greater than 0',
          });
          return;
        }
        updateData.targetAmount = targetAmount;
      }
      if (minBalance !== undefined) updateData.minBalance = minBalance;
      if (targetDate) updateData.targetDate = new Date(targetDate);
      if (description !== undefined) updateData.description = description;
      if (achieved !== undefined) updateData.achieved = achieved;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      const goal = await this.goalService.updateGoal(goalId, req.user.userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Goal updated successfully',
        data: goal,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Goal not found') {
        res.status(404).json({
          success: false,
          message: 'Goal not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Goal update failed',
      });
    }
  };

  /**
   * @swagger
   * /api/goals/{id}:
   *   delete:
   *     summary: Delete goal
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Goal ID
   *     responses:
   *       200:
   *         description: Goal deleted successfully
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
   *         description: Invalid goal ID or cannot delete goal with sub-goals
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Goal not found
   */
  deleteGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid goal ID',
        });
        return;
      }

      await this.goalService.deleteGoal(goalId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Goal deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Goal not found') {
          res.status(404).json({
            success: false,
            message: 'Goal not found',
          });
          return;
        }
        if (error.message.includes('Cannot delete goal with sub-goals')) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete goal with sub-goals. Delete sub-goals first.',
          });
          return;
        }
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Goal deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/goals/{id}/progress:
   *   get:
   *     summary: Get goal progress
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Goal ID
   *     responses:
   *       200:
   *         description: Goal progress retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/GoalProgress'
   *       400:
   *         description: Invalid goal ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Goal not found
   */
  getGoalProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid goal ID',
        });
        return;
      }

      // Get current total balance
      const totalBalance = await this.accountService.getTotalBalance(req.user.userId);

      const progress = await this.goalService.getGoalProgress(goalId, req.user.userId, totalBalance);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Goal not found') {
        res.status(404).json({
          success: false,
          message: 'Goal not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch goal progress',
      });
    }
  };

  /**
   * @swagger
   * /api/goals/progress:
   *   get:
   *     summary: Get progress for all active goals
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Goals progress retrieved successfully
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
   *                     $ref: '#/components/schemas/GoalProgress'
   *       401:
   *         description: Unauthorized
   */
  getAllGoalsProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Get current total balance
      const totalBalance = await this.accountService.getTotalBalance(req.user.userId);

      const progressList = await this.goalService.getGoalsProgress(req.user.userId, totalBalance);

      res.status(200).json({
        success: true,
        data: progressList,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch goals progress',
      });
    }
  };

  /**
   * @swagger
   * /api/goals/{id}/achieve:
   *   post:
   *     summary: Mark goal as achieved
   *     tags: [Goals]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Goal ID
   *     responses:
   *       200:
   *         description: Goal marked as achieved successfully
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
   *                   $ref: '#/components/schemas/Goal'
   *       400:
   *         description: Invalid goal ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Goal not found
   */
  markGoalAsAchieved = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid goal ID',
        });
        return;
      }

      const goal = await this.goalService.markGoalAsAchieved(goalId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Goal marked as achieved successfully',
        data: goal,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Goal not found') {
        res.status(404).json({
          success: false,
          message: 'Goal not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark goal as achieved',
      });
    }
  };
}