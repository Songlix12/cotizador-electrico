// api/electrical-projects/index.js
// ─── Vercel Serverless Function ─── CommonJS ───────────────────

const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Pool con conexión Neon (reutilizable entre invocaciones)
let _pool = null;
function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return _pool;
}

// Crear tabla si no existe (auto-migración)
async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS electrical_projects (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER,
      nombre     TEXT NOT NULL,
      cliente    TEXT,
      ubicacion  TEXT,
      tipo       TEXT DEFAULT 'residencial',
      temp_f     TEXT DEFAULT '1.0',
      sistema    TEXT DEFAULT '120',
      cargas     JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// Verificar token JWT
function getUsuario(req) {
  try {
    const auth  = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '').trim();
    if (!token) return null;
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Helpers de respuesta
const ok  = (res, data)          => res.status(200).json(data);
const err = (res, msg, code=400) => res.status(code).json({ error: msg });

// ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth
  const usuario = getUsuario(req);
  if (!usuario) return err(res, 'No autorizado', 401);
  const userId = usuario.id;

  const pool   = getPool();
  const client = await pool.connect();

  try {
    // Garantizar que la tabla existe
    await ensureTable(client);

    const { id } = req.query;

    // ── GET: listar proyectos ────────────────────────────────
    if (req.method === 'GET') {
      const { rows } = await client.query(
        `SELECT
           id, user_id, nombre, cliente, ubicacion,
           tipo, temp_f, sistema, cargas,
           created_at AS "createdAt",
           updated_at AS "updatedAt"
         FROM electrical_projects
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId]
      );
      return ok(res, rows);
    }

    // ── POST: crear proyecto ─────────────────────────────────
    if (req.method === 'POST') {
      const { nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas } = req.body;
      if (!nombre?.trim()) return err(res, 'El nombre es requerido');

      const { rows } = await client.query(
        `INSERT INTO electrical_projects
           (user_id, nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING
           id, user_id, nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas,
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          userId,
          nombre.trim(),
          cliente?.trim()   || null,
          ubicacion?.trim() || null,
          tipo    || 'residencial',
          temp_f  || '1.0',
          sistema || '120',
          JSON.stringify(cargas || []),
        ]
      );
      return ok(res, rows[0]);
    }

    // ── PUT: actualizar proyecto ─────────────────────────────
    if (req.method === 'PUT') {
      if (!id) return err(res, 'ID requerido');
      const { nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas } = req.body;
      if (!nombre?.trim()) return err(res, 'El nombre es requerido');

      const check = await client.query(
        'SELECT id FROM electrical_projects WHERE id=$1 AND user_id=$2',
        [id, userId]
      );
      if (!check.rows.length) return err(res, 'Proyecto no encontrado', 404);

      const { rows } = await client.query(
        `UPDATE electrical_projects SET
           nombre=$1, cliente=$2, ubicacion=$3,
           tipo=$4, temp_f=$5, sistema=$6,
           cargas=$7, updated_at=NOW()
         WHERE id=$8 AND user_id=$9
         RETURNING
           id, user_id, nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas,
           created_at AS "createdAt", updated_at AS "updatedAt"`,
        [
          nombre.trim(),
          cliente?.trim()   || null,
          ubicacion?.trim() || null,
          tipo    || 'residencial',
          temp_f  || '1.0',
          sistema || '120',
          JSON.stringify(cargas || []),
          id,
          userId,
        ]
      );
      return ok(res, rows[0]);
    }

    // ── DELETE: eliminar proyecto ────────────────────────────
    if (req.method === 'DELETE') {
      if (!id) return err(res, 'ID requerido');

      const { rowCount } = await client.query(
        'DELETE FROM electrical_projects WHERE id=$1 AND user_id=$2',
        [id, userId]
      );
      if (!rowCount) return err(res, 'Proyecto no encontrado', 404);
      return ok(res, { deleted: true, id });
    }

    return err(res, 'Método no permitido', 405);

  } catch (e) {
    // Log detallado para Vercel Functions logs
    console.error('[electrical-projects] ERROR:', e.message);
    console.error('[electrical-projects] STACK:', e.stack);
    return err(res, `Error interno: ${e.message}`, 500);
  } finally {
    client.release();
  }
};