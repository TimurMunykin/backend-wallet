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
import { DailySpendingCache } from './DailySpendingCache';


@Entity('daily_spending_configs')
export class DailySpendingConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  user_id!: number;

  @Column()
  name!: string;

  @Column({ default: false })
  is_active!: boolean;

  @Column({
    type: 'enum',
    enum: ['to_salary', 'to_month_end', 'custom_days', 'to_date'],
    enumName: 'period_type',
  })
  period_type!: string;

  @Column({ nullable: true })
  custom_days?: number;

  @Column({ type: 'date', nullable: true })
  custom_end_date?: Date;

  @Column({ type: 'date', nullable: true })
  salary_date?: Date;

  @Column({ default: true })
  include_pending_salary!: boolean;

  @Column({ default: true })
  include_recurring_income!: boolean;

  @Column({ default: true })
  include_recurring_expenses!: boolean;

  @Column('jsonb')
  active_goals!: number[];

  @Column('jsonb')
  goal_priorities!: object;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  emergency_buffer!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User, user => user.daily_spending_configs)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => DailySpendingCache, cache => cache.config)
  cache!: DailySpendingCache[];
}