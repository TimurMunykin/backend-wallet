import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/profile', authMiddleware.authenticate, authController.getProfile);
router.put('/profile', authMiddleware.authenticate, authController.updateProfile);
router.post('/change-password', authMiddleware.authenticate, authController.changePassword);

export default router;