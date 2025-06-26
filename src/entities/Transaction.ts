import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './Account';
import { RecurringPayment } from './RecurringPayment';


@Entity('transactions')
export class Transaction {
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

  @Column({ type: 'timestamp' })
  @Index()
  transaction_date!: Date;

  @Column({ nullable: true })
  recurring_payment_id?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Account, account => account.transactions)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => RecurringPayment, payment => payment.transactions, { nullable: true })
  @JoinColumn({ name: 'recurring_payment_id' })
  recurring_payment?: RecurringPayment;
}