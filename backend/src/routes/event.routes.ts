import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/upcoming', eventController.getUpcoming);
router.get('/stats', authenticate, eventController.getStats);
router.get('/', eventController.findAll);
router.get('/:id', eventController.findById);

router.post('/', authenticate, authorize('SUPER_ADMIN', 'ORGANIZER'), eventController.create);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ORGANIZER'), eventController.update);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ORGANIZER'), eventController.delete);

export default router;
