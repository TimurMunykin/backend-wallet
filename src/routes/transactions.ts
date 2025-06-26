import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { auth } from '../middleware/auth';

const router = Router();
const transactionController = new TransactionController();

// Apply authentication middleware to all routes
router.use(auth);

// Transaction routes
router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.post('/bulk', transactionController.bulkCreateTransactions);
router.get('/:id', transactionController.getTransactionById);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;