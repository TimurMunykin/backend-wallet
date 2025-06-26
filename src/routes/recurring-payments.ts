import { Router } from 'express';
import { RecurringPaymentController } from '../controllers/RecurringPaymentController';
import { auth } from '../middleware/auth';

const router = Router();
const recurringPaymentController = new RecurringPaymentController();

// Apply authentication middleware to all routes
router.use(auth);

// Recurring payment routes
router.get('/', recurringPaymentController.getRecurringPayments);
router.post('/', recurringPaymentController.createRecurringPayment);
router.get('/upcoming', recurringPaymentController.getUpcomingExecutions);
router.get('/:id', recurringPaymentController.getRecurringPaymentById);
router.put('/:id', recurringPaymentController.updateRecurringPayment);
router.delete('/:id', recurringPaymentController.deleteRecurringPayment);
router.post('/executions/:id', recurringPaymentController.executeRecurringPayment);

export default router;