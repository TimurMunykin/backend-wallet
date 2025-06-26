import { Router } from 'express';
import { DailySpendingController } from '../controllers/DailySpendingController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();
const dailySpendingController = new DailySpendingController();
const authMiddleware = new AuthMiddleware();

router.use(authMiddleware.authenticate);

router.get('/calculate', dailySpendingController.calculateDailySpending);
router.post('/configs', dailySpendingController.createConfig);
router.get('/configs', dailySpendingController.getConfigs);
router.get('/configs/:id', dailySpendingController.getConfigById);
router.put('/configs/:id', dailySpendingController.updateConfig);
router.delete('/configs/:id', dailySpendingController.deleteConfig);
router.post('/configs/:id/activate', dailySpendingController.activateConfig);

export default router;