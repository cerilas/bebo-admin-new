const { Pool } = require('pg');
require('dotenv').config();

const connectionString = 'postgresql://postgres:ptrzmLFbwlrQYpPJfeAofGqMkXFdSIhu@crossover.proxy.rlwy.net:37534/railway';
const pool = new Pool({
    connectionString: connectionString
});

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add image_square_url_2
        console.log('Adding image_square_url_2...');
        await pool.query(`
      ALTER TABLE product 
      ADD COLUMN IF NOT EXISTS image_square_url_2 TEXT;
    `);

        // Add image_square_url_3
        console.log('Adding image_square_url_3...');
        await pool.query(`
      ALTER TABLE product 
      ADD COLUMN IF NOT EXISTS image_square_url_3 TEXT;
    `);

        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
