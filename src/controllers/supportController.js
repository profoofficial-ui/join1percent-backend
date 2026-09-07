import { SupportTicket, SUPPORT_STATUSES } from '../models/SupportTicket.js';
import { User } from '../models/User.js';
function publicTicket(doc) {
    return {
        id: String(doc._id),
        userId: String(doc.userId),
        email: doc.email,
        name: doc.name,
        subject: doc.subject,
        message: doc.message,
        status: doc.status,
        adminNote: doc.adminNote || '',
        resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt).toISOString() : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
}
export async function createSupportTicket(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!subject || !message) {
        return res.status(400).json({ message: 'Subject and message are required.' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(401).json({ message: 'Account not found.' });
    }
    const ticket = await SupportTicket.create({
        userId: user._id,
        email: user.email,
        name: user.name,
        subject,
        message,
        status: 'open',
    });
    return res.status(201).json({ ticket: publicTicket(ticket) });
}
export async function listMySupportTickets(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
    return res.json({ tickets: tickets.map(publicTicket) });
}
export async function listAdminSupport(req, res) {
    const status = String(req.query?.status || 'all').trim();
    const filter = status !== 'all' && SUPPORT_STATUSES.includes(status)
        ? { status }
        : {};
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.json({
        tickets: tickets.map(publicTicket),
        counts: {
            open: await SupportTicket.countDocuments({ status: 'open' }),
            in_progress: await SupportTicket.countDocuments({ status: 'in_progress' }),
            resolved: await SupportTicket.countDocuments({ status: 'resolved' }),
        },
    });
}
export async function updateSupportTicket(req, res) {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const id = String(req.params.id || '');
    const status = String(req.body?.status || '').trim();
    const adminNote = req.body?.adminNote !== undefined ? String(req.body.adminNote).trim() : undefined;
    if (!SUPPORT_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status.' });
    }
    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
        return res.status(404).json({ message: 'Support ticket not found.' });
    }
    ticket.status = status;
    if (adminNote !== undefined)
        ticket.adminNote = adminNote;
    if (status === 'resolved') {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = req.user.id;
    }
    else {
        ticket.resolvedAt = null;
        ticket.resolvedBy = null;
    }
    await ticket.save();
    return res.json({ ticket: publicTicket(ticket) });
}
