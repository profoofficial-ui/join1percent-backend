import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
]);
function ensureDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
ensureDir(path.join(UPLOADS_ROOT, 'images'));
ensureDir(path.join(UPLOADS_ROOT, 'videos'));
const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        const kind = IMAGE_MIME.has(file.mimetype) ? 'images' : 'videos';
        const dir = path.join(UPLOADS_ROOT, kind);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || guessExt(file.mimetype);
        const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, safe);
    },
});
function guessExt(mime) {
    if (mime === 'image/jpeg')
        return '.jpg';
    if (mime === 'image/png')
        return '.png';
    if (mime === 'image/webp')
        return '.webp';
    if (mime === 'image/gif')
        return '.gif';
    if (mime === 'video/webm')
        return '.webm';
    if (mime === 'video/quicktime')
        return '.mov';
    return '.mp4';
}
function fileFilter(_req, file, cb) {
    if (IMAGE_MIME.has(file.mimetype) || VIDEO_MIME.has(file.mimetype)) {
        cb(null, true);
        return;
    }
    cb(new Error('Only image (jpg/png/webp/gif) or video (mp4/webm/mov) files are allowed.'));
}
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
});
export function publicUploadPath(file) {
    const kind = IMAGE_MIME.has(file.mimetype) ? 'images' : 'videos';
    return `/uploads/${kind}/${file.filename}`;
}
