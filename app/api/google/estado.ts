// Nombre de la cookie que guarda, durante 10 minutos, un número al azar.
// Al volver de Google se comprueba que es el mismo: así nadie puede
// colarte la conexión de otra cuenta con un enlace preparado.
export const COOKIE_ESTADO = "diaclaro_google_estado";
export const RUTA_VUELTA = "/api/google/vuelta";
// Cookie con la pantalla a la que volver después (por ejemplo, un proyecto
// al conectar Drive). Si no hay, se vuelve a Ajustes.
export const COOKIE_VOLVER = "diaclaro_google_volver";
