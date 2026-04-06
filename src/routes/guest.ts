import { Router } from 'express'
import crypto from 'crypto'
import { pool } from '../db'
import { validatePreCheckin } from '../validation'

export const guestRouter = Router()

const sessionDays = () =>
  Math.max(1, Number(process.env.SESSION_DAYS) || 30)

function sessionExpiry(): Date {
  const d = new Date()
  d.setDate(d.getDate() + sessionDays())
  return d
}

/** GET /api/guest/bootstrap — datos de propiedad, banner opcional, sesión válida */
guestRouter.get('/bootstrap', async (req, res) => {
  const propertyId = String(req.query.propertyId ?? '').trim()
  const deviceId = String(req.query.deviceId ?? '').trim()
  const sessionToken = String(req.query.sessionToken ?? '').trim()

  if (!propertyId || !deviceId) {
    return res.status(400).json({
      ok: false,
      error: 'propertyId y deviceId son obligatorios',
    })
  }

  try {
    const prop = await pool.query(
      `SELECT id, name, location_summary, city, cover_image_url, logo_url
       FROM properties WHERE id = $1`,
      [propertyId],
    )
    if (prop.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Propiedad no encontrada' })
    }
    const p = prop.rows[0] as {
      id: string
      name: string
      location_summary: string
      city: string
      cover_image_url: string
      logo_url: string
    }

    const bannerRes = await pool.query(
      `SELECT image_url, link_url
       FROM city_banners
       WHERE active = true AND lower(city) = lower($1)
       ORDER BY sort_order ASC, created_at ASC
       LIMIT 1`,
      [p.city],
    )
    const banner =
      bannerRes.rowCount && bannerRes.rows[0]
        ? {
            imageUrl: bannerRes.rows[0].image_url as string,
            linkUrl: (bannerRes.rows[0].link_url as string | null) ?? null,
          }
        : null

    let preCheckinCompleted = false
    if (sessionToken) {
      const sess = await pool.query(
        `SELECT 1 FROM guest_sessions
         WHERE session_token = $1 AND property_id = $2 AND device_id = $3
           AND expires_at > now()`,
        [sessionToken, propertyId, deviceId],
      )
      preCheckinCompleted = (sess.rowCount ?? 0) > 0
    }

    return res.json({
      ok: true,
      property: {
        id: p.id,
        name: p.name,
        locationSummary: p.location_summary,
        city: p.city,
        coverImageUrl: p.cover_image_url,
        logoUrl: p.logo_url,
      },
      banner,
      preCheckinCompleted,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ ok: false, error: 'Error del servidor' })
  }
})

/** POST /api/guest/pre-checkin — lead + guest_session + token */
guestRouter.post('/pre-checkin', async (req, res) => {
  const parsed = validatePreCheckin(req.body)
  if (!parsed.ok) {
    return res.status(400).json({ ok: false, error: parsed.error })
  }
  const { propertyId, deviceId, name, email, whatsapp, privacyAccepted } =
    parsed.data

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const exists = await client.query(
      `SELECT id FROM properties WHERE id = $1`,
      [propertyId],
    )
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, error: 'Propiedad no encontrada' })
    }

    const lead = await client.query(
      `INSERT INTO leads (property_id, device_id, full_name, email, whatsapp, privacy_accepted)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (property_id, device_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         whatsapp = EXCLUDED.whatsapp,
         privacy_accepted = EXCLUDED.privacy_accepted
       RETURNING id`,
      [propertyId, deviceId, name, email, whatsapp, privacyAccepted],
    )
    const leadId = lead.rows[0].id as string

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = sessionExpiry()

    await client.query(
      `INSERT INTO guest_sessions (lead_id, property_id, device_id, session_token, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (property_id, device_id) DO UPDATE SET
         lead_id = EXCLUDED.lead_id,
         session_token = EXCLUDED.session_token,
         expires_at = EXCLUDED.expires_at`,
      [leadId, propertyId, deviceId, token, expiresAt],
    )

    await client.query('COMMIT')

    return res.status(201).json({
      ok: true,
      sessionToken: token,
      leadId,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (e) {
    await client.query('ROLLBACK')
    console.error(e)
    return res.status(500).json({ ok: false, error: 'Error al guardar el registro' })
  } finally {
    client.release()
  }
})
