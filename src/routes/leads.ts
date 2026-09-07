import { Router } from 'express';
import { submitLead } from '../controllers/leadController.js';

const router = Router();

router.post('/', submitLead);

export default router;
