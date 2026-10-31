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
   - En la plantilla **Magic Link**, añade también el código para entrar escribiéndolo (hace falta en el iPhone con la app instalada, porque el enlace se abre en Safari). Por ejemplo: `<p>O escribe este código en DíaClaro: <strong>{{ .Token }}</strong></p>`. Si no lo añades, el enlace sigue funcionando igual.
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
| `20261030230000_habitos_con_rutinas.sql` | Columna `routine_id` en `habits`: un hábito puede ir unido a una rutina y cada «Hecho» suma 1 |
| `20261030240000_tareas_desde_google.sql` | Columna `google_event` en `tasks`: de qué evento de Google salió una tarea, para no crearla dos veces |
| `20261030260000_documentos_de_drive.sql` | Columna `drive` en `google_connections` y tabla `project_documents` (enlaces a archivos de Drive que eliges en cada proyecto), con sus reglas RLS |
| `20261030270000_recordatorios_habitos.sql` | Columna `remind_at` en `habits`: la hora (opcional) a la que Hoy te recuerda un hábito si aún no has apuntado nada |
| `20261030300000_avisos_push.sql` | Tablas `push_subscriptions` (dónde mandar los avisos), `habit_reminder_sends` (avisos ya enviados) y `push_deliveries`, con sus reglas RLS, y la tarea de cada 5 minutos (pg_cron + pg_net) |
| `20261030330000_hora_de_dormir.sql` | Tabla `bedtimes` (a qué hora pulsaste «Me voy a dormir» cada noche), con sus reglas RLS. Sirve para las horas de sueño reales en Áreas → Progreso |
| `20261030350000_frases_habitos.sql` | Columna `phrases` en `habits` (tus frases para motivarte, hasta 20) y la tarea de avisos, que ahora manda una de ellas al azar |

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

### Añadir Google Drive (opcional)

Sirve para enlazar archivos de tu Drive a un proyecto o asignatura. Usa el permiso `drive.file`: DíaClaro solo ve los archivos que eliges en el selector de Google, nunca el resto. Es gratis.

1. En [console.cloud.google.com](https://console.cloud.google.com), con el mismo proyecto, busca y **habilita** **Google Drive API** y **Google Picker API**.
2. **Google Auth Platform → Acceso a los datos → Agregar o quitar permisos**: añade a mano `https://www.googleapis.com/auth/drive.file`, pulsa **Agregar a la tabla**, **Actualizar** y **Guardar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Clave de API**. Edita la clave: en **Restricciones de aplicaciones** elige **Sitios web** y añade `https://diaclaro.vercel.app/*`; en **Restricciones de API** elige solo **Google Picker API**. Guarda.
4. En Vercel añade `GOOGLE_PICKER_API_KEY` con esa clave (Production) y vuelve a desplegar. Esta clave la ve el navegador, por eso va limitada a tu web y al selector.

#### Documentos importantes

En **Ajustes → Documentos importantes** (`/documentos`) puedes guardar fotos y PDF (DNI, billetes, entradas…) con un tipo y buscarlos después. Se guardan en tu Drive, en la carpeta «DíaClaro · Documentos importantes», con el mismo permiso `drive.file`. No hay que configurar nada más ni hace falta migración: DíaClaro no copia los archivos en Supabase.

En Android, con la app instalada en la pantalla de inicio, sale **DíaClaro** en el menú **Compartir** de la galería y de las capturas. Si no sale, desinstala la app de la pantalla de inicio y vuelve a instalarla desde Chrome, para que el móvil lea los cambios. Por este camino el límite es de 4 MB por archivo; desde la pantalla, de 20 MB.

**Sin internet:** cada vez que abres «Documentos importantes» con conexión, el móvil guarda una copia de tus documentos en el propio navegador. Si luego abres DíaClaro sin internet, sale la pantalla «Sin conexión» (`public/sin-conexion.html`, servida por `public/sw.js`) con esa copia. La copia se puede borrar desde la misma pantalla, y si entra otra cuenta en ese móvil se borra sola.

Si algún día cambias el secreto del cliente, cada persona tendrá que volver a pulsar **Conectar con Google**.

## Avisos con la app cerrada (opcional, una vez)

Sirve para que el recordatorio de un hábito llegue al móvil aunque DíaClaro esté cerrada. Es gratis: usa el estándar «Web Push» de los navegadores y las extensiones `pg_cron` y `pg_net` de Supabase Free. Sin esto, los recordatorios siguen saliendo dentro de la app, en Hoy.

1. Ejecuta la migración `20261030300000_avisos_push.sql` en el **SQL Editor** de Supabase.
2. En la app, ve a **Hábitos → Avisos con la app cerrada** y pulsa **Crear las claves**. Salen cuatro valores. No hagas captura ni los pegues en ningún chat: usa los botones «Copiar».
3. En Vercel → **Settings → Environment Variables** (entorno Production) añade `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `AVISOS_SECRETO` con sus valores. Después, **Redeploy**.
4. En el **SQL Editor** de Supabase pega y ejecuta la línea «Para Supabase» (`select vault.create_secret(...)`). Así Supabase guarda la misma contraseña en su caja fuerte (Vault).
5. En cada móvil u ordenador: **Hábitos → Avisos con la app cerrada → Activar avisos aquí**, y luego **Mandar un aviso de prueba**. En iPhone, primero añade DíaClaro a la pantalla de inicio y ábrela desde el icono.

Cada 5 minutos, Supabase mira qué hábitos han llegado a su hora y aún no tienen nada apuntado, y pide a `/api/avisos/enviar` que mande el aviso (como mucho uno por hábito y día, y solo durante las 3 horas siguientes a su hora). Si la web cambia de dirección, guarda la nueva en Vault con el nombre `diaclaro_avisos_url` (por ejemplo `https://tu-web.vercel.app/api/avisos/enviar`). Si algún día cambias `AVISOS_SECRETO`, cámbialo también en Vault: **Project Settings → Vault**, o borra el secreto `diaclaro_avisos` y créalo de nuevo con la línea del paso 4.

## Cuentas de demostración (opcional, una vez)

Tres cuentas para que cualquiera pruebe DíaClaro sin email: en **/login** salen los botones **Demo 1**, **Demo 2** y **Demo 3**. Cada una trae datos de ejemplo y, en Hoy, un botón **Restablecer** que lo borra todo y vuelve a poner los ejemplos.

1. En Supabase → **Authentication → Users → Add user → Create new user**, crea `demo1@example.com`, `demo2@example.com` y `demo3@example.com`. Las tres con **la misma contraseña** (larga, inventada) y con **Auto Confirm User** marcado.
2. Ejecuta la migración `20261030410000_cuentas_demo.sql` en el **SQL Editor**. Al final debe salir `cuentas_demo = 3`.
3. En Vercel → **Settings → Environment Variables** (Production) añade `DEMO_PASSWORD` con esa contraseña. Después, **Redeploy**.

Para quitarlas: borra `DEMO_PASSWORD` en Vercel (los botones desaparecen) y, si quieres, borra los tres usuarios en Supabase.

Qué protege: las cuentas demo son usuarios normales, así que las reglas RLS impiden que vean datos de nadie más. «Restablecer» solo funciona en ellas (la base de datos lo comprueba). No pueden conectar Google ni activar avisos (las comparte más gente), nadie puede cambiarles el email ni la contraseña, y la IA tiene un tope de 5 usos al día por cuenta que no se reinicia al restablecer.

## Seguridad

- Las claves nunca se suben al repositorio (`.env.local` está en `.gitignore`).
- La *publishable key* es pública por diseño; los datos se protegen con reglas RLS en cada tabla (desde la etapa 1).
- Abre el enlace del email en el mismo navegador donde lo pediste (en Android, la app instalada comparte sesión con Chrome).
- Activa la verificación en dos pasos en GitHub, Supabase, Vercel y tu email.
- **Copia de seguridad:** el plan gratuito de Supabase no te deja descargar copias de tu base de datos. En **Ajustes → Copia de seguridad** descargas un archivo JSON con todos tus datos. Hazlo una vez a la semana y guárdalo en Drive.
