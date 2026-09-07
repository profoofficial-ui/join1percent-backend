import { Router } from 'express';
import { listPublicInstructors } from '../controllers/instructorController.js';

const router = Router();

router.get('/', listPublicInstructors);

export default router;
