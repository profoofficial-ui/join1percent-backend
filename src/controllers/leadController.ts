import type { Request, Response } from 'express';
import { Lead } from '../models/Lead.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function submitLead(req: Request, res: Response) {
  try {
    const { name, email, phone, message, source } = req.body || {};
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    const lead = await Lead.create({
      name: String(name).trim(),
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : '',
      message: message ? String(message).trim() : '',
      source: source ? String(source).trim() : 'popup',
    });

    return res.json({ lead });
  } catch (error) {
    console.error('Error submitting lead:', error);
    return res.status(500).json({ message: 'Failed to submit form.' });
  }
}

export async function listAdminLeads(_req: AuthRequest, res: Response) {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    return res.json({ leads });
  } catch (error) {
    console.error('Error fetching admin leads:', error);
    return res.status(500).json({ message: 'Failed to fetch leads.' });
  }
}

export async function deleteLead(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead entry not found.' });
    }

    await lead.deleteOne();

    return res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ message: 'Failed to delete lead.' });
  }
}
