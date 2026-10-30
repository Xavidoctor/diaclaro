# DíaClaro

Tu centro de organización personal: captura rápida, plan del día realista, áreas y proyectos, y rutinas. Web instalable en el móvil.

- Propuesta y plan: [DíaClaro v2](https://claude.ai/artifact/2zyaRKY9L5brpHoRtUDRtp)
- Etapa actual: **1, captura rápida y Bandeja** (notas y tareas).

## Tecnología

| Pieza | Para qué |
| --- | --- |
| [Next.js](https://nextjs.org) + TypeScript | Pantallas y funciones de servidor en un solo proyecto |
| Tailwind CSS | Estilos |
| [Supabase](https://supabase.com) | Base de datos Postgres y login |
| [Vercel](https://vercel.com) | Publicación de la web |
| Vitest | Pruebas automáticas |
| [rrule](https://github.com/jkbrzt/rrule) (BSD-3) | Calcula los días de los eventos que se repiten, con el formato estándar de los calendarios |
| [date-fns](https://date-fns.org) (MIT) | Sumar días y escribir fechas en español |
| Zod | Comprobar los datos que llegan de los formularios |
| [shadcn/ui](https://ui.shadcn.com) | Componentes ya hechos (se copian a `components/ui/` y son nuestros) |

## Cómo está organizado

```
app/                 Pantallas (cada carpeta es una dirección: app/login → /login)
  page.tsx           Pantalla Hoy (captura, agenda de hoy y rutinas)
  bandeja/           Bandeja: pestañas Notas y Tareas, archivo y papelera
  agenda/            Agenda: compromisos de los próximos 14 días, con repeticiones y cambios de un día
  ajustes/           Ajustes: horas habituales, zona horaria y rutinas
  areas/             Áreas: tus grandes temas, con sus proyectos y asignaturas y las horas de cada semana
  componentes/       Piezas que usan varias pantallas (captura, menú de abajo)
  login/             Acceso con enlace por email
  auth/confirm/      Adonde vuelve el enlace del email: abre la sesión
  manifest.ts        Datos para instalarla como app (PWA)
lib/                 Lógica que no es pantalla
  supabase/          Conexión con Supabase (servidor y proxy)
  planner/           Reglas puras (sin base de datos), con pruebas
  data/              Única parte que lee y guarda en Supabase
components/ui/       Componentes de shadcn/ui (se añaden con `npx shadcn@latest add <nombre>`)
  auth/validacion.ts Comprobaciones del formulario de acceso, con pruebas
  saludo.ts          Saludo según la hora, con pruebas
supabase/migrations/ Cambios de la base de datos, en archivos SQL numerados por fecha
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
3. El correo de acceso sale por **SMTP de Gmail** (gratis), así no hay límite de pocos emails por hora y las plantillas se pueden editar:
   - En la cuenta de Google que envía los correos, activa la verificación en dos pasos y crea una **contraseña de aplicación**.
   - En **Authentication → Emails → SMTP Settings**, activa *Custom SMTP* con host `smtp.gmail.com`, puerto `465`, tu dirección de Gmail como usuario y la contraseña de aplicación (nunca la contraseña normal).
   - En **Authentication → Emails → Templates**, las plantillas están traducidas al español. El enlace sigue siendo el de siempre: el email trae un enlace para entrar.
4. En **Authentication → URL Configuration**:
   - *Site URL*: la dirección de Vercel, por ejemplo `https://diaclaro.vercel.app`.
   - *Redirect URLs*: añade `https://diaclaro.vercel.app/auth/confirm` (con tu dirección real) y, para probar en tu ordenador, `http://localhost:3000/auth/confirm`.
5. El registro está **abierto** (**Authentication → Sign In / Providers → Allow new users to sign up** activado), para que tus amigos puedan crearse una cuenta con su email. Cada persona solo ve sus propios datos gracias a las reglas RLS de cada tabla. Si algún día quieres cerrarlo, desactiva esa opción.

## Aplicar los cambios de la base de datos (migraciones)

Cada archivo de `supabase/migrations/` crea o cambia tablas. Se aplican **una vez, en orden de fecha** (el nombre empieza por la fecha):

1. Abre tu proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Copia todo el contenido del archivo de migración, pégalo y pulsa **Run**.
3. Comprueba en **Table Editor** que aparecen las tablas nuevas, y que cada una muestra el aviso de RLS activado.

| Archivo | Qué crea |
| --- | --- |
| `20261030000000_bandeja_notas_y_tareas.sql` | Tablas `notes` y `tasks`, con sus reglas RLS y la búsqueda en español |
| `20261030010000_bandeja_tipos_y_etiquetas.sql` | Tipo de nota y etiquetas en `notes` |
| `20261030020000_agenda_eventos.sql` | Tablas `events` (compromisos, que pueden repetirse) y `event_exceptions` (cambios de un solo día), con sus reglas RLS |
| `20261030030000_ajustes_y_rutinas.sql` | Tablas `settings` (tus ajustes), `routines` (rutinas) y `routine_logs` (cada vez que marcas una como hecha), con sus reglas RLS |
| `20261030040000_areas_y_proyectos.sql` | Tablas `areas` (con sus horas a la semana y si son tiempo personal) y `projects` (proyectos y asignaturas de cada área), con sus reglas RLS |
| `20261030050000_tareas_en_proyectos.sql` | Columna `project_id` en `tasks`: cada tarea puede ir en un proyecto o asignatura (opcional) |
| `20261030090000_temporizador_foco.sql` | Tabla `focus_sessions` (cada rato del temporizador de foco), con sus reglas RLS |
| `20261030100000_cierre_del_dia.sql` | Tabla `day_reviews` (tu cierre de cada día), con sus reglas RLS |
| `20261030110000_empiezo_el_dia.sql` | Tabla `day_starts` (a qué hora empiezas cada día), con sus reglas RLS |
| `20261030120000_dias_dificiles.sql` | Tabla `hard_days` (tus días difíciles y lo que conservaste), con sus reglas RLS |
| `20261030140000_candidaturas_empleo.sql` | Tabla `job_applications` (tus candidaturas de empleo: empresa, puesto, estado y seguimiento), con sus reglas RLS |
| `20261030150000_historial_candidaturas.sql` | Tabla `job_application_events` (el historial de cada candidatura: cambios de estado, seguimientos y notas), con sus reglas RLS |
| `20261030160000_candidaturas_en_areas.sql` | Columna `area_id` en `job_applications` (el área donde cuenta su tiempo) y `minutes` en `job_application_events` (minutos dedicados) |
| `20261030170000_google_calendar.sql` | Tabla `google_connections` (el permiso de Google de cada persona, cifrado, para leer su Google Calendar), con sus reglas RLS |
| `20261030200000_habitos.sql` | Tablas `habits` (tus hábitos, todos opcionales) y `habit_logs` (cada vez que apuntas algo), con sus reglas RLS |
| `20261030210000_despierto_y_levantado.sql` | Columna `awake_time` en `day_starts` (a qué hora pulsaste «Despierto»); la hora de levantarte puede quedar vacía hasta que pulses «Levantado» |

## Publicar en Vercel (una vez)

1. Entra en [vercel.com](https://vercel.com) con tu cuenta de GitHub (plan Hobby, gratuito).
2. **Add New → Project** e importa este repositorio.
3. En **Environment Variables**, añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**. A partir de ahí, cada cambio en `main` se publica solo.

## Conectar Google Calendar (opcional, una vez)

Con esto, cada persona puede pulsar **Ajustes → Conectar con Google** y ver sus eventos de Google Calendar en la Agenda. DíaClaro **solo lee**: nunca crea, cambia ni borra nada en Google. Todo es gratis.

1. Entra en [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google y crea un proyecto nuevo llamado `DiaClaro`.
2. En el buscador de arriba escribe **Google Calendar API**, ábrela y pulsa **Habilitar**.
3. Ve a **Google Auth Platform** (o **Pantalla de consentimiento de OAuth**) → **Comenzar**. Nombre de la app: `DíaClaro`; correo de asistencia: el tuyo; público: **Externo**; correo de contacto: el tuyo. Acepta y pulsa **Crear**.
4. En **Acceso a datos** → **Añadir o quitar permisos**, marca `.../auth/calendar.readonly` (ver tus calendarios), `openid` y `.../auth/userinfo.email`. Guarda.
5. En **Clientes** → **Crear cliente**: tipo **Aplicación web**, nombre `DíaClaro web`. En **URIs de redirección autorizados** añade `https://diaclaro.vercel.app/api/google/vuelta`. Pulsa **Crear**.
6. Te enseña el **ID de cliente** y el **Secreto del cliente**. No hagas captura del secreto. Cópialos directamente a Vercel → **Settings → Environment Variables** como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (entorno Production) y vuelve a desplegar.
7. En **Público**, pulsa **Publicar app** para pasarla a **En producción**. Si se queda en «Prueba», Google corta el permiso cada 7 días.
8. Al conectar, Google enseña «Google no ha verificado esta aplicación» porque no hemos pasado su revisión. Es normal en una app personal: pulsa **Configuración avanzada → Ir a DíaClaro**. Sin esa revisión pueden conectarse hasta 100 personas.

Si algún día cambias el secreto del cliente, cada persona tendrá que volver a pulsar **Conectar con Google**.

## Seguridad

- Las claves nunca se suben al repositorio (`.env.local` está en `.gitignore`).
- La *publishable key* es pública por diseño; los datos se protegen con reglas RLS en cada tabla (desde la etapa 1).
- Abre el enlace del email en el mismo navegador donde lo pediste (en Android, la app instalada comparte sesión con Chrome).
- Activa la verificación en dos pasos en GitHub, Supabase, Vercel y tu email.
- **Copia de seguridad:** el plan gratuito de Supabase no te deja descargar copias de tu base de datos. En **Ajustes → Copia de seguridad** descargas un archivo JSON con todos tus datos. Hazlo una vez a la semana y guárdalo en Drive.
