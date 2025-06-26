import { Response } from 'express';
import { SnapshotService, CreateSnapshotDto, SnapshotFilters } from '../services/SnapshotService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     Snapshot:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         account_id:
 *           type: integer
 *         balance:
 *           type: number
 *         total_income:
 *           type: number
 *         total_expense:
 *           type: number
 *         transactions_count:
 *           type: integer
 *         recent_transactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *         goals_progress:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               goalId:
 *                 type: integer
 *               title:
 *                 type: string
 *               progress:
 *                 type: number
 *               remainingAmount:
 *                 type: number
 *               daysRemaining:
 *                 type: integer
 *         snapshot_date:
 *           type: string
 *           format: date-time
 *         notes:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *     SnapshotComparison:
 *       type: object
 *       properties:
 *         snapshot1:
 *           $ref: '#/components/schemas/Snapshot'
 *         snapshot2:
 *           $ref: '#/components/schemas/Snapshot'
 *         comparison:
 *           type: object
 *           properties:
 *             balanceDiff:
 *               type: number
 *             incomeDiff:
 *               type: number
 *             expenseDiff:
 *               type: number
 *             transactionsDiff:
 *               type: integer
 *             timeDiff:
 *               type: integer
 *               description: Time difference in days
 */

export class SnapshotController {
  private snapshotService: SnapshotService;

  constructor() {
    this.snapshotService = new SnapshotService();
  }

  /**
   * @swagger
   * /api/snapshots:
   *   get:
   *     summary: Get snapshots with optional filtering
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: accountId
   *         schema:
   *           type: integer
   *         description: Filter by account ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter from date (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter to date (YYYY-MM-DD)
   *     responses:
   *       200:
   *         description: Snapshots retrieved successfully
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
   *                     $ref: '#/components/schemas/Snapshot'
   *       401:
   *         description: Unauthorized
   */
  getSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const filters: SnapshotFilters = {};

      if (req.query.accountId) {
        filters.accountId = parseInt(req.query.accountId as string);
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const snapshots = await this.snapshotService.getSnapshots(req.user.userId, filters);

      res.status(200).json({
        success: true,
        data: snapshots,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch snapshots',
      });
    }
  };

  /**
   * @swagger
   * /api/snapshots:
   *   post:
   *     summary: Create a new snapshot
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountId
   *             properties:
   *               accountId:
   *                 type: integer
   *               notes:
   *                 type: string
   *     responses:
   *       201:
   *         description: Snapshot created successfully
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
   *                   $ref: '#/components/schemas/Snapshot'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createSnapshot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { accountId, notes } = req.body;

      if (!accountId) {
        res.status(400).json({
          success: false,
          message: 'Account ID is required',
        });
        return;
      }

      const snapshotData: CreateSnapshotDto = {
        accountId,
        notes,
      };

      const snapshot = await this.snapshotService.createSnapshot(req.user.userId, snapshotData);

      res.status(201).json({
        success: true,
        message: 'Snapshot created successfully',
        data: snapshot,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Snapshot creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/snapshots/daily:
   *   post:
   *     summary: Create automatic daily snapshots for all accounts
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Daily snapshots created successfully
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
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Snapshot'
   *       401:
   *         description: Unauthorized
   */
  createDailySnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const snapshots = await this.snapshotService.createAutomaticDailySnapshots(req.user.userId);

      res.status(201).json({
        success: true,
        message: `${snapshots.length} daily snapshots created successfully`,
        data: snapshots,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Daily snapshots creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/snapshots/{id}:
   *   get:
   *     summary: Get snapshot by ID
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Snapshot ID
   *     responses:
   *       200:
   *         description: Snapshot retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Snapshot'
   *       400:
   *         description: Invalid snapshot ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Snapshot not found
   */
  getSnapshotById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const snapshotId = parseInt(req.params.id);

      if (isNaN(snapshotId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid snapshot ID',
        });
        return;
      }

      const snapshot = await this.snapshotService.getSnapshotById(snapshotId, req.user.userId);

      if (!snapshot) {
        res.status(404).json({
          success: false,
          message: 'Snapshot not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch snapshot',
      });
    }
  };

  /**
   * @swagger
   * /api/snapshots/{id}:
   *   delete:
   *     summary: Delete snapshot
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Snapshot ID
   *     responses:
   *       200:
   *         description: Snapshot deleted successfully
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
   *         description: Invalid snapshot ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Snapshot not found
   */
  deleteSnapshot = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const snapshotId = parseInt(req.params.id);

      if (isNaN(snapshotId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid snapshot ID',
        });
        return;
      }

      await this.snapshotService.deleteSnapshot(snapshotId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Snapshot deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Snapshot not found') {
        res.status(404).json({
          success: false,
          message: 'Snapshot not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Snapshot deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/snapshots/trends:
   *   get:
   *     summary: Get snapshot trends over time
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: accountId
   *         schema:
   *           type: integer
   *         description: Filter by account ID (optional)
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           default: 30
   *         description: Number of days to look back
   *     responses:
   *       200:
   *         description: Snapshot trends retrieved successfully
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
   *                     type: object
   *                     properties:
   *                       date:
   *                         type: string
   *                         format: date
   *                       total_balance:
   *                         type: number
   *                       total_income:
   *                         type: number
   *                       total_expense:
   *                         type: number
   *                       total_transactions:
   *                         type: integer
   *       401:
   *         description: Unauthorized
   */
  getSnapshotTrends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const trends = await this.snapshotService.getSnapshotTrends(req.user.userId, accountId, days);

      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch snapshot trends',
      });
    }
  };

  /**
   * @swagger
   * /api/snapshots/compare:
   *   post:
   *     summary: Compare two snapshots
   *     tags: [Snapshots]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - snapshotId1
   *               - snapshotId2
   *             properties:
   *               snapshotId1:
   *                 type: integer
   *               snapshotId2:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Snapshots compared successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SnapshotComparison'
   *       400:
   *         description: Validation error or snapshots from different accounts
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: One or both snapshots not found
   */
  compareSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { snapshotId1, snapshotId2 } = req.body;

      if (!snapshotId1 || !snapshotId2) {
        res.status(400).json({
          success: false,
          message: 'Both snapshot IDs are required',
        });
        return;
      }

      const comparison = await this.snapshotService.compareSnapshots(
        snapshotId1,
        snapshotId2,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'One or both snapshots not found') {
          res.status(404).json({
            success: false,
            message: 'One or both snapshots not found',
          });
          return;
        }
        if (error.message === 'Snapshots must be from the same account') {
          res.status(400).json({
            success: false,
            message: 'Snapshots must be from the same account',
          });
          return;
        }
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Snapshot comparison failed',
      });
    }
  };
}