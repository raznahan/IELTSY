import { Router } from 'express';
import { addCredits } from '../controllers/paymentController';

const router = Router();

router.post('/addCredits', addCredits);

export default router;
