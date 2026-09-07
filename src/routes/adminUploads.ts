import { Router } from 'express';
import { uploadMedia } from '../controllers/uploadController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.post('/', upload.single('file'), (req, res, next) => {
  uploadMedia(req, res).catch(next);
});

export default router;
