import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Account } from './Account';
import { Goal } from './Goal';
import { DailySpendingConfig } from './DailySpendingConfig';
import { DailySpendingCache } from './DailySpendingCache';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  @Index()
  email!: string;

  @Column()
  password_hash!: string;

  @Column()
  name!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Account, account => account.user)
  accounts!: Account[];

  @OneToMany(() => Goal, goal => goal.user)
  goals!: Goal[];

  @OneToMany(() => DailySpendingConfig, config => config.user)
  daily_spending_configs!: DailySpendingConfig[];

  @OneToMany(() => DailySpendingCache, cache => cache.user)
  daily_spending_cache!: DailySpendingCache[];
}