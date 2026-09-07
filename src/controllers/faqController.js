import { Faq } from '../models/Faq.js';
export async function listPublicFaqs(_req, res) {
    try {
        const faqs = await Faq.find({ isActive: true }).sort({ orderIndex: 1, createdAt: 1 });
        return res.json({ faqs });
    }
    catch (error) {
        console.error('Error fetching FAQs:', error);
        return res.status(500).json({ message: 'Failed to fetch FAQs.' });
    }
}
export async function listAdminFaqs(_req, res) {
    try {
        const faqs = await Faq.find().sort({ orderIndex: 1, createdAt: 1 });
        return res.json({ faqs });
    }
    catch (error) {
        console.error('Error fetching admin FAQs:', error);
        return res.status(500).json({ message: 'Failed to fetch FAQs for admin.' });
    }
}
export async function createFaq(req, res) {
    try {
        const { question, answer, category, orderIndex, isActive } = req.body || {};
        if (!question || !answer) {
            return res.status(400).json({ message: 'Question and answer are required.' });
        }
        const faq = await Faq.create({
            question: String(question).trim(),
            answer: String(answer).trim(),
            category: category ? String(category).trim() : 'General',
            orderIndex: Number(orderIndex) || 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });
        return res.json({ faq });
    }
    catch (error) {
        console.error('Error creating FAQ:', error);
        return res.status(500).json({ message: 'Failed to create FAQ.' });
    }
}
export async function updateFaq(req, res) {
    try {
        const { id } = req.params;
        const { question, answer, category, orderIndex, isActive } = req.body || {};
        const faq = await Faq.findById(id);
        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found.' });
        }
        if (question !== undefined)
            faq.question = String(question).trim();
        if (answer !== undefined)
            faq.answer = String(answer).trim();
        if (category !== undefined)
            faq.category = String(category).trim();
        if (orderIndex !== undefined)
            faq.orderIndex = Number(orderIndex) || 0;
        if (isActive !== undefined)
            faq.isActive = Boolean(isActive);
        await faq.save();
        return res.json({ faq });
    }
    catch (error) {
        console.error('Error updating FAQ:', error);
        return res.status(500).json({ message: 'Failed to update FAQ.' });
    }
}
export async function deleteFaq(req, res) {
    try {
        const { id } = req.params;
        const faq = await Faq.findById(id);
        if (!faq) {
            return res.status(404).json({ message: 'FAQ not found.' });
        }
        await faq.deleteOne();
        return res.json({ ok: true });
    }
    catch (error) {
        console.error('Error deleting FAQ:', error);
        return res.status(500).json({ message: 'Failed to delete FAQ.' });
    }
}
