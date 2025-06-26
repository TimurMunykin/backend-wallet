import { Response } from 'express';
import { AccountService } from '../services/AccountService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         balance:
 *           type: number
 *         currency:
 *           type: string
 *         user_id:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AccountSummary:
 *       type: object
 *       properties:
 *         account:
 *           $ref: '#/components/schemas/Account'
 *         totalIncome:
 *           type: number
 *         totalExpense:
 *           type: number
 *         transactionCount:
 *           type: integer
 */

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  /**
   * @swagger
   * /api/accounts:
   *   post:
   *     summary: Create a new account
   *     tags: [Accounts]
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
   *             properties:
   *               name:
   *                 type: string
   *               balance:
   *                 type: number
   *                 default: 0
   *               currency:
   *                 type: string
   *                 default: USD
   *     responses:
   *       201:
   *         description: Account created successfully
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
   *                   $ref: '#/components/schemas/Account'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  createAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { name, balance, currency } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Account name is required',
        });
        return;
      }

      const account = await this.accountService.createAccount(req.user.userId, {
        name,
        balance,
        currency,
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: account,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Account creation failed',
      });
    }
  };

  /**
   * @swagger
   * /api/accounts:
   *   get:
   *     summary: Get user accounts
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Accounts retrieved successfully
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
   *                     $ref: '#/components/schemas/Account'
   *       401:
   *         description: Unauthorized
   */
  getAccounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const accounts = await this.accountService.getUserAccounts(req.user.userId);

      res.status(200).json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch accounts',
      });
    }
  };

  /**
   * @swagger
   * /api/accounts/{id}:
   *   get:
   *     summary: Get account by ID
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Account ID
   *     responses:
   *       200:
   *         description: Account retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Account'
   *       400:
   *         description: Invalid account ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Account not found
   */
  getAccountById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const accountId = parseInt(req.params['id'] as string);

      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid account ID',
        });
        return;
      }

      const account = await this.accountService.getAccountById(accountId, req.user.userId);

      if (!account) {
        res.status(404).json({
          success: false,
          message: 'Account not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: account,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch account',
      });
    }
  };

  /**
   * @swagger
   * /api/accounts/{id}:
   *   put:
   *     summary: Update account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Account ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               currency:
   *                 type: string
   *     responses:
   *       200:
   *         description: Account updated successfully
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
   *                   $ref: '#/components/schemas/Account'
   *       400:
   *         description: Validation error or invalid account ID
   *       401:
   *         description: Unauthorized
   */
  updateAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const accountId = parseInt(req.params['id'] as string);

      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid account ID',
        });
        return;
      }

      const { name, currency } = req.body;
      const updateData: { name?: string; currency?: string } = {};

      if (name) updateData.name = name;
      if (currency) updateData.currency = currency;

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
        return;
      }

      const account = await this.accountService.updateAccount(accountId, req.user.userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Account updated successfully',
        data: account,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Account update failed',
      });
    }
  };

  /**
   * @swagger
   * /api/accounts/{id}:
   *   delete:
   *     summary: Delete account
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Account ID
   *     responses:
   *       200:
   *         description: Account deleted successfully
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
   *         description: Invalid account ID or deletion failed
   *       401:
   *         description: Unauthorized
   */
  deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const accountId = parseInt(req.params['id'] as string);

      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid account ID',
        });
        return;
      }

      await this.accountService.deleteAccount(accountId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Account deletion failed',
      });
    }
  };

  /**
   * @swagger
   * /api/accounts/{id}/summary:
   *   get:
   *     summary: Get account transaction summary
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Account ID
   *     responses:
   *       200:
   *         description: Account summary retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/AccountSummary'
   *       400:
   *         description: Invalid account ID
   *       401:
   *         description: Unauthorized
   */
  getAccountSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const accountId = parseInt(req.params['id'] as string);

      if (isNaN(accountId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid account ID',
        });
        return;
      }

      const summary = await this.accountService.getAccountTransactionSummary(accountId, req.user.userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get account summary',
      });
    }
  };

  /**
   * @swagger
   * /api/accounts/total-balance:
   *   get:
   *     summary: Get total balance across all accounts
   *     tags: [Accounts]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Total balance retrieved successfully
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
   *                     totalBalance:
   *                       type: number
   *       401:
   *         description: Unauthorized
   */
  getTotalBalance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const totalBalance = await this.accountService.getTotalBalance(req.user.userId);

      res.status(200).json({
        success: true,
        data: { totalBalance },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to calculate total balance',
      });
    }
  };
}