import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/available', vehicleController.getAvailable);
router.get('/', authorize('SUPER_ADMIN', 'ORGANIZER'), vehicleController.findAll);
router.get('/:id', vehicleController.findById);
router.post('/', authorize('SUPER_ADMIN', 'ORGANIZER'), vehicleController.create);
router.put('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), vehicleController.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), vehicleController.delete);

export default router;
