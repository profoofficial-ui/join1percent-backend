import { getOrCreateCommission } from '../services/commission.js';
/** Any signed-in user can read universal commission rates (affiliate link UI). */
export async function getPublicCommission(_req, res) {
    const commission = await getOrCreateCommission();
    return res.json({ commission });
}
