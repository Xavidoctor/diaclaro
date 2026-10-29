# DíaClaro

Tu centro de organización personal: captura rápida, plan del día realista, áreas y proyectos, y rutinas. Web instalable en el móvil.

- Propuesta y plan: [DíaClaro v2](https://claude.ai/artifact/2zyaRKY9L5brpHoRtUDRtp)
- Etapa actual: **0, preparación** (proyecto, login y publicación).

## Tecnología

| Pieza | Para qué |
| --- | --- |
| [Next.js](https://nextjs.org) + TypeScript | Pantallas y funciones de servidor en un solo proyecto |
| Tailwind CSS | Estilos |
| [Supabase](https://supabase.com) | Base de datos Postgres y login |
| [Vercel](https://vercel.com) | Publicación de la web |
| Vitest | Pruebas automáticas |

## Cómo está organizado

```
app/                 Pantallas (cada carpeta es una dirección: app/login → /login)
  page.tsx           Pantalla Hoy (de momento, un saludo)
  login/             Acceso con enlace por email
  auth/confirm/      Adonde vuelve el enlace del email: abre la sesión
  manifest.ts        Datos para instalarla como app (PWA)
lib/                 Lógica que no es pantalla
  supabase/          Conexión con Supabase (servidor y proxy)
  auth/validacion.ts Comprobaciones del formulario de acceso, con pruebas
  saludo.ts          Saludo según la hora, con pruebas
proxy.ts             Se ejecuta antes de cada petición: renueva la sesión y protege las páginas
```

Regla del proyecto: los cálculos (horarios, planificación) viven en `lib/` como funciones puras con pruebas; las pantallas solo muestran y recogen datos.

## Ponerlo en marcha en tu ordenador

Necesitas [Node.js](https://nodejs.org) 22 o superior.

```bash
npm install
cp .env.example .env.local   # y rellena los dos valores de Supabase
npm run dev                  # abre http://localhost:3000
```

Otras órdenes útiles:

```bash
npm test          # pruebas automáticas
npm run lint      # revisa el estilo del código
npm run typecheck # revisa los tipos de TypeScript
npm run build     # compila como en producción
```

## Configurar Supabase (una vez)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com) (región en Europa).
2. En **Project Settings → API Keys**, copia la URL del proyecto y la *publishable key* en `.env.local` y en Vercel.
3. Las plantillas de email se quedan como vienen: el email trae un enlace para entrar. (Para editarlas, Supabase pide un servidor de correo propio; no hace falta.)
4. En **Authentication → URL Configuration**:
   - *Site URL*: la dirección de Vercel, por ejemplo `https://diaclaro.vercel.app`.
   - *Redirect URLs*: añade `https://diaclaro.vercel.app/auth/confirm` (con tu dirección real) y, para probar en tu ordenador, `http://localhost:3000/auth/confirm`.
5. Cuando hayas entrado por primera vez, en **Authentication → Sign In / Providers** desactiva **Allow new users to sign up**. Así nadie más puede crearse una cuenta.

## Publicar en Vercel (una vez)

1. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub (plan Hobby, gratuito).
2. **Add New → Project** e importa este repositorio.
3. En **Environment Variables**, añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**. A partir de ahí, cada cambio en `main` se publica solo.

## Seguridad

- Las claves nunca se suben al repositorio (`.env.local` está en `.gitignore`).
- La *publishable key* es pública por diseño; los datos se protegen con reglas RLS en cada tabla (desde la etapa 1).
- Abre el enlace del email en el mismo navegador donde lo pediste (en Android, la app instalada comparte sesión con Chrome).
- Activa la verificación en dos pasos en GitHub, Supabase, Vercel y tu email.
