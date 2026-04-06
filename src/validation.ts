const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validatePreCheckin(body: unknown): {
  ok: true
  data: {
    propertyId: string
    deviceId: string
    name: string
    email: string
    whatsapp: string
    privacyAccepted: boolean
  }
} | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Cuerpo inválido' }
  }
  const o = body as Record<string, unknown>
  const propertyId = typeof o.propertyId === 'string' ? o.propertyId.trim() : ''
  const deviceId = typeof o.deviceId === 'string' ? o.deviceId.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const email = typeof o.email === 'string' ? o.email.trim().toLowerCase() : ''
  const whatsapp = typeof o.whatsapp === 'string' ? o.whatsapp.trim() : ''
  const privacyAccepted = o.privacyAccepted === true

  if (!propertyId) return { ok: false, error: 'Propiedad requerida' }
  if (!deviceId) return { ok: false, error: 'Dispositivo requerido' }
  if (name.length < 2) return { ok: false, error: 'Nombre inválido' }
  if (!emailRe.test(email)) return { ok: false, error: 'Email inválido' }
  if (whatsapp.replace(/\D/g, '').length < 8) {
    return { ok: false, error: 'WhatsApp inválido' }
  }
  if (!privacyAccepted) {
    return { ok: false, error: 'Debes aceptar la política de privacidad' }
  }

  return {
    ok: true,
    data: { propertyId, deviceId, name, email, whatsapp, privacyAccepted },
  }
}
