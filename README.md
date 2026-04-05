# ⚡ SEST — Cotizador Eléctrico

Sistema web para gestión de cotizaciones eléctricas con autenticación, catálogo de materiales y clientes.

---

## 🏗️ Arquitectura

```
Tu Computador → GitHub (código) → Vercel (web + API) → Neon (base de datos)
```

---

## 📋 PASO A PASO — CONFIGURACIÓN COMPLETA

### PASO 1: Ejecutar el esquema en Neon

1. Ve a [console.neon.tech](https://console.neon.tech)
2. Abre tu proyecto **Cotizador Proyecto**
3. Haz clic en **SQL Editor** (en el menú izquierdo)
4. Copia todo el contenido del archivo `schema.sql` de este proyecto
5. Pégalo en el editor y haz clic en **Run**
6. Deberías ver: "Query returned successfully"

### PASO 2: Subir el proyecto a GitHub

1. Ve a [github.com](https://github.com) y crea una cuenta si no tienes
2. Haz clic en **New repository**
   - Nombre: `cotizador-electrico`
   - Visibilidad: **Private** (recomendado)
   - Haz clic en **Create repository**

3. En tu computador, instala [Git](https://git-scm.com/) si no lo tienes
4. Abre la terminal (CMD o PowerShell en Windows) y ejecuta:

```bash
# Navega a la carpeta del proyecto
cd cotizador-electrico

# Inicializa Git
git init
git add .
git commit -m "Primer commit: cotizador eléctrico"

# Conecta con GitHub (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/cotizador-electrico.git
git branch -M main
git push -u origin main
```

### PASO 3: Obtener la cadena de conexión de Neon

1. En [console.neon.tech](https://console.neon.tech), abre tu proyecto
2. Haz clic en **Dashboard**
3. Busca la sección **Connection string** y haz clic en ella
4. Copia el string que tiene este formato:
   ```
   postgresql://usuario:contraseña@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. **Guárdalo**, lo necesitarás en el siguiente paso

### PASO 4: Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta gratuita
2. Haz clic en **New Project**
3. Conecta con GitHub: **Import Git Repository**
4. Selecciona tu repositorio `cotizador-electrico`
5. En la sección **Environment Variables**, agrega:

   | Nombre | Valor |
   |--------|-------|
   | `DATABASE_URL` | (pega tu cadena de conexión de Neon) |
   | `JWT_SECRET` | (escribe una clave secreta larga, ej: `mi-clave-super-secreta-2024-sest`) |

6. Haz clic en **Deploy**
7. Espera ~1 minuto. Vercel te dará una URL como:
   `https://cotizador-electrico.vercel.app`

### PASO 5: Crear el primer usuario administrador

Abre la URL de tu app y regístrate. El primer usuario será tu administrador.

O bien, puedes insertar un admin desde el SQL Editor de Neon:
```sql
-- Contraseña: Admin1234 (el hash ya está calculado)
INSERT INTO usuarios (nombre, email, password_hash, rol)
VALUES ('Administrador', 'admin@tuempresa.com', 
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK3rKuBBa', 
        'admin');
```

---

## 🚀 Actualizar el código

Cada vez que hagas cambios:
```bash
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push y redespliega automáticamente (tarda ~30 segundos).

---

## 📁 Estructura del proyecto

```
cotizador-electrico/
├── public/
│   ├── index.html        ← Página de login/registro
│   └── dashboard.html    ← App principal (materiales, clientes, cotizaciones)
├── api/
│   ├── _lib/db.js        ← Conexión a base de datos
│   ├── auth/
│   │   ├── login.js      ← POST /api/auth/login
│   │   └── register.js   ← POST /api/auth/register
│   ├── materials/
│   │   └── index.js      ← GET/POST/PUT/DELETE /api/materials/index
│   ├── quotes/
│   │   └── index.js      ← GET/POST/PUT /api/quotes/index
│   └── clients/
│       └── index.js      ← GET/POST/PUT/DELETE /api/clients/index
├── schema.sql            ← Esquema de base de datos
├── package.json
├── vercel.json
└── README.md
```

---

## ✨ Funcionalidades incluidas

- ✅ Registro e inicio de sesión con JWT (tokens seguros)
- ✅ Dashboard con estadísticas
- ✅ Catálogo de materiales con categorías, precios y margen
- ✅ Gestión de clientes (nombre, empresa, RUC, teléfono)
- ✅ Creación de cotizaciones con múltiples ítems
- ✅ Cálculo automático de subtotal, descuentos e IVA
- ✅ Cambio de estado de cotizaciones (borrador → enviada → aprobada...)
- ✅ Materiales de ejemplo precargados
- ✅ Diseño responsive (funciona en celular y computador)

---

## 🆘 Solución de problemas comunes

**"Error al conectar al servidor"**
→ Verifica que `DATABASE_URL` esté bien configurado en Vercel

**"No autorizado"**
→ El token expiró. Cierra sesión y vuelve a ingresar

**Las tablas no aparecen**
→ Asegúrate de haber ejecutado el `schema.sql` en Neon

**Vercel no despliega**
→ Revisa los logs en Vercel Dashboard → tu proyecto → Deployments → click en el último

---

## 📞 Soporte

Proyecto desarrollado para SEST. Para agregar nuevas funciones (PDF de cotizaciones, inventario, reportes), continúa la conversación con Claude.
