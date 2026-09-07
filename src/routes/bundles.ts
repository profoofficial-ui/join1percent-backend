import { Router } from 'express';
import { getBundle, listBundles } from '../controllers/bundleController.js';

const router = Router();

router.get('/', listBundles);
router.get('/:id', getBundle);

export default router;
