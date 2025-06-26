import { Router } from 'express';
import { AccountController } from '../controllers/AccountController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();
const accountController = new AccountController();
const authMiddleware = new AuthMiddleware();

router.use(authMiddleware.authenticate);

router.post('/', accountController.createAccount);
router.get('/', accountController.getAccounts);
router.get('/total-balance', accountController.getTotalBalance);
router.get('/:id', accountController.getAccountById);
router.put('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);
router.get('/:id/summary', accountController.getAccountSummary);

export default router;