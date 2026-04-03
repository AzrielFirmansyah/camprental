import mysql from 'mysql2/promise';

const main = async () => {
    try {
        const pool = await mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'camprental'
        });

        console.log('--- STARTING MANUAL DATABASE REPAIR (PURE JS) ---');

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
        const [payTotal] = await pool.query('SELECT COUNT(*) as cnt FROM payment_methods');
        if (payTotal[0].cnt === 0) {
            await pool.query("INSERT INTO payment_methods (name) VALUES ('Cash'), ('Transfer'), ('QRIS')");
            console.log('Default payments seeded.');
        }

        console.log('Standardizing transactions table...');
        try { await pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0"); } catch(e) {}
        try { await pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount INT DEFAULT 0"); } catch(e) {}
        try { await pool.query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discountAmount DECIMAL(15,2) DEFAULT 0"); } catch(e) {}

        console.log('--- REPAIR COMPLETE ---');
        await pool.end();
    } catch (error) {
        console.error('SERVER REPAIR FAILED:', error.message);
        process.exit(1);
    }
};

main();
