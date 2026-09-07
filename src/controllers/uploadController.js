import { publicUploadPath } from '../middleware/upload.js';
export async function uploadMedia(req, res) {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    const url = publicUploadPath(file);
    const kind = file.mimetype.startsWith('image/') ? 'image' : 'video';
    return res.status(201).json({
        url,
        kind,
        fileName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
    });
}
