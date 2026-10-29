@AGENTS.md

# DíaClaro: normas del proyecto

- Xavi está aprendiendo. Escribe en español sencillo: comentarios del código, textos de la interfaz, commits y pull requests.
- Una etapa por pull request, con explicación de cada parte y cómo probarla. Plan completo: https://claude.ai/artifact/2zyaRKY9L5brpHoRtUDRtp
- Separación de capas: `app/` solo pantallas; `lib/planner/` lógica pura con pruebas (sin base de datos ni IA); `lib/data/` única capa que toca Supabase; `lib/ai/` (desde la etapa 7) solo propone, nunca guarda.
- Nunca inventes horarios, fechas ni duraciones de Xavi: la app los pide o los deja vacíos.
- Toda tabla nueva lleva `user_id` y reglas RLS, en una migración dentro de `supabase/migrations/`.
- Solo planes gratuitos (Vercel Hobby, Supabase Free). Nada de servicios de pago sin preguntar.
- Antes de subir: `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`.
