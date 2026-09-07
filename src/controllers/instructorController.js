import { Instructor } from '../models/Instructor.js';
function toSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^-|-$)/g, '');
}
export async function listPublicInstructors(_req, res) {
    try {
        const instructors = await Instructor.find({ isActive: true }).sort({ orderIndex: 1, createdAt: 1 });
        return res.json({ instructors });
    }
    catch (error) {
        console.error('Error fetching instructors:', error);
        return res.status(500).json({ message: 'Failed to fetch instructors.' });
    }
}
export async function listAdminInstructors(_req, res) {
    try {
        const instructors = await Instructor.find().sort({ orderIndex: 1, createdAt: 1 });
        return res.json({ instructors });
    }
    catch (error) {
        console.error('Error fetching admin instructors:', error);
        return res.status(500).json({ message: 'Failed to fetch instructors for admin.' });
    }
}
export async function createInstructor(req, res) {
    try {
        const { name, role, company, bio, avatarUrl, studentsCount, coursesCount, rating, orderIndex, isActive } = req.body || {};
        if (!name || !role) {
            return res.status(400).json({ message: 'Name and role are required.' });
        }
        const slug = toSlug(String(name));
        // Check for duplicate slug
        const duplicate = await Instructor.findOne({ slug });
        if (duplicate) {
            return res.status(400).json({ message: `Instructor with name/slug "${name}" already exists.` });
        }
        const instructor = await Instructor.create({
            slug,
            name: String(name).trim(),
            role: String(role).trim(),
            company: company ? String(company).trim() : '',
            bio: bio ? String(bio).trim() : '',
            avatarUrl: avatarUrl ? String(avatarUrl).trim() : '',
            studentsCount: Number(studentsCount) || 0,
            coursesCount: Number(coursesCount) || 0,
            rating: Number(rating) || 5,
            orderIndex: Number(orderIndex) || 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });
        return res.json({ instructor });
    }
    catch (error) {
        console.error('Error creating instructor:', error);
        return res.status(500).json({ message: 'Failed to create instructor.' });
    }
}
export async function updateInstructor(req, res) {
    try {
        const { id } = req.params;
        const { name, role, company, bio, avatarUrl, studentsCount, coursesCount, rating, orderIndex, isActive } = req.body || {};
        const instructor = await Instructor.findById(id);
        if (!instructor) {
            return res.status(404).json({ message: 'Instructor not found.' });
        }
        if (name !== undefined) {
            instructor.name = String(name).trim();
            instructor.slug = toSlug(String(name));
        }
        if (role !== undefined)
            instructor.role = String(role).trim();
        if (company !== undefined)
            instructor.company = String(company).trim();
        if (bio !== undefined)
            instructor.bio = String(bio).trim();
        if (avatarUrl !== undefined)
            instructor.avatarUrl = String(avatarUrl).trim();
        if (studentsCount !== undefined)
            instructor.studentsCount = Number(studentsCount) || 0;
        if (coursesCount !== undefined)
            instructor.coursesCount = Number(coursesCount) || 0;
        if (rating !== undefined)
            instructor.rating = Number(rating) || 5;
        if (orderIndex !== undefined)
            instructor.orderIndex = Number(orderIndex) || 0;
        if (isActive !== undefined)
            instructor.isActive = Boolean(isActive);
        await instructor.save();
        return res.json({ instructor });
    }
    catch (error) {
        console.error('Error updating instructor:', error);
        return res.status(500).json({ message: 'Failed to update instructor.' });
    }
}
export async function deleteInstructor(req, res) {
    try {
        const { id } = req.params;
        const instructor = await Instructor.findById(id);
        if (!instructor) {
            return res.status(404).json({ message: 'Instructor not found.' });
        }
        await instructor.deleteOne();
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Error deleting instructor:', error);
        return res.status(500).json({ message: 'Failed to delete instructor.' });
    }
}
