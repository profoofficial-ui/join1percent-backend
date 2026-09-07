import { Router } from 'express';
import {
  getCourseProgress,
  listMyCourses,
  updateCourseProgress,
} from '../controllers/courseProgressController.js';
import { requireAuth } from '../middleware/auth.js';

const myCoursesRouter = Router();

myCoursesRouter.use(requireAuth);
myCoursesRouter.get('/', listMyCourses);
myCoursesRouter.get('/:courseSlug/progress', getCourseProgress);
myCoursesRouter.patch('/:courseSlug/progress', updateCourseProgress);

export default myCoursesRouter;
