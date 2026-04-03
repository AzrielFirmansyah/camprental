import express from 'express';
import cors from 'cors';
// createViteServer removed from static imports for Vercel stability
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-rental-app';

app.use(cors());
app.use(express.json());

// Database Pool configuration for MySQL (Laragon)
let pool: mysql.Pool;

async function setupDatabase() {
  console.log(`[DB] Testing connection to ${process.env.DB_HOST || 'localhost'}...`);
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'camprental',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000 // Force timeout quickly for Vercel stability
  });

  try {
    // Basic connectivity test
    await pool.query('SELECT 1');
    console.log('✅ [DB] MySQL Connection Established Successfully!');
  } catch (err: any) {
    console.error('❌ [DB] Skipping Database Setup: Database unreachable.', err.message);
    return; // STOP HERE but don't crash
  }

  try {
    // ALL TABLE CREATION AND SEEDING GOES HERE
    // (Previous logic continues safely within this try-catch...)
    // Table creation compatible with MySQL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);
    
    // ... all other pool.query calls follow here ...

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      categoryId INT,
      dailyPrice DECIMAL(15,2) NOT NULL,
      weeklyPrice DECIMAL(15,2) NOT NULL,
      totalStock INT NOT NULL,
      availableStock INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Ada',
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT,
      customerName VARCHAR(255) NOT NULL,
      customerPhone VARCHAR(50) NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      durationDays INT NOT NULL,
      subtotal DECIMAL(15,2) DEFAULT 0,
      discount INT DEFAULT 0,
      discountAmount DECIMAL(15,2) DEFAULT 0,
      totalAmount DECIMAL(15,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      paymentMethod VARCHAR(50) DEFAULT 'Cash',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // Migration for existing table - Add columns if they don't exist
  const addColumn = async (col: string, type: string) => {
    try {
      // Try with IF NOT EXISTS (MariaDB / MySQL 8.0.19+)
      await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    } catch (err) {
      try {
        // Fallback for older MySQL (will fail if column exists, which is fine)
        await pool.query(`ALTER TABLE transactions ADD ${col} ${type}`);
        console.log(`Column ${col} added to transactions.`);
      } catch (e: any) {
        if (!e.message.includes('Duplicate column name')) {
          console.warn(`Error adding column ${col}:`, e.message);
        }
      }
    }
  };

  await addColumn('subtotal', 'DECIMAL(15,2) DEFAULT 0 AFTER durationDays');
  await addColumn('discount', 'INT DEFAULT 0 AFTER subtotal');
  await addColumn('discountAmount', 'DECIMAL(15,2) DEFAULT 0 AFTER discount');

  // Set subtotal for old records that have subtotal=0 but totalAmount > 0
  try {
    const [migResult]: any = await pool.query('UPDATE transactions SET subtotal = totalAmount WHERE (subtotal = 0 OR subtotal IS NULL) AND totalAmount > 0');
    if (migResult.changedRows > 0) console.log(`Data Migration: Updated ${migResult.changedRows} legacy records.`);
  } catch (err) {
    console.warn('Migration warning:', err);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transactionId INT,
      itemId INT,
      quantity INT NOT NULL,
      price DECIMAL(15,2) NOT NULL,
      FOREIGN KEY (transactionId) REFERENCES transactions(id),
      FOREIGN KEY (itemId) REFERENCES items(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      date DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS item_statuses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50) DEFAULT 'stone',
      description TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      percentage INT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Use simple queries to check/seed
  const [payRows]: any = await pool.query('SELECT COUNT(*) as count FROM payment_methods');
  if (payRows[0].count === 0) {
    await pool.query("INSERT INTO payment_methods (name) VALUES ('Cash'), ('Transfer'), ('QRIS')");
  }
  const [adminRows]: any = await pool.query('SELECT * FROM users WHERE email = ?', ['azriel@rental.com']);
  if (adminRows.length === 0) {
    const adminPassword = await bcrypt.hash('admin123', 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
      ['Moh. Azriel Firmansyah', 'azriel@rental.com', adminPassword, 'admin']);
  }

  const [ownerRows]: any = await pool.query('SELECT * FROM users WHERE email = ?', ['elza@rental.com']);
  if (ownerRows.length === 0) {
    const ownerPassword = await bcrypt.hash('owner123', 10);
    await pool.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
      ['Elza Nur Rahmah Salzabillah', 'elza@rental.com', ownerPassword, 'owner']);
  }

  const [catRows]: any = await pool.query('SELECT COUNT(*) as count FROM categories');
  if (catRows[0].count === 0) {
    await pool.query("INSERT INTO categories (name) VALUES ('Tenda'), ('Carrier'), ('Alat Masak'), ('Sleeping Bag'), ('Penerangan')");
  }

  const [itemRows]: any = await pool.query('SELECT COUNT(*) as count FROM items');
  if (itemRows[0].count === 0) {
    const [cats]: any = await pool.query('SELECT id FROM categories');
    if (cats.length > 0) {
      const cId = cats[0].id;
      await pool.query(`INSERT INTO items (name, categoryId, dailyPrice, weeklyPrice, totalStock, availableStock, status) VALUES 
        ('Tenda Dome 4 Orang', ${cId}, 50000, 300000, 10, 10, 'Ada'),
        ('Carrier 60L', ${cId}, 35000, 210000, 15, 15, 'Ada'),
        ('Kompor Portable', ${cId}, 15000, 90000, 20, 20, 'Ada')
      `);
    }
  }

  const [statusRows]: any = await pool.query('SELECT COUNT(*) as count FROM item_statuses');
  if (statusRows[0].count === 0) {
    await pool.query("INSERT INTO item_statuses (name, color, description) VALUES ('Ada', 'emerald', 'Item tersedia dan siap untuk disewakan kepada pelanggan.')");
    await pool.query("INSERT INTO item_statuses (name, color, description) VALUES ('Menipis', 'orange', 'Item masih tersedia namun stok mulai menipis (biasanya di bawah 3).')");
    await pool.query("INSERT INTO item_statuses (name, color, description) VALUES ('Habis', 'red', 'Stok item habis sepenuhnya dan tidak tersedia untuk penyewaan.')");
    }
  } catch (err: any) {
    console.warn('⚠️ [DB] Setup partially failed or table creation was skipped:', err.message);
  }
}

const computeItemStatus = (availableStock: number) => {
  if (availableStock <= 0) return 'Habis';
  if (availableStock <= 3) return 'Menipis';
  return 'Ada';
};

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    console.log(`[AUTH] Request by: ${user.name} (${user.role})`);
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  const role = (req.user.role || '').toLowerCase();
  console.log(`[ACL] Verifying role: ${role}`);
  if (role !== 'admin' && role !== 'owner') {
    console.warn(`[ACL] Access Denied for role: ${role}`);
    return res.status(403).json({ error: 'Akses Ditolak: Hanya Admin atau Owner yang diizinkan.' });
  }
  next();
};

// Pre-hashed fallback credentials for when DB is unreachable
const FALLBACK_USERS: Record<string, { name: string; role: string; id: number; passwordPlain: string }> = {
  'azriel@rental.com': { id: 1, name: 'Moh. Azriel Firmansyah', role: 'admin', passwordPlain: 'admin123' },
  'elza@rental.com':   { id: 2, name: 'Elza Nur Rahmah Salzabillah', role: 'owner', passwordPlain: 'owner123' },
};

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[LOGIN] Attempt: ${email}`);

  // --- Try DB login first ---
  try {
    if (pool) {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      const user = rows[0];
      if (user) {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          console.warn(`[LOGIN] Invalid Password: ${email}`);
          return res.status(400).json({ error: 'Email atau password salah' });
        }
        console.log(`[LOGIN] DB Success: ${email} (${user.role})`);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      }
      // Email not found in DB — fall through to fallback check
    }
  } catch (err: any) {
    // DB unreachable — fall through to fallback
    console.warn(`[LOGIN] DB unavailable (${err.code || err.message}), trying fallback credentials...`);
  }

  // --- Fallback: check hardcoded credentials ---
  const fallback = FALLBACK_USERS[email];
  if (fallback && password === fallback.passwordPlain) {
    const userPayload = { id: fallback.id, email, role: fallback.role, name: fallback.name };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
    console.log(`[LOGIN] Fallback Success: ${email} (${fallback.role})`);
    return res.json({ token, user: userPayload });
  }

  console.warn(`[LOGIN] Failed for: ${email}`);
  return res.status(400).json({ error: 'Email atau password salah' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Semua data harus diisi.' });
  }

  console.log(`[REGISTER] Processing: ${email}`);
  try {
    // Check connection first
    if (!pool) {
      throw new Error('Database connection not established');
    }

    // Check if user already exists
    const [existing]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan gunakan email lain atau login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'staff']
    );

    const userId = result.insertId;
    const userPayload = { id: userId, email, role: 'staff', name };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log(`[REGISTER] Success for User ID: ${userId}`);
    res.status(201).json({ 
      token, 
      user: userPayload,
      message: 'Registrasi Berhasil'
    });
  } catch (err: any) {
    console.error(`[REGISTER] Fatal Error:`, err);
    res.status(500).json({ error: 'Gagal melakukan registrasi: ' + (err.message || 'Server error') });
  }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const [incomeResult]: any = await pool.query('SELECT SUM(totalAmount) as total FROM transactions');
    const totalIncome = Number(incomeResult[0].total || 0);
    const [expenseResult]: any = await pool.query('SELECT SUM(amount) as total FROM expenses');
    const totalExpenses = Number(expenseResult[0].total || 0);
    const [txCountResult]: any = await pool.query('SELECT COUNT(*) as count FROM transactions');
    const totalTransactions = Number(txCountResult[0].count || 0);
    const [stockResult]: any = await pool.query('SELECT SUM(totalStock) as total, SUM(availableStock) as available FROM items');
    const totalStock = Number(stockResult[0].total || 0);
    const availableStock = Number(stockResult[0].available || 0);
    const rentedStock = totalStock - availableStock;

    const [monthlyData]: any = await pool.query(`
      SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, SUM(totalAmount) as income
      FROM transactions
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);
    const [monthlyExpenses]: any = await pool.query(`
      SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as expense
      FROM expenses
      GROUP BY month ORDER BY month DESC LIMIT 6
    `);
    const chartMap = new Map();
    monthlyData.forEach((d: any) => chartMap.set(d.month, { name: d.month, income: Number(d.income || 0), expense: 0 }));
    monthlyExpenses.forEach((d: any) => {
      if (chartMap.has(d.month)) chartMap.get(d.month).expense = Number(d.expense || 0);
      else chartMap.set(d.month, { name: d.month, income: 0, expense: Number(d.expense || 0) });
    });
    const chartData = Array.from(chartMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
    res.json({ summary: { totalIncome, totalExpenses, totalTransactions, totalStock, availableStock, rentedStock }, chartData });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/categories', authenticateToken, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories');
  res.json(rows);
});

app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const [result]: any = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.json({ id: result.insertId, message: 'Category created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM items WHERE categoryId = ?', [req.params.id]);
    if (rows[0].count > 0) return res.status(400).json({ error: 'Batal dihapus: masih ada item yang menggunakan kategori ditandai.' });
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/item_statuses', authenticateToken, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM item_statuses');
  res.json(rows);
});

app.post('/api/item_statuses', authenticateToken, requireAdmin, async (req, res) => {
  const { name, color, description } = req.body;
  try {
    const [result]: any = await pool.query('INSERT INTO item_statuses (name, color, description) VALUES (?, ?, ?)', [name, color, description]);
    res.json({ id: result.insertId, message: 'Status created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/item_statuses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, color, description } = req.body;
  try {
    await pool.query('UPDATE item_statuses SET name = ?, color = ?, description = ? WHERE id = ?', [name, color, description, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/item_statuses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_statuses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Status deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Discounts API
app.get('/api/discounts', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM discounts ORDER BY percentage ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/discounts', authenticateToken, requireAdmin, async (req, res) => {
  const { name, percentage } = req.body;
  try {
    const [result]: any = await pool.query('INSERT INTO discounts (name, percentage) VALUES (?, ?)', [name, percentage]);
    res.json({ id: result.insertId, message: 'Discount created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/discounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, percentage } = req.body;
  try {
    await pool.query('UPDATE discounts SET name = ?, percentage = ? WHERE id = ?', [name, percentage, req.params.id]);
    res.json({ message: 'Discount updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/discounts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM discounts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Discount deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/items', authenticateToken, async (req, res) => {
  const [rows] = await pool.query('SELECT items.*, categories.name as categoryName FROM items LEFT JOIN categories ON items.categoryId = categories.id');
  res.json(rows);
});

app.post('/api/items', authenticateToken, requireAdmin, async (req, res) => {
  const { name, categoryId, dailyPrice, weeklyPrice, totalStock } = req.body;
  try {
    const parsedStock = parseInt(totalStock);
    const status = computeItemStatus(parsedStock);
    const [result]: any = await pool.query('INSERT INTO items (name, categoryId, dailyPrice, weeklyPrice, totalStock, availableStock, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, categoryId, dailyPrice, weeklyPrice, parsedStock, parsedStock, status]);
    res.json({ id: result.insertId, message: 'Item created' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, categoryId, dailyPrice, weeklyPrice, totalStock } = req.body;
  const id = req.params.id;
  try {
    const parsedStock = parseInt(totalStock);
    const catId = categoryId ? parseInt(categoryId) : null;
    const [rows]: any = await pool.query('SELECT totalStock, availableStock FROM items WHERE id = ?', [id]);
    const currentItem = rows[0];
    if (!currentItem) return res.status(404).json({ error: 'Data tidak ditemukan' });
    const diff = parsedStock - currentItem.totalStock;
    const newAvailable = Math.max(0, currentItem.availableStock + diff);
    const status = computeItemStatus(newAvailable);
    await pool.query('UPDATE items SET name = ?, categoryId = ?, dailyPrice = ?, weeklyPrice = ?, totalStock = ?, availableStock = ?, status = ? WHERE id = ?', [name, catId, dailyPrice, weeklyPrice, parsedStock, newAvailable, status, id]);
    res.json({ message: 'Berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Payment Methods API
app.get('/api/payment_methods', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_methods ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/payment_methods', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const [result]: any = await pool.query('INSERT INTO payment_methods (name) VALUES (?)', [name]);
    res.json({ id: result.insertId, message: 'Payment method created' });
  } catch (err: any) {
    console.error('MySQL Error in POST payment_methods:', err);
    // If table doesn't exist, try creating it once
    if (err.code === 'ER_NO_SUCH_TABLE') {
       try {
         await pool.query(`CREATE TABLE IF NOT EXISTS payment_methods (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
         const [result]: any = await pool.query('INSERT INTO payment_methods (name) VALUES (?)', [name]);
         return res.json({ id: result.insertId, message: 'Payment method created after auto-repair' });
       } catch (repairErr: any) {
         return res.status(500).json({ error: 'Database repair failed: ' + repairErr.message });
       }
    }
    res.status(500).json({ error: err.message || 'Server error during save' });
  }
});

app.put('/api/payment_methods/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE payment_methods SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ message: 'Payment method updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/payment_methods/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM payment_methods WHERE id = ?', [req.params.id]);
    res.json({ message: 'Payment method deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Item Statuses API
app.get('/api/item_statuses', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM item_statuses ORDER BY name ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/item_statuses', authenticateToken, requireAdmin, async (req, res) => {
  const { name, color, description } = req.body;
  try {
    const [result]: any = await pool.query('INSERT INTO item_statuses (name, color, description) VALUES (?, ?, ?)', [name, color || 'stone', description || '']);
    res.json({ id: result.insertId, message: 'Item status created' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.put('/api/item_statuses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, color, description } = req.body;
  try {
    await pool.query('UPDATE item_statuses SET name = ?, color = ?, description = ? WHERE id = ?', [name, color || 'stone', description || '', req.params.id]);
    res.json({ message: 'Item status updated' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.delete('/api/item_statuses/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM item_statuses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item status deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.delete('/api/items/:id', authenticateToken, requireAdmin, async (req, res) => {
  const itemId = req.params.id;
  console.log(`[DEBUG] Attempting to delete Item ID: ${itemId}`);
  
  try {
    // Phase 1: Check for transaction references
    console.log(`[DEBUG] Checking transaction references for Item ID: ${itemId}`);
    const [txItems]: any = await pool.query('SELECT id FROM transaction_items WHERE itemId = ? LIMIT 1', [itemId]);
    
    if (txItems.length > 0) {
      console.log(`[DEBUG] Blocked: Item ${itemId} has transaction history.`);
      return res.status(400).json({ 
        error: 'PENGHAPUSAN DITOLAK: Barang ini memiliki riwayat sewa di menu Laporan Finance. Silakan ubah Status barang menjadi "Out of Stock" atau "Maintenance" saja untuk menonaktifkannya.' 
      });
    }

    // Phase 2: Execute deletion
    console.log(`[DEBUG] Executing SQL DELETE for Item ID: ${itemId}`);
    const [result]: any = await pool.query('DELETE FROM items WHERE id = ?', [itemId]);
    
    if (result.affectedRows === 0) {
      console.log(`[DEBUG] Not Found: Item ${itemId} does not exist.`);
      return res.status(404).json({ error: 'Data barang tidak ditemukan di database.' });
    }

    console.log(`[DEBUG] Success: Item ${itemId} deleted.`);
    res.json({ message: 'Barang berhasil dihapus' });
  } catch (err: any) {
    console.error(`[FATAL ERROR] Failed to delete Item ${itemId}:`, err);
    
    // Check for explicit MySQL foreign key error if Phase 1 somehow missed it
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        error: 'Gagal: Barang ini masih terhubung dengan data transaksi lain di database.' 
      });
    }
    
    res.status(500).json({ error: 'Kegagalan Server: ' + (err.message || 'Error tidak diketahui') });
  }
});

app.post('/api/transactions', authenticateToken, async (req: any, res) => {
  const { 
    customerName, 
    customerPhone, 
    startDate, 
    endDate, 
    durationDays, 
    items, 
    paymentMethod,
    subtotal,
    discount,
    discountAmount,
    totalAmount
  } = req.body;
  
  const conn = await pool.getConnection();
  try {
    // console.log untuk cek data masuk ke server
    console.log('--- DATA TRANSAKSI MASUK ---');
    console.log(req.body);
    
    await conn.beginTransaction();
    
    // Gunakan Number() untuk memastikan data masuk sebagai angka
    const finalSubtotal = Number(subtotal !== undefined ? subtotal : items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0));
    const finalTotal = Number(totalAmount !== undefined ? totalAmount : finalSubtotal);
    const finalDiscount = Number(discount || 0);
    const finalDiscountAmt = Number(discountAmount || 0);

    const [txResult]: any = await conn.query(
      'INSERT INTO transactions (userId, customerName, customerPhone, startDate, endDate, durationDays, subtotal, discount, discountAmount, totalAmount, status, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [req.user.id, customerName, customerPhone, startDate, endDate, durationDays, finalSubtotal, finalDiscount, finalDiscountAmt, finalTotal, 'active', paymentMethod || 'Cash']
    );
    
    const txId = txResult.insertId;
    for (const item of items) {
      await conn.query('INSERT INTO transaction_items (transactionId, itemId, quantity, price) VALUES (?, ?, ?, ?)', [txId, item.itemId, item.quantity, item.price]);
      const [rows]: any = await conn.query('SELECT availableStock FROM items WHERE id = ?', [item.itemId]);
      const newAvail = rows[0].availableStock - item.quantity;
      await conn.query('UPDATE items SET availableStock = ?, status = ? WHERE id = ?', [newAvail, computeItemStatus(newAvail), item.itemId]);
    }
    await conn.commit();
    res.json({ id: txId, message: 'Transaksi berhasil' });
  } catch (err) {
    console.error('Transaction Error:', err);
    await conn.rollback();
    res.status(500).json({ error: 'Transaction failed' });
  } finally {
    conn.release();
  }
});

app.get('/api/transactions', authenticateToken, async (req, res) => {
  const [rows] = await pool.query('SELECT transactions.*, users.name as userName FROM transactions LEFT JOIN users ON transactions.userId = users.id ORDER BY transactions.createdAt DESC');
  res.json(rows);
});

app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  console.log(`[DEBUG] Fetching details for Transaction ID: ${id}`);
  try {
    const [txRows]: any = await pool.query('SELECT transactions.*, users.name as userName FROM transactions LEFT JOIN users ON transactions.userId = users.id WHERE transactions.id = ?', [id]);
    if (!txRows[0]) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    
    const [itemRows]: any = await pool.query('SELECT transaction_items.*, items.name as itemName FROM transaction_items LEFT JOIN items ON transaction_items.itemId = items.id WHERE transactionId = ?', [id]);
    
    console.log(`[DEBUG] Found ${itemRows.length} items for Transaction ID: ${id}`);
    res.json({ ...txRows[0], items: itemRows });
  } catch (err: any) {
    console.error(`[FATAL ERROR] Failed to fetch transaction details:`, err);
    res.status(500).json({ error: 'Gagal mengambil detail transaksi: ' + err.message });
  }
});

app.post('/api/transactions/:id/return', authenticateToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;
    const [txs]: any = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!txs[0] || txs[0].status === 'returned') throw new Error('Invalid Tx');
    await conn.query('UPDATE transactions SET status = ? WHERE id = ?', ['returned', id]);
    const [items]: any = await conn.query('SELECT * FROM transaction_items WHERE transactionId = ?', [id]);
    for (const item of items) {
      const [rows]: any = await conn.query('SELECT availableStock FROM items WHERE id = ?', [item.itemId]);
      const newAvail = rows[0].availableStock + item.quantity;
      await conn.query('UPDATE items SET availableStock = ?, status = ? WHERE id = ?', [newAvail, computeItemStatus(newAvail), item.itemId]);
    }
    await conn.commit();
    res.json({ message: 'Items returned' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Return failed' });
  } finally {
    conn.release();
  }
});

app.get('/api/finance/expenses', authenticateToken, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
  res.json(rows);
});

app.post('/api/finance/expenses', authenticateToken, requireAdmin, async (req, res) => {
  const { description, amount, date } = req.body;
  try {
    const [result]: any = await pool.query('INSERT INTO expenses (description, amount, date) VALUES (?, ?, ?)', [description, amount, date]);
    res.json({ id: result.insertId, message: 'Expense added' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/finance/expenses/:id', authenticateToken, requireAdmin, async (req, res) => {
  const expenseId = req.params.id;
  console.log(`[DEBUG] Attempting to delete Expense ID: ${expenseId}`);
  try {
    const [result]: any = await pool.query('DELETE FROM expenses WHERE id = ?', [expenseId]);
    if (result.affectedRows === 0) {
      console.log(`[DEBUG] Expense ID ${expenseId} not found.`);
      return res.status(404).json({ error: 'Data pengeluaran tidak ditemukan.' });
    }
    console.log(`[DEBUG] Success: Expense ID ${expenseId} deleted.`);
    res.json({ message: 'Expense deleted successfully' });
  } catch (err: any) {
    console.error(`[FATAL ERROR] Failed to delete Expense ${expenseId}:`, err);
    res.status(500).json({ error: 'Kegagalan Server: ' + (err.message || 'Error tidak diketahui') });
  }
});

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role FROM users');
  res.json(rows);
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'staff']
    );
    res.json({ id: result.insertId, message: 'User created' });
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, role, password } = req.body;
  const id = req.params.id;
  try {
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name = ?, email = ?, role = ?, password = ? WHERE id = ?', [name, email, role, hashedPassword, id]);
    } else {
      await pool.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, id]);
    }
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/auth/change-password', authenticateToken, async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  try {
    const [rows]: any = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: 'Password saat ini salah' });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNew, userId]);
    res.json({ message: 'Password berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function startServer() {
  await setupDatabase();
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}
startServer();
