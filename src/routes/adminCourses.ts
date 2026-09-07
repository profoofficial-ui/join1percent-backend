import { Router } from 'express';
import {
  createCourse,
  deleteCourse,
  getCourse,
  listCourses,
  updateCourse,
} from '../controllers/courseController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/', listCourses);
router.get('/:id', getCourse);
router.post('/', createCourse);
router.patch('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
