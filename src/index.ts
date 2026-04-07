import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pool } from './db'
import { guestRouter } from './routes/guest'

dotenv.config()

const PORT = Number(process.env.PORT) || 4000
const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

/** Diagnóstico: si falla, revisá DATABASE_URL en Render y ejecutá db/schema.sql en esa base */
app.get('/health/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    return res.json({ ok: true, db: 'up' })
  } catch (e) {
    console.error('[health/db]', e)
    return res.status(503).json({
      ok: false,
      db: 'down',
      hint: 'Configurá DATABASE_URL con la Internal URL del Postgres en Render y aplicá backend/db/schema.sql',
    })
  }
})

app.use('/api/guest', guestRouter)

app.get('/', (_req, res) => {
  res.type('text/plain').send('API Guest — use /api/guest/*')
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API en puerto ${PORT}`)
})
