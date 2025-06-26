import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Account } from '../entities/Account';
import { Transaction } from '../entities/Transaction';
import { RecurringPayment } from '../entities/RecurringPayment';
import { RecurringExecution } from '../entities/RecurringExecution';
import { SalaryPayment } from '../entities/SalaryPayment';
import { SalaryReceipt } from '../entities/SalaryReceipt';
import { Goal } from '../entities/Goal';
import { Snapshot } from '../entities/Snapshot';
import { DailySpendingConfig } from '../entities/DailySpendingConfig';
import { DailySpendingCache } from '../entities/DailySpendingCache';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'],
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432'),
  username: process.env['DB_USERNAME'] || 'postgres',
  password: process.env['DB_PASSWORD'] || 'password',
  database: process.env['DB_NAME'] || 'finance_db',
  synchronize: process.env['NODE_ENV'] === 'development',
  logging: process.env['NODE_ENV'] === 'development',
  entities: [
    User,
    Account,
    Transaction,
    RecurringPayment,
    RecurringExecution,
    SalaryPayment,
    SalaryReceipt,
    Goal,
    Snapshot,
    DailySpendingConfig,
    DailySpendingCache,
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});