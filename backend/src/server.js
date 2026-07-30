// === Backend API для Черёмуха Street ===
// Все секреты берутся ТОЛЬКО из переменных окружения (process.env), никогда не пишутся в код.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET;
const dooglys = require('./dooglys');

// --- Middleware: проверка JWT токена ---
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет токена' });
  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

// --- Middleware: проверка роли ---
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

// === AUTH ===
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE login = $1 AND is_active = true', [login]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = jwt.sign({ id: user.id, login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, login: user.login, role: user.role, full_name: user.full_name } });
});

// === DASHBOARD ===
app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  const { period = 'day' } = req.query; // day | week | month
  const interval = { day: '1 day', week: '7 days', month: '30 days' }[period] || '1 day';
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS orders
     FROM sales WHERE sold_at >= now() - $1::interval`,
    [interval]
  );
  res.json(rows[0]);
});

// === PRODUCTS ===
app.get('/api/products', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY name');
  res.json(rows);
});

app.post('/api/products', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  const { name, category, price } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO products (name, category, price) VALUES ($1,$2,$3) RETURNING *',
    [name, category, price]
  );
  res.status(201).json(rows[0]);
});

// === SALES (история продаж) ===
app.get('/api/sales', authMiddleware, async (req, res) => {
  const { from, to, product_id } = req.query;
  let query = `SELECT s.*, p.name AS product_name FROM sales s
               JOIN products p ON p.id = s.product_id WHERE 1=1`;
  const params = [];
  if (from) { params.push(from); query += ` AND sold_at >= $${params.length}`; }
  if (to) { params.push(to); query += ` AND sold_at <= $${params.length}`; }
  if (product_id) { params.push(product_id); query += ` AND product_id = $${params.length}`; }
  query += ' ORDER BY sold_at DESC LIMIT 500';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// === INGREDIENTS / ОСТАТКИ ===
app.get('/api/ingredients/low-stock', authMiddleware, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM ingredients WHERE current_stock <= min_stock');
  res.json(rows);
});

// === DOOGLYS (прямая интеграция) ===
app.get('/api/dooglys/products', authMiddleware, async (req, res) => {
  try {
    const data = await dooglys.getProducts();
    res.json(data);
  } catch (err) {
    console.error('Dooglys products error:', err.message);
    res.status(502).json({ error: 'Не удалось получить товары из Dooglys' });
  }
});

app.get('/api/dooglys/stock', authMiddleware, async (req, res) => {
  try {
    const data = await dooglys.getStock();
    res.json(data);
  } catch (err) {
    console.error('Dooglys stock error:', err.response?.status, JSON.stringify(err.response?.data));
    res.status(502).json({ error: 'Не удалось получить остатки из Dooglys' });
  }
});

app.get('/api/dooglys/sales', authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await dooglys.getSales({ from, to });
    res.json(data);
  } catch (err) {
    console.error('Dooglys sales error:', err.message);
    res.status(502).json({ error: 'Не удалось получить продажи из Dooglys' });
  }
});

app.get('/api/dooglys/probe', authMiddleware, requireRole('admin'), async (req, res) => {
  const results = await dooglys.probeEndpoints();
  res.json(results);
});

// === HEALTH CHECK (для Railway) ===
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend запущен на порту ${PORT}`));
