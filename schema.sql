-- ============================================================
-- ESQUEMA BASE DE DATOS - COTIZADOR ELÉCTRICO
-- Ejecutar en: Neon Console > SQL Editor
-- ============================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) DEFAULT 'vendedor' CHECK (rol IN ('admin', 'vendedor')),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de categorías de materiales
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de materiales/productos
CREATE TABLE IF NOT EXISTS materiales (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_id INTEGER REFERENCES categorias(id),
  unidad VARCHAR(20) DEFAULT 'unidad',
  precio_costo DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
  margen_ganancia DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN precio_costo > 0 
    THEN ROUND(((precio_venta - precio_costo) / precio_costo * 100)::numeric, 2) 
    ELSE 0 END
  ) STORED,
  stock INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  empresa VARCHAR(150),
  email VARCHAR(150),
  telefono VARCHAR(20),
  direccion TEXT,
  ruc_cedula VARCHAR(20),
  notas TEXT,
  usuario_id INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) UNIQUE NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  titulo VARCHAR(200),
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','enviada','aprobada','rechazada','facturada')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  descuento_pct DECIMAL(5,2) DEFAULT 0,
  descuento_valor DECIMAL(10,2) DEFAULT 0,
  iva_pct DECIMAL(5,2) DEFAULT 15,
  iva_valor DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  notas TEXT,
  validez_dias INTEGER DEFAULT 30,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de ítems de cotización
CREATE TABLE IF NOT EXISTS cotizacion_items (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER REFERENCES cotizaciones(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materiales(id),
  descripcion VARCHAR(300),
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
  unidad VARCHAR(20) DEFAULT 'unidad',
  precio_unitario DECIMAL(10,2) NOT NULL,
  descuento_pct DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (
    ROUND((cantidad * precio_unitario * (1 - descuento_pct/100))::numeric, 2)
  ) STORED
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Categorías de materiales eléctricos
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Conductores', 'Cables y conductores eléctricos'),
  ('Protecciones', 'Breakers, fusibles, diferenciales'),
  ('Canalización', 'Tuberías, bandejas, canaletas'),
  ('Iluminación', 'Luminarias, lámparas, accesorios'),
  ('Tomacorrientes', 'Tomacorrientes, interruptores, placas'),
  ('Tableros', 'Tableros eléctricos y accesorios'),
  ('Medición', 'Medidores, transformadores de corriente'),
  ('Mano de Obra', 'Servicios de instalación')
ON CONFLICT DO NOTHING;

-- Materiales de ejemplo
INSERT INTO materiales (codigo, nombre, categoria_id, unidad, precio_costo, precio_venta) VALUES
  ('CAB-1X10', 'Cable THHN #10 AWG negro', 1, 'metro', 0.85, 1.20),
  ('CAB-1X12', 'Cable THHN #12 AWG negro', 1, 'metro', 0.65, 0.95),
  ('CAB-1X14', 'Cable THHN #14 AWG negro', 1, 'metro', 0.45, 0.70),
  ('CAB-2X10', 'Cable duplex #10 AWG', 1, 'metro', 1.60, 2.20),
  ('BRK-1P20', 'Breaker 1 polo 20A', 2, 'unidad', 8.50, 14.00),
  ('BRK-1P30', 'Breaker 1 polo 30A', 2, 'unidad', 9.00, 15.00),
  ('BRK-2P60', 'Breaker 2 polos 60A', 2, 'unidad', 22.00, 35.00),
  ('TUB-34EMT', 'Tubería EMT 3/4"', 3, 'tramo 3m', 5.50, 8.50),
  ('TUB-1EMT', 'Tubería EMT 1"', 3, 'tramo 3m', 8.00, 12.00),
  ('LUM-LED40', 'Luminaria LED panel 40W', 4, 'unidad', 18.00, 28.00),
  ('LUM-LED20', 'Luminaria LED panel 20W', 4, 'unidad', 12.00, 19.00),
  ('TOM-DOBLE', 'Tomacorriente doble 15A', 5, 'unidad', 3.50, 6.00),
  ('INT-SIMP', 'Interruptor simple', 5, 'unidad', 2.80, 5.00),
  ('TAB-12C', 'Tablero 12 circuitos', 6, 'unidad', 45.00, 75.00),
  ('MO-HORA', 'Mano de obra electricista', 8, 'hora', 12.00, 18.00)
ON CONFLICT DO NOTHING;

-- Usuario admin por defecto (contraseña: Admin1234)
-- NOTA: El hash real se genera por la API, este es solo referencial
-- Cámbialo desde la app después del primer inicio de sesión

-- ============================================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON materiales(categoria_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_usuario ON cotizaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_items_cotizacion ON cotizacion_items(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(usuario_id);