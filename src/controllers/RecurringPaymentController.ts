import { Response } from 'express';
import { RecurringPaymentService, CreateRecurringPaymentDto, UpdateRecurringPaymentDto, ExecuteRecurringPaymentDto } from '../services/RecurringPaymentService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     RecurringPayment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         account_id:
 *           type: integer
 *         amount:
 *           type: number
 *         type:
 *           type: string
 *           enum: [income, expense]
 *         description:
 *           type: string
 *         frequency:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         start_date:
 *           type: string
 *           format: date
 *         end_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         day_of_month:
 *           type: integer
 *           nullable: true
 *         day_of_week:
 *           type: integer
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     RecurringExecution:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         recurring_payment_id:
 *           type: integer
 *         transaction_id:
 *           type: integer
 *           nullable: true
 *         expected_date:
 *           type: string
 *           format: date
 *         expected_amount:
 *           type: number
 *         actual_amount:
 *           type: number
 *           nullable: true
 *         executed:
 *           type: boolean
 *         executed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export class RecurringPaymentController {
  private recurringPaymentService: RecurringPaymentService;

  constructor() {
    this.recurringPaymentService = new RecurringPaymentService();
  }

  /**
   * @swagger
   * /api/recurring-payments:
   *   get:
   *     summary: Get user's recurring payments
   *     tags: [Recurring Payments]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Recurring payments retrieved successfully
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
   *                     $ref: '#/components/schemas/RecurringPayment'
   *       401:
   *         description: Unauthorized
   */
  getRecurringPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const payments = await this.recurringPaymentService.getRecurringPayments(req.user.userId);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recurring payments',
      });
    }
  };

  /**
   * @swagger
   * /api/recurring-payments:
   *   post:
   *     summary: Create a new recurring payment
   *     tags: [Recurring Payments]
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
   *               - amount
   *               - type
   *               - description
   *               - frequency
   *               - startDate
   *             properties:
   *               accountId:
   *                 type: integer
   *               amount:
   *                 type: number
   *               type:
   *                 type: string
   *                 enum: [income, expense]
   *               description:
   *                 type: string
   *               frequency:
   *                 type: string
   *                 enum: [daily, weekly, monthly]
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               dayOfMonth:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *               dayOfWeek:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 6
   *     responses:
   *       201:
   *         description: Recurring payment created successfully
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
   *                   $ref: '#/components/schemas/RecurringPayment'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createRecurringPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { accountId, amount, type, description, frequency, startDate, endDate, dayOfMonth, dayOfWeek } = req.body;

      if (!accountId || !amount || !type || !description || !frequency || !startDate) {
        res.status(400).json({
          success: false,
          message: 'Account ID, amount, type, description, frequency, and start date are required',
        });
        return;
      }

      const paymentData: CreateRecurringPaymentDto = {
        accountId,
        amount,
        type,
        description,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        dayOfMonth,
        dayOfWeek,
      };

      const payment = await this.recurringPaymentService.createRecurringPayment(req.user.userId, paymentData);

      res.status(201).json({
        success: true,
        message: 'Recurring payment created successfully',
        data: payment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Recurring payment creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/recurring-payments/{id}:
   *   get:
   *     summary: Get recurring payment by ID
   *     tags: [Recurring Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Recurring payment ID
   *     responses:
   *       200:
   *         description: Recurring payment retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/RecurringPayment'
   *       400:
   *         description: Invalid recurring payment ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Recurring payment not found
   */
  getRecurringPaymentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const paymentId = parseInt(req.params.id);

      if (isNaN(paymentId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid recurring payment ID',
        });
        return;
      }

      const payment = await this.recurringPaymentService.getRecurringPaymentById(paymentId, req.user.userId);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Recurring payment not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recurring payment',
      });
    }
  };

  /**
   * @swagger
   * /api/recurring-payments/{id}:
   *   put:
   *     summary: Update recurring payment
   *     tags: [Recurring Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Recurring payment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *               description:
   *                 type: string
   *               frequency:
   *                 type: string
   *                 enum: [daily, weekly, monthly]
   *               startDate:
   *                 type: string
   *                 format: date
   *               endDate:
   *                 type: string
   *                 format: date
   *               dayOfMonth:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *               dayOfWeek:
   *                 type: integer
   *                 minimum: 0
   *                 maximum: 6
   *     responses:
   *       200:
   *         description: Recurring payment updated successfully
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
   *                   $ref: '#/components/schemas/RecurringPayment'
   *       400:
   *         description: Validation error or invalid recurring payment ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Recurring payment not found
   */
  updateRecurringPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const paymentId = parseInt(req.params.id);

      if (isNaN(paymentId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid recurring payment ID',
        });
        return;
      }

      const { amount, description, frequency, startDate, endDate, dayOfMonth, dayOfWeek } = req.body;
      const updateData: UpdateRecurringPaymentDto = {};

      if (amount !== undefined) updateData.amount = amount;
      if (description) updateData.description = description;
      if (frequency) updateData.frequency = frequency;
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      if (dayOfMonth !== undefined) updateData.dayOfMonth = dayOfMonth;
      if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      const payment = await this.recurringPaymentService.updateRecurringPayment(paymentId, req.user.userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Recurring payment updated successfully',
        data: payment,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Recurring payment not found') {
        res.status(404).json({
          success: false,
          message: 'Recurring payment not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Recurring payment update failed',
      });
    }
  };

  /**
   * @swagger
   * /api/recurring-payments/{id}:
   *   delete:
   *     summary: Delete recurring payment
   *     tags: [Recurring Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Recurring payment ID
   *     responses:
   *       200:
   *         description: Recurring payment deleted successfully
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
   *         description: Invalid recurring payment ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Recurring payment not found
   */
  deleteRecurringPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const paymentId = parseInt(req.params.id);

      if (isNaN(paymentId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid recurring payment ID',
        });
        return;
      }

      await this.recurringPaymentService.deleteRecurringPayment(paymentId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Recurring payment deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Recurring payment not found') {
        res.status(404).json({
          success: false,
          message: 'Recurring payment not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Recurring payment deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/recurring-payments/executions/{id}:
   *   post:
   *     summary: Execute a recurring payment
   *     tags: [Recurring Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Recurring execution ID
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               actualAmount:
   *                 type: number
   *                 description: Actual amount (defaults to expected amount)
   *               notes:
   *                 type: string
   *                 description: Optional notes about the execution
   *     responses:
   *       200:
   *         description: Recurring payment executed successfully
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
   *                   $ref: '#/components/schemas/RecurringExecution'
   *       400:
   *         description: Invalid execution ID or already executed
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Recurring execution not found
   */
  executeRecurringPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const executionId = parseInt(req.params.id);

      if (isNaN(executionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid execution ID',
        });
        return;
      }

      const { actualAmount, notes } = req.body;
      const executeData: ExecuteRecurringPaymentDto = {};

      if (actualAmount !== undefined) executeData.actualAmount = actualAmount;
      if (notes) executeData.notes = notes;

      const execution = await this.recurringPaymentService.executeRecurringPayment(executionId, req.user.userId, executeData);

      res.status(200).json({
        success: true,
        message: 'Recurring payment executed successfully',
        data: execution,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Recurring execution not found') {
          res.status(404).json({
            success: false,
            message: 'Recurring execution not found',
          });
          return;
        }
        if (error.message === 'Recurring payment already executed') {
          res.status(400).json({
            success: false,
            message: 'Recurring payment already executed',
          });
          return;
        }
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Recurring payment execution failed',
      });
    }
  };

  /**
   * @swagger
   * /api/recurring-payments/upcoming:
   *   get:
   *     summary: Get upcoming recurring payment executions
   *     tags: [Recurring Payments]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           default: 30
   *         description: Number of days to look ahead
   *     responses:
   *       200:
   *         description: Upcoming executions retrieved successfully
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
   *                     $ref: '#/components/schemas/RecurringExecution'
   *       401:
   *         description: Unauthorized
   */
  getUpcomingExecutions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const executions = await this.recurringPaymentService.getUpcomingExecutions(req.user.userId, days);

      res.status(200).json({
        success: true,
        data: executions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming executions',
      });
    }
  };
}