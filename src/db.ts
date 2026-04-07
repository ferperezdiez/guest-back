import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const conn = process.env.DATABASE_URL

if (!conn) {
  console.error('[db] DATABASE_URL no está definida: las rutas /api/guest/* fallarán.')
} else if (/localhost|127\.0\.0\.1/.test(conn)) {
  console.warn(
    '[db] DATABASE_URL apunta a localhost. En Render debe ser la URL del Postgres del dashboard (no tu PC).',
  )
}

/** Render Postgres suele requerir SSL; la URL del dashboard ya trae sslmode=require */
export const pool = new Pool({
  connectionString: conn,
  ssl: conn?.includes('render.com') ? { rejectUnauthorized: false } : undefined,
})
