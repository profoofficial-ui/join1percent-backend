import type { Response } from 'express';
import { Course, COURSE_LEVELS, type CourseDocument } from '../models/Course.js';
import { Bundle } from '../models/Bundle.js';
import type { AuthRequest } from '../middleware/auth.js';
import { toSlug } from '../utils/slug.js';

type LessonInput = {
  id?: string;
  title?: string;
  duration?: string;
  videoUrl?: string;
  description?: string;
  resourceUrl?: string;
};

function asStringList(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 30);
}

function publicCourse(course: CourseDocument) {
  return {
    id: course.slug,
    title: course.title,
    description: course.description,
    tagline: course.tagline || '',
    image: course.image || '',
    instructor: course.instructor || '',
    level: course.level,
    duration: course.duration || '',
    language: course.language || '',
    category: course.category || '',
    videoUrl: course.videoUrl || '',
    outcomes: course.outcomes || [],
    requirements: course.requirements || [],
    tags: course.tags || [],
    published: course.published !== false,
    lessons: (course.lessons || []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      duration: lesson.duration || '',
      videoUrl: lesson.videoUrl || '',
      description: lesson.description || '',
      resourceUrl: lesson.resourceUrl || '',
    })),
  };
}

function normalizeLessons(input: unknown) {
  if (!Array.isArray(input)) return [];
  return (input as LessonInput[])
    .map((lesson, index) => {
      const title = String(lesson?.title || '').trim();
      if (!title) return null;
      return {
        id: String(lesson?.id || `${Date.now()}-${index}`),
        title,
        duration: String(lesson?.duration || '').trim(),
        videoUrl: String(lesson?.videoUrl || '').trim(),
        description: String(lesson?.description || '').trim(),
        resourceUrl: String(lesson?.resourceUrl || '').trim(),
      };
    })
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson));
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || `course-${Date.now()}`;
  let n = 2;
  while (true) {
    const existing = await Course.findOne({ slug });
    if (!existing || (excludeId && String(existing._id) === excludeId)) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

async function findCourseByParam(idOrSlug: string) {
  if (/^[a-f\d]{24}$/i.test(idOrSlug)) {
    const byId = await Course.findById(idOrSlug);
    if (byId) return byId;
  }
  return Course.findOne({ slug: idOrSlug });
}

export async function listCourses(_req: AuthRequest, res: Response) {
  const courses = await Course.find().sort({ title: 1 });
  return res.json({ courses: courses.map(publicCourse) });
}

export async function getCourse(req: AuthRequest, res: Response) {
  const course = await findCourseByParam(String(req.params.id || ''));
  if (!course) {
    return res.status(404).json({ message: 'Course not found.' });
  }
  return res.json({ course: publicCourse(course) });
}

export async function createCourse(req: AuthRequest, res: Response) {
  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim();

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required.' });
  }

  const levelRaw = String(req.body?.level || '');
  const level = (COURSE_LEVELS as readonly string[]).includes(levelRaw)
    ? (levelRaw as (typeof COURSE_LEVELS)[number])
    : 'Beginner';
  const lessons = normalizeLessons(req.body?.lessons);
  const slug = await uniqueSlug(toSlug(title));

  const course = await Course.create({
    slug,
    title,
    description,
    tagline: String(req.body?.tagline || '').trim(),
    image: String(req.body?.image || '').trim(),
    instructor: String(req.body?.instructor || '').trim(),
    level,
    duration: String(req.body?.duration || '').trim(),
    language: String(req.body?.language || 'Hindi + English').trim(),
    category: String(req.body?.category || 'Digital Skills').trim(),
    videoUrl: String(req.body?.videoUrl || '').trim(),
    outcomes: asStringList(req.body?.outcomes),
    requirements: asStringList(req.body?.requirements),
    tags: asStringList(req.body?.tags),
    published: req.body?.published === false || req.body?.published === 'false' ? false : true,
    lessons:
      lessons.length > 0
        ? lessons
        : [{ id: '1', title: 'Introduction', duration: '', videoUrl: '', description: '', resourceUrl: '' }],
  });

  return res.status(201).json({ course: publicCourse(course) });
}

export async function updateCourse(req: AuthRequest, res: Response) {
  const course = await findCourseByParam(String(req.params.id || ''));
  if (!course) {
    return res.status(404).json({ message: 'Course not found.' });
  }

  const title = req.body?.title !== undefined ? String(req.body.title).trim() : course.title;
  const description =
    req.body?.description !== undefined ? String(req.body.description).trim() : course.description;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required.' });
  }

  course.title = title;
  course.description = description;
  if (req.body?.tagline !== undefined) course.tagline = String(req.body.tagline).trim();
  if (req.body?.image !== undefined) course.image = String(req.body.image).trim();
  if (req.body?.instructor !== undefined) course.instructor = String(req.body.instructor).trim();
  if (req.body?.level !== undefined) {
    const levelRaw = String(req.body.level);
    if ((COURSE_LEVELS as readonly string[]).includes(levelRaw)) {
      course.level = levelRaw as (typeof COURSE_LEVELS)[number];
    }
  }
  if (req.body?.duration !== undefined) course.duration = String(req.body.duration).trim();
  if (req.body?.language !== undefined) course.language = String(req.body.language).trim();
  if (req.body?.category !== undefined) course.category = String(req.body.category).trim();
  if (req.body?.videoUrl !== undefined) course.videoUrl = String(req.body.videoUrl).trim();
  if (req.body?.outcomes !== undefined) course.outcomes = asStringList(req.body.outcomes);
  if (req.body?.requirements !== undefined) course.requirements = asStringList(req.body.requirements);
  if (req.body?.tags !== undefined) course.tags = asStringList(req.body.tags);
  if (req.body?.published !== undefined) {
    course.published = !(req.body.published === false || req.body.published === 'false');
  }
  if (req.body?.lessons !== undefined) {
    const lessons = normalizeLessons(req.body.lessons);
    course.lessons = (
      lessons.length > 0
        ? lessons
        : [{ id: '1', title: 'Introduction', duration: '', videoUrl: '', description: '', resourceUrl: '' }]
    ) as CourseDocument['lessons'];
  }

  await course.save();
  return res.json({ course: publicCourse(course) });
}

export async function deleteCourse(req: AuthRequest, res: Response) {
  const course = await findCourseByParam(String(req.params.id || ''));
  if (!course) {
    return res.status(404).json({ message: 'Course not found.' });
  }

  await course.deleteOne();
  await Bundle.updateMany({}, { $pull: { courseIds: course.slug } });
  return res.json({ ok: true, id: course.slug });
}
