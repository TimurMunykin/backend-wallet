import { Router } from 'express';
import { SalaryController } from '../controllers/SalaryController';
import { auth } from '../middleware/auth';

const router = Router();
const salaryController = new SalaryController();

// Apply authentication middleware to all routes
router.use(auth);

// Salary payment routes
router.get('/', salaryController.getSalaryPayments);
router.post('/', salaryController.createSalaryPayment);
router.get('/upcoming', salaryController.getUpcomingSalaryReceipts);
router.get('/receipts', salaryController.getSalaryReceiptsByPeriod);
router.get('/:id', salaryController.getSalaryPaymentById);
router.put('/:id', salaryController.updateSalaryPayment);
router.delete('/:id', salaryController.deleteSalaryPayment);
router.post('/receipts/:id/confirm', salaryController.confirmSalaryReceipt);

export default router;