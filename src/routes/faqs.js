import { Router } from 'express';
import { listPublicFaqs } from '../controllers/faqController.js';
const router = Router();
router.get('/', listPublicFaqs);
export default router;
