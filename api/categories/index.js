import { getDb } from '../_lib/db.js';
import jwt from 'jsonwebtoken';

function getUser(req) {
  try { return jwt.verify((req.headers['authorization']||'').replace('Bearer ',''), process.env.JWT_SECRET||'secreto-dev'); }
  catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if (req.method==='OPTIONS') return res.status(204).end();
  const user = getUser(req);
  if (!user) return res.status(401).json({error:'No autorizado'});
  const sql = getDb();
  try {
    if (req.method==='GET') {
      const rows = await sql`SELECT * FROM categorias ORDER BY nombre ASC`;
      return res.status(200).json(rows);
    }
    if (req.method==='POST') {
      if (user.rol !== 'admin') return res.status(403).json({error:'Solo administradores pueden crear categorías'});
      const {nombre, descripcion=''} = req.body;
      if (!nombre) return res.status(400).json({error:'El nombre es requerido'});
      const exists = await sql`SELECT id FROM categorias WHERE nombre=${nombre.trim()}`;
      if (exists.length) return res.status(400).json({error:'Ya existe una categoría con ese nombre'});
      const r = await sql`INSERT INTO categorias(nombre, descripcion) VALUES(${nombre.trim()}, ${descripcion}) RETURNING *`;
      return res.status(201).json(r[0]);
    }
    return res.status(405).json({error:'Método no permitido'});
  } catch(err) { console.error(err); return res.status(500).json({error:err.message}); }
}
