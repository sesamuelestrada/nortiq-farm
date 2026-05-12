# STATUS.md — Synopsis Farm PoC
> Formato standup: hecho / en progreso / bloqueadores. Más reciente arriba.

---

## 2026-05-08 — Claude Code (Sesión inicial)

**Hecho:**
- Scaffold SaaS Factory V4 tomado como base
- Dependencias instaladas: ai, @anthropic-ai/sdk, openai, qrcode, jsqr, @tanstack/react-query, zustand, date-fns, zod
- Componentes shadcn/ui instalados
- SQL migrations creadas en supabase/migrations/
- Seed data en español (12 activos, 4 logs, 3 alertas, 2 telemetrías)
- Estructura de docs/ creada
- Implementando features completas con bucle-agentico

**En progreso:**
- Auth + Layout → Assets → Maintenance → Voice+AI → Dashboard+Realtime

**Bloqueadores:**
- Supabase: usuario necesita crear proyecto y aplicar migrations (instrucciones en TODO.md)
- API Keys: ANTHROPIC_API_KEY y OPENAI_API_KEY necesarias para voice feature
