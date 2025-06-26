import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RecurringPayment } from './RecurringPayment';
import { Transaction } from './Transaction';

@Entity('recurring_executions')
export class RecurringExecution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  recurring_payment_id!: number;

  @Column({ nullable: true })
  transaction_id?: number;

  @Column({ type: 'date' })
  @Index()
  expected_date!: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  expected_amount!: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  actual_amount?: number;

  @Column({ default: false })
  executed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  executed_at?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => RecurringPayment, payment => payment.executions)
  @JoinColumn({ name: 'recurring_payment_id' })
  recurring_payment!: RecurringPayment;

  @OneToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: Transaction;
}