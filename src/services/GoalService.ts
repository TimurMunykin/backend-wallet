import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Goal } from '../entities/Goal';

export interface CreateGoalDto {
  title: string;
  targetAmount: number;
  minBalance?: number;
  targetDate: Date;
  description?: string;
  parentGoalId?: number;
}

export interface UpdateGoalDto {
  title?: string;
  targetAmount?: number;
  minBalance?: number;
  targetDate?: Date;
  description?: string;
  achieved?: boolean;
}

export interface GoalProgress {
  goal: Goal;
  progress: number;
  remainingAmount: number;
  daysRemaining: number;
  dailyTargetAmount: number;
}

export class GoalService {
  private goalRepository: Repository<Goal>;

  constructor() {
    this.goalRepository = AppDataSource.getRepository(Goal);
  }

  async createGoal(userId: number, goalData: CreateGoalDto): Promise<Goal> {
    if (goalData.parentGoalId) {
      const parentGoal = await this.getGoalById(goalData.parentGoalId, userId);
      if (!parentGoal) {
        throw new Error('Parent goal not found');
      }
    }

    const goal = this.goalRepository.create({
      user_id: userId,
      title: goalData.title,
      target_amount: goalData.targetAmount,
      min_balance: goalData.minBalance || 0,
      target_date: goalData.targetDate,
      description: goalData.description,
      parent_goal_id: goalData.parentGoalId,
    });

    return this.goalRepository.save(goal);
  }

  async getUserGoals(userId: number): Promise<Goal[]> {
    return this.goalRepository.find({
      where: { user_id: userId },
      relations: ['children', 'parent'],
      order: { created_at: 'DESC' },
    });
  }

  async getGoalById(goalId: number, userId: number): Promise<Goal | null> {
    return this.goalRepository.findOne({
      where: { id: goalId, user_id: userId },
      relations: ['children', 'parent'],
    });
  }

  async updateGoal(goalId: number, userId: number, updateData: UpdateGoalDto): Promise<Goal> {
    const goal = await this.getGoalById(goalId, userId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }

    Object.assign(goal, {
      title: updateData.title ?? goal.title,
      target_amount: updateData.targetAmount ?? goal.target_amount,
      min_balance: updateData.minBalance ?? goal.min_balance,
      target_date: updateData.targetDate ?? goal.target_date,
      description: updateData.description ?? goal.description,
      achieved: updateData.achieved ?? goal.achieved,
    });

    return this.goalRepository.save(goal);
  }

  async deleteGoal(goalId: number, userId: number): Promise<void> {
    const goal = await this.getGoalById(goalId, userId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }

    const hasChildren = await this.goalRepository.count({
      where: { parent_goal_id: goalId },
    });

    if (hasChildren > 0) {
      throw new Error('Cannot delete goal with sub-goals. Delete sub-goals first.');
    }

    await this.goalRepository.remove(goal);
  }

  async getGoalProgress(goalId: number, userId: number, currentBalance: number): Promise<GoalProgress> {
    const goal = await this.getGoalById(goalId, userId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }

    const targetAmount = Number(goal.target_amount) || 0;
    const minBalance = Number(goal.min_balance) || 0;
    const totalNeeded = targetAmount + minBalance;
    const progress = Math.min((currentBalance / totalNeeded) * 100, 100);
    const remainingAmount = Math.max(totalNeeded - currentBalance, 0);
    
    const now = new Date();
    const targetDate = new Date(goal.target_date);
    const daysRemaining = Math.max(
      Math.ceil((targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      0
    );

    const dailyTargetAmount = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;

    return {
      goal,
      progress,
      remainingAmount,
      daysRemaining,
      dailyTargetAmount,
    };
  }

  async getGoalsProgress(userId: number, currentBalance: number): Promise<GoalProgress[]> {
    const goals = await this.getUserGoals(userId);
    const progressList: GoalProgress[] = [];

    for (const goal of goals) {
      if (!goal.achieved) {
        const progress = await this.getGoalProgress(goal.id, userId, currentBalance);
        progressList.push(progress);
      }
    }

    return progressList.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  async markGoalAsAchieved(goalId: number, userId: number): Promise<Goal> {
    return this.updateGoal(goalId, userId, { achieved: true });
  }

  async getHierarchicalGoals(userId: number): Promise<Goal[]> {
    const allGoals = await this.getUserGoals(userId);
    return allGoals.filter(goal => !goal.parent_goal_id);
  }

  async calculateTotalGoalAmount(userId: number, activeGoalIds?: number[]): Promise<number> {
    let query = this.goalRepository
      .createQueryBuilder('goal')
      .where('goal.user_id = :userId', { userId })
      .andWhere('goal.achieved = false');

    if (activeGoalIds && activeGoalIds.length > 0) {
      query = query.andWhere('goal.id IN (:...goalIds)', { goalIds: activeGoalIds });
    }

    const goals = await query.getMany();
    
    return goals.reduce((total, goal) => {
      const targetAmount = Number(goal.target_amount) || 0;
      const minBalance = Number(goal.min_balance) || 0;
      return total + targetAmount + minBalance;
    }, 0);
  }
}