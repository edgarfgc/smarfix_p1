// ===== SmartFix - Admin JS =====
let token = localStorage.getItem('smartfix_token') || '';

// Check if already logged in
if (token) { showPanel(); }

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = document.getElementById('adminPass').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pass })
    });
    const data = await res.json();
    if (res.ok) {
      token = data.token;
      localStorage.setItem('smartfix_token', token);
      showPanel();
    } else {
      errEl.textContent = data.error || 'Error de autenticación';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = 'Error de conexión';
    errEl.style.display = 'block';
  }
});

function showPanel() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  loadStats();
  loadData();
}

function logout() {
  token = '';
  localStorage.removeItem('smartfix_token');
  location.reload();
}

function headers() {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats', { headers: headers() });
    if (res.status === 401) { logout(); return; }
    const s = await res.json();
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card"><div class="number">${s.total}</div><div class="label">Total solicitudes</div></div>
      <div class="stat-card"><div class="number">${s.pendientes}</div><div class="label">Pendientes</div></div>
      <div class="stat-card"><div class="number">${s.atendidos}</div><div class="label">Atendidos</div></div>
      <div class="stat-card"><div class="number">${s.hoy}</div><div class="label">Hoy</div></div>
    `;
  } catch (err) { console.error(err); }
}

async function loadData() {
  const estado = document.getElementById('filterEstado').value;
  const marca = document.getElementById('filterMarca').value;
  const desde = document.getElementById('filterDesde').value;
  const hasta = document.getElementById('filterHasta').value;
  
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  if (marca) params.set('marca', marca);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);

  try {
    const res = await fetch(`/api/presupuestos?${params}`, { headers: headers() });
    if (res.status === 401) { logout(); return; }
    const rows = await res.json();
    const tbody = document.getElementById('tableBody');
    
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hay presupuestos</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${new Date(r.created_at).toLocaleDateString('es-AR')}</td>
        <td>${esc(r.nombre)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.telefono)}</td>
        <td>${esc(r.marca)}</td>
        <td>${esc(r.modelo)}</td>
        <td style="max-width:200px">${esc(r.falla)}</td>
        <td>
          <div style="font-weight:700;color:var(--green)">${r.monto ? '$' + r.monto : '-'}</div>
          <div style="font-size:.7rem;color:var(--gray)">${esc(r.monto_descripcion)}</div>
        </td>
        <td><span class="badge badge-${r.estado}">${r.estado}</span></td>
        <td>
          <div class="action-btns">
            ${r.estado === 'pendiente' ? `<button class="action-btn green" title="Presupuestar" onclick="quoteBudget(${r.id},'${esc(r.nombre)}','${esc(r.telefono)}','${esc(r.marca)} ${esc(r.modelo)}')">💰</button>` : ''}
            ${r.estado === 'presupuestado' ? `<button class="action-btn green" title="Finalizar" onclick="updateStatus(${r.id},'atendido')">✓</button>` : ''}
            ${r.estado !== 'pendiente' ? `<button class="action-btn green" title="Reiniciar" onclick="updateStatus(${r.id},'pendiente')">↺</button>` : ''}
            <button class="action-btn red" title="Eliminar" onclick="deleteRow(${r.id})">✕</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) { console.error(err); }
}

async function quoteBudget(id, nombre, telefono, equipo) {
  const monto = prompt(`Ingrese el monto del presupuesto para ${nombre} (${equipo}):`);
  if (monto === null || monto === "" || isNaN(monto)) return;

  const descripcion = prompt(`Ingrese una descripción opcional para el presupuesto:`);

  try {
    const res = await fetch(`/api/presupuestos/${id}/presupuestar`, {
      method: 'PATCH', headers: headers(),
      body: JSON.stringify({ monto: parseFloat(monto), descripcion: descripcion || '' })
    });
    
    if (res.ok) {
      const descPart = descripcion ? `\n\n*Detalle:* ${descripcion}` : '';
      const message = `Hola ${nombre}! Te contactamos de SmartFix 🛠️ por tu ${equipo}. El presupuesto para la reparación es de *$${monto}*.${descPart}\n\n¿Deseas coordinar para realizar el trabajo?`;
      const cleanPhone = telefono.replace(/\D/g, '');
      const wsUrl = `https://wa.me/${cleanPhone.startsWith('291') ? '549' + cleanPhone : cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(wsUrl, '_blank');
      loadStats(); loadData();
    } else {
      const data = await res.json();
      alert(data.error || 'Error al guardar presupuesto');
    }
  } catch (err) { alert('Error de conexión'); }
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

async function updateStatus(id, estado) {
  await fetch(`/api/presupuestos/${id}`, {
    method: 'PATCH', headers: headers(),
    body: JSON.stringify({ estado })
  });
  loadStats(); loadData();
}

async function deleteRow(id) {
  if (!confirm('¿Eliminar este presupuesto?')) return;
  await fetch(`/api/presupuestos/${id}`, { method: 'DELETE', headers: headers() });
  loadStats(); loadData();
}

async function exportCSV() {
  try {
    const res = await fetch('/api/export/csv', { headers: headers() });
    if (res.status === 401) { logout(); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'presupuestos_smartfix.csv';
    a.click(); URL.revokeObjectURL(url);
  } catch (err) { alert('Error al exportar'); }
}
