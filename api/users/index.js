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
  if (user.rol !== 'admin') return res.status(403).json({error:'Solo administradores pueden gestionar usuarios'});
  const sql = getDb();
  const {id} = req.query;
  try {
    if (req.method==='GET') {
      // Ensure permisos column exists (safe migration)
      try {
        await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos VARCHAR(20) DEFAULT 'vendedor'`;
      } catch(e) {}
      const rows = await sql`SELECT id, nombre, email, rol, permisos, activo, creado_en FROM usuarios ORDER BY creado_en ASC`;
      return res.status(200).json(rows);
    }
    if (req.method==='PUT') {
      if (!id) return res.status(400).json({error:'ID requerido'});
      if (parseInt(id) === user.id) return res.status(400).json({error:'No puedes modificar tu propio rol'});
      const {rol, permisos} = req.body;

      // Handle permisos update (give/revoke admin-level access to a vendor)
      if (permisos !== undefined) {
        const validPermisos = ['admin','vendedor'];
        if (!validPermisos.includes(permisos)) return res.status(400).json({error:'Permiso inválido'});
        try {
          await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos VARCHAR(20) DEFAULT 'vendedor'`;
        } catch(e) {}
        const r = await sql`UPDATE usuarios SET permisos=${permisos} WHERE id=${parseInt(id)} RETURNING id, nombre, email, rol, permisos, activo`;
        if (!r.length) return res.status(404).json({error:'Usuario no encontrado'});
        return res.status(200).json(r[0]);
      }

      // Handle rol update
      if (!['admin','vendedor'].includes(rol)) return res.status(400).json({error:'Rol inválido'});
      const r = await sql`UPDATE usuarios SET rol=${rol} WHERE id=${parseInt(id)} RETURNING id, nombre, email, rol, activo`;
      if (!r.length) return res.status(404).json({error:'Usuario no encontrado'});
      return res.status(200).json(r[0]);
    }
    return res.status(405).json({error:'Método no permitido'});
  } catch(err) { console.error(err); return res.status(500).json({error:err.message}); }
}