import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const recordingsDir = path.join(uploadDir, 'recordings');
const feedbackDir = path.join(uploadDir, 'feedback');

[uploadDir, recordingsDir, feedbackDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('[MulterConfig] Created directory', { dir });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Sort files into subfolders based on field name or type
        if (file.fieldname === 'audio') {
            console.log('[MulterConfig] destination: recordings', { fieldname: file.fieldname });
            cb(null, recordingsDir);
        } else if (file.fieldname === 'feedback') {
            console.log('[MulterConfig] destination: feedback', { fieldname: file.fieldname });
            cb(null, feedbackDir);
        } else {
            console.log('[MulterConfig] destination: default upload dir', { fieldname: file.fieldname });
            cb(null, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-user-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const generatedName = `${file.fieldname}-${uniqueSuffix}${ext}`;
        console.log('[MulterConfig] filename generated', { original: file.originalname, generated: generatedName });
        cb(null, generatedName);
    }
});

// File filter (Optional: restrict to audio/pdf)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        console.log('[MulterConfig] fileFilter: accepted', { mimetype: file.mimetype });
        cb(null, true);
    } else {
        console.log('[MulterConfig] fileFilter: rejected', { mimetype: file.mimetype });
        cb(new Error('Invalid file type. Only audio (mp3, wav, webm) and PDF are allowed.'));
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
