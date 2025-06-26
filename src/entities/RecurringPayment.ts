import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './Account';
import { Transaction } from './Transaction';
import { RecurringExecution } from './RecurringExecution';

@Entity('recurring_payments')
export class RecurringPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  account_id!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: ['income', 'expense'],
    enumName: 'transaction_type',
  })
  type!: string;

  @Column()
  description!: string;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'monthly'],
    enumName: 'recurring_frequency',
  })
  frequency!: string;

  @Column({ type: 'date' })
  start_date!: Date;

  @Column({ type: 'date', nullable: true })
  end_date?: Date;

  @Column({ nullable: true })
  day_of_month?: number;

  @Column({ nullable: true })
  day_of_week?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Account, account => account.recurring_payments)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @OneToMany(() => Transaction, transaction => transaction.recurring_payment)
  transactions!: Transaction[];

  @OneToMany(() => RecurringExecution, execution => execution.recurring_payment)
  executions!: RecurringExecution[];
}