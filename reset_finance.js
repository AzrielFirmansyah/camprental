import mysql from 'mysql2/promise';

async function resetTransactions() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'camprental'
  });

  try {
    console.log('--- STARTING SELECTIVE MIGRATION FRESH (FINANCE ONLY) ---');
    
    // Disable foreign key checks to truncate properly
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('Wiping transaction_items table...');
    await connection.query('TRUNCATE TABLE transaction_items');
    
    console.log('Wiping transactions table...');
    await connection.query('TRUNCATE TABLE transactions');
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Restoring all items availability...');
    // Synchronize availableStock with totalStock and set status back to 'Ada'
    await connection.query('UPDATE items SET availableStock = totalStock, status = "Ada"');
    
    console.log('--- MIGRATION COMPLETE ---');
    console.log('Safe: Master Data (Items, Categories, Status, Discounts, Payments) are NOT affected.');
    console.log('Please restart server (npm run dev) now.');
    
  } catch (err) {
    console.error('Error during finance reset:', err.message);
  } finally {
    await connection.end();
  }
}

resetTransactions();
