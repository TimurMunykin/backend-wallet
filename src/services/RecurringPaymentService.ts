import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { RecurringPayment } from '../entities/RecurringPayment';
import { RecurringExecution } from '../entities/RecurringExecution';
import { Transaction } from '../entities/Transaction';
import { AccountService } from './AccountService';

export interface CreateRecurringPaymentDto {
  accountId: number;
  amount: number;
  type: string;
  description: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  dayOfMonth?: number;
  dayOfWeek?: number;
}

export interface UpdateRecurringPaymentDto {
  amount?: number;
  description?: string;
  frequency?: string;
  startDate?: Date;
  endDate?: Date;
  dayOfMonth?: number;
  dayOfWeek?: number;
}

export interface ExecuteRecurringPaymentDto {
  actualAmount?: number;
  notes?: string;
}

export class RecurringPaymentService {
  private recurringPaymentRepository: Repository<RecurringPayment>;
  private recurringExecutionRepository: Repository<RecurringExecution>;
  private transactionRepository: Repository<Transaction>;
  private accountService: AccountService;

  constructor() {
    this.recurringPaymentRepository = AppDataSource.getRepository(RecurringPayment);
    this.recurringExecutionRepository = AppDataSource.getRepository(RecurringExecution);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.accountService = new AccountService();
  }

  async createRecurringPayment(userId: number, data: CreateRecurringPaymentDto): Promise<RecurringPayment> {
    // Verify the account belongs to the user
    const account = await this.accountService.getAccountById(data.accountId, userId);
    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    const recurringPayment = this.recurringPaymentRepository.create({
      account_id: data.accountId,
      amount: data.amount,
      type: data.type,
      description: data.description,
      frequency: data.frequency,
      start_date: data.startDate,
      end_date: data.endDate,
      day_of_month: data.dayOfMonth,
      day_of_week: data.dayOfWeek,
    });

    const saved = await this.recurringPaymentRepository.save(recurringPayment);

    // Generate initial executions for the next few periods
    await this.generateUpcomingExecutions(saved);

    return this.getRecurringPaymentById(saved.id, userId) as Promise<RecurringPayment>;
  }

  async getRecurringPayments(userId: number): Promise<RecurringPayment[]> {
    return this.recurringPaymentRepository
      .createQueryBuilder('rp')
      .innerJoin('rp.account', 'account')
      .leftJoinAndSelect('rp.executions', 'executions')
      .where('account.user_id = :userId', { userId })
      .orderBy('rp.start_date', 'DESC')
      .getMany();
  }

  async getRecurringPaymentById(id: number, userId: number): Promise<RecurringPayment | null> {
    return this.recurringPaymentRepository
      .createQueryBuilder('rp')
      .innerJoin('rp.account', 'account')
      .leftJoinAndSelect('rp.account', 'accountData')
      .leftJoinAndSelect('rp.executions', 'executions')
      .leftJoinAndSelect('executions.transaction', 'transaction')
      .where('rp.id = :id AND account.user_id = :userId', { id, userId })
      .getOne();
  }

  async updateRecurringPayment(id: number, userId: number, data: UpdateRecurringPaymentDto): Promise<RecurringPayment> {
    const recurringPayment = await this.getRecurringPaymentById(id, userId);
    if (!recurringPayment) {
      throw new Error('Recurring payment not found');
    }

    await this.recurringPaymentRepository.update(id, {
      amount: data.amount,
      description: data.description,
      frequency: data.frequency,
      start_date: data.startDate,
      end_date: data.endDate,
      day_of_month: data.dayOfMonth,
      day_of_week: data.dayOfWeek,
    });

    // If frequency or timing changed, regenerate executions
    if (data.frequency || data.startDate || data.dayOfMonth || data.dayOfWeek) {
      await this.regenerateExecutions(id);
    }

    return this.getRecurringPaymentById(id, userId) as Promise<RecurringPayment>;
  }

  async deleteRecurringPayment(id: number, userId: number): Promise<void> {
    const recurringPayment = await this.getRecurringPaymentById(id, userId);
    if (!recurringPayment) {
      throw new Error('Recurring payment not found');
    }

    // Delete related executions first
    await this.recurringExecutionRepository.delete({ recurring_payment_id: id });
    
    await this.recurringPaymentRepository.delete(id);
  }

  async executeRecurringPayment(executionId: number, userId: number, data: ExecuteRecurringPaymentDto = {}): Promise<RecurringExecution> {
    const execution = await this.recurringExecutionRepository
      .createQueryBuilder('re')
      .innerJoin('re.recurring_payment', 'rp')
      .innerJoin('rp.account', 'account')
      .leftJoinAndSelect('re.recurring_payment', 'recurringPayment')
      .where('re.id = :executionId AND account.user_id = :userId', { executionId, userId })
      .getOne();

    if (!execution) {
      throw new Error('Recurring execution not found');
    }

    if (execution.executed) {
      throw new Error('Recurring payment already executed');
    }

    const actualAmount = data.actualAmount ?? execution.expected_amount;

    // Create the actual transaction
    const transaction = this.transactionRepository.create({
      account_id: execution.recurring_payment.account_id,
      amount: actualAmount,
      type: execution.recurring_payment.type,
      description: `${execution.recurring_payment.description} (Recurring)`,
      transaction_date: new Date(),
      recurring_payment_id: execution.recurring_payment.id,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Update account balance
    await this.accountService.updateAccountBalance(
      execution.recurring_payment.account_id,
      userId,
      actualAmount,
      execution.recurring_payment.type as 'income' | 'expense'
    );

    // Update the execution
    execution.executed = true;
    execution.executed_at = new Date();
    execution.actual_amount = actualAmount;
    execution.transaction_id = savedTransaction.id;
    execution.notes = data.notes;

    await this.recurringExecutionRepository.save(execution);

    return execution;
  }

  async getUpcomingExecutions(userId: number, days: number = 30): Promise<RecurringExecution[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.recurringExecutionRepository
      .createQueryBuilder('re')
      .innerJoin('re.recurring_payment', 'rp')
      .innerJoin('rp.account', 'account')
      .leftJoinAndSelect('re.recurring_payment', 'recurringPayment')
      .where('account.user_id = :userId', { userId })
      .andWhere('re.executed = false')
      .andWhere('re.expected_date <= :futureDate', { futureDate })
      .orderBy('re.expected_date', 'ASC')
      .getMany();
  }

  private async generateUpcomingExecutions(recurringPayment: RecurringPayment): Promise<void> {
    const executions: Partial<RecurringExecution>[] = [];
    const startDate = new Date(recurringPayment.start_date);
    const endDate = recurringPayment.end_date ? new Date(recurringPayment.end_date) : null;
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 6); // Generate 6 months ahead

    let currentDate = new Date(startDate);

    while (currentDate <= maxDate && (!endDate || currentDate <= endDate)) {
      executions.push({
        recurring_payment_id: recurringPayment.id,
        expected_date: new Date(currentDate),
        expected_amount: recurringPayment.amount,
        executed: false,
      });

      // Calculate next date based on frequency
      switch (recurringPayment.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          if (recurringPayment.day_of_month) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            currentDate.setDate(recurringPayment.day_of_month);
          } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
          }
          break;
      }
    }

    if (executions.length > 0) {
      await this.recurringExecutionRepository.save(executions);
    }
  }

  private async regenerateExecutions(recurringPaymentId: number): Promise<void> {
    // Delete future unexecuted executions
    await this.recurringExecutionRepository
      .createQueryBuilder()
      .delete()
      .where('recurring_payment_id = :id AND executed = false', { id: recurringPaymentId })
      .execute();

    // Get the recurring payment and regenerate
    const recurringPayment = await this.recurringPaymentRepository.findOne({
      where: { id: recurringPaymentId }
    });

    if (recurringPayment) {
      await this.generateUpcomingExecutions(recurringPayment);
    }
  }
}