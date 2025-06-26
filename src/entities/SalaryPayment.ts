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
import { SalaryReceipt } from './SalaryReceipt';


@Entity('salary_payments')
export class SalaryPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  account_id!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  expected_amount!: number;

  @Column()
  description!: string;

  @Column()
  start_day!: number;

  @Column()
  end_day!: number;

  @Column({
    type: 'enum',
    enum: ['monthly', 'quarterly'],
    enumName: 'salary_frequency',
    default: 'monthly',
  })
  frequency!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Account, account => account.salary_payments)
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @OneToMany(() => SalaryReceipt, receipt => receipt.salary_payment)
  receipts!: SalaryReceipt[];
}