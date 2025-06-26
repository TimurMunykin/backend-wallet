import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './Account';

@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  account_id!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  balance!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  total_income!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  total_expense!: number;

  @Column()
  transactions_count!: number;

  @Column('jsonb')
  recent_transactions!: object;

  @Column('jsonb')
  goals_progress!: object;

  @Column({ type: 'timestamp' })
  @Index()
  snapshot_date!: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Account, account => account.snapshots)
  @JoinColumn({ name: 'account_id' })
  account!: Account;
}