const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:ptrzmLFbwlrQYpPJfeAofGqMkXFdSIhu@crossover.proxy.rlwy.net:37534/railway';
const pool = new Pool({
    connectionString: connectionString
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');

        await client.query('BEGIN');

        // Check if desi column exists in product
        const productCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='product' AND column_name='desi'
    `);

        if (productCheck.rows.length === 0) {
            console.log('Adding desi to product table...');
            await client.query('ALTER TABLE "product" ADD COLUMN "desi" INTEGER DEFAULT 1 NOT NULL');
        } else {
            console.log('Column desi already exists in product table.');
        }

        // Add columns to order table
        const orderColumns = [
            { name: 'geliver_offer_id', type: 'VARCHAR(100)' },
            { name: 'geliver_shipment_id', type: 'VARCHAR(100)' },
            { name: 'geliver_transaction_number', type: 'VARCHAR(100)' },
            { name: 'geliver_shipping_code', type: 'VARCHAR(100)' }
        ];

        for (const col of orderColumns) {
            const colCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='order' AND column_name='${col.name}'
      `);

            if (colCheck.rows.length === 0) {
                console.log(`Adding ${col.name} to order table...`);
                await client.query(`ALTER TABLE "order" ADD COLUMN "${col.name}" ${col.type}`);
            } else {
                console.log(`Column ${col.name} already exists in order table.`);
            }
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
