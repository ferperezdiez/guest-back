import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { guestRouter } from './routes/guest'

dotenv.config()

const PORT = Number(process.env.PORT) || 4000
const app = express()

app.use(cors({ origin: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/guest', guestRouter)

app.get('/', (_req, res) => {
  res.type('text/plain').send('API Guest — use /api/guest/*')
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API en puerto ${PORT}`)
})
