
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const crypto = require('crypto');
const https = require('https');
const net = require('net');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
console.log('🔍 Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
console.log('PGHOST:', process.env.PGHOST || 'NOT SET');
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:ptrzmLFbwlrQYpPJfeAofGqMkXFdSIhu@crossover.proxy.rlwy.net:37534/railway';
console.log('📡 Using DB connection string (host partially shown):', connectionString.split('@')[1] || '(none)');
const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString.includes('rlwy.net') ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'files');
const ADMIN_UPLOAD_KEY = process.env.ADMIN_UPLOAD_KEY || 'birebiro2024';
const ADMIN_AUTH_ACCESS_KEY = process.env.ADMIN_AUTH_ACCESS_KEY || process.env.ADMIN_ACCESS_KEY || 'birebiro2026';
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

const adminAuthAttempts = new Map();

const getDefaultAdminUsers = () => ([
  {
    username: 'admin',
    password: 'admin123',
    displayName: 'Admin',
    role: 'super_admin',
  },
  {
    username: 'deniz',
    password: 'deniz123',
    displayName: 'Deniz Can',
    role: 'admin',
  },
  {
    username: 'erdem',
    password: 'erdem123',
    displayName: 'Erdem',
    role: 'admin',
  },
]);

const getAdminAuthUsers = () => {
  const raw = process.env.ADMIN_AUTH_USERS_JSON;

  if (!raw) {
    return getDefaultAdminUsers();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('ADMIN_AUTH_USERS_JSON must be an array');
    }

    return parsed
      .filter(user => user && user.username && user.password)
      .map(user => ({
        username: String(user.username),
        password: String(user.password),
        displayName: String(user.displayName || user.username),
        role: String(user.role || 'admin'),
      }));
  } catch (error) {
    console.error('Failed to parse ADMIN_AUTH_USERS_JSON:', error.message);
    return getDefaultAdminUsers();
  }
};

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || 'unknown';
};

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new Error('Lütfen geçerli bir görsel dosyası seçin'));
      return;
    }
    cb(null, true);
  },
});

const requireAdminUploadAccess = (req, res, next) => {
  const providedKey = req.headers['x-admin-upload-key'];

  if (!providedKey) {
    return res.status(401).json({ error: 'Admin upload erişim anahtarı gerekli' });
  }

  if (providedKey !== ADMIN_UPLOAD_KEY) {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekli' });
  }

  return next();
};

const getExtensionFromFile = (file) => {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (fromName) {
    return fromName;
  }

  const mimeExtensionMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };

  return mimeExtensionMap[file.mimetype] || '.jpg';
};

app.post('/api/admin-auth/login', (req, res) => {
  const { username, password, accessKey } = req.body || {};

  if (!username || !password || !accessKey) {
    return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz.' });
  }

  const now = Date.now();
  const requestIp = getRequestIp(req);
  const attemptKey = `${String(username).toLowerCase()}::${requestIp}`;
  const attempts = adminAuthAttempts.get(attemptKey) || { count: 0, lastAttempt: 0 };

  if (attempts.count >= 5 && (now - attempts.lastAttempt) < 5 * 60 * 1000) {
    const remainingTime = Math.ceil((5 * 60 * 1000 - (now - attempts.lastAttempt)) / 1000 / 60);
    return res.status(429).json({
      success: false,
      message: `Çok fazla başarısız deneme. ${remainingTime} dakika sonra tekrar deneyin.`
    });
  }

  if ((now - attempts.lastAttempt) > 5 * 60 * 1000) {
    attempts.count = 0;
  }

  const matchedUser = getAdminAuthUsers().find(user => (
    user.username.toLowerCase() === String(username).toLowerCase() &&
    user.password === password
  ));

  if (!matchedUser || accessKey !== ADMIN_AUTH_ACCESS_KEY) {
    attempts.count += 1;
    attempts.lastAttempt = now;
    adminAuthAttempts.set(attemptKey, attempts);

    return res.status(401).json({
      success: false,
      message: 'Geçersiz kullanıcı adı, şifre veya erişim anahtarı.'
    });
  }

  adminAuthAttempts.delete(attemptKey);

  return res.json({
    success: true,
    user: {
      username: matchedUser.username,
      displayName: matchedUser.displayName,
      role: matchedUser.role,
    },
  });
});

app.use('/api/files', express.static(UPLOAD_DIR));

/**
 * Helper: Uzak bir URL'deki görseli indirir ve /api/files/ altına kaydeder.
 * Returns: { localUrl, relativePath } veya null (hata durumunda)
 */
async function downloadRemoteImageToStorage(remoteUrl, prefix = 'img') {
  return new Promise(async (resolve) => {
    try {
      if (!remoteUrl || !remoteUrl.startsWith('http')) {
        // Zaten lokal URL ise dokunma
        resolve(null);
        return;
      }

      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const fileName = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.png`;
      const relativeDirectory = path.join(year, month);
      const absoluteDirectory = path.join(UPLOAD_DIR, relativeDirectory);
      await fs.promises.mkdir(absoluteDirectory, { recursive: true });

      const absolutePath = path.join(absoluteDirectory, fileName);
      const relativePath = path.join(relativeDirectory, fileName).replace(/\\/g, '/');

      // Use https or http depending on URL
      const httpModule = remoteUrl.startsWith('https') ? https : require('http');
      
      const download = (url, redirectCount = 0) => {
        if (redirectCount > 5) {
          console.error('Too many redirects downloading image:', remoteUrl);
          resolve(null);
          return;
        }

        httpModule.get(url, (response) => {
          // Handle redirects
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            download(response.headers.location, redirectCount + 1);
            return;
          }

          if (response.statusCode !== 200) {
            console.error(`Failed to download image: HTTP ${response.statusCode} from ${url}`);
            resolve(null);
            return;
          }

          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              await fs.promises.writeFile(absolutePath, buffer);
              const localUrl = `https://admin.birebiro.com/api/files/${relativePath}`;
              console.log(`📥 Image downloaded: ${remoteUrl.substring(0, 80)}... → ${localUrl}`);

              // Log to image_uploads table
              pool.query(
                `INSERT INTO image_uploads (image_url, original_filename, file_size, mime_type, source_page, endpoint, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [localUrl, path.basename(remoteUrl), buffer.length, 'image/png', 'auto-download', 'downloadRemoteImageToStorage', 'server', remoteUrl.substring(0, 200)]
              ).catch(err => console.error('image_uploads log error:', err));

              resolve({ localUrl, relativePath, absolutePath, fileSize: buffer.length });
            } catch (writeErr) {
              console.error('Error writing downloaded image:', writeErr);
              resolve(null);
            }
          });
          response.on('error', (err) => {
            console.error('Error downloading image:', err);
            resolve(null);
          });
        }).on('error', (err) => {
          console.error('HTTP request error downloading image:', err);
          resolve(null);
        });
      };

      download(remoteUrl);
    } catch (err) {
      console.error('downloadRemoteImageToStorage error:', err);
      resolve(null);
    }
  });
}

// PUBLIC USER IMAGE UPLOAD ENDPOINT
// This endpoint is for user uploads (not admin panel). It always returns image URLs with admin.birebiro.com.
app.post('/api/upload-image', (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dosya boyutu 5MB\'dan büyük olamaz' });
      }
      return res.status(400).json({ error: error.message || 'Görsel yüklenemedi' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Yüklenecek görsel bulunamadı' });
    }

    try {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const extension = getExtensionFromFile(req.file);
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

      const relativeDirectory = path.join(year, month);
      const absoluteDirectory = path.join(UPLOAD_DIR, relativeDirectory);
      await fs.promises.mkdir(absoluteDirectory, { recursive: true });

      const absolutePath = path.join(absoluteDirectory, fileName);
      await fs.promises.writeFile(absolutePath, req.file.buffer);

      const relativePath = path.join(relativeDirectory, fileName).replace(/\\/g, '/');
      const imageUrl = `https://admin.birebiro.com/api/files/${relativePath}`;

      // Log to image_uploads table
      const sourcePage = req.body?.source || req.headers['x-upload-source'] || 'unknown';
      pool.query(
        `INSERT INTO image_uploads (image_url, original_filename, file_size, mime_type, source_page, endpoint, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [imageUrl, req.file.originalname, req.file.size, req.file.mimetype, sourcePage, '/api/upload-image', req.ip, req.headers['user-agent']]
      ).catch(err => console.error('image_uploads log error:', err));

      return res.json({
        image_url: imageUrl,
        thumb_url: imageUrl,
      });
    } catch (writeError) {
      console.error('Image upload write error:', writeError);
      return res.status(500).json({ error: 'Görsel kaydedilirken hata oluştu' });
    }
  });
});

app.post('/api/admin/upload-image', requireAdminUploadAccess, (req, res) => {
  upload.single('image')(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dosya boyutu 5MB\'dan büyük olamaz' });
      }
      return res.status(400).json({ error: error.message || 'Görsel yüklenemedi' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Yüklenecek görsel bulunamadı' });
    }

    try {
      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const extension = getExtensionFromFile(req.file);
      const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

      const relativeDirectory = path.join(year, month);
      const absoluteDirectory = path.join(UPLOAD_DIR, relativeDirectory);
      await fs.promises.mkdir(absoluteDirectory, { recursive: true });

      const absolutePath = path.join(absoluteDirectory, fileName);
      await fs.promises.writeFile(absolutePath, req.file.buffer);

      const relativePath = path.join(relativeDirectory, fileName).replace(/\\/g, '/');
      const imageUrl = `https://admin.birebiro.com/api/files/${relativePath}`;

      // Log to image_uploads table
      const sourcePage = req.body?.source || req.headers['x-upload-source'] || 'admin-panel';
      pool.query(
        `INSERT INTO image_uploads (image_url, original_filename, file_size, mime_type, source_page, endpoint, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [imageUrl, req.file.originalname, req.file.size, req.file.mimetype, sourcePage, '/api/admin/upload-image', req.ip, req.headers['user-agent']]
      ).catch(err => console.error('image_uploads log error:', err));

      return res.json({
        image_url: imageUrl,
        thumb_url: imageUrl,
      });
    } catch (writeError) {
      console.error('Image upload write error:', writeError);
      return res.status(500).json({ error: 'Görsel kaydedilirken hata oluştu' });
    }
  });
});

// VERSION CHECK - Bu endpoint Railway'in hangi kodu çalıştırdığını gösterir
app.get('/api/version', (req, res) => {
  res.json({
    version: '2.2.0-debug',
    deployTime: '2025-12-03T00:00:00Z',
    features: ['site-settings', 'refund', 'dashboard']
  });
});

// ==================== PRODUCTS API ====================
// ==================== PRODUCTS API ====================

// Get product stats
app.get('/api/products/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalProducts",
        COUNT(*) FILTER (WHERE is_active = true) as "activeProducts",
        COUNT(*) FILTER (WHERE is_active = false) as "inactiveProducts",
        (SELECT COUNT(*) FROM product_size) as "totalSizes",
        (SELECT COUNT(*) FROM product_frame) as "totalFrames"
      FROM product
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Products stats error:', error);
    if (!res.headersSent) {
      res.status(500).type('application/json').send(JSON.stringify({ error: 'Failed to fetch stats', details: error.message }));
    }
  }
});

// Get all products with sizes and frames count
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, 
        p.slug,
        p.name as "name",
        p.name_en as "nameEn", 
        p.name_fr as "nameFr",
        p.description as "description",
        p.description_en as "descriptionEn",
        p.description_fr as "descriptionFr",
        p.image_square_url as "imageSquareUrl",
        p.image_wide_url as "imageWideUrl",
        p.image_dimensions as "imageDimensions",
        p.size_label as "sizeLabel",
        p.size_label_en as "sizeLabelEn",
        p.size_label_fr as "sizeLabelFr",
        p.frame_label as "frameLabel",
        p.frame_label_en as "frameLabelEn",
        p.frame_label_fr as "frameLabelFr",
        p.is_active as "isActive",
        p.sort_order as "sortOrder",
        p.desi,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        (SELECT COUNT(*) FROM product_size WHERE product_id = p.id) as "sizesCount",
        (SELECT COUNT(*) FROM product_frame WHERE product_id = p.id) as "framesCount",
        (SELECT MIN(price_amount) FROM product_size WHERE product_id = p.id) as "minPrice",
        (SELECT MAX(price_amount) FROM product_size WHERE product_id = p.id) as "maxPrice"
      FROM product p
      ORDER BY p.sort_order ASC, p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Products fetch error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }
});

// Get single product with all details
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get product
    const productResult = await pool.query(`
      SELECT 
        id, 
        slug,
        name as "name",
        name_en as "nameEn", 
        name_fr as "nameFr",
        description as "description",
        description_en as "descriptionEn",
        description_fr as "descriptionFr",
        image_square_url as "imageSquareUrl",
        image_square_url_2 as "imageSquareUrl2",
        image_square_url_3 as "imageSquareUrl3",
        image_wide_url as "imageWideUrl",
        image_dimensions as "imageDimensions",
        size_label as "sizeLabel",
        size_label_en as "sizeLabelEn",
        size_label_fr as "sizeLabelFr",
        frame_label as "frameLabel",
        frame_label_en as "frameLabelEn",
        frame_label_fr as "frameLabelFr",
        is_active as "isActive",
        sort_order as "sortOrder",
        desi,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM product 
      WHERE id = $1
    `, [id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get sizes
    const sizesResult = await pool.query(`
      SELECT 
        id,
        product_id as "productId",
        slug,
        name,
        name_en as "nameEn",
        name_fr as "nameFr",
        dimensions,
        price_amount as "priceAmount",
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM product_size 
      WHERE product_id = $1
      ORDER BY sort_order ASC
    `, [id]);

    // Get frames
    const framesResult = await pool.query(`
      SELECT 
        id,
        product_id as "productId",
        slug,
        name,
        name_en as "nameEn",
        name_fr as "nameFr",
        price_amount as "priceAmount",
        color_code as "colorCode",
        frame_image as "frameImage",
        frame_image_large as "frameImageLarge",
        mockup_template as "mockupTemplate",
        mockup_config as "mockupConfig",
        mockup_template_vertical as "mockupTemplateVertical",
        mockup_config_vertical as "mockupConfigVertical",
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM product_frame 
      WHERE product_id = $1
      ORDER BY sort_order ASC
    `, [id]);

    // Get size-frame availability
    const availabilityResult = await pool.query(`
      SELECT 
        size_id as "sizeId",
        frame_id as "frameId",
        is_available as "isAvailable"
      FROM product_size_frame
      WHERE product_id = $1
    `, [id]);

    res.json({
      ...productResult.rows[0],
      sizes: sizesResult.rows,
      frames: framesResult.rows,
      sizeFrameAvailability: availabilityResult.rows,
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const {
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageSquareUrl2, imageSquareUrl3, imageWideUrl, imageDimensions, sizeLabel, sizeLabelEn,
      sizeLabelFr, frameLabel, frameLabelEn, frameLabelFr, isActive, sortOrder, desi
    } = req.body;

    const result = await pool.query(`
      INSERT INTO product (
        slug, name, name_en, name_fr, description, description_en, description_fr,
        image_square_url, image_square_url_2, image_square_url_3, image_wide_url, image_dimensions, size_label, size_label_en,
        size_label_fr, frame_label, frame_label_en, frame_label_fr, is_active, sort_order, desi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `, [
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageSquareUrl2, imageSquareUrl3, imageWideUrl, imageDimensions || '1920x1080',
      sizeLabel || 'Boyut Seçin', sizeLabelEn || 'Select Size', sizeLabelFr || 'Sélectionner la taille',
      frameLabel || 'Çerçeve Seçin', frameLabelEn || 'Select Frame', frameLabelFr || 'Sélectionner le cadre',
      isActive !== false, sortOrder || 0, desi || 1
    ]);

    res.status(201).json({ id: result.rows[0].id, message: 'Product created successfully' });
  } catch (error) {
    console.error('Product create error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageSquareUrl2, imageSquareUrl3, imageWideUrl, imageDimensions, sizeLabel, sizeLabelEn,
      sizeLabelFr, frameLabel, frameLabelEn, frameLabelFr, isActive, sortOrder, desi
    } = req.body;

    const result = await pool.query(`
      UPDATE product SET
        slug = COALESCE($1, slug),
        name = COALESCE($2, name),
        name_en = $3,
        name_fr = $4,
        description = COALESCE($5, description),
        description_en = $6,
        description_fr = $7,
        image_square_url = $8,
        image_square_url_2 = $9,
        image_square_url_3 = $10,
        image_wide_url = $11,
        image_dimensions = COALESCE($12, image_dimensions),
        size_label = COALESCE($13, size_label),
        size_label_en = $14,
        size_label_fr = $15,
        frame_label = COALESCE($16, frame_label),
        frame_label_en = $17,
        frame_label_fr = $18,
        is_active = COALESCE($19, is_active),
        sort_order = COALESCE($20, sort_order),
        desi = COALESCE($21, desi),
        updated_at = NOW()
      WHERE id = $22
      RETURNING id
    `, [
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageSquareUrl2, imageSquareUrl3, imageWideUrl, imageDimensions, sizeLabel, sizeLabelEn,
      sizeLabelFr, frameLabel, frameLabelEn, frameLabelFr, isActive, sortOrder, desi, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM product WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ==================== PRODUCT SIZES API ====================

// Get sizes for a product
app.get('/api/products/:productId/sizes', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        product_id as "productId",
        slug,
        name,
        name_en as "nameEn",
        name_fr as "nameFr",
        dimensions,
        price_amount as "priceAmount",
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM product_size 
      WHERE product_id = $1
      ORDER BY sort_order ASC
    `, [productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Product sizes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sizes' });
  }
});

// Create size
app.post('/api/products/:productId/sizes', async (req, res) => {
  try {
    const { productId } = req.params;
    const { slug, name, nameEn, nameFr, dimensions, priceAmount, isActive, sortOrder } = req.body;

    const result = await pool.query(`
      INSERT INTO product_size (product_id, slug, name, name_en, name_fr, dimensions, price_amount, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [productId, slug, name, nameEn, nameFr, dimensions, priceAmount, isActive !== false, sortOrder || 0]);

    res.status(201).json({ id: result.rows[0].id, message: 'Size created successfully' });
  } catch (error) {
    console.error('Size create error:', error);
    res.status(500).json({ error: 'Failed to create size' });
  }
});

// Update size
app.put('/api/products/:productId/sizes/:sizeId', async (req, res) => {
  try {
    const { productId, sizeId } = req.params;
    const { slug, name, nameEn, nameFr, dimensions, priceAmount, isActive, sortOrder } = req.body;

    const result = await pool.query(`
      UPDATE product_size SET
        slug = COALESCE($1, slug),
        name = COALESCE($2, name),
        name_en = $3,
        name_fr = $4,
        dimensions = COALESCE($5, dimensions),
        price_amount = COALESCE($6, price_amount),
        is_active = COALESCE($7, is_active),
        sort_order = COALESCE($8, sort_order),
        updated_at = NOW()
      WHERE id = $9 AND product_id = $10
      RETURNING id
    `, [slug, name, nameEn, nameFr, dimensions, priceAmount, isActive, sortOrder, sizeId, productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Size not found' });
    }

    res.json({ message: 'Size updated successfully' });
  } catch (error) {
    console.error('Size update error:', error);
    res.status(500).json({ error: 'Failed to update size' });
  }
});

// Delete size
app.delete('/api/products/:productId/sizes/:sizeId', async (req, res) => {
  try {
    const { productId, sizeId } = req.params;
    const result = await pool.query(
      'DELETE FROM product_size WHERE id = $1 AND product_id = $2 RETURNING id',
      [sizeId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Size not found' });
    }

    res.json({ message: 'Size deleted successfully' });
  } catch (error) {
    console.error('Size delete error:', error);
    res.status(500).json({ error: 'Failed to delete size' });
  }
});

// ==================== PRODUCT FRAMES API ====================

// Get frames for a product
app.get('/api/products/:productId/frames', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        product_id as "productId",
        slug,
        name,
        name_en as "nameEn",
        name_fr as "nameFr",
        price_amount as "priceAmount",
        color_code as "colorCode",
        frame_image as "frameImage",
        frame_image_large as "frameImageLarge",
        mockup_template as "mockupTemplate",
        mockup_config as "mockupConfig",
        mockup_template_vertical as "mockupTemplateVertical",
        mockup_config_vertical as "mockupConfigVertical",
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM product_frame 
      WHERE product_id = $1
      ORDER BY sort_order ASC
    `, [productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Product frames fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch frames' });
  }
});

// Create frame
app.post('/api/products/:productId/frames', async (req, res) => {
  try {
    const { productId } = req.params;
    const { slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, mockupTemplateVertical, mockupConfigVertical, isActive, sortOrder } = req.body;

    const result = await pool.query(`
      INSERT INTO product_frame (product_id, slug, name, name_en, name_fr, price_amount, color_code, frame_image, frame_image_large, mockup_template, mockup_config, mockup_template_vertical, mockup_config_vertical, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [productId, slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, mockupTemplateVertical || null, mockupConfigVertical || '{}', isActive !== false, sortOrder || 0]);

    res.status(201).json({ id: result.rows[0].id, message: 'Frame created successfully' });
  } catch (error) {
    console.error('Frame create error:', error);
    res.status(500).json({ error: 'Failed to create frame' });
  }
});

// Update frame
app.put('/api/products/:productId/frames/:frameId', async (req, res) => {
  try {
    const { productId, frameId } = req.params;
    const { slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, mockupTemplateVertical, mockupConfigVertical, isActive, sortOrder } = req.body;

    const result = await pool.query(`
      UPDATE product_frame SET
        slug = COALESCE($1, slug),
        name = COALESCE($2, name),
        name_en = $3,
        name_fr = $4,
        price_amount = COALESCE($5, price_amount),
        color_code = $6,
        frame_image = $7,
        frame_image_large = $8,
        mockup_template = $9,
        mockup_config = $10,
        mockup_template_vertical = $11,
        mockup_config_vertical = COALESCE($12, mockup_config_vertical),
        is_active = COALESCE($13, is_active),
        sort_order = COALESCE($14, sort_order),
        updated_at = NOW()
      WHERE id = $15 AND product_id = $16
      RETURNING id
    `, [slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, mockupTemplateVertical, mockupConfigVertical, isActive, sortOrder, frameId, productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    res.json({ message: 'Frame updated successfully' });
  } catch (error) {
    console.error('Frame update error:', error);
    res.status(500).json({ error: 'Failed to update frame' });
  }
});

// Delete frame
app.delete('/api/products/:productId/frames/:frameId', async (req, res) => {
  try {
    const { productId, frameId } = req.params;
    const result = await pool.query(
      'DELETE FROM product_frame WHERE id = $1 AND product_id = $2 RETURNING id',
      [frameId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame not found' });
    }

    res.json({ message: 'Frame deleted successfully' });
  } catch (error) {
    console.error('Frame delete error:', error);
    res.status(500).json({ error: 'Failed to delete frame' });
  }
});

// ==================== PRODUCT SIZE-FRAME AVAILABILITY API ====================

// Get size-frame availability for a product
app.get('/api/products/:productId/size-frame-availability', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        product_id as "productId",
        size_id as "sizeId",
        frame_id as "frameId",
        is_available as "isAvailable"
      FROM product_size_frame
      WHERE product_id = $1
    `, [productId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Size-frame availability fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch size-frame availability' });
  }
});

// Update size-frame availability (bulk upsert)
app.put('/api/products/:productId/size-frame-availability', async (req, res) => {
  try {
    const { productId } = req.params;
    const { availability } = req.body; // Array of { sizeId, frameId, isAvailable }

    if (!Array.isArray(availability)) {
      return res.status(400).json({ error: 'availability must be an array' });
    }

    // Use a transaction for bulk upsert
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of availability) {
        await client.query(`
          INSERT INTO product_size_frame (product_id, size_id, frame_id, is_available, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (product_id, size_id, frame_id)
          DO UPDATE SET is_available = $4, updated_at = NOW()
        `, [productId, item.sizeId, item.frameId, item.isAvailable]);
      }

      await client.query('COMMIT');
      res.json({ message: 'Size-frame availability updated successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Size-frame availability update error:', error);
    res.status(500).json({ error: 'Failed to update size-frame availability' });
  }
});

// ==================== AI MODELS API ====================

// Get all AI models
app.get('/api/ai-models', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        provider, 
        model_identifier as "modelIdentifier", 
        is_active as "isActive", 
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM ai_model 
      ORDER BY sort_order ASC, name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('AI models fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch AI models' });
  }
});

// Batch reorder AI models
app.post('/api/ai-models/reorder', async (req, res) => {
  const client = await pool.connect();
  try {
    const { modelIds } = req.body; // Array of IDs in the new order
    await client.query('BEGIN');

    for (let i = 0; i < modelIds.length; i++) {
      await client.query(
        'UPDATE ai_model SET sort_order = $1, updated_at = NOW() WHERE id = $2',
        [i + 1, modelIds[i]]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'AI models reordered successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('AI models reorder error:', error);
    res.status(500).json({ error: 'Failed to reorder AI models' });
  } finally {
    client.release();
  }
});

// Create AI model
app.post('/api/ai-models', async (req, res) => {
  try {
    const { name, provider, modelIdentifier, isActive, sortOrder } = req.body;
    const result = await pool.query(
      'INSERT INTO ai_model (name, provider, model_identifier, is_active, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, provider, modelIdentifier, isActive !== false, sortOrder || 0]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'AI model created successfully' });
  } catch (error) {
    console.error('AI model create error:', error);
    res.status(500).json({ error: 'Failed to create AI model' });
  }
});

// Update AI model
app.put('/api/ai-models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, modelIdentifier, isActive, sortOrder } = req.body;
    const result = await pool.query(
      `UPDATE ai_model SET 
        name = COALESCE($1, name), 
        provider = COALESCE($2, provider), 
        model_identifier = COALESCE($3, model_identifier), 
        is_active = COALESCE($4, is_active), 
        sort_order = COALESCE($5, sort_order),
        updated_at = NOW()
      WHERE id = $6 RETURNING id`,
      [name, provider, modelIdentifier, isActive, sortOrder, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI model not found' });
    }
    res.json({ message: 'AI model updated successfully' });
  } catch (error) {
    console.error('AI model update error:', error);
    res.status(500).json({ error: 'Failed to update AI model' });
  }
});

// Delete AI model
app.delete('/api/ai-models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM ai_model WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AI model not found' });
    }
    res.json({ message: 'AI model deleted successfully' });
  } catch (error) {
    console.error('AI model delete error:', error);
    res.status(500).json({ error: 'Failed to delete AI model' });
  }
});

// ==================== PARAŞÜT API ====================
// Paraşüt API Configuration
const PARASUT_CONFIG = {
  clientId: process.env.PARASUT_CLIENT_ID,
  clientSecret: process.env.PARASUT_CLIENT_SECRET,
  companyId: process.env.PARASUT_COMPANY_ID,
  username: process.env.PARASUT_USERNAME,
  password: process.env.PARASUT_PASSWORD,
  baseUrl: 'https://api.parasut.com/v4',
  redirectUri: 'urn:ietf:wg:oauth:2.0:oob'
};

// Diagnostic logging for Paraşüt config
console.log('--- Paraşüt Config Diagnostic ---');
console.log(`PARASUT_CLIENT_ID: ${PARASUT_CONFIG.clientId ? 'SET (ends with ' + PARASUT_CONFIG.clientId.slice(-4) + ')' : 'MISSING'}`);
console.log(`PARASUT_CLIENT_SECRET: ${PARASUT_CONFIG.clientSecret ? 'SET' : 'MISSING'}`);
console.log(`PARASUT_COMPANY_ID: ${PARASUT_CONFIG.companyId ? 'SET (' + PARASUT_CONFIG.companyId + ')' : 'MISSING'}`);
console.log(`PARASUT_USERNAME: ${PARASUT_CONFIG.username ? 'SET' : 'MISSING'}`);
console.log(`PARASUT_PASSWORD: ${PARASUT_CONFIG.password ? 'SET' : 'MISSING'}`);
console.log('---------------------------------');

// Token cache
let parasutToken = null;

let tokenExpiresAt = null;



// Get Paraşüt OAuth Token
async function getParasutToken() {
  if (!PARASUT_CONFIG.clientId || !PARASUT_CONFIG.clientSecret || !PARASUT_CONFIG.companyId) {
    const missing = [];
    if (!PARASUT_CONFIG.clientId) missing.push('PARASUT_CLIENT_ID');
    if (!PARASUT_CONFIG.clientSecret) missing.push('PARASUT_CLIENT_SECRET');
    if (!PARASUT_CONFIG.companyId) missing.push('PARASUT_COMPANY_ID');
    throw new Error(`Paraşüt API kimlik bilgileri eksik (Temel): ${missing.join(', ')}`);
  }

  // Password Flow Check
  if (!PARASUT_CONFIG.username || !PARASUT_CONFIG.password) {
    console.warn('⚠️ PARASUT_USERNAME or PARASUT_PASSWORD missing. Falling back to client_credentials (may cause "User not found").');
  }

  // Return cached token if still valid
  if (parasutToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return parasutToken;
  }

  const tokenUrl = 'https://api.parasut.com/oauth/token';
  const params = new URLSearchParams();

  if (PARASUT_CONFIG.username && PARASUT_CONFIG.password) {
    // Password Grant Flow (Preferred for operations requiring User context)
    console.log('🔑 Authenticating with Password Flow...');
    params.append('grant_type', 'password');
    params.append('client_id', PARASUT_CONFIG.clientId);
    params.append('client_secret', PARASUT_CONFIG.clientSecret);
    params.append('username', PARASUT_CONFIG.username);
    params.append('password', PARASUT_CONFIG.password);
    params.append('redirect_uri', PARASUT_CONFIG.redirectUri);
  } else {
    // Client Credentials Flow (Fallback)
    console.log('🛡️ Authenticating with Client Credentials Flow...');
    params.append('grant_type', 'client_credentials');
    params.append('client_id', PARASUT_CONFIG.clientId);
    params.append('client_secret', PARASUT_CONFIG.clientSecret);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Paraşüt Token Error Body:', error);
    throw new Error(`Paraşüt token hatası: ${error}`);
  }

  const data = await response.json();
  parasutToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer;

  console.log('✅ Paraşüt token alındı');
  return parasutToken;
}

// Diagnostic: List Accessible Firms
async function listParasutFirms() {
  const token = await getParasutToken();
  const url = 'https://api.parasut.com/v4/me';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      const firms = data.included?.filter(item => item.type === 'companies').map(c => `ID: ${c.id} (${c.attributes.name})`) || [];
      console.log('--- Accessible Paraşüt Firms ---');
      console.log(firms.length > 0 ? firms.join('\n') : 'No firms found in token scope.');
      console.log('--------------------------------');
      return firms;
    } else {
      console.log(`DEBUG: Could not list firms. Status: ${response.status}`);
    }
  } catch (e) {
    console.error('DEBUG: Error listing firms:', e.message);
  }
  return [];
}

// Paraşüt API Request Helper
async function parasutRequest(method, endpoint, body = null) {
  const token = await getParasutToken();
  const url = `${PARASUT_CONFIG.baseUrl}/${PARASUT_CONFIG.companyId}${endpoint}`;

  console.log(`DEBUG: Paraşüt Request [${method}] ${url}`);

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/vnd.api+json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  // Parse response cautiously (Paraşüt uses application/vnd.api+json)
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/json') || contentType.includes('application/vnd.api+json'))) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log(`DEBUG: Non-JSON Paraşüt Response: ${text}`);
      data = { errors: [{ detail: text || `HTTP ${response.status} ${response.statusText}` }] };
    }
  }

  if (!response.ok) {
    console.error(`❌ Paraşüt API Error [${response.status}] ${method} ${url}`);
    console.error('Paraşüt API Error Detail:', JSON.stringify(data, null, 2));

    // Diagnostic for Record Not Found / User
    if (response.status === 404 && JSON.stringify(data).includes('User')) {
      console.log('DEBUG: "User not found" detected. Attempting to list accessible firms...');
      await listParasutFirms();
    }

    throw new Error(data.errors?.[0]?.detail || data.message || `Paraşüt API hatası (${response.status})`);
  }

  return data;
}

// Find or Create Contact in Paraşüt
async function findOrCreateParasutContact(order) {
  // First try to find by email
  try {
    const searchResult = await parasutRequest('GET', `/contacts?filter[email]=${encodeURIComponent(order.customerEmail)}`);
    if (searchResult.data && searchResult.data.length > 0) {
      console.log('✅ Mevcut müşteri bulundu:', searchResult.data[0].id);
      return searchResult.data[0].id;
    }
  } catch (e) {
    console.log('Müşteri araması başarısız, yeni oluşturulacak');
  }

  // Create new contact
  const contactData = {
    data: {
      type: 'contacts',
      attributes: {
        contact_type: order.isCorporateInvoice ? 'company' : 'person',
        name: order.isCorporateInvoice ? order.companyName : order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.customerAddress,
        city: order.customerCity,
        district: order.customerDistrict,
        account_type: 'customer'
      }
    }
  };

  // Add company details if corporate invoice
  if (order.isCorporateInvoice) {
    contactData.data.attributes.tax_number = order.taxNumber;
    contactData.data.attributes.tax_office = order.taxOffice;
  }

  const result = await parasutRequest('POST', '/contacts', contactData);
  if (!result || !result.data) {
    console.error('❌ Parasut contact creation returned invalid response:', JSON.stringify(result));
    throw new Error('Müşteri oluşturulamadı (Invalid Response)');
  }
  console.log('✅ Yeni müşteri oluşturuldu:', result.data.id);
  return result.data.id;
}

// Find or Create Product in Paraşüt
async function findOrCreateParasutProduct(order) {
  let finalProductName = [
    order.productName,
    order.sizeName ? `- ${order.sizeName}` : '',
    order.frameName ? `${order.frameName} Çerçeve` : ''
  ].filter(Boolean).join(' ');

  // If no product name (e.g. credit purchase), generate one
  if (!finalProductName) {
    if (order.orderType === 'CREDIT' || order.creditAmount > 0) {
      finalProductName = `Birebiro Kredi Paketi (${order.creditAmount || ''} Kredi)`;
    } else {
      finalProductName = 'Birebiro Hizmet Bedeli';
    }
  }

  // First try to find by name
  try {
    const searchResult = await parasutRequest('GET', `/products?filter[name]=${encodeURIComponent(finalProductName)}`);
    if (searchResult.data && searchResult.data.length > 0) {
      console.log('✅ Mevcut ürün bulundu:', searchResult.data[0].id);
      return searchResult.data[0].id;
    }
  } catch (e) {
    console.log('Ürün araması başarısız, yeni oluşturulacak');
  }

  // Create new product
  const productData = {
    data: {
      type: 'products',
      attributes: {
        name: finalProductName,
        code: `PRD-${order.productId || 'CREDIT'}-${order.productSizeId || '0'}-${order.productFrameId || '0'}`,
        vat_rate: 20,
        currency: 'TRL',
        unit: 'Adet'
      }
    }
  };

  const result = await parasutRequest('POST', '/products', productData);
  if (!result || !result.data) {
    console.error('❌ Parasut product creation returned invalid response:', JSON.stringify(result));
    throw new Error('Ürün oluşturulamadı (Invalid Response)');
  }
  console.log('✅ Yeni ürün oluşturuldu:', result.data.id);
  return result.data.id;
}

// Create Sales Invoice in Paraşüt
async function createParasutInvoice(order, contactId, productId) {
  // Calculate prices (assuming totalAmount is in kuruş, convert to TL)
  const totalTL = (order.totalAmount / 100).toFixed(2);

  const invoiceData = {
    data: {
      type: 'sales_invoices',
      attributes: {
        item_type: 'invoice',
        description: `Birebiro Sipariş #${order.id}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        currency: 'TRL'
      },
      relationships: {
        contact: {
          data: {
            id: contactId,
            type: 'contacts'
          }
        },
        details: {
          data: [
            {
              type: 'sales_invoice_details',
              attributes: {
                quantity: 1,
                unit_price: totalTL,
                vat_rate: 20,
                description: [
                  order.productName || (order.creditAmount ? `Birebiro Kredi Paketi (${order.creditAmount} Kredi)` : 'Birebiro Hizmet Bedeli'),
                  order.sizeName ? `- ${order.sizeName}` : '',
                  order.frameName ? `${order.frameName} Çerçeve` : ''
                ].filter(Boolean).join(' ')
              },
              relationships: {
                product: {
                  data: {
                    id: productId,
                    type: 'products'
                  }
                }
              }
            }
          ]
        }
      }
    }
  };

  const result = await parasutRequest('POST', '/sales_invoices', invoiceData);
  if (!result || !result.data) {
    console.error('❌ Parasut invoice creation returned invalid response:', JSON.stringify(result));
    throw new Error('Fatura oluşturulamadı (Invalid Response)');
  }
  console.log('✅ Fatura oluşturuldu:', result.data.id);
  return result.data;
}

// Create Invoice Endpoint
app.get('/api/parasut/debug', async (req, res) => {
  try {
    const firms = await listParasutFirms();
    res.json({
      config: {
        clientId: PARASUT_CONFIG.clientId ? `SET (ends with ${PARASUT_CONFIG.clientId.slice(-4)})` : 'MISSING',
        companyId: PARASUT_CONFIG.companyId || 'MISSING',
        baseUrl: PARASUT_CONFIG.baseUrl
      },
      accessibleFirms: firms,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      config_status: {
        hasClientId: !!PARASUT_CONFIG.clientId,
        hasClientSecret: !!PARASUT_CONFIG.clientSecret,
        hasCompanyId: !!PARASUT_CONFIG.companyId
      }
    });
  }
});

// Create Invoice Endpoint
app.post('/api/orders/:id/create-invoice', async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const orderResult = await pool.query(`
      SELECT 
        o.id,
        o.customer_name as "customerName",
        o.customer_email as "customerEmail",
        o.customer_phone as "customerPhone",
        o.customer_address as "customerAddress",
        o.customer_city as "customerCity",
        o.customer_district as "customerDistrict",
        o.is_corporate_invoice as "isCorporateInvoice",
        o.company_name as "companyName",
        o.tax_number as "taxNumber",
        o.tax_office as "taxOffice",
        o.total_amount as "totalAmount",
        o.payment_status as "paymentStatus",
        o.parasut_invoice_id as "parasutInvoiceId",
        o.order_type as "orderType",
        o.credit_amount as "creditAmount",
        p.name as "productName",
        ps.name as "sizeName",
        pf.name as "frameName"
      FROM "order" o
      LEFT JOIN product p ON o.product_id = p.id
      LEFT JOIN product_size ps ON o.product_size_id = ps.id
      LEFT JOIN product_frame pf ON o.product_frame_id = pf.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    const order = orderResult.rows[0];

    // Check if invoice already exists
    if (order.parasutInvoiceId) {
      return res.status(400).json({
        error: 'Bu sipariş için zaten fatura kesilmiş',
        invoiceId: order.parasutInvoiceId
      });
    }

    // Check payment status
    if (order.paymentStatus !== 'success') {
      console.log(`DEBUG: Invoice skip - Payment status: ${order.paymentStatus}`);
      return res.status(400).json({ error: 'Sadece ödemesi tamamlanmış siparişler için fatura kesilebilir' });
    }

    console.log(`DEBUG: Creating invoice for order #${id}, customer: ${order.customerEmail}`);

    // Find or create contact
    const contactId = await findOrCreateParasutContact(order);
    console.log(`DEBUG: Resolved Contact ID: ${contactId}`);

    // Find or create product
    const productId = await findOrCreateParasutProduct(order);
    console.log(`DEBUG: Resolved Product ID: ${productId}`);

    // Create invoice
    const invoiceData = await createParasutInvoice(order, contactId, productId);
    const invoiceId = invoiceData.id;
    console.log(`DEBUG: Created Invoice ID: ${invoiceId}`);

    // Save invoice ID to order
    await pool.query(`
      UPDATE "order" 
      SET 
        parasut_invoice_id = $1,
        invoice_created_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [invoiceId, id]);

    res.json({
      success: true,
      message: 'Fatura başarıyla oluşturuldu',
      invoiceId: invoiceId,
      invoiceUrl: `https://uygulama.parasut.com/${PARASUT_CONFIG.companyId}/satislar/${invoiceId}`
    });

  } catch (error) {
    console.error('Fatura oluşturma hatası [ENDPOINT]:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Fatura oluşturulamadı',
      detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ==================== GELIVER API ====================
const GELIVER_CONFIG = {
  apiToken: process.env.GELIVER_API_TOKEN || '538ffd83-a1c2-45c2-bddd-f7b98d23ed43',
  baseUrl: 'https://api.geliver.io/api/v1'
};

async function geliverRequest(method, endpoint, body = null) {
  const url = `${GELIVER_CONFIG.baseUrl}${endpoint}`;
  console.log(`DEBUG: Geliver Request [${method}] ${url}`);

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${GELIVER_CONFIG.apiToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    console.error(`❌ Geliver API Error [${response.status}] ${method} ${url}`, data);
    throw new Error(data.message || data.error || `Geliver API error (${response.status})`);
  }

  return data;
}

// ==================== ORDERS API ====================
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.user_id as "userId",
        o.order_type as "orderType",
        o.generation_id as "generationId",
        o.customer_name as "customerName",
        o.customer_email as "customerEmail",
        o.customer_phone as "customerPhone",
        o.customer_address as "customerAddress",
        o.customer_city as "customerCity",
        o.customer_district as "customerDistrict",
        o.payment_amount as "paymentAmount",
        o.total_amount as "totalAmount",
        o.payment_status as "paymentStatus",
        o.shipping_status as "shippingStatus",
        o.tracking_number as "trackingNumber",
        o.orientation,
        o.created_at as "createdAt",
        o.updated_at as "updatedAt",
        p.name as "productName"
      FROM "order" o
      LEFT JOIN product p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order detail with user, product, and generated image info
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        o.id,
        o.user_id as "userId",
        o.generation_id as "generationId",
        o.product_id as "productId",
        o.product_size_id as "productSizeId",
        o.product_frame_id as "productFrameId",
        o.merchant_oid as "merchantOid",
        o.payment_amount as "paymentAmount",
        o.total_amount as "totalAmount",
        o.credit_amount as "creditAmount",
        o.currency,
        o.payment_status as "paymentStatus",
        o.payment_type as "paymentType",
        o.order_type as "orderType",
        o.customer_name as "customerName",
        o.customer_email as "customerEmail",
        o.customer_phone as "customerPhone",
        o.customer_address as "customerAddress",
        o.customer_city as "customerCity",
        o.customer_district as "customerDistrict",
        o.is_corporate_invoice as "isCorporateInvoice",
        o.company_name as "companyName",
        o.tax_number as "taxNumber",
        o.tax_office as "taxOffice",
        o.company_address as "companyAddress",
        o.shipping_status as "shippingStatus",
        o.tracking_number as "trackingNumber",
        o.geliver_offer_id as "geliverOfferId",
        o.geliver_shipment_id as "geliverShipmentId",
        o.geliver_transaction_number as "geliverTransactionNumber",
        o.geliver_shipping_code as "geliverShippingCode",
        o.geliver_provider_code as "geliverProviderCode",
        o.notes,
        o.orientation,
        o.paid_at as "paidAt",
        o.created_at as "createdAt",
        o.updated_at as "updatedAt",
        
        -- User info
        u.art_credits as "userArtCredits",
        
        -- Product info
        p.name as "productName",
        p.name_en as "productNameEn",
        p.slug as "productSlug",
        p.image_square_url as "productImageUrl",
        p.desi as "productDesi",
        
        -- Product size info
        ps.name as "sizeName",
        ps.dimensions as "sizeDimensions",
        ps.price_amount as "sizePrice",
        
        -- Product frame info
        pf.name as "frameName",
        pf.price_amount as "framePrice",
        pf.color_code as "frameColorCode",
        pf.mockup_template as "frameMockupTemplate",
        pf.mockup_config as "frameMockupConfig",
        pf.mockup_template_vertical as "frameMockupTemplateVertical",
        pf.mockup_config_vertical as "frameMockupConfigVertical",
        
        -- Generated image info
        gi.image_url as "generatedImageUrl",
        gi.production_image_url as "productionImageUrl",
        gi.text_prompt as "imagePrompt",
        gi.credit_used as "creditsUsed",
        
        -- Order image transform
        o.image_transform as "imageTransform",
        
        -- Preview & final product images
        o.preview_image_url as "previewImageUrl",
        o.final_product_image_url as "finalProductImageUrl"
        
      FROM "order" o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN product p ON o.product_id = p.id
      LEFT JOIN product_size ps ON o.product_size_id = ps.id
      LEFT JOIN product_frame pf ON o.product_frame_id = pf.id
      LEFT JOIN generated_image gi ON o.generation_id = gi.generation_id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Order detail fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch order detail' });
  }
});

// ==================== REPLICATE UPSCALE (Üretim Görseli) ====================
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || '';

/**
 * Helper: Replicate API'ye HTTPS isteği gönderir (rate limit retry ile)
 */
function replicateRequest(method, urlPath, body, retries = 3) {
  return new Promise((resolve, reject) => {
    const doRequest = (attempt) => {
      const options = {
        hostname: 'api.replicate.com',
        path: urlPath,
        method: method,
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            // Rate limit (429) - retry with backoff
            if (res.statusCode === 429 && attempt < retries) {
              const retryAfter = parseInt(res.headers['retry-after'] || '10', 10);
              const waitMs = Math.max(retryAfter, 10) * 1000;
              console.log(`⏳ Replicate rate limited, ${retryAfter}s sonra tekrar denenecek (deneme ${attempt + 1}/${retries})`);
              setTimeout(() => doRequest(attempt + 1), waitMs);
              return;
            }

            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            reject(new Error(`Replicate API parse error: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('Replicate API timeout (120s)'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    };

    doRequest(0);
  });
}

/**
 * POST /api/orders/:id/generate-production-image
 * Replicate Google Image Upscaler ile üretim görseli oluşturur
 * - Siparişin generatedImageUrl'ini alır
 * - Replicate API'ye gönderir (x4 upscale)
 * - Sonucu generated_image.production_image_url'e kaydeder
 */
app.post('/api/orders/:id/generate-production-image', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Sipariş ve görsel bilgisini al
    const orderResult = await pool.query(`
      SELECT o.id, o.generation_id as "generationId",
             gi.id as "giId", gi.image_url as "generatedImageUrl", gi.production_image_url as "productionImageUrl"
      FROM "order" o
      LEFT JOIN generated_image gi ON o.generation_id = gi.generation_id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    const order = orderResult.rows[0];

    // Zaten üretim görseli varsa tekrar oluşturma
    if (order.productionImageUrl) {
      return res.json({
        success: true,
        message: 'Üretim görseli zaten mevcut',
        productionImageUrl: order.productionImageUrl,
        alreadyExists: true,
      });
    }

    if (!order.generatedImageUrl) {
      return res.status(400).json({ error: 'Siparişe ait oluşturulmuş görsel bulunamadı' });
    }

    if (!order.giId) {
      return res.status(400).json({ error: 'generated_image kaydı bulunamadı' });
    }

    console.log(`🎨 Üretim görseli oluşturuluyor - Sipariş #${id}, Kaynak: ${order.generatedImageUrl}`);

    // 2. Görsel URL'ini absolute hale getir (Replicate dışarıdan erişebilmeli)
    let sourceImageUrl = order.generatedImageUrl;
    if (sourceImageUrl && !sourceImageUrl.startsWith('http')) {
      // Relative URL'i absolute yap
      sourceImageUrl = `https://www.birebiro.com${sourceImageUrl.startsWith('/') ? '' : '/'}${sourceImageUrl}`;
    }
    console.log(`🔗 Replicate'e gönderilecek URL: ${sourceImageUrl}`);

    // 3. Replicate API'ye istek gönder (nightmareai/real-esrgan - model-based endpoint, version hash gerekmez)
    const replicateBody = {
      input: {
        image: sourceImageUrl,
        scale: 4,
        face_enhance: false,
      },
    };

    const response = await replicateRequest('POST', '/v1/models/nightmareai/real-esrgan/predictions', replicateBody);

    if (response.status !== 200 && response.status !== 201) {
      console.error('Replicate API error:', response.data);

      if (response.status === 429) {
        return res.status(429).json({
          error: 'Replicate API rate limit aşıldı',
          details: 'Çok fazla istek gönderildi. Lütfen 10-15 saniye bekleyip tekrar deneyin.',
        });
      }

      return res.status(502).json({
        error: 'Replicate API hatası',
        details: response.data?.detail || response.data?.error || 'Bilinmeyen hata',
      });
    }

    const prediction = response.data;

    // 3. Eğer sync ile tamamlandıysa (Prefer: wait)
    if (prediction.status === 'succeeded' && prediction.output) {
      const replicateUrl = prediction.output;

      // Replicate görselini kendi storage'ımıza indir
      const downloaded = await downloadRemoteImageToStorage(replicateUrl, `upscale-${id}`);
      const productionUrl = downloaded ? downloaded.localUrl : replicateUrl;

      // DB'ye kaydet
      await pool.query(`
        UPDATE generated_image SET production_image_url = $1 WHERE id = $2
      `, [productionUrl, order.giId]);

      console.log(`✅ Üretim görseli hazır - Sipariş #${id}: ${productionUrl}`);

      return res.json({
        success: true,
        productionImageUrl: productionUrl,
        predictionId: prediction.id,
      });
    }

    // 4. Eğer hala işleniyorsa, polling yap (max 120 saniye)
    if (prediction.status === 'starting' || prediction.status === 'processing') {
      const predictionId = prediction.id;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 2s = 120s

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000)); // 2 saniye bekle
        attempts++;

        const pollResponse = await replicateRequest('GET', `/v1/predictions/${predictionId}`, null);
        const pollData = pollResponse.data;

        if (pollData.status === 'succeeded' && pollData.output) {
          const replicateUrl = pollData.output;

          // Replicate görselini kendi storage'ımıza indir
          const downloaded = await downloadRemoteImageToStorage(replicateUrl, `upscale-${id}`);
          const productionUrl = downloaded ? downloaded.localUrl : replicateUrl;

          // DB'ye kaydet
          await pool.query(`
            UPDATE generated_image SET production_image_url = $1 WHERE id = $2
          `, [productionUrl, order.giId]);

          console.log(`✅ Üretim görseli hazır (polling) - Sipariş #${id}: ${productionUrl}`);

          return res.json({
            success: true,
            productionImageUrl: productionUrl,
            predictionId: predictionId,
          });
        }

        if (pollData.status === 'failed' || pollData.status === 'canceled') {
          console.error(`❌ Replicate prediction failed: ${pollData.error}`);
          return res.status(502).json({
            error: 'Görsel upscale işlemi başarısız oldu',
            details: pollData.error || 'Bilinmeyen hata',
          });
        }
      }

      return res.status(504).json({ error: 'Görsel upscale işlemi zaman aşımına uğradı (120s)' });
    }

    // Beklenmeyen durum
    if (prediction.status === 'failed') {
      return res.status(502).json({
        error: 'Görsel upscale işlemi başarısız',
        details: prediction.error || 'Bilinmeyen hata',
      });
    }

    return res.status(502).json({
      error: 'Beklenmeyen Replicate durumu',
      status: prediction.status,
    });

  } catch (error) {
    console.error(`❌ Production image generation error for order #${id}:`, error);
    res.status(500).json({ error: 'Üretim görseli oluşturulurken sunucu hatası oluştu' });
  }
});

// Update order shipping status and tracking number
app.patch('/api/orders/:id/shipping', async (req, res) => {
  try {
    const { id } = req.params;
    const { shippingStatus, trackingNumber } = req.body;

    const result = await pool.query(`
      UPDATE "order" 
      SET 
        shipping_status = $1,
        tracking_number = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING 
        id,
        shipping_status as "shippingStatus",
        tracking_number as "trackingNumber",
        updated_at as "updatedAt"
    `, [shippingStatus, trackingNumber, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Order shipping update error:', error);
    res.status(500).json({ error: 'Failed to update order shipping' });
  }
});

// Update order notes
app.patch('/api/orders/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(`
      UPDATE "order" 
      SET 
        notes = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING 
        id,
        notes,
        updated_at as "updatedAt"
    `, [notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Order notes update error:', error);
    res.status(500).json({ error: 'Failed to update order notes' });
  }
});

// ==================== GELIVER SHIPPING API ====================

// Get shipping offers from Geliver
app.get('/api/orders/:id/shipping-offers', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch order and product info
    const orderResult = await pool.query(`
      SELECT 
        o.*,
        p.desi as "productDesi"
      FROM "order" o
      LEFT JOIN product p ON o.product_id = p.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Fetch sender info from site_settings (using default fallback if empty)
    let settings = {};
    try {
      const settingsResult = await pool.query(`
        SELECT key, value FROM site_settings 
        WHERE key IN ('company_name', 'company_address', 'contact_phone', 'contact_email', 'company_tax_number', 'company_tax_office')
      `);
      settingsResult.rows.forEach(row => settings[row.key] = row.value);
    } catch (e) {
      console.log('Site settings fetch error, using defaults:', e.message);
    }

    // Determine receiver address - parse if needed or use fields
    // Assuming customer_address is a full string, we might need better parsing in future
    // For now using simple logic or fallbacks

    // Helper to get city code (Basic mapping for common cities)
    const getCityCode = (cityName) => {
      const normalized = (cityName || '').toUpperCase()
        .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S').replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C'); // Normalize chars

      const codes = {
        'ADANA': '01', 'ADIYAMAN': '02', 'AFYON': '03', 'AFYONKARAHISAR': '03', 'AGRI': '04', 'AMASYA': '05',
        'ANKARA': '06', 'ANTALYA': '07', 'ARTVIN': '08', 'AYDIN': '09', 'BALIKESIR': '10', 'BILECIK': '11',
        'BINGOL': '12', 'BITLIS': '13', 'BOLU': '14', 'BURDUR': '15', 'BURSA': '16', 'CANAKKALE': '17',
        'CANKIRI': '18', 'CORUM': '19', 'DENIZLI': '20', 'DIYARBAKIR': '21', 'EDIRNE': '22', 'ELAZIG': '23',
        'ERZINCAN': '24', 'ERZURUM': '25', 'ESKISEHIR': '26', 'GAZIANTEP': '27', 'GIRESUN': '28', 'GUMUSHANE': '29',
        'HAKKARI': '30', 'HATAY': '31', 'ISPARTA': '32', 'MERSIN': '33', 'ICEL': '33', 'ISTANBUL': '34',
        'IZMIR': '35', 'KARS': '36', 'KASTAMONU': '37', 'KAYSERI': '38', 'KIRKLARELI': '39', 'KIRSEHIR': '40',
        'KOCAELI': '41', 'IZMIT': '41', 'KONYA': '42', 'KUTAHYA': '43', 'MALATYA': '44', 'MANISA': '45',
        'KAHRAMANMARAS': '46', 'MARAS': '46', 'MARDIN': '47', 'MUGLA': '48', 'MUS': '49', 'NEVSEHIR': '50',
        'NIGDE': '51', 'ORDU': '52', 'RIZE': '53', 'SAKARYA': '54', 'ADAPAZARI': '54', 'SAMSUN': '55',
        'SIIRT': '56', 'SINOP': '57', 'SIVAS': '58', 'TEKIRDAG': '59', 'TOKAT': '60', 'TRABZON': '61',
        'TUNCELI': '62', 'SANLIURFA': '63', 'USAK': '64', 'VAN': '65', 'YOZGAT': '66', 'ZONGULDAK': '67',
        'AKSARAY': '68', 'BAYBURT': '69', 'KARAMAN': '70', 'KIRIKKALE': '71', 'BATMAN': '72', 'SIRNAK': '73',
        'BARTIN': '74', 'ARDAHAN': '75', 'IGDIR': '76', 'YALOVA': '77', 'KARABUK': '78', 'KILIS': '79',
        'OSMANIYE': '80', 'DUZCE': '81'
      };

      // Try exact match first
      if (codes[normalized]) return codes[normalized];

      // Try partial matching or fuzzy search if needed, but for now exact match on normalized
      // Find key that contains the input or vice versa
      const found = Object.keys(codes).find(k => k === normalized || normalized.includes(k) || k.includes(normalized));

      return found ? codes[found] : '34'; // Default to Istanbul only if really can't find
    };

    // Helper to format phone number to +905051234567
    const formatPhoneNumber = (phone) => {
      if (!phone) return '';
      // Remove all non-numeric characters
      let cleaned = phone.replace(/\D/g, '');

      // If starts with 90, just prepend +
      if (cleaned.startsWith('90')) {
        return '+' + cleaned;
      }
      // If starts with 0, replace 0 with +90
      else if (cleaned.startsWith('0')) {
        return '+90' + cleaned.substring(1);
      }
      // If length is 10 (e.g. 505...), prepend +90
      else if (cleaned.length === 10) {
        return '+90' + cleaned;
      }

      // Fallback: return as is or just prepend +
      return '+' + cleaned;
    };

    // Prepare Geliver request matching user provided structure
    const shipmentData = {
      test: false, // User requested test: false
      // senderAddressID: '...', // We need to find this or let user configure it. 
      // For now, attempting to list addresses or expect user to provide one in settings?
      // Falling back to inline senderAddress (hoping it's supported) OR we need to fetch user's first address ID.

      // Dimensions (Defaults based on Desi or static)
      length: "10",
      width: "10",
      height: "10",
      distanceUnit: "cm",
      weight: "1",
      massUnit: "kg",

      items: [
        {
          title: order.productName || 'Art Print',
          quantity: 1
        }
      ],

      recipientAddress: {
        name: order.customer_name,
        email: order.customer_email,
        phone: formatPhoneNumber(order.customer_phone),
        address1: order.customer_address,
        countryCode: "TR",
        cityCode: getCityCode(order.customer_city),
        districtName: (order.customer_district || 'Merkez').toUpperCase()
      },

      productPaymentOnDelivery: false,
      order: {
        sourceCode: "API",
        sourceIdentifier: "https://birebiro.com",
        orderNumber: order.id.toString(),
        totalAmount: parseFloat(order.totalAmount || order.paymentAmount) / 100, // Assuming db stores in cents
        totalAmountCurrency: "TL"
      }
    };

    // First, try to get a valid senderAddressID if we don't have one
    // We'll fetch from Geliver API /addresses/sender (guessing endpoint from context or just try to fetch first one)
    try {
      const addressResponse = await geliverRequest('GET', '/addresses/sender'); // Endpoint guess? 
      // Actually common endpoint is often just /addresses with type filter. 
      // Let's try to proceed without ID first (using inline) OR 
      // Since user gave an ID in example, maybe they want us to use THAT specific one? 
      // "b6029b1b-cc61-4263-95c3-2bd17614c9d6" seems like a specific ID.
      // I will assume for now we need to Find ONE.
      // Let's use a PLACEHOLDER and log that we need a real ID if it fails.
    } catch (e) {
      // ignore
    }

    // Attempt to inject senderAddressID if we can find one, otherwise hope for the best or error out.
    // For this iteration, I will add the keys the user wants.

    // Fetch Sender Address ID
    let senderAddressID = null;
    try {
      // Assuming GET /addresses returns list. We filter/find one.
      // User curl example implies we need an ID.
      const addresses = await geliverRequest('GET', '/addresses');
      // Look for a sender address
      if (addresses && addresses.data && Array.isArray(addresses.data)) {
        const sender = addresses.data.find(a => a.type === 'SENDER' || a.type === 'sender') || addresses.data[0];
        if (sender) senderAddressID = sender.id;
      }
    } catch (e) {
      console.warn('Could not fetch sender addresses:', e.message);
    }

    if (senderAddressID) {
      shipmentData.senderAddressID = senderAddressID;
      shipmentData.returnAddressID = senderAddressID; // Use same for return for now
    } else {
      // Fallback: Use the ID from user example if nothing found (High risk, but maybe it's a global test ID? Unlikely)
      // Or error out.
      console.warn('No Sender Address ID found! Shipment creation might fail.');
    }

    console.log('📦 Kargo teklifleri alınıyor - Order ID:', id);
    const response = await geliverRequest('POST', '/shipments', shipmentData);
    console.log('✅ Kargo teklifleri alındı:', response?.data?.offers?.list?.length || 0, 'teklif');
    res.json(response);

  } catch (error) {
    console.error('❌ Geliver shipping offers error:', {
      message: error.message,
      orderId: req.params.id,
      stack: error.stack
    });
    res.status(500).json({
      error: error.message || 'Kargo teklifleri alınamadı',
      errorCode: 'SHIPPING_OFFERS_ERROR',
      details: 'Geliver API ile iletişim sırasında hata oluştu',
      suggestion: 'Sipariş adres bilgilerinin eksiksiz olduğundan emin olun. Özellikle şehir ve ilçe bilgilerini kontrol edin.'
    });
  }
});

// Accept shipping offer
app.post('/api/orders/:id/accept-shipping-offer', async (req, res) => {
  try {
    const { id } = req.params;
    const { offerId, shipmentId } = req.body;

    if (!offerId) {
      return res.status(400).json({
        error: 'Teklif ID\'si gerekli',
        errorCode: 'MISSING_OFFER_ID',
        details: 'Kargo teklifi kabul edilmek için teklif ID\'si belirtilmelidir.'
      });
    }

    // Geliver endpoint: POST /transactions with offerID in body
    console.log('🔄 Kargo teklifi kabul ediliyor - Offer ID:', offerId, 'Order ID:', id);

    let response;
    try {
      response = await geliverRequest('POST', '/transactions', {
        offerID: offerId
      });
      console.log('✅ Geliver transactions response:', JSON.stringify(response, null, 2));
    } catch (geliverError) {
      console.error('❌ Geliver API hatası:', geliverError);
      return res.status(500).json({
        error: 'Geliver API ile iletişim hatası',
        errorCode: 'GELIVER_API_ERROR',
        details: geliverError.message,
        suggestion: 'Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.'
      });
    }

    // Extract shipping info from response
    // response.data.shipment.barcode = tracking code
    // response.data.shipment.providerCode = carrier name
    const shipmentData = response?.data?.shipment || {};
    const transactionData = response?.data || {};

    console.log('📦 Shipment Data:', JSON.stringify(shipmentData, null, 2));

    // Check if there's an error in the shipment
    if (shipmentData.hasError) {
      console.error('❌ Geliver shipment error:', {
        message: shipmentData.lastErrorMessage,
        code: shipmentData.lastErrorCode,
        status: shipmentData.statusCode
      });
      return res.status(400).json({
        error: shipmentData.lastErrorMessage || 'Kargo oluşturulurken hata oluştu',
        errorCode: shipmentData.lastErrorCode || 'SHIPMENT_ERROR',
        details: `Durum Kodu: ${shipmentData.statusCode || 'Bilinmiyor'}`,
        suggestion: 'Lütfen adres bilgilerinin doğru ve eksiksiz olduğundan emin olun.'
      });
    }

    const trackingCode = shipmentData.barcode || '';
    const providerCode = shipmentData.providerCode || '';
    const labelUrl = shipmentData.labelURL || '';
    const resShipmentId = shipmentData.id || shipmentId || '';
    const transactionId = transactionData.id || '';

    // If no tracking code was generated, it means the transaction wasn't successful
    if (!trackingCode) {
      console.error('❌ Geliver: Takip kodu oluşturulamadı', {
        statusCode: shipmentData.statusCode,
        providerCode: providerCode,
        shipmentId: resShipmentId,
        fullResponse: JSON.stringify(response, null, 2)
      });
      return res.status(400).json({
        error: 'Kargo takip kodu oluşturulamadı',
        errorCode: 'NO_TRACKING_CODE',
        details: `Durum: ${shipmentData.statusCode || 'Bilinmiyor'}, Kargo Firması: ${providerCode || 'Belirtilmemiş'}`,
        suggestion: 'Adres bilgilerini kontrol edin. Özellikle şehir ve ilçe bilgilerinin doğru olduğundan emin olun.',
        debugInfo: {
          statusCode: shipmentData.statusCode,
          providerCode: providerCode,
          hasShipmentId: !!resShipmentId
        }
      });
    }

    // Update order with shipping info
    try {
      await pool.query(`
        UPDATE "order" 
        SET 
          geliver_offer_id = $1,
          geliver_shipment_id = $2,
          geliver_transaction_number = $3,
          geliver_shipping_code = $4,
          geliver_provider_code = $5,
          tracking_number = $4,
          shipping_status = 'preparing',
          updated_at = NOW()
        WHERE id = $6
      `, [
        offerId,
        resShipmentId,
        transactionId,
        trackingCode,
        providerCode,
        id
      ]);
      console.log('✅ Sipariş güncellendi - Tracking Code:', trackingCode);
    } catch (dbError) {
      console.error('❌ Veritabanı güncelleme hatası:', dbError);
      return res.status(500).json({
        error: 'Sipariş güncellenirken hata oluştu',
        errorCode: 'DATABASE_UPDATE_ERROR',
        details: dbError.message,
        suggestion: 'Kargo kaydedildi ancak sipariş güncellenemedi. Lütfen yönetici ile iletişime geçin.'
      });
    }

    res.json({
      success: true,
      message: 'Kargo teklifi başarıyla kabul edildi',
      trackingCode: trackingCode,
      providerCode: providerCode,
      labelUrl: labelUrl,
      shippingCode: trackingCode // for backward compatibility
    });

  } catch (error) {
    console.error('❌ Kargo teklifi kabul hatası:', {
      message: error.message,
      stack: error.stack,
      orderId: req.params.id,
      offerId: req.body.offerId
    });
    res.status(500).json({
      error: 'Kargo teklifi kabul edilirken beklenmeyen bir hata oluştu',
      errorCode: 'UNEXPECTED_ERROR',
      details: error.message,
      suggestion: 'Lütfen tekrar deneyin. Sorun devam ederse yönetici ile iletişime geçin.'
    });
  }
});

// List all shipments from Geliver
app.get('/api/shipping/shipments', async (req, res) => {
  try {
    const response = await geliverRequest('GET', '/shipments');
    res.json(response);
  } catch (error) {
    console.error('Geliver list shipments error:', error);
    res.status(500).json({ error: error.message || 'Failed to list shipments' });
  }
});

// ==================== AKBANK REFUND API ====================
function generateAkbankRandomNumber() {
  return crypto.randomBytes(64).toString('hex').toUpperCase();
}

function hashToBase64HmacSha512(serializedModel, secretKey) {
  let keyBuffer;
  if (Buffer.isBuffer(secretKey)) {
    keyBuffer = secretKey;
  } else if (typeof secretKey === 'string' && /^[0-9a-fA-F]+$/.test(secretKey) && secretKey.length % 2 === 0) {
    keyBuffer = Buffer.from(secretKey, 'hex');
  } else {
    keyBuffer = Buffer.from(String(secretKey), 'utf8');
  }
  return crypto
    .createHmac('sha512', keyBuffer)
    .update(Buffer.from(serializedModel, 'utf8'))
    .digest('base64');
}

function getAkbankKeyCandidates(secretKey) {
  if (!secretKey) {
    return [];
  }

  // Matrix test showed AKBANK accepts auth when the .env value is used as raw UTF-8 bytes.
  return [Buffer.from(String(secretKey), 'utf8')];
}

function toHashString(value) {
  return value === undefined || value === null ? '' : String(value);
}

function buildAkbankHashItems(payload) {
  const transaction = payload.transaction || {};
  const customer = payload.customer || {};
  const terminal = payload.terminal || {};
  const order = payload.order || {};

  const hashItems =
    toHashString(payload.paymentModel) +
    toHashString(payload.txnCode) +
    toHashString(terminal.merchantSafeId) +
    toHashString(terminal.terminalSafeId) +
    toHashString(order.orderId) +
    toHashString(payload.lang) +
    toHashString(transaction.amount) +
    toHashString(transaction.ccbRewardAmount) +
    toHashString(transaction.pcbRewardAmount) +
    toHashString(transaction.xcbRewardAmount) +
    toHashString(transaction.currencyCode) +
    toHashString(transaction.installCount) +
    toHashString(payload.okUrl) +
    toHashString(payload.failUrl) +
    toHashString(customer.emailAddress) +
    toHashString(customer.mobilePhone) +
    toHashString(customer.homePhone) +
    toHashString(customer.workPhone) +
    toHashString(payload.subMerchantId) +
    toHashString(payload.creditCard) +
    toHashString(payload.expiredDate) +
    toHashString(payload.cvv) +
    toHashString(payload.cardHolderName) +
    toHashString(payload.randomNumber) +
    toHashString(payload.requestDateTime) +
    toHashString(payload.b2bIdentityNumber) +
    toHashString(payload.merchantData) +
    toHashString(payload.merchantBranchNo) +
    toHashString(payload.mobileEci) +
    toHashString(payload.walletProgramData) +
    toHashString(payload.mobileAssignedId) +
    toHashString(payload.mobileDeviceType);

  return hashItems;
}

// Simplified hash for minimal AKBANK spec-compliant payload
function buildAkbankHashItemsMinimal(payload) {
  const transaction = payload.transaction || {};
  const customer = payload.customer || {};
  const terminal = payload.terminal || {};
  const order = payload.order || {};

  // Field order matters for AKBANK hash calculation
  const hashItems =
    toHashString(payload.txnCode) +
    toHashString(terminal.merchantSafeId) +
    toHashString(terminal.terminalSafeId) +
    toHashString(order.orderId) +
    toHashString(transaction.amount) +
    toHashString(transaction.currencyCode) +
    toHashString(customer.emailAddress) +
    toHashString(customer.ipAddress) +
    toHashString(payload.randomNumber) +
    toHashString(payload.requestDateTime);

  return hashItems;
}

function getRequestDateTime() {
  // AKBANK accepts milliseconds and does not require trailing Z in this integration.
  return new Date().toISOString().replace('Z', '');
}

function getClientIpAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const xRealIp = req.headers['x-real-ip'];

  const candidates = [];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    candidates.push(...forwarded.split(',').map((ip) => ip.trim()));
  }
  if (typeof xRealIp === 'string' && xRealIp.length > 0) {
    candidates.push(xRealIp.trim());
  }
  if (typeof req.ip === 'string' && req.ip.length > 0) {
    candidates.push(req.ip.trim());
  }
  if (typeof req.socket?.remoteAddress === 'string' && req.socket.remoteAddress.length > 0) {
    candidates.push(req.socket.remoteAddress.trim());
  }

  for (const rawIp of candidates) {
    const normalized = rawIp.replace(/^::ffff:/, '');
    if (!net.isIP(normalized)) {
      continue;
    }

    if (
      normalized === '127.0.0.1' ||
      normalized === '::1' ||
      normalized === '0.0.0.0' ||
      normalized === '::'
    ) {
      continue;
    }

    return normalized;
  }

  return null;
}

function postJsonWithHeaders(urlString, bodyString, headers) {
  const endpoint = new URL(urlString);

  return new Promise((resolve, reject) => {
    const req = https.request({
      protocol: endpoint.protocol,
      hostname: endpoint.hostname,
      port: endpoint.port || 443,
      path: `${endpoint.pathname}${endpoint.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString),
        ...headers,
      },
    }, (response) => {
      let rawBody = '';
      response.on('data', (chunk) => {
        rawBody += chunk;
      });

      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          rawBody,
        });
      });
    });

    req.on('error', (error) => reject(error));
    req.setTimeout(90000, () => {
      req.destroy();
      reject(new Error('AKBANK isteği zaman aşımına uğradı'));
    });

    req.write(bodyString);
    req.end();
  });
}

// AKBANK Referanslı İade işlemi
app.post('/api/orders/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body; // amount: iade tutarı (kuruş cinsinden), reason: iade nedeni

    // Sipariş bilgisini al
    const orderResult = await pool.query(`
      SELECT 
        id,
        merchant_oid as "merchantOid",
        payment_amount as "paymentAmount",
        total_amount as "totalAmount",
        payment_status as "paymentStatus",
        customer_email as "customerEmail",
        currency
      FROM "order" 
      WHERE id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    const order = orderResult.rows[0];

    // Sadece başarılı ödemelerde iade yapılabilir
    if (order.paymentStatus !== 'success') {
      return res.status(400).json({ error: 'Sadece başarılı ödemelerde iade yapılabilir' });
    }

    // İade tutarını belirle (tam iade veya kısmi iade)
    const orderTotal = order.totalAmount || order.paymentAmount;
    const refundAmount = amount ? parseFloat(amount) : orderTotal;

    // İade tutarı sipariş tutarından fazla olamaz
    if (refundAmount > orderTotal) {
      return res.status(400).json({ error: 'İade tutarı sipariş tutarından fazla olamaz' });
    }

    const akbankRefundUrl = process.env.AKBANK_REFUND_URL;
    const akbankSecretKey = process.env.AKBANK_SECRET_KEY;
    const merchantSafeId = process.env.AKBANK_MERCHANT_SAFE_ID;
    const terminalSafeId = process.env.AKBANK_TERMINAL_SAFE_ID;

    if (!akbankRefundUrl || !akbankSecretKey || !merchantSafeId || !terminalSafeId) {
      console.error('AKBANK credentials missing');
      return res.status(500).json({ error: 'AKBANK yapılandırması eksik' });
    }

    // İade tutarını TL formatına çevir (kuruştan TL'ye, 2 ondalık)
    const returnAmountTL = (refundAmount / 100).toFixed(2);

    const customerEmail = order.customerEmail || 'unknown@birebiro.com';
    const clientIp = getClientIpAddress(req);

    const requestPayload = {
      version: '1.00',
      txnCode: '1002',
      requestDateTime: getRequestDateTime(),
      randomNumber: generateAkbankRandomNumber(),
      terminal: {
        merchantSafeId,
        terminalSafeId,
      },
      order: {
        orderId: order.merchantOid,
      },
      transaction: {
        amount: returnAmountTL,
        currencyCode: 949,
      },
      customer: {
        emailAddress: customerEmail,
      },
    };

    if (clientIp) {
      requestPayload.customer.ipAddress = clientIp;
    }

    const serializedRequest = JSON.stringify(requestPayload);
    console.log('=== AKBANK REFUND REQUEST ===');
    console.log('Payload:', JSON.stringify(requestPayload, null, 2));
    console.log('Serialized:', serializedRequest);
    const hashItems = buildAkbankHashItemsMinimal(requestPayload);
    console.log('Hash items string:', hashItems);
    const keyCandidates = getAkbankKeyCandidates(akbankSecretKey);
    const hashStrategies = [
      { name: 'json-body', value: serializedRequest },
      { name: 'hash-items', value: hashItems },
    ];

    let akbankRawResponse = null;
    let usedHashStrategy = null;
    let fallbackResponse = null;
    let fallbackHashStrategy = null;

    for (const strategy of hashStrategies) {
      for (const keyCandidate of keyCandidates) {
        const requestHash = hashToBase64HmacSha512(strategy.value, keyCandidate);
        console.log(`Trying ${strategy.name} with hash: ${requestHash.substring(0, 50)}...`);
        const response = await postJsonWithHeaders(
          akbankRefundUrl,
          serializedRequest,
          { 'auth-hash': requestHash }
        );
        console.log(`${strategy.name} response status:`, response.statusCode);
        if (response.statusCode !== 401) {
          console.log(`${strategy.name} response body:`, response.rawBody);
        }

        if (response.statusCode === 400 || response.statusCode === 401) {
          fallbackResponse = response;
          fallbackHashStrategy = strategy.name;
          continue;
        }

        if (response.statusCode !== 401) {
          akbankRawResponse = response;
          usedHashStrategy = strategy.name;
          break;
        }
      }

      if (akbankRawResponse) {
        break;
      }
    }

    if (!akbankRawResponse && fallbackResponse) {
      akbankRawResponse = fallbackResponse;
      usedHashStrategy = fallbackHashStrategy;
    }

    if (!akbankRawResponse) {
      return res.status(401).json({
        success: false,
        error: 'AKBANK auth-hash doğrulaması başarısız',
      });
    }

    console.log('AKBANK refund hash strategy:', usedHashStrategy);

    const responseAuthHash = akbankRawResponse.headers['auth-hash'];
    const responseAuthHashValue = Array.isArray(responseAuthHash)
      ? responseAuthHash[0]
      : responseAuthHash;
    if (responseAuthHashValue) {
      const responseHashMatched = keyCandidates.some((candidate) => (
        hashToBase64HmacSha512(akbankRawResponse.rawBody, candidate) === responseAuthHashValue
      ));
      if (!responseHashMatched) {
        console.error('AKBANK response hash mismatch', {
          responseAuthHashValue,
          requestHashStrategy: usedHashStrategy,
        });
      }
    } else {
      console.warn('AKBANK response auth-hash header not provided, verification skipped');
    }

    let akbankResponse;
    try {
      akbankResponse = JSON.parse(akbankRawResponse.rawBody);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        error: 'AKBANK yanıtı parse edilemedi',
        details: akbankRawResponse.rawBody,
      });
    }

    console.log('AKBANK Refund Response:', akbankResponse);

    if (akbankResponse.responseCode === 'VPS-0000' && akbankResponse.hostResponseCode === '00') {
      const isFullRefund = Math.round(refundAmount) >= Math.round(orderTotal);
      const nextPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

      // Veritabanında siparişi güncelle
      await pool.query(`
        UPDATE "order" 
        SET 
          payment_status = $1,
          notes = COALESCE(notes, '') || E'\n\n[AKBANK İADE] ' || $2 || ' - Tutar: ' || $3 || ' TL - AuthCode: ' || COALESCE($4, '-') || ' - RRN: ' || COALESCE($5, '-') || ' - Tarih: ' || NOW()::text,
          updated_at = NOW()
        WHERE id = $6
      `, [
        nextPaymentStatus,
        reason || 'İade yapıldı',
        returnAmountTL,
        akbankResponse.transaction?.authCode || null,
        akbankResponse.transaction?.rrn || null,
        id,
      ]);

      res.json({
        success: true,
        message: 'İade işlemi başarılı',
        refundAmount: returnAmountTL,
        merchantOid: order.merchantOid,
        authCode: akbankResponse.transaction?.authCode,
        rrn: akbankResponse.transaction?.rrn,
        refundableAmount: akbankResponse.transaction?.refundableAmount,
      });
    } else {
      console.error('AKBANK refund error:', akbankResponse);
      res.status(400).json({
        success: false,
        error: akbankResponse.responseMessage || akbankResponse.message || 'İade işlemi başarısız',
        errorCode: akbankResponse.responseCode || akbankResponse.code,
        hostResponseCode: akbankResponse.hostResponseCode,
        hostMessage: akbankResponse.hostMessage || akbankResponse.message,
        diagnostics: {
          akbankUrl: akbankRefundUrl,
          merchantOid: order.merchantOid,
          requestDateTime: requestPayload.requestDateTime,
          hasCustomerIp: Boolean(requestPayload.customer?.ipAddress),
          attemptedHashStrategies: hashStrategies.map((item) => item.name),
          usedHashStrategy,
          rawResponse: akbankRawResponse.rawBody,
        },
      });
    }

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'İade işlemi sırasında hata oluştu: ' + error.message });
  }
});

// ==================== USERS API ====================
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.id as "clerkUserId",
        u.art_credits as "artCredits",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        u.email as "email",
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.phone as "phone",
        u.image_url as "imageUrl",
        -- Son siparişten müşteri bilgilerini al (fallback için tutuyoruz)
        (SELECT customer_name FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerName",
        (SELECT customer_email FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerEmail",
        (SELECT customer_phone FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerPhone",
        (SELECT customer_city FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerCity",
        -- İstatistikler
        (SELECT COUNT(*) FROM "order" WHERE user_id = u.id) as "totalOrders",
        (SELECT COALESCE(SUM(total_amount), 0) FROM "order" WHERE user_id = u.id AND payment_status = 'success') as "totalSpent",
        (SELECT COUNT(*) FROM generated_image WHERE user_id = u.id) as "totalGenerations"
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user with details and orders
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // User bilgisi - generated_image count'u ayrı sorgu ile al
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.id as "clerkUserId",
        u.art_credits as "artCredits",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt",
        u.email as "email",
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.phone as "phone",
        u.image_url as "imageUrl",
        (SELECT customer_name FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerName",
        (SELECT customer_email FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerEmail",
        (SELECT customer_phone FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerPhone",
        (SELECT customer_city FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerCity",
        (SELECT customer_address FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "customerAddress",
        (SELECT COUNT(*) FROM "order" WHERE user_id = u.id) as "totalOrders",
        (SELECT COALESCE(SUM(total_amount), 0) FROM "order" WHERE user_id = u.id AND payment_status = 'success') as "totalSpent"
      FROM users u
      WHERE u.id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generated images count - ayrı sorgu
    let totalGenerations = 0;
    try {
      const genCountResult = await pool.query(`
        SELECT COUNT(*) as count FROM generated_image WHERE user_id = $1
      `, [id]);
      totalGenerations = parseInt(genCountResult.rows[0]?.count || 0);
    } catch (e) {
      console.log('Generated images count error, trying text cast:', e.message);
      // Farklı tip denemesi
    }

    // Kullanıcının siparişleri
    const ordersResult = await pool.query(`
      SELECT 
        o.id,
        o.order_type as "orderType",
        o.total_amount as "totalAmount",
        o.payment_status as "paymentStatus",
        o.shipping_status as "shippingStatus",
        o.tracking_number as "trackingNumber",
        o.created_at as "createdAt",
        p.name as "productName",
        gi.image_url as "generatedImageUrl"
      FROM "order" o
      LEFT JOIN product p ON o.product_id = p.id
      LEFT JOIN generated_image gi ON o.generation_id::text = gi.id::text
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [id]);

    // Kullanıcının oluşturduğu görseller - ayrı try-catch ile
    let generatedImages = [];
    try {
      const imagesResult = await pool.query(`
        SELECT 
          gi.id,
          gi.text_prompt as "prompt",
          gi.image_url as "imageUrl",
          gi.thumbnail_url as "thumbnailUrl",
          gi.credit_used as "creditsUsed",
          gi.is_selected as "isSelectedForOrder",
          gi.created_at as "createdAt",
          p.name as "productName"
        FROM generated_image gi
        LEFT JOIN product p ON gi.product_id = p.id
        WHERE gi.user_id = $1
        ORDER BY gi.created_at DESC
        LIMIT 100
      `, [id]);
      generatedImages = imagesResult.rows;
      totalGenerations = generatedImages.length > 0 ? totalGenerations : 0;
    } catch (e) {
      console.log('Generated images fetch error:', e.message);
    }

    res.json({
      ...userResult.rows[0],
      totalGenerations,
      orders: ordersResult.rows,
      generatedImages
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user credits
app.patch('/api/users/:id/credits', async (req, res) => {
  try {
    const { id } = req.params;
    const { artCredits } = req.body;

    const result = await pool.query(`
      UPDATE users 
      SET art_credits = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, art_credits as "artCredits", updated_at as "updatedAt"
    `, [artCredits, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('User credits update error:', error);
    res.status(500).json({ error: 'Failed to update user credits' });
  }
});

// ==================== GENERATED IMAGES API ====================

// Get generated images stats
app.get('/api/generated-images/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as "totalImages",
        COALESCE(SUM(credit_used), 0) as "totalCredits",
        COUNT(*) FILTER (WHERE is_selected = true) as "selectedImages",
        COUNT(DISTINCT user_id) as "uniqueUsers",
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as "today",
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as "thisWeek",
        COUNT(*) FILTER (WHERE is_generate_mode = true) as "generateMode",
        COUNT(*) FILTER (WHERE is_generate_mode = false) as "inspirationMode"
      FROM generated_image
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Generated images stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all generated images with filtering
app.get('/api/generated-images', async (req, res) => {
  try {
    const { userId, productId, isSelected, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        gi.id,
        gi.user_id as "userId",
        gi.chat_session_id as "chatSessionId",
        gi.generation_id as "generationId",
        gi.product_id as "productId",
        gi.text_prompt as "prompt",
        gi.improved_prompt as "improvedPrompt",
        gi.image_url as "imageUrl",
        gi.thumbnail_url as "thumbnailUrl",
        gi.uploaded_image_url as "uploadedImageUrl",
        gi.user_generation_intent as "userIntent",
        gi.is_generate_mode as "isGenerateMode",
        gi.credit_used as "creditsUsed",
        gi.is_selected as "isSelected",
        gi.created_at as "createdAt",
        p.name as "productName",
        (SELECT customer_email FROM "order" WHERE user_id = gi.user_id ORDER BY created_at DESC LIMIT 1) as "userEmail",
        (SELECT customer_name FROM "order" WHERE user_id = gi.user_id ORDER BY created_at DESC LIMIT 1) as "userName"
      FROM generated_image gi
      LEFT JOIN product p ON gi.product_id = p.id
    `;

    const conditions = [];
    const params = [];

    if (userId) {
      params.push(userId);
      conditions.push(`gi.user_id = $${params.length}`);
    }

    if (productId) {
      params.push(productId);
      conditions.push(`gi.product_id = $${params.length}`);
    }

    if (isSelected === 'true') {
      conditions.push(`gi.is_selected = true`);
    } else if (isSelected === 'false') {
      conditions.push(`gi.is_selected = false`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(gi.text_prompt ILIKE $${params.length} OR gi.improved_prompt ILIKE $${params.length} OR EXISTS (SELECT 1 FROM "order" o WHERE o.user_id = gi.user_id AND o.customer_email ILIKE $${params.length}))`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY gi.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Generated images fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch generated images' });
  }
});

// Get single generated image
app.get('/api/generated-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        gi.id,
        gi.user_id as "userId",
        gi.chat_session_id as "chatSessionId",
        gi.generation_id as "generationId",
        gi.product_id as "productId",
        gi.product_size_id as "productSizeId",
        gi.product_frame_id as "productFrameId",
        gi.text_prompt as "prompt",
        gi.improved_prompt as "improvedPrompt",
        gi.image_url as "imageUrl",
        gi.thumbnail_url as "thumbnailUrl",
        gi.uploaded_image_url as "uploadedImageUrl",
        gi.user_generation_intent as "userIntent",
        gi.is_generate_mode as "isGenerateMode",
        gi.credit_used as "creditsUsed",
        gi.is_selected as "isSelected",
        gi.created_at as "createdAt",
        gi.updated_at as "updatedAt",
        p.name as "productName",
        (SELECT customer_email FROM "order" WHERE user_id = gi.user_id ORDER BY created_at DESC LIMIT 1) as "userEmail",
        (SELECT customer_name FROM "order" WHERE user_id = gi.user_id ORDER BY created_at DESC LIMIT 1) as "userName"
      FROM generated_image gi
      LEFT JOIN product p ON gi.product_id = p.id
      WHERE gi.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Generated image fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch generated image' });
  }
});

// Get products for filter dropdown (MUST be before /:id route)
app.get('/api/generated-images/products/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT p.id, p.name
      FROM product p
      INNER JOIN generated_image gi ON p.id = gi.product_id
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Products list fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products list' });
  }
});

// Delete generated image
app.delete('/api/generated-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM generated_image WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Generated image delete error:', error);
    res.status(500).json({ error: 'Failed to delete generated image' });
  }
});

// ==================== LEGAL DOCUMENTS API ====================

// Get all legal documents
app.get('/api/legal-documents', async (req, res) => {
  try {
    const { language } = req.query;

    let query = `
      SELECT 
        id,
        slug,
        title,
        content,
        language,
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM legal_documents 
    `;

    const params = [];
    if (language) {
      params.push(language);
      query += ` WHERE language = $1`;
    }

    query += ` ORDER BY sort_order ASC, slug ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Legal documents fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch legal documents' });
  }
});

// Get single legal document by slug and language
app.get('/api/legal-documents/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { language } = req.query;

    // Check if the parameter is a number (ID) or a string (slug)
    const isId = /^\d+$/.test(slug);

    let query = `
      SELECT 
        id,
        slug,
        title,
        content,
        language,
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM legal_documents 
      WHERE ${isId ? 'id' : 'slug'} = $1
    `;

    const params = [slug];
    if (language) {
      params.push(language);
      query += ` AND language = $2`;
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Legal document not found' });
    }

    // If ID is provided, return single object (for admin edit)
    // If slug is provided with language, return single object
    // Otherwise return array for public listing
    if (isId) {
      res.json(result.rows[0]);
    } else {
      res.json(language ? result.rows[0] : result.rows);
    }
  } catch (error) {
    console.error('Legal document fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch legal document' });
  }
});

// Update legal document
app.put('/api/legal-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, content, language, isActive, sortOrder } = req.body;

    const result = await pool.query(`
      UPDATE legal_documents 
      SET 
        slug = COALESCE($1, slug),
        title = COALESCE($2, title),
        content = COALESCE($3, content),
        language = COALESCE($4, language),
        is_active = COALESCE($5, is_active),
        sort_order = COALESCE($6, sort_order),
        updated_at = NOW()
      WHERE id = $7
      RETURNING 
        id,
        slug,
        title,
        content,
        language,
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [slug, title, content, language, isActive, sortOrder, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Legal document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Legal document update error:', error);
    res.status(500).json({ error: 'Failed to update legal document' });
  }
});

// Create new legal document
app.post('/api/legal-documents', async (req, res) => {
  try {
    const { slug, title, content, language, isActive, sortOrder } = req.body;

    const result = await pool.query(`
      INSERT INTO legal_documents (slug, title, content, language, is_active, sort_order, created_at, updated_at)
      VALUES ($1, $2, $3, $4, COALESCE($5, true), COALESCE($6, 0), NOW(), NOW())
      RETURNING 
        id,
        slug,
        title,
        content,
        language,
        is_active as "isActive",
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [slug, title, content, language || 'tr', isActive, sortOrder]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Legal document create error:', error);
    res.status(500).json({ error: 'Failed to create legal document' });
  }
});

// Delete legal document
app.delete('/api/legal-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM legal_documents WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Legal document not found' });
    }

    res.json({ message: 'Legal document deleted successfully' });
  } catch (error) {
    console.error('Legal document delete error:', error);
    res.status(500).json({ error: 'Failed to delete legal document' });
  }
});

// ==================== CONTACT SUBMISSIONS API ====================

// Get contact submissions stats
app.get('/api/contact-submissions/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_read = false) as unread,
        COUNT(*) FILTER (WHERE is_read = true) as read,
        COUNT(*) FILTER (WHERE is_replied = true) as replied,
        COUNT(*) FILTER (WHERE is_replied = false) as "notReplied",
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as "today",
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as "thisWeek"
      FROM contact_submissions
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Contact stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch contact stats' });
  }
});

// Get all contact submissions with filtering
app.get('/api/contact-submissions', async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT 
        id,
        full_name as "name",
        email,
        phone,
        subject,
        message,
        is_read as "isRead",
        is_replied as "isReplied",
        created_at as "createdAt"
      FROM contact_submissions 
    `;

    const conditions = [];
    const params = [];

    if (status === 'unread') {
      conditions.push(`is_read = false`);
    } else if (status === 'read') {
      conditions.push(`is_read = true`);
    } else if (status === 'replied') {
      conditions.push(`is_replied = true`);
    } else if (status === 'not-replied') {
      conditions.push(`is_replied = false`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR subject ILIKE $${params.length} OR message ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Contact submissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch contact submissions' });
  }
});

// Get single contact submission
app.get('/api/contact-submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        full_name as "name",
        email,
        phone,
        subject,
        message,
        ip_address as "ipAddress",
        user_agent as "userAgent",
        is_read as "isRead",
        is_replied as "isReplied",
        created_at as "createdAt"
      FROM contact_submissions 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Contact submission fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch contact submission' });
  }
});

// Mark as read
app.patch('/api/contact-submissions/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE contact_submissions 
      SET is_read = true 
      WHERE id = $1
      RETURNING 
        id,
        full_name as "name",
        email,
        is_read as "isRead",
        is_replied as "isReplied"
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark as replied
app.patch('/api/contact-submissions/:id/replied', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE contact_submissions 
      SET is_replied = true, is_read = true
      WHERE id = $1
      RETURNING 
        id,
        full_name as "name",
        email,
        is_read as "isRead",
        is_replied as "isReplied"
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark as replied error:', error);
    res.status(500).json({ error: 'Failed to mark as replied' });
  }
});

// Delete contact submission
app.delete('/api/contact-submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM contact_submissions WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ message: 'Contact submission deleted successfully' });
  } catch (error) {
    console.error('Contact submission delete error:', error);
    res.status(500).json({ error: 'Failed to delete contact submission' });
  }
});

// Bulk mark as read
app.post('/api/contact-submissions/bulk-read', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    const result = await pool.query(`
      UPDATE contact_submissions 
      SET is_read = true 
      WHERE id = ANY($1)
      RETURNING id
    `, [ids]);

    res.json({ message: `${result.rowCount} submissions marked as read` });
  } catch (error) {
    console.error('Bulk mark as read error:', error);
    res.status(500).json({ error: 'Failed to bulk mark as read' });
  }
});

// ==================== NEWSLETTER SUBSCRIBERS API ====================

// Get all newsletter subscribers
app.get('/api/newsletter-subscribers', async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT 
        id,
        email,
        name,
        status,
        subscription_source as "subscriptionSource",
        verified_at as "verifiedAt",
        unsubscribed_at as "unsubscribedAt",
        created_at as "subscribedAt",
        updated_at as "updatedAt"
      FROM newsletter_subscribers 
    `;

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(email ILIKE $${params.length} OR name ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Newsletter subscribers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch newsletter subscribers' });
  }
});

// Get newsletter stats
app.get('/api/newsletter-subscribers/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
        COUNT(*) FILTER (WHERE status = 'bounced') as bounced,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as "lastWeek",
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as "lastMonth"
      FROM newsletter_subscribers
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Newsletter stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch newsletter stats' });
  }
});

// Update subscriber status
app.patch('/api/newsletter-subscribers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'unsubscribed', 'bounced'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const unsubscribedAt = status === 'unsubscribed' ? 'NOW()' : 'NULL';

    const result = await pool.query(`
      UPDATE newsletter_subscribers 
      SET status = $1, 
          unsubscribed_at = ${status === 'unsubscribed' ? 'NOW()' : 'NULL'},
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, status
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Newsletter status update error:', error);
    res.status(500).json({ error: 'Failed to update subscriber status' });
  }
});

// Delete subscriber
app.delete('/api/newsletter-subscribers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM newsletter_subscribers WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    res.json({ success: true, message: 'Subscriber deleted', data: result.rows[0] });
  } catch (error) {
    console.error('Newsletter delete error:', error);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// Export subscribers as CSV
app.get('/api/newsletter-subscribers/export', async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        email,
        name,
        status,
        subscription_source as "source",
        created_at as "subscribed_at"
      FROM newsletter_subscribers
    `;

    if (status && status !== 'all') {
      query += ` WHERE status = $1`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, status && status !== 'all' ? [status] : []);

    // CSV oluştur
    const headers = ['email', 'name', 'status', 'source', 'subscribed_at'];
    let csv = headers.join(',') + '\n';

    result.rows.forEach(row => {
      const values = headers.map(h => {
        const val = row[h] || '';
        // Virgül veya tırnak içeriyorsa tırnak içine al
        if (String(val).includes(',') || String(val).includes('"')) {
          return `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      });
      csv += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Newsletter export error:', error);
    res.status(500).json({ error: 'Failed to export subscribers' });
  }
});

// ==================== ART CREDIT SETTINGS API ====================
app.get('/api/art-credit-settings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        price_per_credit as "pricePerCredit",
        min_purchase as "minPurchaseCredits",
        max_purchase as "maxPurchaseCredits",
        is_active as "isActive",
        updated_at as "updatedAt"
      FROM art_credit_settings 
      LIMIT 1
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Art credit settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch art credit settings' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Birebiro Admin API is running',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      siteSettings: true,
      refund: true
    }
  });
});

// 404 handler
// ==================== SETTINGS API ====================

// Settings tablosu yoksa oluştur ve varsayılan değerleri ekle
const initSettingsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Varsayılan ayarları ekle (yoksa)
    const defaultSettings = [
      { key: 'about_title', value: 'Birebiro Hakkında' },
      { key: 'about_content', value: 'Birebiro, yapay zeka destekli sanat üretimi platformudur. Kullanıcılarımız metinlerden benzersiz görseller oluşturabilir ve bunları fiziksel ürünlere dönüştürebilir.' },
      { key: 'about_mission', value: 'Misyonumuz, herkesin sanatçı olabileceği bir dünya yaratmaktır.' },
      { key: 'about_vision', value: 'Vizyonumuz, yapay zeka ve yaratıcılığı birleştirerek sanatı demokratikleştirmektir.' },
      { key: 'contact_email', value: 'info@birebiro.com' },
      { key: 'contact_phone', value: '' },
      { key: 'contact_address', value: '' },
      { key: 'social_instagram', value: '' },
      { key: 'social_twitter', value: '' },
      { key: 'social_facebook', value: '' },
    ];

    for (const setting of defaultSettings) {
      await pool.query(`
        INSERT INTO settings (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT (key) DO NOTHING
      `, [setting.key, setting.value]);
    }

    console.log('✅ Settings table initialized');
  } catch (error) {
    console.error('Settings table init error:', error);
  }
};

// Sunucu başlarken settings tablosunu kontrol et
initSettingsTable();

// Image uploads log tablosu
const initImageUploadsTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS image_uploads (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        original_filename VARCHAR(500),
        file_size INTEGER,
        mime_type VARCHAR(100),
        source_page VARCHAR(200),
        endpoint VARCHAR(100),
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ image_uploads table initialized');
  } catch (error) {
    console.error('image_uploads table init error:', error);
  }
};
initImageUploadsTable();

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value, updated_at as "updatedAt"
      FROM settings
      ORDER BY key
    `);

    // Key-value formatına dönüştür
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get single setting
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(`
      SELECT key, value, updated_at as "updatedAt"
      FROM settings
      WHERE key = $1
    `, [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Setting fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update settings (bulk)
app.put('/api/settings', async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, value]);
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update single setting
app.patch('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const result = await pool.query(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      RETURNING key, value, updated_at as "updatedAt"
    `, [key, value]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Setting update error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ==================== ABOUT CONTENT API ====================
// Mevcut tablo: Tüm diller tek satırda - section1TitleTr, section1TitleEn, section1TitleFr vb.

// Get about content (tek satır, tüm diller)
app.get('/api/about-content', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        language,
        image1 as "image1",
        title1 as "title1",
        body1 as "body1",
        image2 as "image2",
        title2 as "title2",
        body2 as "body2",
        image3 as "image3",
        title3 as "title3",
        body3 as "body3",
        mission,
        vision,
        updated_at as "updatedAt"
      FROM about_content
      ORDER BY 
        CASE language 
          WHEN 'tr' THEN 1 
          WHEN 'en' THEN 2 
          WHEN 'fr' THEN 3 
        END
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('About content fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch about content' });
  }
});

// Get about content by language
app.get('/api/about-content/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        language,
        image1 as "image1",
        title1 as "title1",
        body1 as "body1",
        image2 as "image2",
        title2 as "title2",
        body2 as "body2",
        image3 as "image3",
        title3 as "title3",
        body3 as "body3",
        mission,
        vision,
        updated_at as "updatedAt"
      FROM about_content
      WHERE language = $1
    `, [language]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'About content not found for this language' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('About content fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch about content' });
  }
});

// Update about content by language
app.put('/api/about-content/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { image1, title1, body1, image2, title2, body2, image3, title3, body3, mission, vision } = req.body;

    const result = await pool.query(`
      UPDATE about_content
      SET 
        image1 = COALESCE($1, image1),
        title1 = COALESCE($2, title1),
        body1 = COALESCE($3, body1),
        image2 = COALESCE($4, image2),
        title2 = COALESCE($5, title2),
        body2 = COALESCE($6, body2),
        image3 = COALESCE($7, image3),
        title3 = COALESCE($8, title3),
        body3 = COALESCE($9, body3),
        mission = COALESCE($10, mission),
        vision = COALESCE($11, vision),
        updated_at = NOW()
      WHERE language = $12
      RETURNING 
        id,
        language,
        image1,
        title1,
        body1,
        image2,
        title2,
        body2,
        image3,
        title3,
        body3,
        mission,
        vision,
        updated_at as "updatedAt"
    `, [image1, title1, body1, image2, title2, body2, image3, title3, body3, mission, vision, language]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'About content not found for this language' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('About content update error:', error && error.stack ? error.stack : error);
    res.status(500).json({ error: 'Failed to update about content', details: error.message || String(error) });
  }
});

// Bulk update all languages
app.put('/api/about-content', async (req, res) => {
  try {
    const contents = req.body; // Array of content objects with language field
    const results = [];

    for (const content of contents) {
      const { language, image1, title1, body1, image2, title2, body2, image3, title3, body3, mission, vision } = content;

      const result = await pool.query(`
        UPDATE about_content
        SET 
          image1 = COALESCE($1, image1),
          title1 = COALESCE($2, title1),
          body1 = COALESCE($3, body1),
          image2 = COALESCE($4, image2),
          title2 = COALESCE($5, title2),
          body2 = COALESCE($6, body2),
          image3 = COALESCE($7, image3),
          title3 = COALESCE($8, title3),
          body3 = COALESCE($9, body3),
          mission = COALESCE($10, mission),
          vision = COALESCE($11, vision),
          updated_at = NOW()
        WHERE language = $12
        RETURNING id, language
      `, [image1, title1, body1, image2, title2, body2, image3, title3, body3, mission, vision, language]);

      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }

    res.json({ success: true, message: 'About content updated successfully', updated: results });
  } catch (error) {
    console.error('About content bulk update error:', error);
    res.status(500).json({ error: 'Failed to update about content' });
  }
});

// ==================== CREDIT SETTINGS API ====================

// Get credit settings
app.get('/api/credit-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM art_credit_settings ORDER BY id LIMIT 1');

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        id: null,
        pricePerCredit: 100,
        isActive: true,
        minPurchase: 1,
        maxPurchase: 1000,
        maxUserCredits: 10000
      });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      pricePerCredit: row.price_per_credit,
      isActive: row.is_active,
      minPurchase: row.min_purchase,
      maxPurchase: row.max_purchase,
      maxUserCredits: row.max_user_credits,
      updatedAt: row.updated_at,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('Credit settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch credit settings' });
  }
});

// Update credit settings
app.put('/api/credit-settings', async (req, res) => {
  try {
    const { pricePerCredit, isActive, minPurchase, maxPurchase, maxUserCredits } = req.body;

    // Check if settings exist
    const existing = await pool.query('SELECT id FROM art_credit_settings ORDER BY id LIMIT 1');

    let result;
    if (existing.rows.length === 0) {
      // Insert new settings
      result = await pool.query(`
        INSERT INTO art_credit_settings (price_per_credit, is_active, min_purchase, max_purchase, max_user_credits)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [pricePerCredit || 100, isActive !== false, minPurchase || 1, maxPurchase || 1000, maxUserCredits || 10000]);
    } else {
      // Update existing settings
      result = await pool.query(`
        UPDATE art_credit_settings SET
          price_per_credit = COALESCE($1, price_per_credit),
          is_active = COALESCE($2, is_active),
          min_purchase = COALESCE($3, min_purchase),
          max_purchase = COALESCE($4, max_purchase),
          max_user_credits = COALESCE($5, max_user_credits),
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `, [pricePerCredit, isActive, minPurchase, maxPurchase, maxUserCredits, existing.rows[0].id]);
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        pricePerCredit: row.price_per_credit,
        isActive: row.is_active,
        minPurchase: row.min_purchase,
        maxPurchase: row.max_purchase,
        maxUserCredits: row.max_user_credits,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error('Credit settings update error:', error);
    res.status(500).json({ error: 'Failed to update credit settings' });
  }
});

// ==================== DASHBOARD API ====================

// Helper function to get date filter
function getDateFilter(period) {
  if (period === 'all' || !period) return '';
  const days = parseInt(period) || 30;
  return `AND created_at >= NOW() - INTERVAL '${days} days'`;
}

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const period = req.query.period || '30';
    const dateFilter = period === 'all' ? '' : `WHERE created_at >= NOW() - INTERVAL '${period} days'`;
    const andDateFilter = period === 'all' ? '' : `AND created_at >= NOW() - INTERVAL '${period} days'`;

    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM "order" ${dateFilter}) as "totalOrders",
        (SELECT COUNT(*) FROM "order" WHERE payment_status IN ('completed', 'success') ${andDateFilter}) as "completedOrders",
        (SELECT COUNT(*) FROM "order" WHERE payment_status = 'pending' ${andDateFilter}) as "pendingOrders",
        (SELECT COUNT(*) FROM "order" WHERE payment_status = 'processing' ${andDateFilter}) as "processingOrders",
        (SELECT COUNT(*) FROM "order" WHERE payment_status = 'cancelled' ${andDateFilter}) as "cancelledOrders",
        (SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) FROM "order" WHERE payment_status = 'success' ${andDateFilter}) as "totalRevenue",
        (SELECT COUNT(*) FROM users ${dateFilter}) as "totalUsers",
        (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as "newUsersLast30Days",
        (SELECT COUNT(*) FROM generated_image ${dateFilter}) as "totalGeneratedImages",
        (SELECT COUNT(*) FROM generated_image WHERE created_at >= NOW() - INTERVAL '30 days') as "imagesLast30Days",
        (SELECT COUNT(*) FROM product WHERE is_active = true) as "activeProducts",
        (SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'active') as "activeSubscribers",
        (SELECT COUNT(*) FROM contact_submissions WHERE is_read = false) as "unreadContacts"
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get orders by date for chart
app.get('/api/dashboard/orders-chart', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || null;
    const dateFilter = getDateFilter(days, 'created_at');

    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) as revenue
      FROM "order"
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Orders chart error:', error);
    res.status(500).json({ error: 'Failed to fetch orders chart data' });
  }
});

// Get recent orders for dashboard
app.get('/api/dashboard/recent-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.id as "orderNumber",
        o.payment_status as status,
        o.total_amount as "totalAmount",
        o.created_at as "createdAt",
        o.customer_email as "userEmail",
        o.customer_name as "userName"
      FROM "order" o
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
});

// Get recent users for dashboard
app.get('/api/dashboard/recent-users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        COALESCE(u.email, (SELECT customer_email FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1)) as email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.image_url as "profilePictureUrl",
        u.created_at as "createdAt"
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Recent users error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch recent users' });
    }
  }
});

// Get generated images by date for chart
app.get('/api/dashboard/images-chart', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM generated_image
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Images chart error:', error);
    res.status(500).json({ error: 'Failed to fetch images chart data' });
  }
});

// Get orders by status for pie chart
app.get('/api/dashboard/orders-by-status', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || null;
    const dateFilter = getDateFilter(days, 'created_at');

    const result = await pool.query(`
      SELECT 
        payment_status as status,
        COUNT(*) as count
      FROM "order"
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY payment_status
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Orders by status error:', error);
    res.status(500).json({ error: 'Failed to fetch orders by status' });
  }
});

// Get top products by orders
app.get('/api/dashboard/top-products', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || null;
    const dateFilter = days ? `AND o.created_at >= NOW() - INTERVAL '${days} days'` : '';

    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.image_square_url as "imageUrl",
        COUNT(o.id) as "orderCount",
        COALESCE(SUM(CAST(o.total_amount AS DECIMAL)), 0) as "totalRevenue"
      FROM product p
      LEFT JOIN "order" o ON p.id = o.product_id ${dateFilter}
      GROUP BY p.id, p.name, p.image_square_url
      ORDER BY "orderCount" DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

// ==================== SITE SETTINGS ====================

// Get all site settings
app.get('/api/site-settings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        key,
        value,
        value_type as "valueType",
        category,
        label,
        description,
        is_public as "isPublic",
        updated_at as "updatedAt"
      FROM site_settings
      ORDER BY category, key
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Site settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

// Get site settings by category
app.get('/api/site-settings/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        key,
        value,
        value_type as "valueType",
        category,
        label,
        description,
        is_public as "isPublic",
        updated_at as "updatedAt"
      FROM site_settings
      WHERE category = $1
      ORDER BY key
    `, [category]);
    res.json(result.rows);
  } catch (error) {
    console.error('Site settings by category error:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

// Get single site setting by key
app.get('/api/site-settings/key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        key,
        value,
        value_type as "valueType",
        category,
        label,
        description,
        is_public as "isPublic",
        updated_at as "updatedAt"
      FROM site_settings
      WHERE key = $1
    `, [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Site setting fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch site setting' });
  }
});

// Create or update site setting (upsert)
app.put('/api/site-settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, valueType, category, label, description, isPublic } = req.body;

    const result = await pool.query(`
      INSERT INTO site_settings (key, value, value_type, category, label, description, is_public, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        value_type = COALESCE(EXCLUDED.value_type, site_settings.value_type),
        category = COALESCE(EXCLUDED.category, site_settings.category),
        label = COALESCE(EXCLUDED.label, site_settings.label),
        description = COALESCE(EXCLUDED.description, site_settings.description),
        is_public = COALESCE(EXCLUDED.is_public, site_settings.is_public),
        updated_at = NOW()
      RETURNING id
    `, [key, value, valueType || 'text', category || 'general', label, description, isPublic !== false]);

    res.json({ success: true, id: result.rows[0].id, message: 'Setting saved successfully' });
  } catch (error) {
    console.error('Site setting upsert error:', error);
    res.status(500).json({ error: 'Failed to save site setting' });
  }
});

// Bulk update site settings
app.put('/api/site-settings', async (req, res) => {
  try {
    const settings = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Expected array of settings' });
    }

    for (const setting of settings) {
      await pool.query(`
        INSERT INTO site_settings (key, value, value_type, category, label, description, is_public, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          value_type = COALESCE(EXCLUDED.value_type, site_settings.value_type),
          category = COALESCE(EXCLUDED.category, site_settings.category),
          label = COALESCE(EXCLUDED.label, site_settings.label),
          description = COALESCE(EXCLUDED.description, site_settings.description),
          is_public = COALESCE(EXCLUDED.is_public, site_settings.is_public),
          updated_at = NOW()
      `, [
        setting.key,
        setting.value,
        setting.valueType || 'text',
        setting.category || 'general',
        setting.label,
        setting.description,
        setting.isPublic !== false
      ]);
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Site settings bulk update error:', error);
    res.status(500).json({ error: 'Failed to save site settings' });
  }
});

// Delete site setting
app.delete('/api/site-settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(
      'DELETE FROM site_settings WHERE key = $1 RETURNING id',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ success: true, message: 'Setting deleted successfully' });
  } catch (error) {
    console.error('Site setting delete error:', error);
    res.status(500).json({ error: 'Failed to delete site setting' });
  }
});

// Get public settings only (for frontend)
app.get('/api/site-settings/public', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value, value_type as "valueType", category
      FROM site_settings
      WHERE is_public = true
      ORDER BY category, key
    `);

    // Convert to object format
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json(settings);
  } catch (error) {
    console.error('Public site settings error:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

// Compression middleware
app.use(compression());

// Angular static dosyalarını serve et
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Angular routing için - API olmayan tüm istekleri index.html'e yönlendir
app.use((req, res, next) => {
  // API isteklerini atla
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Angular index.html dosyasını gönder
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

// 404 handler - sadece API istekleri için
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handler for Railway
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    pool.end(() => {
      console.log('✅ Database pool closed.');
      process.exit(0);
    });
  });
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

