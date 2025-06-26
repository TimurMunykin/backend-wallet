import { Router } from 'express';
import { GoalController } from '../controllers/GoalController';
import { auth } from '../middleware/auth';

const router = Router();
const goalController = new GoalController();

// Apply authentication middleware to all routes
router.use(auth);

// Goal routes
router.get('/', goalController.getGoals);
router.post('/', goalController.createGoal);
router.get('/progress', goalController.getAllGoalsProgress);
router.get('/:id', goalController.getGoalById);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);
router.get('/:id/progress', goalController.getGoalProgress);
router.post('/:id/achieve', goalController.markGoalAsAchieved);

export default router;