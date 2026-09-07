import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { getOrCreateCommission } from '../services/commission.js';

/** Any signed-in user can read universal commission rates (affiliate link UI). */
export async function getPublicCommission(_req: AuthRequest, res: Response) {
  const commission = await getOrCreateCommission();
  return res.json({ commission });
}
