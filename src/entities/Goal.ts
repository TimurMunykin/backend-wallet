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

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  user_id!: number;

  @Column({ nullable: true })
  parent_goal_id?: number;

  @Column()
  title!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  target_amount!: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  min_balance!: number;

  @Column({ type: 'date' })
  target_date!: Date;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: false })
  achieved!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User, user => user.goals)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Goal, goal => goal.children, { nullable: true })
  @JoinColumn({ name: 'parent_goal_id' })
  parent?: Goal;

  @OneToMany(() => Goal, goal => goal.parent)
  children!: Goal[];
}