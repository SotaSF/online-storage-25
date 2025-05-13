const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
    uploadFile,
    getFiles,
    downloadFile,
    deleteFile,
    getFilePreview,
} = require('../controllers/fileController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads');
        // Ensure the uploads directory exists
        if (!require('fs').existsSync(uploadPath)) {
            require('fs').mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create a unique filename while preserving the original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: function (req, file, cb) {
        cb(null, true); // Accept all file types for now
    }
});

router.post('/', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles);
router.get('/:id', protect, downloadFile);
router.get('/:id/preview', protect, getFilePreview);
router.delete('/:id', protect, deleteFile);

module.exports = router; 