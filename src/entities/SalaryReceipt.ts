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
import { SalaryPayment } from './SalaryPayment';
import { Transaction } from './Transaction';

@Entity('salary_receipts')
export class SalaryReceipt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  salary_payment_id!: number;

  @Column({ nullable: true })
  transaction_id?: number;

  @Column({ type: 'date' })
  @Index()
  period_year_month!: Date;

  @Column('decimal', { precision: 12, scale: 2 })
  expected_amount!: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  actual_amount?: number;

  @Column({ default: false })
  received!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  received_at?: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => SalaryPayment, payment => payment.receipts)
  @JoinColumn({ name: 'salary_payment_id' })
  salary_payment!: SalaryPayment;

  @OneToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: Transaction;
}