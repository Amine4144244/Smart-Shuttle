import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/my-reservations', reservationController.getMyReservations);
router.get('/stats', authorize('SUPER_ADMIN', 'ORGANIZER'), reservationController.getStats);
router.get('/', authorize('SUPER_ADMIN', 'ORGANIZER', 'DRIVER'), reservationController.findAll);
router.get('/:id', reservationController.findById);
router.post('/validate-qr', authorize('DRIVER', 'SUPER_ADMIN', 'ORGANIZER'), reservationController.validateQR);
router.post('/scan', authorize('DRIVER', 'SUPER_ADMIN', 'ORGANIZER'), reservationController.scanQR);
router.post('/validate-boarding', authorize('DRIVER', 'SUPER_ADMIN', 'ORGANIZER'), reservationController.validateBoarding);
router.post('/find-matches', reservationController.findMatches);
router.post('/join-trip', authorize('EMPLOYEE', 'SUPER_ADMIN', 'ORGANIZER'), reservationController.joinTrip);
router.post('/', authorize('EMPLOYEE', 'SUPER_ADMIN', 'ORGANIZER'), reservationController.create);
router.put('/:id', authorize('SUPER_ADMIN', 'ORGANIZER'), reservationController.update);
router.put('/:id/cancel', reservationController.cancel);
router.post('/:id/approve', authorize('SUPER_ADMIN', 'ORGANIZER'), reservationController.approve);
router.post('/:id/reject', authorize('SUPER_ADMIN', 'ORGANIZER'), reservationController.reject);
router.get('/waiting-list/list', authorize('SUPER_ADMIN', 'ORGANIZER'), reservationController.getWaitingList);
router.get('/shared-pickups/list', authorize('SUPER_ADMIN', 'ORGANIZER'), reservationController.getSharedPickups);

export default router;
