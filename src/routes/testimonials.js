import { Router } from 'express';
import { listPublicTestimonials } from '../controllers/testimonialController.js';
const router = Router();
router.get('/', listPublicTestimonials);
export default router;
