export async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!sid || !token || !from) {
    console.warn('[WhatsApp] Twilio env vars not configured. Message not sent.')
    return false
  }

  const twilio = await import('twilio')
  const client = twilio.default(sid, token)

  try {
    await client.messages.create({
      from,
      to: `whatsapp:${to}`,
      body,
    })
    return true
  } catch (err) {
    console.error('[WhatsApp] Failed to send message:', err)
    return false
  }
}
