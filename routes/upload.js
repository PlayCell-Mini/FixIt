// File Upload API Routes (S3)
const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Get AWS services from server
const awsServices = require('../server').awsServices;

/**
 * POST /api/upload
 * Upload file to S3
 * 
 * Request:
 * - multipart/form-data
 * - file: Image file (required)
 * - userId: User ID (required)
 * - fileType: Type of file - 'profile' or 'job' (optional, default: 'profile')
 * 
 * Response:
 * {
 *   success: true,
 *   fileUrl: string,
 *   key: string
 * }
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    // Validate userId
    const { userId, fileType = 'profile' } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required'
      });
    }

    console.log('📤 Processing file upload:', {
      userId,
      fileType,
      fileName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    });

    // Generate S3 key based on file type
    let s3Key;
    if (fileType === 'profile') {
      s3Key = `profilePhotos/${userId}/profile.jpg`;
    } else if (fileType === 'job') {
      const timestamp = Date.now();
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      s3Key = `jobPhotos/${userId}/${timestamp}.${ext}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid fileType',
        message: 'fileType must be "profile" or "job"'
      });
    }

    // Upload to S3
    const fileUrl = await uploadToS3(req.file, s3Key);

    console.log('✅ File uploaded successfully:', fileUrl);

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl,
      key: s3Key
    });

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large',
          message: 'File size must be less than 5MB'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: 'Failed to upload file to S3',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper function to upload file to S3
 * @param {Object} file - Multer file object
 * @param {string} key - S3 object key
 * @returns {Promise<string>} - S3 file URL
 */
async function uploadToS3(file, key) {
  const s3 = require('../server').s3;
  const bucketName = process.env.S3_BUCKET || 'fixit-profile-images';

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
}

module.exports = router;
