import { getDb } from '../_lib/db.js';
import jwt from 'jsonwebtoken';

function getUser(req) {
  try {
    return jwt.verify(
      (req.headers['authorization'] || '').replace('Bearer ', ''),
      process.env.JWT_SECRET || 'secreto-dev'
    );
  } catch { return null; }
}

async function ensureTable(sql) {
  await sql`
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
  `;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const sql = getDb();
  const { id } = req.query;

  try {
    await ensureTable(sql);

    // GET: listar proyectos del usuario
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, user_id, nombre, cliente, ubicacion,
               tipo, temp_f, sistema, cargas,
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM electrical_projects
        WHERE user_id = ${user.id}
        ORDER BY updated_at DESC
      `;
      return res.status(200).json(rows);
    }

    // POST: crear proyecto
    if (req.method === 'POST') {
      const { nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas } = req.body;
      if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

      const rows = await sql`
        INSERT INTO electrical_projects
          (user_id, nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas)
        VALUES (
          ${user.id},
          ${nombre.trim()},
          ${cliente?.trim() || null},
          ${ubicacion?.trim() || null},
          ${tipo || 'residencial'},
          ${temp_f || '1.0'},
          ${sistema || '120'},
          ${JSON.stringify(cargas || [])}
        )
        RETURNING
          id, user_id, nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas,
          created_at AS "createdAt", updated_at AS "updatedAt"
      `;
      return res.status(200).json(rows[0]);
    }

    // PUT: actualizar proyecto
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const { nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas } = req.body;
      if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

      const check = await sql`
        SELECT id FROM electrical_projects WHERE id=${parseInt(id)} AND user_id=${user.id}
      `;
      if (!check.length) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const rows = await sql`
        UPDATE electrical_projects SET
          nombre    = ${nombre.trim()},
          cliente   = ${cliente?.trim() || null},
          ubicacion = ${ubicacion?.trim() || null},
          tipo      = ${tipo || 'residencial'},
          temp_f    = ${temp_f || '1.0'},
          sistema   = ${sistema || '120'},
          cargas    = ${JSON.stringify(cargas || [])},
          updated_at = NOW()
        WHERE id = ${parseInt(id)} AND user_id = ${user.id}
        RETURNING
          id, user_id, nombre, cliente, ubicacion, tipo, temp_f, sistema, cargas,
          created_at AS "createdAt", updated_at AS "updatedAt"
      `;
      return res.status(200).json(rows[0]);
    }

    // DELETE: eliminar proyecto
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const check = await sql`
        SELECT id FROM electrical_projects WHERE id=${parseInt(id)} AND user_id=${user.id}
      `;
      if (!check.length) return res.status(404).json({ error: 'Proyecto no encontrado' });

      await sql`DELETE FROM electrical_projects WHERE id=${parseInt(id)} AND user_id=${user.id}`;
      return res.status(200).json({ deleted: true, id });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (e) {
    console.error('[electrical-projects] ERROR:', e.message);
    return res.status(500).json({ error: `Error interno: ${e.message}` });
  }
}