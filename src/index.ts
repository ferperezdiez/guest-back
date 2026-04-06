import express from 'express'
import cors from 'cors'

const PORT = Number(process.env.PORT) || 4000

const allowed = new Set(
  (process.env.ALLOWED_BARCODES ??
    'DEMO123,PREMIUM-001,9876543210,GUEST-PREMIUM')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

const app = express()
app.use(cors({ origin: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/validate', (req, res) => {
  const raw = req.body?.barcode
  const barcode =
    typeof raw === 'string' ? raw.trim() : raw != null ? String(raw).trim() : ''

  if (!barcode) {
    return res.status(400).json({ ok: false, error: 'Código requerido' })
  }

  if (!allowed.has(barcode)) {
    return res.status(403).json({ ok: false, error: 'Código no reconocido' })
  }

  return res.json({
    ok: true,
    barcode,
    guestName: process.env.GUEST_NAME ?? 'Invitado Premium',
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API escuchando en puerto ${PORT}`)
})
