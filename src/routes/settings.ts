import { Router } from 'express';
import { getPublicSettings } from '../controllers/siteSettingsController.js';

const router = Router();

router.get('/', getPublicSettings);

export default router;
