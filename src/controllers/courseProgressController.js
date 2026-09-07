import { Bundle } from '../models/Bundle.js';
import { Course } from '../models/Course.js';
import { CourseProgress } from '../models/CourseProgress.js';
import { User } from '../models/User.js';
function progressPayload(doc) {
    const completed = doc.completedLessonIds || [];
    return {
        courseSlug: doc.courseSlug,
        completedLessonIds: completed,
        lastLessonId: doc.lastLessonId || '',
        lastPositionSeconds: Number(doc.lastPositionSeconds) || 0,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
}
async function getEntitledCourseIds(userId) {
    const user = await User.findById(userId).select('planSlug isActive');
    if (!user || !user.isActive || !user.planSlug) {
        return { bundle: null, courseIds: [] };
    }
    const bundle = await Bundle.findOne({ slug: user.planSlug }).lean();
    if (!bundle) {
        return { bundle: null, courseIds: [] };
    }
    return {
        bundle: { slug: bundle.slug, name: bundle.name },
        courseIds: bundle.courseIds || [],
    };
}
async function assertCourseAccess(userId, courseSlug) {
    const { bundle, courseIds } = await getEntitledCourseIds(userId);
    if (!bundle) {
        return { ok: false, status: 403, message: 'No active bundle on this account.' };
    }
    if (!courseIds.includes(courseSlug)) {
        return { ok: false, status: 403, message: 'This course is not included in your bundle.' };
    }
    return { ok: true, bundle };
}
export async function listMyCourses(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const { bundle, courseIds } = await getEntitledCourseIds(req.user.id);
    if (!bundle) {
        return res.json({ bundle: null, courses: [] });
    }
    const courses = await Course.find({ slug: { $in: courseIds }, published: { $ne: false } }).lean();
    const courseBySlug = new Map(courses.map((course) => [course.slug, course]));
    const orderedCourses = courseIds
        .map((slug) => courseBySlug.get(slug))
        .filter((course) => Boolean(course));
    const progressDocs = await CourseProgress.find({
        userId: req.user.id,
        courseSlug: { $in: courseIds },
    }).lean();
    const progressBySlug = new Map(progressDocs.map((doc) => [doc.courseSlug, doc]));
    const rows = orderedCourses.map((course) => {
        const lessons = course.lessons || [];
        const lessonCount = lessons.length;
        const progress = progressBySlug.get(course.slug);
        const completedLessonIds = progress?.completedLessonIds || [];
        const completedCount = completedLessonIds.length;
        const percent = lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0;
        const lastLesson = lessons.find((lesson) => lesson.id === progress?.lastLessonId);
        return {
            slug: course.slug,
            title: course.title,
            image: course.image || '',
            instructor: course.instructor || '',
            duration: course.duration || '',
            lessonCount,
            completedCount,
            completedLessonIds,
            percent,
            lastLessonId: progress?.lastLessonId || '',
            lastLessonTitle: lastLesson?.title || '',
            lastPositionSeconds: Number(progress?.lastPositionSeconds) || 0,
            updatedAt: progress?.updatedAt ? new Date(progress.updatedAt).toISOString() : null,
        };
    });
    return res.json({ bundle, courses: rows });
}
export async function getCourseProgress(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const courseSlug = String(req.params.courseSlug || '').trim();
    if (!courseSlug) {
        return res.status(400).json({ message: 'Course slug is required.' });
    }
    const access = await assertCourseAccess(req.user.id, courseSlug);
    if (!access.ok) {
        return res.status(access.status).json({ message: access.message });
    }
    const course = await Course.findOne({ slug: courseSlug }).lean();
    if (!course) {
        return res.status(404).json({ message: 'Course not found.' });
    }
    let progress = await CourseProgress.findOne({ userId: req.user.id, courseSlug });
    if (!progress) {
        progress = await CourseProgress.create({
            userId: req.user.id,
            courseSlug,
            completedLessonIds: [],
            lastLessonId: '',
            lastPositionSeconds: 0,
        });
    }
    const lessons = (course.lessons || []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration || '',
        videoUrl: lesson.videoUrl || '',
        description: lesson.description || '',
        resourceUrl: lesson.resourceUrl || '',
    }));
    return res.json({
        course: {
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
            lessons,
        },
        progress: progressPayload(progress),
    });
}
export async function updateCourseProgress(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const courseSlug = String(req.params.courseSlug || '').trim();
    if (!courseSlug) {
        return res.status(400).json({ message: 'Course slug is required.' });
    }
    const access = await assertCourseAccess(req.user.id, courseSlug);
    if (!access.ok) {
        return res.status(access.status).json({ message: access.message });
    }
    const course = await Course.findOne({ slug: courseSlug }).lean();
    if (!course) {
        return res.status(404).json({ message: 'Course not found.' });
    }
    const validLessonIds = new Set((course.lessons || []).map((lesson) => lesson.id));
    const body = req.body || {};
    let progress = await CourseProgress.findOne({ userId: req.user.id, courseSlug });
    if (!progress) {
        progress = new CourseProgress({
            userId: req.user.id,
            courseSlug,
            completedLessonIds: [],
            lastLessonId: '',
            lastPositionSeconds: 0,
        });
    }
    if (typeof body.toggleLessonId === 'string' && body.toggleLessonId) {
        const lessonId = body.toggleLessonId;
        if (!validLessonIds.has(lessonId)) {
            return res.status(400).json({ message: 'Invalid lesson id.' });
        }
        const list = [...(progress.completedLessonIds || [])];
        const index = list.indexOf(lessonId);
        if (index >= 0)
            list.splice(index, 1);
        else
            list.push(lessonId);
        progress.completedLessonIds = list;
    }
    if (typeof body.markLessonComplete === 'string' && body.markLessonComplete) {
        const lessonId = body.markLessonComplete;
        if (!validLessonIds.has(lessonId)) {
            return res.status(400).json({ message: 'Invalid lesson id.' });
        }
        const list = new Set(progress.completedLessonIds || []);
        list.add(lessonId);
        progress.completedLessonIds = [...list];
    }
    if (Array.isArray(body.completedLessonIds)) {
        progress.completedLessonIds = body.completedLessonIds
            .map((id) => String(id))
            .filter((id) => validLessonIds.has(id));
    }
    if (typeof body.lastLessonId === 'string') {
        if (body.lastLessonId && !validLessonIds.has(body.lastLessonId)) {
            return res.status(400).json({ message: 'Invalid last lesson id.' });
        }
        progress.lastLessonId = body.lastLessonId;
    }
    if (body.lastPositionSeconds !== undefined) {
        const seconds = Number(body.lastPositionSeconds);
        progress.lastPositionSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
    }
    await progress.save();
    return res.json({ progress: progressPayload(progress) });
}
