import { Response } from 'express';
import { AccountService } from '../services/AccountService';
import { AuthenticatedRequest } from '../middleware/auth';

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

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