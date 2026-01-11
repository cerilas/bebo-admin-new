const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const connectionString = 'postgresql://postgres:ptrzmLFbwlrQYpPJfeAofGqMkXFdSIhu@crossover.proxy.rlwy.net:37534/railway';
const pool = new Pool({
  connectionString: connectionString
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
    res.status(500).json({ error: 'Failed to fetch stats' });
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
    res.status(500).json({ error: 'Failed to fetch products' });
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
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM product_frame 
      WHERE product_id = $1
      ORDER BY sort_order ASC
    `, [id]);
    
    res.json({
      ...productResult.rows[0],
      sizes: sizesResult.rows,
      frames: framesResult.rows,
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const {
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageWideUrl, imageDimensions, sizeLabel, sizeLabelEn,
      sizeLabelFr, frameLabel, frameLabelEn, frameLabelFr, isActive, sortOrder
    } = req.body;
    
    const result = await pool.query(`
      INSERT INTO product (
        slug, name, name_en, name_fr, description, description_en, description_fr,
        image_square_url, image_wide_url, image_dimensions, size_label, size_label_en,
        size_label_fr, frame_label, frame_label_en, frame_label_fr, is_active, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `, [
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageWideUrl, imageDimensions || '1920x1080', 
      sizeLabel || 'Boyut Seçin', sizeLabelEn || 'Select Size', sizeLabelFr || 'Sélectionner la taille',
      frameLabel || 'Çerçeve Seçin', frameLabelEn || 'Select Frame', frameLabelFr || 'Sélectionner le cadre',
      isActive !== false, sortOrder || 0
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
      imageSquareUrl, imageWideUrl, imageDimensions, sizeLabel, sizeLabelEn,
      sizeLabelFr, frameLabel, frameLabelEn, frameLabelFr, isActive, sortOrder
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
        image_wide_url = $9,
        image_dimensions = COALESCE($10, image_dimensions),
        size_label = COALESCE($11, size_label),
        size_label_en = $12,
        size_label_fr = $13,
        frame_label = COALESCE($14, frame_label),
        frame_label_en = $15,
        frame_label_fr = $16,
        is_active = COALESCE($17, is_active),
        sort_order = COALESCE($18, sort_order),
        updated_at = NOW()
      WHERE id = $19
      RETURNING id
    `, [
      slug, name, nameEn, nameFr, description, descriptionEn, descriptionFr,
      imageSquareUrl, imageWideUrl, imageDimensions, sizeLabel, sizeLabelEn,
      sizeLabelFr, frameLabel, frameLabelEn, frameLabelFr, isActive, sortOrder, id
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
    const { slug, name, nameEn, nameFr, dimensions, priceAmount, sortOrder } = req.body;
    
    const result = await pool.query(`
      INSERT INTO product_size (product_id, slug, name, name_en, name_fr, dimensions, price_amount, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [productId, slug, name, nameEn, nameFr, dimensions, priceAmount, sortOrder || 0]);
    
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
    const { slug, name, nameEn, nameFr, dimensions, priceAmount, sortOrder } = req.body;
    
    const result = await pool.query(`
      UPDATE product_size SET
        slug = COALESCE($1, slug),
        name = COALESCE($2, name),
        name_en = $3,
        name_fr = $4,
        dimensions = COALESCE($5, dimensions),
        price_amount = COALESCE($6, price_amount),
        sort_order = COALESCE($7, sort_order),
        updated_at = NOW()
      WHERE id = $8 AND product_id = $9
      RETURNING id
    `, [slug, name, nameEn, nameFr, dimensions, priceAmount, sortOrder, sizeId, productId]);
    
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
    const { slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, sortOrder } = req.body;
    
    const result = await pool.query(`
      INSERT INTO product_frame (product_id, slug, name, name_en, name_fr, price_amount, color_code, frame_image, frame_image_large, mockup_template, mockup_config, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [productId, slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, sortOrder || 0]);
    
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
    const { slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, sortOrder } = req.body;
    
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
        sort_order = COALESCE($11, sort_order),
        updated_at = NOW()
      WHERE id = $12 AND product_id = $13
      RETURNING id
    `, [slug, name, nameEn, nameFr, priceAmount, colorCode, frameImage, frameImageLarge, mockupTemplate, mockupConfig, sortOrder, frameId, productId]);
    
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
        o.notes,
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
        
        -- Product size info
        ps.name as "sizeName",
        ps.dimensions as "sizeDimensions",
        ps.price_amount as "sizePrice",
        
        -- Product frame info
        pf.name as "frameName",
        pf.price_amount as "framePrice",
        pf.color_code as "frameColorCode",
        
        -- Generated image info
        gi.image_url as "generatedImageUrl",
        gi.text_prompt as "imagePrompt",
        gi.credit_used as "creditsUsed"
        
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

// ==================== PAYTR REFUND API ====================
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// PayTR İade işlemi
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
    
    // PayTR API bilgileri
    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    
    if (!merchantId || !merchantKey || !merchantSalt) {
      console.error('PayTR credentials missing');
      return res.status(500).json({ error: 'PayTR yapılandırması eksik' });
    }
    
    // İade tutarını TL formatına çevir (kuruştan TL'ye, 2 ondalık)
    const returnAmountTL = (refundAmount / 100).toFixed(2);
    
    // PayTR token oluştur
    // Token: base64(hmac_sha256(merchant_id + merchant_oid + return_amount + merchant_salt, merchant_key))
    const hashStr = merchantId + order.merchantOid + returnAmountTL + merchantSalt;
    const paytrToken = crypto
      .createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');
    
    // PayTR'a iade isteği gönder
    const postData = querystring.stringify({
      merchant_id: merchantId,
      merchant_oid: order.merchantOid,
      return_amount: returnAmountTL,
      paytr_token: paytrToken,
      reference_no: `REFUND${id}T${Date.now()}`
    });
    
    const options = {
      hostname: 'www.paytr.com',
      port: 443,
      path: '/odeme/iade',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    // PayTR'a istek at
    const paytrResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('PayTR yanıtı parse edilemedi: ' + data));
          }
        });
      });
      
      req.on('error', (e) => reject(e));
      req.setTimeout(90000, () => {
        req.destroy();
        reject(new Error('PayTR isteği zaman aşımına uğradı'));
      });
      
      req.write(postData);
      req.end();
    });
    
    console.log('PayTR Refund Response:', paytrResponse);
    
    // PayTR yanıtını kontrol et
    if (paytrResponse.status === 'success') {
      // Veritabanında siparişi güncelle
      await pool.query(`
        UPDATE "order" 
        SET 
          payment_status = 'refunded',
          notes = COALESCE(notes, '') || E'\n\n[İADE] ' || $1 || ' - Tutar: ' || $2 || ' TL - Tarih: ' || NOW()::text,
          updated_at = NOW()
        WHERE id = $3
      `, [reason || 'İade yapıldı', returnAmountTL, id]);
      
      res.json({
        success: true,
        message: 'İade işlemi başarılı',
        refundAmount: returnAmountTL,
        merchantOid: order.merchantOid,
        isTest: paytrResponse.is_test === 1
      });
    } else {
      // PayTR hatası
      console.error('PayTR refund error:', paytrResponse);
      res.status(400).json({
        success: false,
        error: paytrResponse.err_msg || 'İade işlemi başarısız',
        errorCode: paytrResponse.err_no
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
        -- Son siparişten müşteri bilgilerini al
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
      WHERE slug = $1
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
    
    // Tek dil istendiyse tek obje, değilse array dön
    res.json(language ? result.rows[0] : result.rows);
  } catch (error) {
    console.error('Legal document fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch legal document' });
  }
});

// Update legal document
app.put('/api/legal-documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isActive, sortOrder } = req.body;
    
    const result = await pool.query(`
      UPDATE legal_documents 
      SET 
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        is_active = COALESCE($3, is_active),
        sort_order = COALESCE($4, sort_order),
        updated_at = NOW()
      WHERE id = $5
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
    `, [title, content, isActive, sortOrder, id]);
    
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
        maxPurchase: 1000
      });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      pricePerCredit: row.price_per_credit,
      isActive: row.is_active,
      minPurchase: row.min_purchase,
      maxPurchase: row.max_purchase,
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
    const { pricePerCredit, isActive, minPurchase, maxPurchase } = req.body;
    
    // Check if settings exist
    const existing = await pool.query('SELECT id FROM art_credit_settings ORDER BY id LIMIT 1');
    
    let result;
    if (existing.rows.length === 0) {
      // Insert new settings
      result = await pool.query(`
        INSERT INTO art_credit_settings (price_per_credit, is_active, min_purchase, max_purchase)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [pricePerCredit || 100, isActive !== false, minPurchase || 1, maxPurchase || 1000]);
    } else {
      // Update existing settings
      result = await pool.query(`
        UPDATE art_credit_settings SET
          price_per_credit = COALESCE($1, price_per_credit),
          is_active = COALESCE($2, is_active),
          min_purchase = COALESCE($3, min_purchase),
          max_purchase = COALESCE($4, max_purchase),
          updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [pricePerCredit, isActive, minPurchase, maxPurchase, existing.rows[0].id]);
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
        (SELECT COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0) FROM "order" ${dateFilter}) as "totalRevenue",
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
        (SELECT customer_email FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as email,
        (SELECT customer_name FROM "order" WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as "firstName",
        '' as "lastName",
        NULL as "profilePictureUrl",
        u.created_at as "createdAt"
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Recent users error:', error);
    res.status(500).json({ error: 'Failed to fetch recent users' });
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

