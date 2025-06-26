import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { auth } from '../middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// Apply authentication middleware to all routes
router.use(auth);

// Analytics routes
router.get('/income-expense-trends', analyticsController.getIncomeExpenseTrends);
router.get('/spending-patterns', analyticsController.getSpendingPatterns);
router.get('/financial-summary', analyticsController.getFinancialSummary);
router.get('/forecasts', analyticsController.getForecast);
router.get('/goal-progress', analyticsController.getGoalProgressReport);
router.get('/cash-flow', analyticsController.getCashFlowAnalysis);

export default router;