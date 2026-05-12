# SmartFix Bahía Blanca — Sitio Web con Backend

Sitio web profesional para servicio técnico de reparación de celulares **SmartFix** en Bahía Blanca. Estética premium, tecnológica, responsive, con formulario de presupuestos y panel de administración.

## Datos del Negocio

| Campo | Valor |
|-------|-------|
| Nombre | SmartFix — Reparación inteligente |
| Dirección | Maldonado 1431, Bahía Blanca |
| Teléfono | 291 4394736 |
| Instagram | @smartfix.bb |
| Horarios | Lunes a Viernes 9:00 - 18:00, Sábados 9:00 - 13:00 |

## Paleta de Colores (extraída de los logos)

| Color | Hex | Uso |
|-------|-----|-----|
| Navy Dark | `#0a1628` | Fondos principales |
| Navy | `#0d2247` | Fondos secundarios, cards |
| Navy Light | `#142d5c` | Bordes, hovers |
| Verde Lima | `#7dc63f` | Acentos, CTAs, botones |
| Celeste | `#3a9fd6` | Links, detalles secundarios |
| Blanco | `#ffffff` | Textos principales |
| Gris claro | `#b0bec5` | Textos secundarios |

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 (vanilla) + JavaScript |
| Backend | Node.js + Express |
| Base de datos | SQLite (via `better-sqlite3`) |
| Fuentes | Google Fonts (Inter) |
| Iconos | Lucide Icons (SVG inline) |

> [!NOTE]
> Se usa SQLite para simplicidad — no requiere instalar un servidor de base de datos externo. El archivo `.db` se crea automáticamente.

## Arquitectura del Proyecto

```
modelo IA 2/
├── logo.png                  # Logo circular (existente)
├── logo2.png                 # Logo horizontal (existente)
├── server.js                 # Servidor Express principal
├── package.json              # Dependencias Node.js
├── database.db               # SQLite (se crea automáticamente)
├── public/
│   ├── index.html            # Página principal
│   ├── admin.html            # Panel de administración
│   ├── css/
│   │   └── styles.css        # Estilos principales
│   ├── js/
│   │   ├── main.js           # Lógica del frontend
│   │   └── admin.js          # Lógica del panel admin
│   └── img/
│       ├── logo.png          # Copia del logo
│       └── logo2.png         # Copia del logo2
```

## Secciones de la Página Principal

### 1. **Navbar** (fija, glassmorphism)
- Logo horizontal (`logo2.png`) a la izquierda
- Links de navegación con smooth scroll
- Botón CTA "Solicitar Presupuesto"
- Menú hamburguesa en móvil

### 2. **Hero Section**
- Fondo con gradiente navy + partículas/efecto tech animado
- Logo circular grande con animación de entrada
- Título: "Reparación inteligente de celulares"
- Subtítulo con ubicación en Bahía Blanca
- Botón CTA principal → Formulario de presupuesto
- Estadísticas animadas (equipos reparados, años de experiencia, etc.)

### 3. **Servicios** (6 cards con iconos SVG + hover effects)
1. 📱 Reparación de pantallas
2. 🔋 Cambio de baterías
3. ⚡ Reparación de carga
4. 💻 Software / Desbloqueo
5. 🔧 Reparación de placa
6. 🛡️ Diagnóstico gratuito

### 4. **Formulario de Presupuesto**
Campos:
- Nombre completo
- Teléfono / WhatsApp
- Marca del equipo (select con opciones: Samsung, Apple, Motorola, Xiaomi, Huawei, LG, Otro)
- Modelo del equipo
- Descripción de la falla (textarea)

Validación en frontend + backend. Feedback visual al enviar.

### 5. **Testimonios** (carrusel con 6 reseñas ficticias)
- Nombre, foto de avatar, texto, rating con estrellas
- Auto-play con controles

### 6. **FAQ** (acordeón desplegable)
- 5–6 preguntas frecuentes sobre reparaciones

### 7. **Contacto + Mapa**
- Info de contacto (dirección, teléfono, horarios, Instagram)
- Google Maps embed con la ubicación

### 8. **Footer**
- Logo, links, redes sociales, copyright

### 9. **Botón flotante de WhatsApp**
- Ícono animado en esquina inferior derecha
- Abre chat con número 5492914394736

## Panel de Administración (`/admin.html`)

- Login con contraseña (hash bcrypt en el backend)
- Tabla con todos los presupuestos recibidos
- Filtros por fecha, marca, estado
- Marcar presupuestos como "Atendido" / "Pendiente"
- Exportar a CSV
- Estadísticas: total de solicitudes, marcas más frecuentes

> [!IMPORTANT]
> La contraseña del admin se configura como variable de entorno o se define en el primer uso. ¿Querés definir una contraseña ahora o preferís que te pregunte al iniciar el servidor por primera vez?

## API Endpoints (Backend)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/presupuestos` | Crear nueva solicitud |
| `GET` | `/api/presupuestos` | Listar todas (requiere auth) |
| `PATCH` | `/api/presupuestos/:id` | Actualizar estado (requiere auth) |
| `DELETE` | `/api/presupuestos/:id` | Eliminar solicitud (requiere auth) |
| `POST` | `/api/login` | Login admin (devuelve token) |
| `GET` | `/api/stats` | Estadísticas (requiere auth) |
| `GET` | `/api/export/csv` | Exportar CSV (requiere auth) |

## Diseño Visual

- **Dark mode** con fondos navy como el logo
- **Glassmorphism** en navbar y cards
- **Gradientes** sutiles azul→verde
- **Micro-animaciones**: hover en cards, entrada de secciones con IntersectionObserver
- **Partículas tech** animadas en el hero
- **Responsive**: Mobile-first, breakpoints en 768px y 1024px
- **Tipografía**: Inter (Google Fonts) para todo el sitio

## Verificación

### Automatizada
- Iniciar servidor y verificar que carga correctamente
- Enviar presupuesto de prueba vía formulario
- Verificar que aparece en el panel admin
- Probar responsive en el navegador

### Manual
- El usuario verificará el diseño visual y funcionalidad completa

## Open Questions

> [!IMPORTANT]
> **Contraseña del admin**: ¿Querés definir una contraseña fija ahora (ej: "smartfix2026") o preferís que el sistema te pida crearla la primera vez que accedas al panel?

> [!NOTE]
> **Horarios**: Asumí Lunes a Viernes 9-18 y Sábados 9-13. ¿Son correctos o los cambio?
