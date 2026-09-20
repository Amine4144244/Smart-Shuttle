import { Router } from 'express';
import { routeController } from '../controllers/route.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', routeController.findAll);
router.get('/:id', routeController.findById);
router.post('/', authorize('SUPER_ADMIN', 'ORGANIZER'), routeController.create);
router.put('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), routeController.update);
router.delete('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), routeController.delete);

export default router;
