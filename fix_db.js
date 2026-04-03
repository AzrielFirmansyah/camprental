import mysql from 'mysql2/promise';

const main = async () => {
    try {
        const pool = await mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'camprental'
        });

        console.log('--- STARTING MANUAL DATABASE REPAIR ---');

        console.log('Checking/Creating discounts table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS discounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                percentage INT NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Checking/Creating payment_methods table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Seeding payment methods...');
        const [payCount]: any = await pool.query('SELECT COUNT(*) as cnt FROM payment_methods');
        if (payCount[0].cnt === 0) {
            await pool.query("INSERT INTO payment_methods (name) VALUES ('Cash'), ('Transfer'), ('QRIS')");
            console.log('Default payments seeded.');
        }

        console.log('Checking transactions columns...');
        // Standardize finance columns
        try { await pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0"); } catch(e) {}
        try { await pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount INT DEFAULT 0"); } catch(e) {}
        try { await pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discountAmount DECIMAL(15,2) DEFAULT 0"); } catch(e) {}

        console.log('--- MANUAL REPAIR COMPLETED SUCCESSFULLY ---');
        await pool.end();
    } catch (error) {
        console.error('FATAL ERROR DURING REPAIR:', error.message);
        process.exit(1);
    }
};

main();
