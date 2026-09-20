import { Router } from 'express';
import { driverController } from '../controllers/driver.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('SUPER_ADMIN', 'ORGANIZER'), driverController.findAll);
router.get('/:id', driverController.findById);
router.get('/:id/today-trips', authorize('SUPER_ADMIN', 'ORGANIZER', 'DRIVER'), driverController.getTodayTrips);
router.post('/', authorize('SUPER_ADMIN', 'ORGANIZER'), driverController.create);
router.put('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), driverController.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), driverController.delete);

export default router;
