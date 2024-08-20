import { Router } from 'express';
import {
  getUser,
  submitEssay,
  submitPaidEssay,
  generateReferralCode,
  applyReferralCode,
  updateAIConsent,
} from '../controllers/userController';  // Only user-related controllers

const router = Router();

router.post('/getUser', getUser);
router.post('/submitEssay', submitEssay);
router.post('/submitPaidEssay', submitPaidEssay);
router.post('/generateReferralCode', generateReferralCode);
router.post('/applyReferralCode', applyReferralCode);
router.post('/updateAIConsent', updateAIConsent);

export default router;
