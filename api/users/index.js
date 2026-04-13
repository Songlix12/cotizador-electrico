import { getDb } from '../_lib/db.js';
import jwt from 'jsonwebtoken';

function getUser(req) {
  try { return jwt.verify((req.headers['authorization']||'').replace('Bearer ',''), process.env.JWT_SECRET||'secreto-dev'); }
  catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if (req.method==='OPTIONS') return res.status(204).end();
  const user = getUser(req);
  if (!user) return res.status(401).json({error:'No autorizado'});

  const sql = getDb();

  // Asegurar columnas necesarias
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos VARCHAR(20) DEFAULT 'vendedor'`; } catch(e) {}
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS compartir_datos BOOLEAN DEFAULT false`; } catch(e) {}
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS compartir_cotizaciones BOOLEAN DEFAULT false`; } catch(e) {}
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS compartir_clientes BOOLEAN DEFAULT false`; } catch(e) {}
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS compartir_con JSONB DEFAULT '[]'`; } catch(e) {}

  const dbUser = await sql`SELECT rol, permisos FROM usuarios WHERE id=${user.id} AND activo=true`;
  if (!dbUser.length) return res.status(401).json({error:'Usuario no encontrado'});

  const isPrincipalAdmin = dbUser[0].rol === 'admin';

  const { id, todos } = req.query;
  try {
    if (req.method==='GET') {
      // todos=1: lista básica del equipo accesible para todos (para selector de compartir)
      if (todos === '1') {
        const rows = await sql`
          SELECT id, nombre, email, rol, permisos,
                 compartir_datos, compartir_cotizaciones, compartir_clientes,
                 compartir_con, activo
          FROM usuarios WHERE activo=true ORDER BY nombre ASC`;
        return res.status(200).json(rows);
      }
      // Lista completa solo para admin
      if (!isPrincipalAdmin) return res.status(403).json({error:'Solo el administrador principal puede gestionar usuarios'});
      const rows = await sql`
        SELECT id, nombre, email, rol, permisos,
               compartir_datos, compartir_cotizaciones, compartir_clientes,
               compartir_con, activo, creado_en
        FROM usuarios ORDER BY creado_en ASC`;
      return res.status(200).json(rows);
    }

    if (req.method==='PUT') {
      if (!id) return res.status(400).json({error:'ID requerido'});
      const targetId = parseInt(id);
      const { rol, permisos, compartir_datos, compartir_cotizaciones, compartir_clientes, compartir_con } = req.body;

      // Cualquier usuario puede actualizar sus PROPIAS preferencias de compartir
      if (targetId === user.id && (compartir_datos !== undefined || compartir_cotizaciones !== undefined || compartir_clientes !== undefined || compartir_con !== undefined)) {
        const newCots = compartir_cotizaciones !== undefined ? !!compartir_cotizaciones : undefined;
        const newClis = compartir_clientes !== undefined ? !!compartir_clientes : undefined;
        const newLegacy = compartir_datos !== undefined ? !!compartir_datos : (newCots !== undefined || newClis !== undefined ? (newCots || newClis) : undefined);
        const newCon = compartir_con !== undefined ? JSON.stringify(Array.isArray(compartir_con) ? compartir_con : []) : undefined;

        const r = await sql`
          UPDATE usuarios SET
            compartir_datos        = COALESCE(${newLegacy ?? null}, compartir_datos),
            compartir_cotizaciones = COALESCE(${newCots ?? null}, compartir_cotizaciones),
            compartir_clientes     = COALESCE(${newClis ?? null}, compartir_clientes),
            compartir_con          = COALESCE(${newCon !== undefined ? newCon : null}::jsonb, compartir_con)
          WHERE id=${targetId}
          RETURNING id, nombre, email, rol, permisos,
                    compartir_datos, compartir_cotizaciones, compartir_clientes, compartir_con, activo`;
        if (!r.length) return res.status(404).json({error:'Usuario no encontrado'});
        return res.status(200).json(r[0]);
      }

      // Cambiar rol/permisos: solo admin principal
      if (!isPrincipalAdmin) return res.status(403).json({error:'Solo el administrador principal puede cambiar roles y permisos'});
      if (targetId === user.id) return res.status(400).json({error:'No puedes modificar tu propio rol/permiso'});

      if (permisos !== undefined) {
        if (!['admin','vendedor'].includes(permisos)) return res.status(400).json({error:'Permiso inválido'});
        const r = await sql`UPDATE usuarios SET permisos=${permisos} WHERE id=${targetId} RETURNING id, nombre, email, rol, permisos, compartir_datos, activo`;
        if (!r.length) return res.status(404).json({error:'Usuario no encontrado'});
        return res.status(200).json(r[0]);
      }
      if (rol !== undefined) {
        if (!['admin','vendedor'].includes(rol)) return res.status(400).json({error:'Rol inválido'});
        const r = await sql`UPDATE usuarios SET rol=${rol} WHERE id=${targetId} RETURNING id, nombre, email, rol, permisos, compartir_datos, activo`;
        if (!r.length) return res.status(404).json({error:'Usuario no encontrado'});
        return res.status(200).json(r[0]);
      }
      return res.status(400).json({error:'Nada que actualizar'});
    }
    return res.status(405).json({error:'Método no permitido'});
  } catch(err) { console.error(err); return res.status(500).json({error:err.message}); }
}