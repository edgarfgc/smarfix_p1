const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Cargar .env manualmente
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smartfix_jwt_secret_2026_bahia_blanca';
const ADMIN_PASSWORD = 'sm4rtfix2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS presupuestos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    falla TEXT NOT NULL,
    monto REAL,
    monto_descripcion TEXT,
    estado TEXT DEFAULT 'pendiente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL
  );
`);

// Initialize admin password
const adminRow = db.prepare('SELECT * FROM admin WHERE id = 1').get();
if (!adminRow) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO admin (id, password_hash) VALUES (1, ?)').run(hash);
  console.log('✅ Admin password initialized');
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ===== API ROUTES =====

// POST /api/login - Admin login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }
  const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// POST /api/presupuestos - Create new budget request
app.post('/api/presupuestos', (req, res) => {
  const { nombre, email, telefono, marca, modelo, falla } = req.body;

  // Validation
  if (!nombre || !email || !telefono || !marca || !modelo || !falla) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  try {
    const stmt = db.prepare(
      'INSERT INTO presupuestos (nombre, email, telefono, marca, modelo, falla) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(nombre, email, telefono, marca, modelo, falla);

    // --- WhatsApp Notification ---
    // Para que funcione, debes configurar WHATSAPP_NUMBER y WHATSAPP_API_KEY (de CallMeBot)
    const wsNumber = process.env.WHATSAPP_NUMBER || '5492914394736'; // Tu número por defecto
    const wsApiKey = process.env.WHATSAPP_API_KEY;

    if (wsNumber && wsApiKey) {
      const message = `🛠️ *Nuevo Presupuesto SmartFix*\n\n*Cliente:* ${nombre}\n*Equipo:* ${marca} ${modelo}\n*Falla:* ${falla}\n*Tel:* ${telefono}`;
      const wsUrl = `https://api.callmebot.com/whatsapp.php?phone=${wsNumber}&text=${encodeURIComponent(message)}&apikey=${wsApiKey}`;
      
      fetch(wsUrl).catch(err => console.error('Error enviando notificación WhatsApp:', err.message));
    }
    // ----------------------------

    res.status(201).json({
      message: 'Presupuesto enviado con éxito',
      id: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar el presupuesto' });
  }
});

// GET /api/presupuestos - List all (admin only)
app.get('/api/presupuestos', authMiddleware, (req, res) => {
  const { estado, marca, desde, hasta } = req.query;
  let query = 'SELECT * FROM presupuestos WHERE 1=1';
  const params = [];

  if (estado) {
    query += ' AND estado = ?';
    params.push(estado);
  }
  if (marca) {
    query += ' AND marca = ?';
    params.push(marca);
  }
  if (desde) {
    query += ' AND created_at >= ?';
    params.push(desde);
  }
  if (hasta) {
    query += ' AND created_at <= ?';
    params.push(hasta + ' 23:59:59');
  }

  query += ' ORDER BY created_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// PATCH /api/presupuestos/:id - Update status (admin only)
app.patch('/api/presupuestos/:id', authMiddleware, (req, res) => {
  const { estado } = req.body;
  if (!estado || !['pendiente', 'atendido', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const result = db.prepare('UPDATE presupuestos SET estado = ? WHERE id = ?').run(estado, req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Presupuesto no encontrado' });
  }
  res.json({ message: 'Estado actualizado' });
});

// DELETE /api/presupuestos/:id - Delete (admin only)
app.delete('/api/presupuestos/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM presupuestos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Presupuesto no encontrado' });
  }
  res.json({ message: 'Presupuesto eliminado' });
});

// PATCH /api/presupuestos/:id/presupuestar - Set amount, description and mark as presupuestado (admin only)
app.patch('/api/presupuestos/:id/presupuestar', authMiddleware, (req, res) => {
  const { monto, descripcion } = req.body;
  if (monto === undefined || isNaN(monto)) {
    return res.status(400).json({ error: 'Monto inválido' });
  }
  const result = db.prepare('UPDATE presupuestos SET monto = ?, monto_descripcion = ?, estado = "presupuestado" WHERE id = ?').run(monto, descripcion, req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Presupuesto no encontrado' });
  }
  res.json({ message: 'Presupuesto registrado' });
});

// GET /api/stats - Statistics (admin only)
app.get('/api/stats', authMiddleware, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM presupuestos').get();
  const pendientes = db.prepare("SELECT COUNT(*) as count FROM presupuestos WHERE estado = 'pendiente'").get();
  const atendidos = db.prepare("SELECT COUNT(*) as count FROM presupuestos WHERE estado = 'atendido'").get();
  const marcas = db.prepare('SELECT marca, COUNT(*) as count FROM presupuestos GROUP BY marca ORDER BY count DESC').all();
  const hoy = db.prepare("SELECT COUNT(*) as count FROM presupuestos WHERE date(created_at) = date('now')").get();

  res.json({
    total: total.count,
    pendientes: pendientes.count,
    atendidos: atendidos.count,
    hoy: hoy.count,
    marcas
  });
});

// GET /api/export/csv - Export as CSV (admin only)
app.get('/api/export/csv', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM presupuestos ORDER BY created_at DESC').all();

  const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Marca', 'Modelo', 'Falla', 'Estado', 'Fecha'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.id,
      `"${r.nombre}"`,
      `"${r.email}"`,
      `"${r.telefono}"`,
      `"${r.marca}"`,
      `"${r.modelo}"`,
      `"${(r.falla || '').replace(/"/g, '""')}"`,
      r.estado,
      r.created_at
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=presupuestos_smartfix.csv');
  res.send('\uFEFF' + csv);
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback to index
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🔧 SmartFix Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin password: ${ADMIN_PASSWORD}\n`);
});
