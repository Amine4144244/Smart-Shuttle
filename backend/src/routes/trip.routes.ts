import { Router } from 'express';
import { tripController } from '../controllers/trip.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/active', tripController.getActiveTrips);
router.get('/', tripController.findAll);
router.get('/:id', tripController.findById);
router.post('/', authorize('SUPER_ADMIN', 'ORGANIZER'), tripController.create);
router.put('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), tripController.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), tripController.delete);
router.patch('/:id/start', authorize('SUPER_ADMIN', 'ORGANIZER', 'DRIVER'), tripController.startTrip);
router.patch('/:id/complete', authorize('SUPER_ADMIN', 'ORGANIZER', 'DRIVER'), tripController.completeTrip);
router.patch('/:id/delay', authorize('SUPER_ADMIN', 'ORGANIZER', 'DRIVER'), tripController.delayTrip);

export default router;
