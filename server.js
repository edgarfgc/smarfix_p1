const { createClient } = require('@supabase/supabase-js');
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

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Contraseña requerida' });
  }
  
  const { data: admin, error } = await supabase
    .from('admin')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// POST /api/presupuestos - Create new budget request
app.post('/api/presupuestos', async (req, res) => {
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
    const { data, error } = await supabase
      .from('presupuestos')
      .insert([{ nombre, email, telefono, marca, modelo, falla }])
      .select();

    if (error) throw error;

    // --- WhatsApp Notification ---
    const wsNumber = process.env.WHATSAPP_NUMBER || '5492914394736';
    const wsApiKey = process.env.WHATSAPP_API_KEY;

    if (wsNumber && wsApiKey) {
      const message = `🛠️ *Nuevo Presupuesto SmartFix*\n\n*Cliente:* ${nombre}\n*Equipo:* ${marca} ${modelo}\n*Falla:* ${falla}\n*Tel:* ${telefono}`;
      const wsUrl = `https://api.callmebot.com/whatsapp.php?phone=${wsNumber}&text=${encodeURIComponent(message)}&apikey=${wsApiKey}`;
      
      fetch(wsUrl).catch(err => console.error('Error enviando notificación WhatsApp:', err.message));
    }
    // ----------------------------

    res.status(201).json({
      message: 'Presupuesto enviado con éxito',
      id: data[0].id
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar el presupuesto' });
  }
});

// GET /api/presupuestos - List all (admin only)
app.get('/api/presupuestos', authMiddleware, async (req, res) => {
  const { estado, marca, desde, hasta } = req.query;
  let query = supabase.from('presupuestos').select('*');

  if (estado) query = query.eq('estado', estado);
  if (marca) query = query.eq('marca', marca);
  if (desde) query = query.gte('created_at', desde);
  if (hasta) query = query.lte('created_at', hasta + ' 23:59:59');

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/presupuestos/:id - Update status (admin only)
app.patch('/api/presupuestos/:id', authMiddleware, async (req, res) => {
  const { estado } = req.body;
  if (!estado || !['pendiente', 'atendido', 'rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const { error } = await supabase
    .from('presupuestos')
    .update({ estado })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Estado actualizado' });
});

// DELETE /api/presupuestos/:id - Delete (admin only)
app.delete('/api/presupuestos/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from('presupuestos')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Presupuesto eliminado' });
});

// PATCH /api/presupuestos/:id/presupuestar - Set amount, description and mark as presupuestado (admin only)
app.patch('/api/presupuestos/:id/presupuestar', authMiddleware, async (req, res) => {
  const { monto, descripcion } = req.body;
  if (monto === undefined || isNaN(monto)) {
    return res.status(400).json({ error: 'Monto inválido' });
  }
  const { error } = await supabase
    .from('presupuestos')
    .update({ 
      monto, 
      monto_descripcion: descripcion, 
      estado: "presupuestado" 
    })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Presupuesto registrado' });
});

// GET /api/stats - Statistics (admin only)
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const { data: all } = await supabase.from('presupuestos').select('estado, marca, created_at');
    
    const stats = {
      total: all.length,
      pendientes: all.filter(r => r.estado === 'pendiente').length,
      atendidos: all.filter(r => r.estado === 'atendido' || r.estado === 'presupuestado').length,
      hoy: all.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length,
      marcas: []
    };

    const marcasMap = all.reduce((acc, r) => {
      acc[r.marca] = (acc[r.marca] || 0) + 1;
      return acc;
    }, {});

    stats.marcas = Object.entries(marcasMap)
      .map(([marca, count]) => ({ marca, count }))
      .sort((a, b) => b.count - a.count);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/export/csv - Export as CSV (admin only)
app.get('/api/export/csv', authMiddleware, async (req, res) => {
  const { data: rows, error } = await supabase.from('presupuestos').select('*').order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

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
  console.log(`🔑 Admin password: sm4rtfix2026\n`);
});
