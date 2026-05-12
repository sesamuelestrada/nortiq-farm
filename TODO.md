# TODO — Synopsis Farm PoC

## ✅ Completado

- Supabase configurado (schema + seed data en español)
- Usuario de prueba creado — usar "Create new user" directo en Dashboard (evitar "Invite user" — rate limit de emails)
- ANTHROPIC_API_KEY + OPENAI_API_KEY configuradas → voice input activo
- Voice input: Whisper transcribe → Claude extrae campos → form se llena automáticamente
- Fechas relativas ("en tres meses") convertidas a fecha absoluta correctamente
- Bugs de UI corregidos (badges, filtros, reset de contraseña)
- App corriendo en http://localhost:3000

---

## WOW Moment #1: WhatsApp Real (no implementado — estimado 4-6 hrs)

Para activarlo después del PoC:

1. Crear cuenta en Twilio → activar WhatsApp Sandbox
   - https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Agregar variables:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
3. Implementar `src/app/api/webhooks/twilio/route.ts`:
   ```typescript
   export async function POST(req) {
     const body = await req.text()
     // Parsear mensaje Twilio (URLSearchParams)
     // Si contiene "LISTO" → actualizar status de activo
     // Supabase Realtime dispara → dashboard actualiza en vivo
     // Responder con TwiML
   }
   ```
4. Exponer con ngrok para desarrollo: `ngrok http 3000`
5. Configurar webhook en Twilio con tu URL ngrok + `/api/webhooks/twilio`

---

## Deploy (para demo con cliente en móvil)

**Opción A — Vercel (recomendado para demo):**
```bash
npx vercel
# Agregar las env vars en Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# ANTHROPIC_API_KEY
# OPENAI_API_KEY
```
Agregar la URL de Vercel en Supabase → Authentication → URL Configuration → Redirect URLs.

**Opción B — Railway (si se agrega BullMQ):**
- Conectar repo a Railway
- Agregar Redis service
- Agregar las env vars
