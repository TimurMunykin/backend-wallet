import { Response } from 'express';
import { SalaryService, CreateSalaryPaymentDto, UpdateSalaryPaymentDto, ConfirmSalaryReceiptDto } from '../services/SalaryService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     SalaryPayment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         account_id:
 *           type: integer
 *         expected_amount:
 *           type: number
 *         description:
 *           type: string
 *         start_day:
 *           type: integer
 *           minimum: 1
 *           maximum: 31
 *         end_day:
 *           type: integer
 *           minimum: 1
 *           maximum: 31
 *         frequency:
 *           type: string
 *           enum: [monthly, quarterly]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     SalaryReceipt:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         salary_payment_id:
 *           type: integer
 *         transaction_id:
 *           type: integer
 *           nullable: true
 *         period_year_month:
 *           type: string
 *           format: date
 *         expected_amount:
 *           type: number
 *         actual_amount:
 *           type: number
 *           nullable: true
 *         received:
 *           type: boolean
 *         received_at:
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

export class SalaryController {
  private salaryService: SalaryService;

  constructor() {
    this.salaryService = new SalaryService();
  }

  /**
   * @swagger
   * /api/salary:
   *   get:
   *     summary: Get user's salary payments
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Salary payments retrieved successfully
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
   *                     $ref: '#/components/schemas/SalaryPayment'
   *       401:
   *         description: Unauthorized
   */
  getSalaryPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const payments = await this.salaryService.getSalaryPayments(req.user.userId);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch salary payments',
      });
    }
  };

  /**
   * @swagger
   * /api/salary:
   *   post:
   *     summary: Create a new salary payment
   *     tags: [Salary]
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
   *               - expectedAmount
   *               - description
   *               - startDay
   *               - endDay
   *               - frequency
   *             properties:
   *               accountId:
   *                 type: integer
   *               expectedAmount:
   *                 type: number
   *               description:
   *                 type: string
   *               startDay:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *                 description: Start day of salary period
   *               endDay:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *                 description: End day of salary period
   *               frequency:
   *                 type: string
   *                 enum: [monthly, quarterly]
   *     responses:
   *       201:
   *         description: Salary payment created successfully
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
   *                   $ref: '#/components/schemas/SalaryPayment'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createSalaryPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { accountId, expectedAmount, description, startDay, endDay, frequency } = req.body;

      if (!accountId || !expectedAmount || !description || !startDay || !endDay || !frequency) {
        res.status(400).json({
          success: false,
          message: 'Account ID, expected amount, description, start day, end day, and frequency are required',
        });
        return;
      }

      if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) {
        res.status(400).json({
          success: false,
          message: 'Start day and end day must be between 1 and 31',
        });
        return;
      }

      const paymentData: CreateSalaryPaymentDto = {
        accountId,
        expectedAmount,
        description,
        startDay,
        endDay,
        frequency,
      };

      const payment = await this.salaryService.createSalaryPayment(req.user.userId, paymentData);

      res.status(201).json({
        success: true,
        message: 'Salary payment created successfully',
        data: payment,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Salary payment creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/salary/{id}:
   *   get:
   *     summary: Get salary payment by ID
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Salary payment ID
   *     responses:
   *       200:
   *         description: Salary payment retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/SalaryPayment'
   *       400:
   *         description: Invalid salary payment ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Salary payment not found
   */
  getSalaryPaymentById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          message: 'Invalid salary payment ID',
        });
        return;
      }

      const payment = await this.salaryService.getSalaryPaymentById(paymentId, req.user.userId);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Salary payment not found',
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
        message: 'Failed to fetch salary payment',
      });
    }
  };

  /**
   * @swagger
   * /api/salary/{id}:
   *   put:
   *     summary: Update salary payment
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Salary payment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               expectedAmount:
   *                 type: number
   *               description:
   *                 type: string
   *               startDay:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *               endDay:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 31
   *               frequency:
   *                 type: string
   *                 enum: [monthly, quarterly]
   *     responses:
   *       200:
   *         description: Salary payment updated successfully
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
   *                   $ref: '#/components/schemas/SalaryPayment'
   *       400:
   *         description: Validation error or invalid salary payment ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Salary payment not found
   */
  updateSalaryPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          message: 'Invalid salary payment ID',
        });
        return;
      }

      const { expectedAmount, description, startDay, endDay, frequency } = req.body;
      const updateData: UpdateSalaryPaymentDto = {};

      if (expectedAmount !== undefined) updateData.expectedAmount = expectedAmount;
      if (description) updateData.description = description;
      if (startDay !== undefined) {
        if (startDay < 1 || startDay > 31) {
          res.status(400).json({
            success: false,
            message: 'Start day must be between 1 and 31',
          });
          return;
        }
        updateData.startDay = startDay;
      }
      if (endDay !== undefined) {
        if (endDay < 1 || endDay > 31) {
          res.status(400).json({
            success: false,
            message: 'End day must be between 1 and 31',
          });
          return;
        }
        updateData.endDay = endDay;
      }
      if (frequency) updateData.frequency = frequency;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      const payment = await this.salaryService.updateSalaryPayment(paymentId, req.user.userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Salary payment updated successfully',
        data: payment,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Salary payment not found') {
        res.status(404).json({
          success: false,
          message: 'Salary payment not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Salary payment update failed',
      });
    }
  };

  /**
   * @swagger
   * /api/salary/{id}:
   *   delete:
   *     summary: Delete salary payment
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Salary payment ID
   *     responses:
   *       200:
   *         description: Salary payment deleted successfully
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
   *         description: Invalid salary payment ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Salary payment not found
   */
  deleteSalaryPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
          message: 'Invalid salary payment ID',
        });
        return;
      }

      await this.salaryService.deleteSalaryPayment(paymentId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Salary payment deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Salary payment not found') {
        res.status(404).json({
          success: false,
          message: 'Salary payment not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Salary payment deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/salary/receipts/{id}/confirm:
   *   post:
   *     summary: Confirm salary receipt
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Salary receipt ID
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               actualAmount:
   *                 type: number
   *                 description: Actual amount received (defaults to expected amount)
   *               notes:
   *                 type: string
   *                 description: Optional notes about the receipt
   *     responses:
   *       200:
   *         description: Salary receipt confirmed successfully
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
   *                   $ref: '#/components/schemas/SalaryReceipt'
   *       400:
   *         description: Invalid receipt ID or already confirmed
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Salary receipt not found
   */
  confirmSalaryReceipt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const receiptId = parseInt(req.params.id);

      if (isNaN(receiptId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid receipt ID',
        });
        return;
      }

      const { actualAmount, notes } = req.body;
      const confirmData: ConfirmSalaryReceiptDto = {};

      if (actualAmount !== undefined) confirmData.actualAmount = actualAmount;
      if (notes) confirmData.notes = notes;

      const receipt = await this.salaryService.confirmSalaryReceipt(receiptId, req.user.userId, confirmData);

      res.status(200).json({
        success: true,
        message: 'Salary receipt confirmed successfully',
        data: receipt,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Salary receipt not found') {
          res.status(404).json({
            success: false,
            message: 'Salary receipt not found',
          });
          return;
        }
        if (error.message === 'Salary already confirmed') {
          res.status(400).json({
            success: false,
            message: 'Salary already confirmed',
          });
          return;
        }
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Salary receipt confirmation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/salary/upcoming:
   *   get:
   *     summary: Get upcoming salary receipts
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: months
   *         schema:
   *           type: integer
   *           default: 6
   *         description: Number of months to look ahead
   *     responses:
   *       200:
   *         description: Upcoming receipts retrieved successfully
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
   *                     $ref: '#/components/schemas/SalaryReceipt'
   *       401:
   *         description: Unauthorized
   */
  getUpcomingSalaryReceipts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string) : 6;

      const receipts = await this.salaryService.getUpcomingSalaryReceipts(req.user.userId, months);

      res.status(200).json({
        success: true,
        data: receipts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch upcoming salary receipts',
      });
    }
  };

  /**
   * @swagger
   * /api/salary/receipts:
   *   get:
   *     summary: Get salary receipts by period
   *     tags: [Salary]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: year
   *         required: true
   *         schema:
   *           type: integer
   *         description: Year to filter by
   *       - in: query
   *         name: month
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 12
   *         description: Month to filter by (optional)
   *     responses:
   *       200:
   *         description: Salary receipts retrieved successfully
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
   *                     $ref: '#/components/schemas/SalaryReceipt'
   *       400:
   *         description: Invalid year or month parameter
   *       401:
   *         description: Unauthorized
   */
  getSalaryReceiptsByPeriod = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const year = parseInt(req.query.year as string);
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      if (isNaN(year)) {
        res.status(400).json({
          success: false,
          message: 'Year parameter is required and must be a valid number',
        });
        return;
      }

      if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
        res.status(400).json({
          success: false,
          message: 'Month parameter must be between 1 and 12',
        });
        return;
      }

      const receipts = await this.salaryService.getSalaryReceiptsByPeriod(req.user.userId, year, month);

      res.status(200).json({
        success: true,
        data: receipts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch salary receipts',
      });
    }
  };
}