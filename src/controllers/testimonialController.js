import { Testimonial } from '../models/Testimonial.js';
export async function listPublicTestimonials(_req, res) {
    try {
        const testimonials = await Testimonial.find({ isActive: true }).sort({ orderIndex: 1, createdAt: 1 });
        return res.json({ testimonials });
    }
    catch (error) {
        console.error('Error fetching testimonials:', error);
        return res.status(500).json({ message: 'Failed to fetch testimonials.' });
    }
}
export async function listAdminTestimonials(_req, res) {
    try {
        const testimonials = await Testimonial.find().sort({ orderIndex: 1, createdAt: 1 });
        return res.json({ testimonials });
    }
    catch (error) {
        console.error('Error fetching admin testimonials:', error);
        return res.status(500).json({ message: 'Failed to fetch testimonials for admin.' });
    }
}
export async function createTestimonial(req, res) {
    try {
        const { name, role, company, avatarUrl, rating, quote, careerImpact, orderIndex, isActive } = req.body || {};
        if (!name || !role || !company || !quote) {
            return res.status(400).json({ message: 'Name, role, company, and quote are required.' });
        }
        const testimonial = await Testimonial.create({
            name: String(name).trim(),
            role: String(role).trim(),
            company: String(company).trim(),
            avatarUrl: avatarUrl ? String(avatarUrl).trim() : '',
            rating: Number(rating) || 5,
            quote: String(quote).trim(),
            careerImpact: careerImpact ? String(careerImpact).trim() : '',
            orderIndex: Number(orderIndex) || 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });
        return res.json({ testimonial });
    }
    catch (error) {
        console.error('Error creating testimonial:', error);
        return res.status(500).json({ message: 'Failed to create testimonial.' });
    }
}
export async function updateTestimonial(req, res) {
    try {
        const { id } = req.params;
        const { name, role, company, avatarUrl, rating, quote, careerImpact, orderIndex, isActive } = req.body || {};
        const testimonial = await Testimonial.findById(id);
        if (!testimonial) {
            return res.status(404).json({ message: 'Testimonial not found.' });
        }
        if (name !== undefined)
            testimonial.name = String(name).trim();
        if (role !== undefined)
            testimonial.role = String(role).trim();
        if (company !== undefined)
            testimonial.company = String(company).trim();
        if (avatarUrl !== undefined)
            testimonial.avatarUrl = String(avatarUrl).trim();
        if (rating !== undefined)
            testimonial.rating = Number(rating) || 5;
        if (quote !== undefined)
            testimonial.quote = String(quote).trim();
        if (careerImpact !== undefined)
            testimonial.careerImpact = String(careerImpact).trim();
        if (orderIndex !== undefined)
            testimonial.orderIndex = Number(orderIndex) || 0;
        if (isActive !== undefined)
            testimonial.isActive = Boolean(isActive);
        await testimonial.save();
        return res.json({ testimonial });
    }
    catch (error) {
        console.error('Error updating testimonial:', error);
        return res.status(500).json({ message: 'Failed to update testimonial.' });
    }
}
export async function deleteTestimonial(req, res) {
    try {
        const { id } = req.params;
        const testimonial = await Testimonial.findById(id);
        if (!testimonial) {
            return res.status(404).json({ message: 'Testimonial not found.' });
        }
        await testimonial.deleteOne();
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Error deleting testimonial:', error);
        return res.status(500).json({ message: 'Failed to delete testimonial.' });
    }
}
