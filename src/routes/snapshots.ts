import { Router } from 'express';
import { SnapshotController } from '../controllers/SnapshotController';
import { auth } from '../middleware/auth';

const router = Router();
const snapshotController = new SnapshotController();

// Apply authentication middleware to all routes
router.use(auth);

// Snapshot routes
router.get('/', snapshotController.getSnapshots);
router.post('/', snapshotController.createSnapshot);
router.post('/daily', snapshotController.createDailySnapshots);
router.get('/trends', snapshotController.getSnapshotTrends);
router.post('/compare', snapshotController.compareSnapshots);
router.get('/:id', snapshotController.getSnapshotById);
router.delete('/:id', snapshotController.deleteSnapshot);

export default router;