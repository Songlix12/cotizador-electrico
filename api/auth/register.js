import { getDb } from '../_lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if (req.method==='OPTIONS') return res.status(204).end();
  if (req.method!=='POST') return res.status(405).json({error:'Método no permitido'});
  try {
    const {nombre,email,password,rol='vendedor'} = req.body;
    if (!nombre||!email||!password) return res.status(400).json({error:'Todos los campos son requeridos'});
    if (password.length<6) return res.status(400).json({error:'Contraseña mínimo 6 caracteres'});
    const sql = getDb();
    const emailLow = email.toLowerCase();
    const exists = await sql`SELECT id FROM usuarios WHERE email=${emailLow}`;
    if (exists.length) return res.status(400).json({error:'El email ya está registrado'});
    const hash = await bcrypt.hash(password,12);
    const result = await sql`INSERT INTO usuarios(nombre,email,password_hash,rol) VALUES(${nombre},${emailLow},${hash},${rol}) RETURNING id,nombre,email,rol`;
    const user = result[0];
    const token = jwt.sign({id:user.id,email:user.email,nombre:user.nombre,rol:user.rol},process.env.JWT_SECRET||'secreto-dev',{expiresIn:'8h'});
    return res.status(201).json({token,usuario:user});
  } catch(err) { console.error(err); return res.status(500).json({error:'Error interno'}); }
}