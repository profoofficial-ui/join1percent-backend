import { SiteSettings, DEFAULT_SITE_SETTINGS } from '../models/SiteSettings.js';
export async function getPublicSettings(_req, res) {
    try {
        let settings = await SiteSettings.findOne({ key: 'default' });
        if (!settings) {
            return res.json({ settings: DEFAULT_SITE_SETTINGS });
        }
        return res.json({ settings });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ message: 'Failed to fetch settings.' });
    }
}
export async function updateSiteSettings(req, res) {
    try {
        const { phone, email, domainName, siteName, address, copyright, mapEmbed, logoUrl, popup, hero } = req.body || {};
        const doc = await SiteSettings.findOneAndUpdate({ key: 'default' }, {
            phone: phone || DEFAULT_SITE_SETTINGS.phone,
            email: email || DEFAULT_SITE_SETTINGS.email,
            domainName: domainName || DEFAULT_SITE_SETTINGS.domainName,
            siteName: siteName || DEFAULT_SITE_SETTINGS.siteName,
            address: address || DEFAULT_SITE_SETTINGS.address,
            copyright: copyright || DEFAULT_SITE_SETTINGS.copyright,
            mapEmbed: mapEmbed || DEFAULT_SITE_SETTINGS.mapEmbed,
            logoUrl: logoUrl !== undefined ? logoUrl : DEFAULT_SITE_SETTINGS.logoUrl,
            popup: popup || DEFAULT_SITE_SETTINGS.popup,
            hero: hero || DEFAULT_SITE_SETTINGS.hero,
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return res.json({ settings: doc });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        return res.status(500).json({ message: 'Failed to update settings.' });
    }
}
