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
    const {email,password} = req.body;
    if (!email||!password) return res.status(400).json({error:'Email y contraseña requeridos'});
    const sql = getDb();
    const users = await sql`SELECT id,nombre,email,password_hash,rol FROM usuarios WHERE email=${email.toLowerCase()} AND activo=true`;
    if (!users.length) return res.status(401).json({error:'Credenciales incorrectas'});
    const user = users[0];
    if (!await bcrypt.compare(password,user.password_hash)) return res.status(401).json({error:'Credenciales incorrectas'});
    const token = jwt.sign({id:user.id,email:user.email,nombre:user.nombre,rol:user.rol},process.env.JWT_SECRET||'secreto-dev',{expiresIn:'8h'});
    return res.status(200).json({token,usuario:{id:user.id,nombre:user.nombre,email:user.email,rol:user.rol}});
  } catch(err) { console.error(err); return res.status(500).json({error:'Error interno'}); }
}