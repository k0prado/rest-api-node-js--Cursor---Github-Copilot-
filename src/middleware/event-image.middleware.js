const multer = require('multer');

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('image must be jpeg, png, gif, or webp'));
  }
});

function optionalEventImageUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (!ct.toLowerCase().includes('multipart/form-data')) {
    next();
    return;
  }
  upload.single('image')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ message: 'image file too large (max 5MB)' });
        return;
      }
    }
    res.status(400).json({ message: err.message || 'invalid file upload' });
  });
}

module.exports = {
  optionalEventImageUpload
};
