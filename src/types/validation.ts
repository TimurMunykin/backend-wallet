import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email address').optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
  balance: z.number().optional().default(0),
  currency: z.string().length(3, 'Currency must be 3 characters').optional().default('USD'),
});

export const UpdateAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long').optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
});

export const CreateTransactionSchema = z.object({
  accountId: z.number().int().positive('Account ID must be a positive integer'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['income', 'expense'], { required_error: 'Type must be income or expense' }),
  description: z.string().min(1, 'Description is required').max(255, 'Description too long'),
  transactionDate: z.string().datetime().optional(),
});

export const UpdateTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  type: z.enum(['income', 'expense']).optional(),
  description: z.string().min(1, 'Description is required').max(255, 'Description too long').optional(),
  transactionDate: z.string().datetime().optional(),
});

export const TransactionFiltersSchema = z.object({
  accountId: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive()).optional(),
  type: z.enum(['income', 'expense']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().positive()).optional(),
  maxAmount: z.string().transform(val => parseFloat(val)).pipe(z.number().positive()).optional(),
  description: z.string().optional(),
  page: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive()).optional().default('1'),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive().max(100)).optional().default('20'),
  sortBy: z.enum(['transaction_date', 'amount', 'created_at']).optional().default('transaction_date'),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

export const CreateDailySpendingConfigSchema = z.object({
  name: z.string().min(1, 'Configuration name is required').max(100, 'Name too long'),
  periodType: z.enum(['to_salary', 'to_month_end', 'custom_days', 'to_date']),
  customDays: z.number().int().positive('Custom days must be positive').optional(),
  customEndDate: z.string().datetime('Invalid date format').optional(),
  includePendingSalary: z.boolean().optional().default(true),
  includeRecurringIncome: z.boolean().optional().default(true),
  includeRecurringExpenses: z.boolean().optional().default(true),
  activeGoals: z.array(z.number().int().positive()).optional().default([]),
  goalPriorities: z.record(z.number().int().positive()).optional().default({}),
  emergencyBuffer: z.number().min(0, 'Emergency buffer cannot be negative').optional().default(0),
});

export const UpdateDailySpendingConfigSchema = CreateDailySpendingConfigSchema.partial();

export const IdParamSchema = z.object({
  id: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive('Invalid ID')),
});

export const DailySpendingQuerySchema = z.object({
  configId: z.string().transform(val => parseInt(val)).pipe(z.number().int().positive()).optional(),
});

export type RegisterData = z.infer<typeof RegisterSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type CreateAccountData = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountData = z.infer<typeof UpdateAccountSchema>;
export type CreateTransactionData = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionData = z.infer<typeof UpdateTransactionSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type CreateDailySpendingConfigData = z.infer<typeof CreateDailySpendingConfigSchema>;
export type UpdateDailySpendingConfigData = z.infer<typeof UpdateDailySpendingConfigSchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
export type DailySpendingQuery = z.infer<typeof DailySpendingQuerySchema>;