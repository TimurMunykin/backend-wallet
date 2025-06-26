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
import { User } from './User';
import { Transaction } from './Transaction';
import { RecurringPayment } from './RecurringPayment';
import { SalaryPayment } from './SalaryPayment';
import { Snapshot } from './Snapshot';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  user_id!: number;

  @Column()
  name!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  balance!: number;

  @Column({ default: 'USD' })
  currency!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User, user => user.accounts)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Transaction, transaction => transaction.account)
  transactions!: Transaction[];

  @OneToMany(() => RecurringPayment, payment => payment.account)
  recurring_payments!: RecurringPayment[];

  @OneToMany(() => SalaryPayment, payment => payment.account)
  salary_payments!: SalaryPayment[];

  @OneToMany(() => Snapshot, snapshot => snapshot.account)
  snapshots!: Snapshot[];
}