import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { DailySpendingConfig } from './DailySpendingConfig';

@Entity('daily_spending_cache')
export class DailySpendingCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  user_id!: number;

  @Column()
  @Index()
  config_id!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  daily_limit!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  current_balance!: number;

  @Column('decimal', { precision: 12, scale: 2 })
  available_for_goals!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  days_remaining!: number;

  @Column('jsonb')
  calculation_breakdown!: object;

  @Column({ type: 'timestamp' })
  calculated_at!: Date;

  @Column({ type: 'timestamp' })
  @Index()
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => User, user => user.daily_spending_cache)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => DailySpendingConfig, config => config.cache)
  @JoinColumn({ name: 'config_id' })
  config!: DailySpendingConfig;
}