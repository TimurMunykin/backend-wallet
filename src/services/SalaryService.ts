import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SalaryPayment } from '../entities/SalaryPayment';
import { SalaryReceipt } from '../entities/SalaryReceipt';
import { Transaction } from '../entities/Transaction';
import { AccountService } from './AccountService';

export interface CreateSalaryPaymentDto {
  accountId: number;
  expectedAmount: number;
  description: string;
  startDay: number;
  endDay: number;
  frequency: string;
}

export interface UpdateSalaryPaymentDto {
  expectedAmount?: number;
  description?: string;
  startDay?: number;
  endDay?: number;
  frequency?: string;
}

export interface ConfirmSalaryReceiptDto {
  actualAmount?: number;
  notes?: string;
}

export class SalaryService {
  private salaryPaymentRepository: Repository<SalaryPayment>;
  private salaryReceiptRepository: Repository<SalaryReceipt>;
  private transactionRepository: Repository<Transaction>;
  private accountService: AccountService;

  constructor() {
    this.salaryPaymentRepository = AppDataSource.getRepository(SalaryPayment);
    this.salaryReceiptRepository = AppDataSource.getRepository(SalaryReceipt);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.accountService = new AccountService();
  }

  async createSalaryPayment(userId: number, data: CreateSalaryPaymentDto): Promise<SalaryPayment> {
    // Verify the account belongs to the user
    const account = await this.accountService.getAccountById(data.accountId, userId);
    if (!account) {
      throw new Error('Account not found or does not belong to user');
    }

    const salaryPayment = this.salaryPaymentRepository.create({
      account_id: data.accountId,
      expected_amount: data.expectedAmount,
      description: data.description,
      start_day: data.startDay,
      end_day: data.endDay,
      frequency: data.frequency,
    });

    const saved = await this.salaryPaymentRepository.save(salaryPayment);

    // Generate upcoming salary receipts
    await this.generateUpcomingSalaryReceipts(saved);

    return this.getSalaryPaymentById(saved.id, userId) as Promise<SalaryPayment>;
  }

  async getSalaryPayments(userId: number): Promise<SalaryPayment[]> {
    return this.salaryPaymentRepository
      .createQueryBuilder('sp')
      .innerJoin('sp.account', 'account')
      .leftJoinAndSelect('sp.receipts', 'receipts')
      .where('account.user_id = :userId', { userId })
      .orderBy('sp.created_at', 'DESC')
      .getMany();
  }

  async getSalaryPaymentById(id: number, userId: number): Promise<SalaryPayment | null> {
    return this.salaryPaymentRepository
      .createQueryBuilder('sp')
      .innerJoin('sp.account', 'account')
      .leftJoinAndSelect('sp.account', 'accountData')
      .leftJoinAndSelect('sp.receipts', 'receipts')
      .leftJoinAndSelect('receipts.transaction', 'transaction')
      .where('sp.id = :id AND account.user_id = :userId', { id, userId })
      .getOne();
  }

  async updateSalaryPayment(id: number, userId: number, data: UpdateSalaryPaymentDto): Promise<SalaryPayment> {
    const salaryPayment = await this.getSalaryPaymentById(id, userId);
    if (!salaryPayment) {
      throw new Error('Salary payment not found');
    }

    await this.salaryPaymentRepository.update(id, {
      expected_amount: data.expectedAmount,
      description: data.description,
      start_day: data.startDay,
      end_day: data.endDay,
      frequency: data.frequency,
    });

    // If timing changed, regenerate receipts
    if (data.startDay !== undefined || data.endDay !== undefined || data.frequency) {
      await this.regenerateSalaryReceipts(id);
    }

    return this.getSalaryPaymentById(id, userId) as Promise<SalaryPayment>;
  }

  async deleteSalaryPayment(id: number, userId: number): Promise<void> {
    const salaryPayment = await this.getSalaryPaymentById(id, userId);
    if (!salaryPayment) {
      throw new Error('Salary payment not found');
    }

    // Delete related receipts first
    await this.salaryReceiptRepository.delete({ salary_payment_id: id });
    
    await this.salaryPaymentRepository.delete(id);
  }

  async confirmSalaryReceipt(receiptId: number, userId: number, data: ConfirmSalaryReceiptDto = {}): Promise<SalaryReceipt> {
    const receipt = await this.salaryReceiptRepository
      .createQueryBuilder('sr')
      .innerJoin('sr.salary_payment', 'sp')
      .innerJoin('sp.account', 'account')
      .leftJoinAndSelect('sr.salary_payment', 'salaryPayment')
      .where('sr.id = :receiptId AND account.user_id = :userId', { receiptId, userId })
      .getOne();

    if (!receipt) {
      throw new Error('Salary receipt not found');
    }

    if (receipt.received) {
      throw new Error('Salary already confirmed');
    }

    const actualAmount = data.actualAmount ?? receipt.expected_amount;

    // Create the actual transaction
    const transaction = this.transactionRepository.create({
      account_id: receipt.salary_payment.account_id,
      amount: actualAmount,
      type: 'income',
      description: `${receipt.salary_payment.description} (Salary)`,
      transaction_date: new Date(),
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Update account balance
    await this.accountService.updateAccountBalance(
      receipt.salary_payment.account_id,
      userId,
      actualAmount,
      'income'
    );

    // Update the receipt
    receipt.received = true;
    receipt.received_at = new Date();
    receipt.actual_amount = actualAmount;
    receipt.transaction_id = savedTransaction.id;
    receipt.notes = data.notes;

    await this.salaryReceiptRepository.save(receipt);

    return receipt;
  }

  async getUpcomingSalaryReceipts(userId: number, months: number = 6): Promise<SalaryReceipt[]> {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    return this.salaryReceiptRepository
      .createQueryBuilder('sr')
      .innerJoin('sr.salary_payment', 'sp')
      .innerJoin('sp.account', 'account')
      .leftJoinAndSelect('sr.salary_payment', 'salaryPayment')
      .where('account.user_id = :userId', { userId })
      .andWhere('sr.received = false')
      .andWhere('sr.period_year_month <= :futureDate', { futureDate })
      .orderBy('sr.period_year_month', 'ASC')
      .getMany();
  }

  async getSalaryReceiptsByPeriod(userId: number, year: number, month?: number): Promise<SalaryReceipt[]> {
    let query = this.salaryReceiptRepository
      .createQueryBuilder('sr')
      .innerJoin('sr.salary_payment', 'sp')
      .innerJoin('sp.account', 'account')
      .leftJoinAndSelect('sr.salary_payment', 'salaryPayment')
      .leftJoinAndSelect('sr.transaction', 'transaction')
      .where('account.user_id = :userId', { userId })
      .andWhere('EXTRACT(YEAR FROM sr.period_year_month) = :year', { year });

    if (month !== undefined) {
      query = query.andWhere('EXTRACT(MONTH FROM sr.period_year_month) = :month', { month });
    }

    return query
      .orderBy('sr.period_year_month', 'DESC')
      .getMany();
  }

  private async generateUpcomingSalaryReceipts(salaryPayment: SalaryPayment): Promise<void> {
    const receipts: Partial<SalaryReceipt>[] = [];
    const currentDate = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 12); // Generate 12 months ahead

    let currentPeriod = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    while (currentPeriod <= maxDate) {
      // Check if this period is within the salary range
      const currentDay = currentDate.getDate();
      const shouldGenerateForCurrentMonth = 
        currentPeriod.getMonth() === currentDate.getMonth() && 
        currentPeriod.getFullYear() === currentDate.getFullYear() &&
        currentDay <= salaryPayment.end_day;

      const shouldGenerateForFutureMonth = 
        currentPeriod > new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      if (shouldGenerateForCurrentMonth || shouldGenerateForFutureMonth) {
        receipts.push({
          salary_payment_id: salaryPayment.id,
          period_year_month: new Date(currentPeriod),
          expected_amount: salaryPayment.expected_amount,
          received: false,
        });
      }

      // Move to next period based on frequency
      if (salaryPayment.frequency === 'monthly') {
        currentPeriod.setMonth(currentPeriod.getMonth() + 1);
      } else if (salaryPayment.frequency === 'quarterly') {
        currentPeriod.setMonth(currentPeriod.getMonth() + 3);
      }
    }

    if (receipts.length > 0) {
      await this.salaryReceiptRepository.save(receipts);
    }
  }

  private async regenerateSalaryReceipts(salaryPaymentId: number): Promise<void> {
    // Delete future unconfirmed receipts
    await this.salaryReceiptRepository
      .createQueryBuilder()
      .delete()
      .where('salary_payment_id = :id AND received = false', { id: salaryPaymentId })
      .execute();

    // Get the salary payment and regenerate
    const salaryPayment = await this.salaryPaymentRepository.findOne({
      where: { id: salaryPaymentId }
    });

    if (salaryPayment) {
      await this.generateUpcomingSalaryReceipts(salaryPayment);
    }
  }
}