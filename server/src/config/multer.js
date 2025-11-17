const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Base upload directory
const UPLOAD_BASE = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_BASE, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const t = file.mimetype;
    const sub = t.startsWith('image/') ? 'images' : t.startsWith('video/') ? 'videos' : 'other';
    const dir = path.join(UPLOAD_BASE, sub);
    fs.mkdirSync(dir, { recursive: true });
    file.subdirectory = sub;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const filename = `${Date.now()}_${base}${ext}`;
    
    // Store both filesystem path and URL-friendly path
    file.url = `/uploads/${file.subdirectory}/${filename}`;
    
    cb(null, filename);
  }
});

// Allowed file types
const ALLOWED_IMAGES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/jpg',
  'image/svg+xml'
]);

const ALLOWED_VIDEOS = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska'
]);

// File filters
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, png, webp, gif, svg)'));
  }
};

const videoFilter = (req, file, cb) => {
  if (ALLOWED_VIDEOS.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, webm, mov, mkv)'));
  }
};

const mediaFilter = (req, file, cb) => {
  if (ALLOWED_IMAGES.has(file.mimetype) || ALLOWED_VIDEOS.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image or video files are allowed'));
  }
};

// Multer upload configurations
const uploadImage = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 
  },
  fileFilter: imageFilter
});

const uploadVideo = multer({
  storage,
  limits: { 
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 1 
  },
  fileFilter: videoFilter
});

const uploadMedia = multer({
  storage,
  limits: { 
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 30 
  },
  fileFilter: mediaFilter
});

// Property creation media upload (2MB limit, images only, 16:9 aspect ratio required)
// Limits: 2MB per file, up to 12 property images + up to 12 images per room type
// Maximum: 12 property images + (12 images × N room types) = ~60 files for 4 room types
const uploadPropertyMedia = multer({
  storage,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB limit per file
    files: 60 // Maximum total files: 12 property images + 12 images per room type × 4 room types
  },
  fileFilter: (req, file, cb) => {
    // Only allow images for property creation
    if (ALLOWED_IMAGES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for property creation (jpg, png, webp)'));
    }
  }
});

// Make sure uploadIcon is defined and exported
const uploadIcon = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for icons
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files for icons
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for icons'), false);
    }
  }
});

// Upload configuration for agent certificates (PDF, JPEG, PNG)
const uploadCertificate = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = path.join(UPLOAD_BASE, 'agent-certificates');
      fs.mkdirSync(dir, { recursive: true });
      file.subdirectory = 'agent-certificates';
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/\s+/g, '_');
      const filename = `agent-${Date.now()}_${base}${ext}`;
      
      // Store both filesystem path and URL-friendly path
      file.url = `/uploads/${file.subdirectory}/${filename}`;
      
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, JPEG, PNG files for IATA certificates
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, and PNG files are allowed for IATA certificates'), false);
    }
  }
});

// Upload configuration for site configuration (logo and banner images)
// Logo: single image (PNG, SVG, JPG) - 5MB max
// Banner images: multiple images (PNG, JPG, WebP) - 5MB each, max 10 images
const uploadSiteConfig = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 11 // 1 logo + up to 10 banner images
  },
  fileFilter: (req, file, cb) => {
    // Accept images (including SVG for logo)
    if (ALLOWED_IMAGES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, svg)'), false);
    }
  }
});

// Helper function for multipart requests
const isMultipart = (req) => (req.headers['content-type'] || '').startsWith('multipart/form-data');

// Export configurations
module.exports = {
  uploadImage,
  uploadVideo,
  uploadMedia,
  uploadPropertyMedia, // Property creation media upload (2MB limit, images only)
  uploadIcon, // Make sure this is exported
  uploadCertificate, // Export for agent certificates
  uploadSiteConfig, // Site configuration upload (logo and banner images)
  isMultipart,
  UPLOAD_BASE
};