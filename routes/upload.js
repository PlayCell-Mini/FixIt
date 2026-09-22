const express = require('express');
const multer = require('multer');
const router = express.Router();
const { supabaseAdmin } = require('../supabaseClient');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    const { userId, fileType = 'profile' } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId',
        message: 'userId is required'
      });
    }

    const validTypes = ['profile', 'job'];
    if (!validTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fileType',
        message: 'fileType must be "profile" or "job"'
      });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'profile-pictures';
    const timestamp = Date.now();
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const key = fileType === 'profile'
      ? `${userId}/profile-${timestamp}.${ext}`
      : `${userId}/job-${timestamp}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(key, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(key);

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      fileUrl: publicUrlData?.publicUrl || '',
      key
    });
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 5MB'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: 'Failed to upload file to Supabase Storage',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
