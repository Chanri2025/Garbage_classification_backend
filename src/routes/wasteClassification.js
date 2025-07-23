const express = require('express');
const multer = require('multer');
const wasteController = require('../controllers/wasteController');
const { validatePredictRequest } = require('../middleware/validation');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and HEIC images are allowed.'));
    }
  }
});

// Routes
router.post('/predict', 
  upload.single('image'), 
  validatePredictRequest,
  wasteController.predict
);

router.get('/model-info', wasteController.getModelInfo);

module.exports = router;