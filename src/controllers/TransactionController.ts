import { Response } from 'express';
import { TransactionService, CreateTransactionDto, UpdateTransactionDto, TransactionFilters, PaginationOptions } from '../services/TransactionService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
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
 *         transaction_date:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PaginatedTransactions:
 *       type: object
 *       properties:
 *         transactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Transaction'
 *         total:
 *           type: integer
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * @swagger
   * /api/transactions:
   *   get:
   *     summary: Get transactions with filtering and pagination
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: accountId
   *         schema:
   *           type: integer
   *         description: Filter by account ID
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [income, expense]
   *         description: Filter by transaction type
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
   *       - in: query
   *         name: minAmount
   *         schema:
   *           type: number
   *         description: Minimum amount filter
   *       - in: query
   *         name: maxAmount
   *         schema:
   *           type: number
   *         description: Maximum amount filter
   *       - in: query
   *         name: description
   *         schema:
   *           type: string
   *         description: Search in description
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Items per page
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: transaction_date
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [ASC, DESC]
   *           default: DESC
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Transactions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/PaginatedTransactions'
   *       401:
   *         description: Unauthorized
   */
  getTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const filters: TransactionFilters = {};
      const pagination: PaginationOptions = {};

      // Parse filters
      if (req.query.accountId) filters.accountId = parseInt(req.query.accountId as string);
      if (req.query.type) filters.type = req.query.type as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.minAmount) filters.minAmount = parseFloat(req.query.minAmount as string);
      if (req.query.maxAmount) filters.maxAmount = parseFloat(req.query.maxAmount as string);
      if (req.query.description) filters.description = req.query.description as string;

      // Parse pagination
      if (req.query.page) pagination.page = parseInt(req.query.page as string);
      if (req.query.limit) pagination.limit = parseInt(req.query.limit as string);
      if (req.query.sortBy) pagination.sortBy = req.query.sortBy as string;
      if (req.query.sortOrder) pagination.sortOrder = req.query.sortOrder as 'ASC' | 'DESC';

      const result = await this.transactionService.getTransactions(req.user.userId, filters, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transactions',
      });
    }
  };

  /**
   * @swagger
   * /api/transactions:
   *   post:
   *     summary: Create a new transaction
   *     tags: [Transactions]
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
   *               transactionDate:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       201:
   *         description: Transaction created successfully
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
   *                   $ref: '#/components/schemas/Transaction'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { accountId, amount, type, description, transactionDate } = req.body;

      if (!accountId || !amount || !type || !description) {
        res.status(400).json({
          success: false,
          message: 'Account ID, amount, type, and description are required',
        });
        return;
      }

      const transactionData: CreateTransactionDto = {
        accountId,
        amount,
        type,
        description,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
      };

      const transaction = await this.transactionService.createTransaction(req.user.userId, transactionData);

      res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data: transaction,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Transaction creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/transactions/{id}:
   *   get:
   *     summary: Get transaction by ID
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Transaction ID
   *     responses:
   *       200:
   *         description: Transaction retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Transaction'
   *       400:
   *         description: Invalid transaction ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Transaction not found
   */
  getTransactionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const transactionId = parseInt(req.params.id);

      if (isNaN(transactionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid transaction ID',
        });
        return;
      }

      const transaction = await this.transactionService.getTransactionById(transactionId, req.user.userId);

      if (!transaction) {
        res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction',
      });
    }
  };

  /**
   * @swagger
   * /api/transactions/{id}:
   *   put:
   *     summary: Update transaction
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Transaction ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *               type:
   *                 type: string
   *                 enum: [income, expense]
   *               description:
   *                 type: string
   *               transactionDate:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: Transaction updated successfully
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
   *                   $ref: '#/components/schemas/Transaction'
   *       400:
   *         description: Validation error or invalid transaction ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Transaction not found
   */
  updateTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const transactionId = parseInt(req.params.id);

      if (isNaN(transactionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid transaction ID',
        });
        return;
      }

      const { amount, type, description, transactionDate } = req.body;
      const updateData: UpdateTransactionDto = {};

      if (amount !== undefined) updateData.amount = amount;
      if (type) updateData.type = type;
      if (description) updateData.description = description;
      if (transactionDate) updateData.transactionDate = new Date(transactionDate);

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      const transaction = await this.transactionService.updateTransaction(transactionId, req.user.userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Transaction updated successfully',
        data: transaction,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Transaction not found') {
        res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Transaction update failed',
      });
    }
  };

  /**
   * @swagger
   * /api/transactions/{id}:
   *   delete:
   *     summary: Delete transaction
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Transaction ID
   *     responses:
   *       200:
   *         description: Transaction deleted successfully
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
   *         description: Invalid transaction ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Transaction not found
   */
  deleteTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const transactionId = parseInt(req.params.id);

      if (isNaN(transactionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid transaction ID',
        });
        return;
      }

      await this.transactionService.deleteTransaction(transactionId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Transaction not found') {
        res.status(404).json({
          success: false,
          message: 'Transaction not found',
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Transaction deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/transactions/bulk:
   *   post:
   *     summary: Create multiple transactions
   *     tags: [Transactions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - transactions
   *             properties:
   *               transactions:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required:
   *                     - accountId
   *                     - amount
   *                     - type
   *                     - description
   *                   properties:
   *                     accountId:
   *                       type: integer
   *                     amount:
   *                       type: number
   *                     type:
   *                       type: string
   *                       enum: [income, expense]
   *                     description:
   *                       type: string
   *                     transactionDate:
   *                       type: string
   *                       format: date-time
   *     responses:
   *       201:
   *         description: Transactions created successfully
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
   *                     $ref: '#/components/schemas/Transaction'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  bulkCreateTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { transactions } = req.body;

      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Transactions array is required and must not be empty',
        });
        return;
      }

      // Validate each transaction
      for (const transaction of transactions) {
        if (!transaction.accountId || !transaction.amount || !transaction.type || !transaction.description) {
          res.status(400).json({
            success: false,
            message: 'Each transaction must have accountId, amount, type, and description',
          });
          return;
        }
      }

      const transactionData: CreateTransactionDto[] = transactions.map((t: any) => ({
        accountId: t.accountId,
        amount: t.amount,
        type: t.type,
        description: t.description,
        transactionDate: t.transactionDate ? new Date(t.transactionDate) : undefined,
      }));

      const createdTransactions = await this.transactionService.bulkCreateTransactions(req.user.userId, transactionData);

      res.status(201).json({
        success: true,
        message: `${createdTransactions.length} transactions created successfully`,
        data: createdTransactions,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Bulk transaction creation failed',
      });
    }
  };
}